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

