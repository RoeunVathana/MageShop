import { api } from '@/lib/api'

export interface DeliveryMethod {
  id: string
  name: string
  name_km?: string
  price: number
  estimated_time?: string
  estimated_time_km?: string
  is_active: boolean
  is_default: boolean
}

export interface DeliverySettingsData {
  is_free_delivery: boolean
  free_delivery_threshold: number
  default_delivery_fee: number
  methods: DeliveryMethod[]
}

interface ApiResponse<T> {
  status: string
  message?: string
  data?: T
  methods?: DeliveryMethod[]
}

export const deliveryService = {
  /**
   * Get public and customer delivery settings & methods
   */
  async getSettings(): Promise<DeliverySettingsData> {
    const res = await api.get<ApiResponse<DeliverySettingsData>>('/delivery/settings')
    return (
      res?.data || {
        is_free_delivery: true,
        free_delivery_threshold: 0,
        default_delivery_fee: 0,
        methods: [
          {
            id: 'standard_express',
            name: 'Standard Express (Phnom Penh 1-2h)',
            name_km: 'សេវាដឹកជញ្ជូនរហ័ស (ភ្នំពេញ ១-២ ម៉ោង)',
            price: 1.5,
            estimated_time: '1 - 2 Hours',
            estimated_time_km: '១ - ២ ម៉ោង',
            is_active: true,
            is_default: true,
          },
          {
            id: 'nationwide_provincial',
            name: 'Nationwide Provincial Delivery',
            name_km: 'សេវាដឹកជញ្ជូនតាមបណ្តាខេត្ត',
            price: 2.5,
            estimated_time: '24 - 48 Hours',
            estimated_time_km: '២៤ - ៤៨ ម៉ោង',
            is_active: true,
            is_default: false,
          },
        ],
      }
    )
  },

  /**
   * Update global delivery settings (Admin)
   */
  async updateSettings(data: {
    is_free_delivery: boolean
    free_delivery_threshold?: number
    default_delivery_fee?: number
  }): Promise<DeliverySettingsData | undefined> {
    const res = await api.post<ApiResponse<DeliverySettingsData>>('/admin/delivery/settings', data)
    return res?.data
  },

  /**
   * Toggle Free Delivery on/off (Admin)
   */
  async toggleFreeDelivery(is_free_delivery?: boolean): Promise<{ is_free_delivery: boolean } | undefined> {
    const res = await api.post<ApiResponse<{ is_free_delivery: boolean }>>(
      '/admin/delivery/toggle-free',
      is_free_delivery !== undefined ? { is_free_delivery } : {}
    )
    return res?.data
  },

  /**
   * Add a new delivery method (Admin)
   */
  async addMethod(
    method: Omit<DeliveryMethod, 'id'>
  ): Promise<{ data?: DeliveryMethod; methods?: DeliveryMethod[] }> {
    const res = await api.post<ApiResponse<DeliveryMethod>>('/admin/delivery/methods', method)
    return {
      data: res?.data,
      methods: res?.methods,
    }
  },

  /**
   * Update an existing delivery method / price (Admin)
   */
  async updateMethod(
    id: string,
    method: Partial<Omit<DeliveryMethod, 'id'>>
  ): Promise<{ methods?: DeliveryMethod[] }> {
    const res = await api.patch<ApiResponse<any>>(`/admin/delivery/methods/${id}`, method)
    return {
      methods: res?.methods,
    }
  },

  /**
   * Delete a delivery method (Admin)
   */
  async deleteMethod(id: string): Promise<{ methods?: DeliveryMethod[] }> {
    const res = await api.delete<ApiResponse<any>>(`/admin/delivery/methods/${id}`)
    return {
      methods: res?.methods,
    }
  },
}
