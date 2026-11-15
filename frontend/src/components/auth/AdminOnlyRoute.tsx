import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '@/services/auth.service'
import type { User } from '@/types/user.types'

/**
 * Strict Admin-Only Guard:
 * Only authenticated users with SUPER_ADMIN or ADMIN role can access system management routes.
 * Staff, Seller, Driver, Warehouse, Customer, and unauthenticated visitors are blocked.
 */
export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const user = authService.getStoredUser()

  if (!user || !authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!authService.isAdmin(user)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/**
 * Admin or Seller Guard:
 * Allows access to users with Admin (SUPER_ADMIN, ADMIN) or Seller (SELLER, SELLER_STAFF) roles.
 */
export function AdminOrSellerRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const user = authService.getStoredUser()

  if (!user || !authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!authService.canManageStore(user)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/**
 * Staff or Admin Guard:
 * Allows access to users with Staff (STAFF, OPERATIONS_MANAGER) or Admin roles.
 */
export function StaffOrAdminRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const user = authService.getStoredUser()

  if (!user || !authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!authService.isStaff(user)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/**
 * Delivery Courier or Admin Guard:
 * Allows access to users with Delivery (DELIVERY_DRIVER, COURIER, DISPATCHER) or Admin roles.
 */
export function DeliveryOrAdminRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const user = authService.getStoredUser()

  if (!user || !authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!authService.isDelivery(user)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto text-2xl">
            🚚
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Delivery Fleet Access Required</h2>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              This dashboard is reserved for <strong>TYUSHOP Delivery Couriers</strong>, <strong>Dispatchers</strong>, and <strong>Administrators</strong>. Your current account ({user.email}) does not have delivery dispatch permissions.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <a href="/login" className="flex-1">
              <button type="button" className="w-full px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                Sign In with Courier Account
              </button>
            </a>
            <a href="/" className="flex-1">
              <button type="button" className="w-full px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Back to Storefront
              </button>
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Warehouse Manager or Admin Guard:
 * Allows access to users with Warehouse (WAREHOUSE_MANAGER, INVENTORY_MANAGER) or Admin roles.
 */
export function WarehouseOrAdminRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const user = authService.getStoredUser()

  if (!user || !authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!authService.isWarehouse(user)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/**
 * Authenticated Customer Guard:
 * Requires an active authenticated user session.
 */
export function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const user = authService.getStoredUser()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}

/**
 * Entry guard for the generic dashboard/account URLs. Operational users may
 * still have the CUSTOMER role for shopping, but they must land in their
 * assigned workspace instead of seeing the customer portal by default.
 */
export function RoleAwareDashboardRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser())
  const [refreshing, setRefreshing] = useState(true)

  useEffect(() => {
    let mounted = true

    if (!authService.isAuthenticated()) {
      setRefreshing(false)
      return () => { mounted = false }
    }

    // Do not trust a cached CUSTOMER role after an administrator assigns a
    // delivery role. The API is the source of truth for workspace routing.
    authService.getCurrentUser()
      .then((response) => {
        if (mounted && response?.data?.user) setUser(response.data.user)
      })
      .catch(() => {
        // Keep the cached session as a safe fallback during a temporary API
        // outage; the normal auth interceptor handles expired sessions.
      })
      .finally(() => {
        if (mounted) setRefreshing(false)
      })

    return () => { mounted = false }
  }, [])

  if (!user || !authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (refreshing) {
    return <div className="min-h-[45vh] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">Loading workspace...</div>
  }

  const dashboardPath = authService.getDashboardPath(user)
  const customerPortalPaths = ['/dashboard/customer', '/account', '/orders']
  const isCustomerPortalPath = customerPortalPaths.some((path) => (
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  ))

  if (dashboardPath !== '/dashboard/customer' && isCustomerPortalPath) {
    return <Navigate to={dashboardPath} replace />
  }

  return <>{children}</>
}

