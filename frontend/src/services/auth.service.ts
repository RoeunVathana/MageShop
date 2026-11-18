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
export const GOOGLE_AUTH_SESSION_KEY = 'tyushop_google_auth_verified'

const roleNamesFor = (user?: User | null): string[] => {
  const rawRoles = (user as any)?.roles
  const roles = Array.isArray(rawRoles) ? rawRoles : rawRoles ? [rawRoles] : []
  const roleValues = [
    ...roles,
    (user as any)?.role,
    (user as any)?.role_name,
    (user as any)?.role_slug,
  ]

  return roleValues
    .flatMap((role: any) => typeof role === 'string' ? [role] : [role?.name, role?.slug])
    .filter(Boolean)
    .map((role: unknown) => String(role).trim().toUpperCase().replace(/[\s-]+/g, '_'))
}

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
    // The cached profile alone is not enough to authorize API requests. A
    // previous session can leave the profile behind after its Sanctum token
    // expires or is cleared, which made checkout appear logged in and then
    // fail with an unauthenticated API response.
    try {
      return Boolean(authService.getStoredUser() && localStorage.getItem(AUTH_TOKEN_KEY))
    } catch {
      return false
    }
  },

  /** Whether the current browser session completed Google authentication. */
  isGoogleAuthenticated: (): boolean => {
    try {
      return authService.isAuthenticated() && localStorage.getItem(GOOGLE_AUTH_SESSION_KEY) === '1'
    } catch {
      return false
    }
  },

  /**
   * Strict Admin-Only check based on server-issued roles.
   */
  isAdmin: (user?: User | null): boolean => {
    const target = user !== undefined ? user : authService.getStoredUser()
    if (!target) return false
    const roleNames = roleNamesFor(target)
    return roleNames.includes('SUPER_ADMIN') || roleNames.includes('ADMIN')
  },

  /**
   * Check whether the user has SELLER or SELLER_STAFF role.
   */
  isSeller: (user?: User | null): boolean => {
    const target = user !== undefined ? user : authService.getStoredUser()
    if (!target) return false
    const roleNames = roleNamesFor(target)
    return roleNames.includes('SELLER') || roleNames.includes('SELLER_STAFF')
  },

  /**
   * Check whether the user has STAFF role or higher.
   */
  isStaff: (user?: User | null): boolean => {
    if (authService.isAdmin(user)) return true
    const target = user !== undefined ? user : authService.getStoredUser()
    if (!target) return false
    const roleNames = roleNamesFor(target)
    return roleNames.some((role: string) => [
      'STAFF',
      'OPERATIONS_MANAGER',
      'MANAGER',
      'ORDER_MANAGER',
      'CUSTOMER_SUPPORT',
      'LOGISTICS_MANAGER',
      'DISPATCHER',
    ].includes(role))
  },

  /**
   * Check whether the user has DELIVERY_DRIVER or courier role.
   */
  isDelivery: (user?: User | null): boolean => {
    if (authService.isAdmin(user) || authService.isStaff(user)) return true
    const target = user !== undefined ? user : authService.getStoredUser()
    if (!target) return false
    const roleNames = roleNamesFor(target)
    return (
      roleNames.includes('DELIVERY_DRIVER') ||
      roleNames.includes('COURIER') ||
      roleNames.includes('DELIVERY') ||
      roleNames.includes('LOGISTICS_MANAGER') ||
      roleNames.includes('DISPATCHER') ||
      roleNames.includes('ORDER_MANAGER') ||
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
    const roleNames = roleNamesFor(target)
    return roleNames.includes('WAREHOUSE_MANAGER') || roleNames.includes('INVENTORY_MANAGER')
  },

  /**
   * Resolve the first dashboard a signed-in user should land on.  The API can
   * return roles as strings or role objects, and customer is often included as
   * a secondary role, so routing must inspect every role instead of assuming
   * roles[0] is the user's workspace.
   */
  getDashboardPath: (user?: User | null): string => {
    const target = user !== undefined ? user : authService.getStoredUser()
    if (!target) return '/login'

    const roles = roleNamesFor(target)

    if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) return '/dashboard/admin'
    if (roles.includes('SELLER') || roles.includes('SELLER_STAFF')) return '/dashboard/seller'
    if (roles.includes('WAREHOUSE_MANAGER') || roles.includes('INVENTORY_MANAGER')) return '/dashboard/warehouse'
    if (roles.includes('DELIVERY_DRIVER') || roles.includes('COURIER') || roles.includes('DELIVERY')) return '/dashboard/delivery'
    if (roles.some((role: string) => ['STAFF', 'OPERATIONS_MANAGER', 'MANAGER', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT', 'LOGISTICS_MANAGER', 'DISPATCHER'].includes(role))) {
      return '/dashboard/staff'
    }

    return '/dashboard/customer'
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
   * Assign or update roles for an existing user selected by email address.
   */
  assignRolesByEmail: async (
    email: string,
    payload: {
      role?: string
      roles?: string[]
      role_slugs?: string[]
      role_ids?: number[]
      permissions?: string[]
      permission_ids?: number[]
    }
  ): Promise<any> => {
    const res = await api.post('/admin/users/roles/by-email', {
      email: email.trim().toLowerCase(),
      ...payload,
    })
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
      localStorage.removeItem(GOOGLE_AUTH_SESSION_KEY)
      window.dispatchEvent(new Event('tyushop-auth-changed'))
    } catch {
      // ignore storage errors
    }
  },

  /**
   * Initialize the NestJS-compatible Sanctum CSRF cookie.
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
      localStorage.removeItem(GOOGLE_AUTH_SESSION_KEY)
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
      localStorage.removeItem(GOOGLE_AUTH_SESSION_KEY)
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
    // Google sign-in is a mutating API request too. Initialize Sanctum first
    // so the deployed API receives the CSRF cookie/header pair from localhost.
    await initCsrf()
    const res = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/google/firebase', payload)
    if (res?.data?.user) {
      localStorage.setItem(GOOGLE_AUTH_SESSION_KEY, '1')
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
    const res = await api.get<ApiResponse<{ user: User }>>('/auth/me')
    if (res?.data?.user) {
      // Role assignments can change while a user is already signed in. Keep
      // the cached session synchronized so dashboard routing uses the latest
      // server-issued role instead of an old CUSTOMER-only snapshot.
      authService.saveSession(res.data.user)
    }
    return res
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
