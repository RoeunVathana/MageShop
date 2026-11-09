export type CouponDiscountType = 'percentage' | 'fixed'

export interface Coupon {
  id: number
  code: string
  description?: string | null
  discount_type: CouponDiscountType
  discount_value: number
  min_order_amount: number
  max_discount_amount?: number | null
  is_active: boolean
  expires_at?: string | null
  created_by?: number | null
  created_at: string
  updated_at: string
  formatted_discount?: string
  cart_label?: string
}

export interface CreateCouponPayload {
  code: string
  description?: string
  discount_type: CouponDiscountType
  discount_value: number
  min_order_amount?: number
  max_discount_amount?: number | null
  is_active?: boolean
  expires_at?: string | null
}

export interface UpdateCouponPayload {
  code?: string
  description?: string
  discount_type?: CouponDiscountType
  discount_value?: number
  min_order_amount?: number
  max_discount_amount?: number | null
  is_active?: boolean
  expires_at?: string | null
}

export interface CouponFilterParams {
  search?: string
  discount_type?: 'percentage' | 'fixed' | 'all'
  is_active?: 'all' | '1' | '0'
  seller_only?: boolean
}

export interface CouponMeta {
  total: number
  active_count: number
  inactive_count: number
}
