import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api.types'

export interface SellerApplicationData {
  id: number
  user_id: number
  store_name: string
  slug: string
  category?: string
  description?: string
  phone: string
  telegram_username?: string
  city?: string
  address?: string
  bank_name?: string
  bakong_account_id?: string
  logo_url?: string
  banner_url?: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  rejection_reason?: string
  approved_at?: string
  rejected_at?: string
  created_at?: string
  updated_at?: string
  user?: {
    id: number
    name: string
    email: string
    created_at?: string
  }
}

export interface SellerApplyPayload {
  store_name: string
  phone: string
  category?: string
  description?: string
  telegram_username?: string
  city?: string
  address?: string
  bank_name?: string
  bakong_account_id?: string
  logo_url?: string
  banner_url?: string
  // For guest users applying inline
  email?: string
  name?: string
  password?: string
}

export interface AdminSellersResponse {
  data: SellerApplicationData[]
  stats: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  meta: {
    total: number
    current_page: number
    last_page: number
  }
}

export const sellerService = {
  /**
   * Submit seller application
   */
  async apply(payload: SellerApplyPayload): Promise<{ data: SellerApplicationData; message: string }> {
    return api.post('/sellers/apply', payload)
  },

  /**
   * Get current user's seller application
   */
  async getMyApplication(): Promise<{ data: SellerApplicationData | null; is_seller: boolean }> {
    return api.get('/sellers/my-application')
  },

  /**
   * Get public approved seller stores
   */
  async getPublicStores(): Promise<{ data: SellerApplicationData[] }> {
    return api.get('/sellers/stores')
  },

  /**
   * Admin: List all seller member applications with stats
   */
  async getAdminSellers(params?: { status?: string; search?: string; page?: number }): Promise<AdminSellersResponse> {
    const searchParams = new URLSearchParams()
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    if (params?.page) searchParams.set('page', String(params.page))
    const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
    return api.get(`/admin/sellers${query}`)
  },

  /**
   * Admin: Approve seller application
   */
  async approveSeller(id: number): Promise<{ data: SellerApplicationData; message: string }> {
    return api.post(`/admin/sellers/${id}/approve`)
  },

  /**
   * Admin: Reject seller application
   */
  async rejectSeller(id: number, reason: string): Promise<{ data: SellerApplicationData; message: string }> {
    return api.post(`/admin/sellers/${id}/reject`, { reason })
  },

  /**
   * Admin: Update seller status
   */
  async updateStatus(id: number, status: 'approved' | 'suspended' | 'pending'): Promise<{ data: SellerApplicationData; message: string }> {
    return api.patch(`/admin/sellers/${id}/status`, { status })
  },
}
