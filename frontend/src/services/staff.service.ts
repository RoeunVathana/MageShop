import { api } from '@/lib/api'

export interface StaffOrderQueueItem {
  id: number
  order_number: string
  customer_name?: string
  status: string
  total_amount?: number | string
  payment_status?: string
  created_at?: string
  driver?: {
    id: number
    name: string
    phone_number?: string | null
  } | null
  items?: Array<{
    product_name: string
    quantity: number
  }>
}

export interface StaffDriver {
  id: number
  name: string
  email: string
  phone_number?: string | null
  status: string
  roles?: string[]
  assigned_orders_count: number
}

export interface StaffOverview {
  stats: {
    pending_orders: number
    processing_orders: number
    open_tickets: number
    low_stock_products: number
    active_products: number
    delivered_today: number
    pending_seller_applications: number
  }
  queue: StaffOrderQueueItem[]
  drivers: StaffDriver[]
}

export const staffService = {
  async getOverview(): Promise<{ data: StaffOverview }> {
    return api.get('/operations/overview')
  },

  async getDrivers(): Promise<{ data: StaffDriver[] }> {
    return api.get('/operations/drivers')
  },

  async assignDriver(orderNumber: string, driverId: number | null): Promise<{ status: string; message?: string; data?: unknown }> {
    return api.post<{ status: string; message?: string; data?: unknown }>(`/operations/orders/${encodeURIComponent(orderNumber)}/assign-driver`, {
      driver_id: driverId,
    })
  },
}
