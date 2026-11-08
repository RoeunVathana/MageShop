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

export const authService = {
  /**
   * Initialize CSRF cookie from Laravel Sanctum.
   */
  initializeCsrf: async (): Promise<void> => {
    return initCsrf()
  },

  /**
   * Authenticate session via Sanctum HttpOnly cookie.
   */
  login: async (credentials: LoginPayload): Promise<ApiResponse<{ user: User }>> => {
    await initCsrf()
    return api.post<ApiResponse<{ user: User }>>('/auth/login', credentials)
  },

  /**
   * Register a new customer.
   */
  register: async (payload: RegisterPayload): Promise<ApiResponse<{ user: User; token: string }>> => {
    await initCsrf()
    return api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', payload)
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
    return api.post<ApiResponse<null>>('/auth/logout')
  },

  /**
   * Terminate all other sessions across all devices.
   */
  logoutAllDevices: async (): Promise<ApiResponse<null>> => {
    return api.post<ApiResponse<null>>('/auth/logout-all')
  },
}
