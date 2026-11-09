import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '@/services/auth.service'

/**
 * Strict Admin-Only Guard:
 * Only authenticated users with SUPER_ADMIN or ADMIN role can access system management routes.
 * Staff, Seller, Driver, Warehouse, Customer, and unauthenticated visitors are blocked.
 */
export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const user = authService.getStoredUser()

  if (!user) {
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

  if (!user) {
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

  if (!user) {
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

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!authService.isDelivery(user)) {
    return <Navigate to="/" replace />
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

  if (!user) {
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

