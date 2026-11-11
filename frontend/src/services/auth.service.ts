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

export interface UpdateProfilePayload {
  name: string
  email: string
  phone_number?: string | null
  avatar_url?: string | null
  address?: string | null
  current_password?: string
  new_password?: string
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
   * Strict Admin-Only check based on server-issued roles.
   */
  isAdmin: (user?: User | null): boolean => {
    const target = user !== undefined ? user : authService.getStoredUser()
    if (!target) return false
    const roles = (target as any).roles || []
    const roleNames = roles.map((r: any) =>
      typeof r === 'string' ? r.toUpperCase() : String(r?.name || r?.slug || '').toUpperCase()
    )
    return roleNames.includes('SUPER_ADMIN') || roleNames.includes('ADMIN')
  },

  /**
   * Check whether the user has SELLER or SELLER_STAFF role.
   */
  isSeller: (user?: User | null): boolean => {
    const target = user !== undefined ? user : authService.getStoredUser()
    if (!target) return false
    const roles = (target as any).roles || []
    const roleNames = roles.map((r: any) =>
      typeof r === 'string' ? r.toUpperCase() : String(r?.name || r?.slug || '').toUpperCase()
    )
    return roleNames.includes('SELLER') || roleNames.includes('SELLER_STAFF')
  },

  /**
   * Check whether the user has STAFF role or higher.
   */
  isStaff: (user?: User | null): boolean => {
    if (authService.isAdmin(user)) return true
    const target = user !== undefined ? user : authService.getStoredUser()
    if (!target) return false
    const roles = (target as any).roles || []
    const roleNames = roles.map((r: any) =>
      typeof r === 'string' ? r.toUpperCase() : String(r?.name || r?.slug || '').toUpperCase()
    )
    return roleNames.includes('STAFF') || roleNames.includes('OPERATIONS_MANAGER') || roleNames.includes('MANAGER')
  },

  /**
   * Check whether the user has DELIVERY_DRIVER or courier role.
   */
  isDelivery: (user?: User | null): boolean => {
    if (authService.isAdmin(user) || authService.isStaff(user)) return true
    const target = user !== undefined ? user : authService.getStoredUser()
    if (!target) return false
    const roles = (target as any).roles || []
    const roleNames = roles.map((r: any) =>
      typeof r === 'string' ? r.toUpperCase() : String(r?.name || r?.slug || '').toUpperCase()
    )
    return (
      roleNames.includes('DELIVERY_DRIVER') ||
      roleNames.includes('COURIER') ||
      roleNames.includes('LOGISTICS_MANAGER') ||
      roleNames.includes('DISPATCHER') ||
      roleNames.includes('STAFF') ||
      roleNames.includes('OPERATIONS_MANAGER')
    )
  },

  /**
   * Check whether the user has WAREHOUSE or INVENTORY manager role.
   */
  isWarehouse: (user?: User | null): boolean => {
    if (authService.isAdmin(user)) return true
    const target = user !== undefined ? user : authService.getStoredUser()
    if (!target) return false
    const roles = (target as any).roles || []
    const roleNames = roles.map((r: any) =>
      typeof r === 'string' ? r.toUpperCase() : String(r?.name || r?.slug || '').toUpperCase()
    )
    return roleNames.includes('WAREHOUSE_MANAGER') || roleNames.includes('INVENTORY_MANAGER')
  },

  /**
   * Check whether user is an Admin OR Seller (can manage products, coupons, and store features).
   */
  canManageStore: (user?: User | null): boolean => {
    return authService.isAdmin(user) || authService.isSeller(user)
  },

  /**
   * Assign or update roles for a user.
   */
  assignRoles: async (
    userId: number | string,
    payload: {
      role?: string
      roles?: string[]
      role_slugs?: string[]
      role_ids?: number[]
      permissions?: string[]
      permission_ids?: number[]
    }
  ): Promise<any> => {
    const res = await api.post(`/admin/users/${userId}/roles`, payload)
    return res
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
   * Authenticate with Firebase Google OAuth result.
   */
  loginWithFirebase: async (payload: {
    id_token: string
    email?: string | null
    name?: string | null
    avatar?: string | null
    uid?: string | null
  }): Promise<ApiResponse<{ user: User; token: string }>> => {
    const res = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/google/firebase', payload)
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
   * Update the authenticated user's own profile (Admin, Seller, Staff, Customer).
   */
  updateProfile: async (payload: UpdateProfilePayload): Promise<ApiResponse<{ user: User }>> => {
    const res = await api.put<ApiResponse<{ user: User }>>('/auth/profile', payload)
    if (res?.data?.user) {
      authService.saveSession(res.data.user)
    }
    return res
  },

  /**
   * Upload an avatar picture for the authenticated user.
   */
  uploadAvatar: async (file: File): Promise<ApiResponse<{ avatar_url: string; user: User }>> => {
    const formData = new FormData()
    formData.append('avatar', file)
    const res = await api.post<ApiResponse<{ avatar_url: string; user: User }>>('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (res?.data?.user) {
      authService.saveSession(res.data.user)
    }
    return res
  },

  /**
   * Update account password.
   */
  changePassword: async (payload: { current_password: string; new_password: string; new_password_confirmation: string }): Promise<ApiResponse<null>> => {
    return api.put<ApiResponse<null>>('/auth/password', payload)
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
