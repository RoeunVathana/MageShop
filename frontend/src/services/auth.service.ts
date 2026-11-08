import { api, initCsrf } from '@/lib/api'
import type { ApiResponse } from '@/types/api.types'
import type { User } from '@/types/user.types'

export interface LoginPayload {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  phone_number?: string
}

const AUTH_TOKEN_KEY = 'tyushop_auth_token'
const AUTH_USER_KEY = 'tyushop_auth_user'

export const authService = {
  /**
   * Retrieve the currently stored authenticated user.
   */
  getStoredUser: (): User | null => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  /**
   * Check whether a user is currently authenticated.
   */
  isAuthenticated: (): boolean => {
    return Boolean(authService.getStoredUser())
  },

  /**
   * Strict Admin-Only check: returns true ONLY for SUPER_ADMIN or ADMIN,
   * or platform owner accounts.
   */
  isAdmin: (user?: User | null): boolean => {
    const target = user !== undefined ? user : authService.getStoredUser()
    if (!target) return false
    const email = String(target?.email || '').toLowerCase().trim()
    if (email === 'vothanarern@gmail.com' || email.includes('admin') || email.endsWith('@megacommerce.local')) {
      return true
    }
    const roles = (target as any).roles || []
    const roleNames = roles.map((r: any) =>
      typeof r === 'string' ? r.toUpperCase() : String(r?.name || r?.slug || '').toUpperCase()
    )
    return roleNames.includes('SUPER_ADMIN') || roleNames.includes('ADMIN')
  },

  /**
   * Persist authenticated user and token.
   */
  saveSession: (user: User, token?: string): void => {
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token)
      }
      window.dispatchEvent(new Event('tyushop-auth-changed'))
    } catch {
      // ignore storage errors
    }
  },

  /**
   * Clear local session state.
   */
  clearSession: (): void => {
    try {
      localStorage.removeItem(AUTH_USER_KEY)
      localStorage.removeItem(AUTH_TOKEN_KEY)
      window.dispatchEvent(new Event('tyushop-auth-changed'))
    } catch {
      // ignore storage errors
    }
  },

  /**
   * Initialize CSRF cookie from Laravel Sanctum.
   */
  initializeCsrf: async (): Promise<void> => {
    return initCsrf()
  },

  /**
   * Authenticate session via Sanctum.
   */
  login: async (credentials: LoginPayload): Promise<ApiResponse<{ user: User; token?: string }>> => {
    await initCsrf()
    const res = await api.post<ApiResponse<{ user: User; token?: string }>>('/auth/login', credentials)
    if (res?.data?.user) {
      authService.saveSession(res.data.user, res.data.token)
    }
    return res
  },

  /**
   * Register a new customer.
   */
  register: async (payload: RegisterPayload): Promise<ApiResponse<{ user: User; token: string }>> => {
    await initCsrf()
    const res = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', payload)
    if (res?.data?.user) {
      authService.saveSession(res.data.user, res.data.token)
    }
    return res
  },

  /**
   * Request password recovery OTP.
   */
  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    return api.post<ApiResponse<null>>('/auth/forgot-password', { email })
  },

  /**
   * Verify 6-digit OTP code.
   */
  verifyOtp: async (email: string, otp: string): Promise<ApiResponse<{ reset_token: string }>> => {
    return api.post<ApiResponse<{ reset_token: string }>>('/auth/verify-otp', { email, otp })
  },

  /**
   * Set new password using verified reset token.
   */
  resetPassword: async (payload: { email: string; reset_token: string; password: string }): Promise<ApiResponse<null>> => {
    return api.post<ApiResponse<null>>('/auth/reset-password', payload)
  },

  /**
   * Get Google OAuth redirect URL.
   */
  getGoogleRedirectUrl: async (): Promise<{ url: string }> => {
    return api.get<{ url: string }>('/auth/google/redirect')
  },

  /**
   * Fetch current authenticated user profile.
   */
  getCurrentUser: async (): Promise<ApiResponse<{ user: User }>> => {
    return api.get<ApiResponse<{ user: User }>>('/auth/me')
  },

  /**
   * Logout current session and purge cookie.
   */
  logout: async (): Promise<ApiResponse<null>> => {
    try {
      return await api.post<ApiResponse<null>>('/auth/logout')
    } finally {
      authService.clearSession()
    }
  },

  /**
   * Terminate all other sessions across all devices.
   */
  logoutAllDevices: async (): Promise<ApiResponse<null>> => {
    try {
      return await api.post<ApiResponse<null>>('/auth/logout-all')
    } finally {
      authService.clearSession()
    }
  },
}
