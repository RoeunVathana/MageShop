import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { ApiErrorResponse } from '@/types/api.types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
// Sanctum csrf cookie endpoint is at the backend root: http://localhost:8000/sanctum/csrf-cookie
const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, '')

/**
 * First-Party Sanctum Cookie-Based Axios Instance
 * In accordance with OWASP ASVS and Module 1 Security requirements:
 * - Credentials and session cookies are HttpOnly and managed by the browser.
 * - No authentication tokens are ever stored in localStorage or sessionStorage.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
  withXSRFToken: true,
})

/**
 * Standardize error responses from backend API without leaking sensitive debug data.
 */
export function normalizeApiError(error: unknown): ApiErrorResponse {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>
    if (axiosError.response) {
      const data = axiosError.response.data
      return {
        status: 'error',
        message: data?.message || `Request failed with status ${axiosError.response.status}`,
        errors: data?.errors,
        code: axiosError.response.status,
      }
    } else if (axiosError.request) {
      return {
        status: 'error',
        message: 'No response received from the MegaCommerce API server. Please check your backend connection.',
        code: 0,
      }
    }
  }

  return {
    status: 'error',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    code: 500,
  }
}

/**
 * Initialize CSRF cookie for Laravel Sanctum SPA authentication before mutating requests.
 */
export async function initCsrf(): Promise<void> {
  try {
    await axios.get(`${BACKEND_ROOT}/sanctum/csrf-cookie`, {
      withCredentials: true,
      headers: {
        Accept: 'application/json',
      },
    })
  } catch (error) {
    console.warn('Failed to obtain CSRF cookie from Sanctum:', error)
  }
}

// Request Interceptor: Strict cookie-only authentication (No localStorage tokens)
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(normalizeApiError(error))
)

// Response Interceptor: Safe 401 & 419 Handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const normalized = normalizeApiError(error)

    if (status === 419) {
      // CSRF token mismatch / expired: refresh cookie
      console.warn('[Security] CSRF session expired. Re-initializing Sanctum CSRF cookie.')
      await initCsrf()
    } else if (status === 401) {
      // Session expired or unauthenticated
      const currentPath = window.location.pathname
      const isAuthOrPublic = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-otp'].includes(currentPath)

      if (!isAuthOrPublic && currentPath.startsWith('/dashboard')) {
        console.warn('[Security] Unauthorized access to protected route. Session terminated.')
        // Redirect will be handled by auth guard in Phase 2
      }
    }

    return Promise.reject(normalized)
  }
)

/**
 * Type-safe API helper methods
 */
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.put<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.delete<T>(url, config).then((res) => res.data),
}

export default apiClient
