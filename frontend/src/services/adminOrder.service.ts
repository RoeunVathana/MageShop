import { api } from '@/lib/api'

export interface OrderItem {
  id: number
  product_id?: number
  product_name: string
  product_sku?: string
  quantity: number
  unit_price: number
  total_price: number
  product?: {
    id: number
    name: string
    image_url?: string
    slug?: string
  }
}

export interface AdminOrder {
  id: number
  order_number: string
  user_id?: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: number
  discount: number
  shipping_fee: number
  tax: number
  total_amount: number
  currency: string
  payment_status: 'pending' | 'completed' | 'paid' | 'failed'
  payment_method: string
  customer_name: string
  customer_email?: string
  customer_phone: string
  delivery_address: string
  notes?: string
  driver_name?: string
  driver_phone?: string
  driver_vehicle?: string
  current_lat?: number
  current_lng?: number
  dest_lat?: number
  dest_lng?: number
  estimated_arrival?: string
  items?: OrderItem[]
  payments?: any[]
  receipt?: any
  created_at: string
  updated_at: string
}

export interface SystemOverviewStats {
  total_revenue: number
  total_orders: number
  pending_orders: number
  processing_orders: number
  shipped_orders: number
  delivered_orders: number
  cancelled_orders: number
  total_products: number
  active_products: number
  low_stock_products: number
  total_users: number
  total_categories: number
  total_brands: number
  active_coupons: number
  active_banners: number
}

export interface SystemStatsResponse {
  overview: SystemOverviewStats
  recent_orders: AdminOrder[]
}

export interface OrderListParams {
  search?: string
  status?: string
  payment_status?: string
  payment_method?: string
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface PaginatedOrdersResponse {
  status: string
  data: AdminOrder[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    has_more_pages: boolean
  }
}

export const adminOrderService = {
  /**
   * Get paginated orders list
   */
  async getOrders(params: OrderListParams = {}): Promise<PaginatedOrdersResponse> {
    const res = await api.get<PaginatedOrdersResponse>('/admin/orders', { params })
    return res as unknown as PaginatedOrdersResponse
  },

  /**
   * Get single order details
   */
  async getOrder(id: number | string): Promise<AdminOrder> {
    const res = await api.get<{ status: string; data: AdminOrder }>(`/admin/orders/${id}`)
    return res.data
  },

  /**
   * Update editable customer and delivery details without changing payment
   * or fulfillment state.
   */
  async updateOrder(
    id: number | string,
    data: {
      customer_name: string
      customer_email?: string | null
      customer_phone: string
      delivery_address: string
      notes?: string | null
    }
  ): Promise<AdminOrder> {
    const res = await api.patch<{ status: string; message: string; data: AdminOrder }>(
      `/admin/orders/${id}`,
      data
    )
    return res.data
  },

  /**
   * Update order status
   */
  async updateStatus(
    id: number | string,
    data: {
      status: string
      driver_name?: string
      driver_phone?: string
      estimated_arrival?: string
      notes?: string
    }
  ): Promise<AdminOrder> {
    const res = await api.patch<{ status: string; message: string; data: AdminOrder }>(
      `/admin/orders/${id}/status`,
      data
    )
    return res.data
  },

  /**
   * Update payment status
   */
  async updatePaymentStatus(id: number | string, payment_status: string): Promise<AdminOrder> {
    const res = await api.patch<{ status: string; message: string; data: AdminOrder }>(
      `/admin/orders/${id}/payment-status`,
      { payment_status }
    )
    return res.data
  },

  /**
   * Delete or cancel order
   */
  async deleteOrder(id: number | string): Promise<void> {
    await api.delete(`/admin/orders/${id}`)
  },

  /**
   * Get overall system metrics and recent orders
   */
  async getSystemStats(): Promise<SystemStatsResponse> {
    const res = await api.get<{ status: string; data: SystemStatsResponse }>('/admin/stats')
    return res.data
  },
}

