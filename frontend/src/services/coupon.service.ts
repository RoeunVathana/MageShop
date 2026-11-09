import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api.types'
import type {
  Coupon,
  CreateCouponPayload,
  UpdateCouponPayload,
  CouponFilterParams,
  CouponMeta,
} from '@/types/coupon.types'

export interface CouponsResponse {
  status: string
  data: Coupon[]
  meta?: CouponMeta
  loyalty_rules?: {
    points_per_purchase: number
    points_for_free_item: number
    free_item_max_price: number
    description: string
  }
}

export const couponService = {
  /**
   * Fetch active coupons for storefront cart
   */
  async getActiveCoupons(): Promise<Coupon[]> {
    try {
      const res = await api.get<CouponsResponse>('/coupons')
      return res.data || []
    } catch {
      return []
    }
  },

  /**
   * Fetch all coupons for Admin & Seller Management with filtering
   */
  async getCoupons(params?: CouponFilterParams & {
    page?: number
    per_page?: number
    sort_by?: string
    sort_direction?: string
  }): Promise<{ data: Coupon[]; meta?: CouponMeta }> {
    const query = new URLSearchParams()
    if (params?.search) query.append('search', params.search)
    if (params?.discount_type && params.discount_type !== 'all') query.append('discount_type', params.discount_type)
    if (params?.is_active && params.is_active !== 'all') query.append('is_active', params.is_active)
    if (params?.seller_only) query.append('seller_only', '1')
    if (params?.page) query.append('page', String(params.page))
    if (params?.per_page) query.append('per_page', String(params.per_page))
    if (params?.sort_by) query.append('sort_by', params.sort_by)
    if (params?.sort_direction) query.append('sort_direction', params.sort_direction)

    const qs = query.toString() ? `?${query.toString()}` : ''
    const res = await api.get<{ status: string; data: Coupon[]; meta?: CouponMeta }>(`/coupons/manage${qs}`)
    return { data: res.data || [], meta: res.meta }
  },

  /**
   * Get single coupon by ID
   */
  async getCoupon(id: number | string): Promise<Coupon> {
    const res = await api.get<{ status: string; data: Coupon }>(`/coupons/${id}`)
    return res.data
  },

  /**
   * Create a new coupon (Admin / Seller)
   */
  async createCoupon(payload: CreateCouponPayload): Promise<Coupon> {
    const res = await api.post<{ status: string; message: string; data: Coupon }>('/coupons', payload)
    return res.data
  },

  /**
   * Update an existing coupon (Admin / Seller)
   */
  async updateCoupon(id: number | string, payload: UpdateCouponPayload): Promise<Coupon> {
    const res = await api.patch<{ status: string; message: string; data: Coupon }>(`/coupons/${id}`, payload)
    return res.data
  },

  /**
   * Permanently delete a coupon
   */
  async deleteCoupon(id: number | string): Promise<{ status: string; message: string }> {
    return api.delete<{ status: string; message: string }>(`/coupons/${id}`)
  },

  /**
   * Quick toggle active / inactive status
   */
  async toggleActive(id: number | string): Promise<Coupon> {
    const res = await api.patch<{ status: string; message: string; data: Coupon }>(`/coupons/${id}/toggle-active`, {})
    return res.data
  },

  /**
   * Validate coupon code against subtotal in Cart
   */
  async validateCoupon(code: string, subtotal: number): Promise<{
    status: string
    message: string
    data: {
      code: string
      description: string
      discount_type: 'percentage' | 'fixed'
      discount_value: number
      discount_amount: number
    }
  }> {
    return api.post('/coupons/validate', { code, subtotal })
  },
}

