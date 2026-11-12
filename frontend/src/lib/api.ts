import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { ApiErrorResponse } from '@/types/api.types'

const getApiBaseUrl = (): string => {
  // Keep local development usable even when the PHP API is not running on the
  // same machine. A local API can still be selected explicitly with
  // VITE_API_BASE_URL=http://localhost:8000/api/v1.
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return configuredBaseUrl || 'https://api.tyushop.blog/api/v1'
    }
    if (host.includes('railway.app')) {
      return 'https://mageshop-production.up.railway.app/api/v1'
    }
    return 'https://api.tyushop.blog/api/v1'
  }
  return configuredBaseUrl || 'https://api.tyushop.blog/api/v1'
}

const API_BASE_URL = getApiBaseUrl()
// Public catalog reads use the Railway service URL directly. The custom API
// domain adds several seconds of edge latency for uncached product requests,
// while authenticated and mutating requests continue using API_BASE_URL.
const PUBLIC_API_BASE_URL =
  import.meta.env.VITE_PUBLIC_API_BASE_URL?.trim() ||
  'https://mageshop-production.up.railway.app/api/v1'
// Sanctum csrf cookie endpoint is at the backend root: https://api.tyushop.blog/sanctum/csrf-cookie
const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
let csrfReady = false
let csrfRequest: Promise<void> | null = null

/**
 * First-Party Sanctum Cookie-Based Axios Instance
 * In accordance with OWASP ASVS and Module 1 Security requirements:
 * - Credentials and session cookies are HttpOnly and managed by the browser.
 * - No authentication tokens are ever stored in localStorage or sessionStorage.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  // Railway cold starts and database-backed catalog queries can take 10–20 seconds.
  // Keep the request alive long enough for a cold API instance to respond; individual
  // catalog reads also retry transient failures in product.service.ts.
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
  withXSRFToken: true,
})

/**
 * Lightweight client for public catalog reads.
 *
 * It intentionally avoids cookies, CSRF, and custom request headers so these
 * GET requests do not need an extra CORS preflight round trip.
 */
export const publicApiClient: AxiosInstance = axios.create({
  baseURL: PUBLIC_API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
  withCredentials: false,
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
        message: 'No response received from the TYUSHOP API server. Please check your backend connection.',
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
  if (csrfReady) return
  if (csrfRequest) return csrfRequest

  csrfRequest = axios
    .get(`${BACKEND_ROOT}/sanctum/csrf-cookie`, {
      withCredentials: true,
      headers: {
        Accept: 'application/json',
      },
    })
    .then(() => {
      csrfReady = true
    })
    .catch((error) => {
      console.warn('Failed to obtain CSRF cookie from Sanctum:', error)
    })
    .finally(() => {
      csrfRequest = null
    })

  return csrfRequest
}

// Request Interceptor: Attach Sanctum Bearer token if present + cookie credentials
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('tyushop_auth_token')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // ignore storage errors
    }
    return config
  },
  (error) => Promise.reject(normalizeApiError(error))
)

// Response Interceptor: Safe 401 & 419 Handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const normalized = normalizeApiError(error)

    if (status === 419) {
      // CSRF token mismatch / expired: refresh the cookie and retry the same
      // request exactly once. This protects dashboard mutations that call the
      // shared API helper directly.
      const requestConfig = error.config as (AxiosRequestConfig & { _csrfRetried?: boolean }) | undefined
      if (requestConfig && !requestConfig._csrfRetried) {
        console.warn('[Security] CSRF session expired. Retrying request after refreshing Sanctum CSRF cookie.')
        requestConfig._csrfRetried = true
        csrfReady = false
        await initCsrf()
        return apiClient.request(requestConfig)
      }
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

  post: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    await initCsrf()
    return apiClient.post<T>(url, data, config).then((res) => res.data)
  },

  put: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    await initCsrf()
    return apiClient.put<T>(url, data, config).then((res) => res.data)
  },

  patch: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    await initCsrf()
    return apiClient.patch<T>(url, data, config).then((res) => res.data)
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    await initCsrf()
    return apiClient.delete<T>(url, config).then((res) => res.data)
  },
}

export default apiClient
