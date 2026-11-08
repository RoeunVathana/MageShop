import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api.types'

export interface Banner {
  id: number
  title: string
  subtitle: string | null
  badge_text: string | null
  image_url: string | null
  video_url: string | null
  link_url: string | null
  button_text: string | null
  background_style: string | null
  placement: string
  sort_order: number
  is_active: boolean
  clicks_count: number
  start_at: string | null
  end_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateBannerPayload {
  title: string
  subtitle?: string | null
  badge_text?: string | null
  image_url?: string | null
  video_url?: string | null
  link_url?: string | null
  button_text?: string | null
  background_style?: string | null
  placement?: string
  sort_order?: number
  is_active?: boolean
  start_at?: string | null
  end_at?: string | null
}

export type UpdateBannerPayload = Partial<CreateBannerPayload>

export const bannerService = {
  /**
   * Public: Fetch active banners for a specific placement (default 'hero').
   */
  getBanners: async (placement: string = 'hero'): Promise<ApiResponse<Banner[]>> => {
    return api.get<ApiResponse<Banner[]>>('/banners', {
      params: { placement },
    })
  },

  /**
   * Public: Track click count on a banner.
   */
  trackClick: async (bannerId: number): Promise<void> => {
    try {
      await api.post(`/banners/${bannerId}/click`)
    } catch {
      // Ignore click tracking failure silently in UI
    }
  },

  /**
   * Admin: List all banners with search, placement, and status filters.
   */
  getAdminBanners: async (params?: {
    search?: string
    placement?: string
    status?: string
    page?: number
    per_page?: number
  }): Promise<ApiResponse<Banner[]>> => {
    return api.get<ApiResponse<Banner[]>>('/admin/banners', { params })
  },

  /**
   * Admin: Create a new slide banner.
   */
  createBanner: async (payload: CreateBannerPayload): Promise<ApiResponse<Banner>> => {
    return api.post<ApiResponse<Banner>>('/admin/banners', payload)
  },

  /**
   * Admin: Update an existing slide banner.
   */
  updateBanner: async (id: number, payload: UpdateBannerPayload): Promise<ApiResponse<Banner>> => {
    return api.patch<ApiResponse<Banner>>(`/admin/banners/${id}`, payload)
  },

  /**
   * Admin: Delete a slide banner.
   */
  deleteBanner: async (id: number): Promise<ApiResponse<null>> => {
    return api.delete<ApiResponse<null>>(`/admin/banners/${id}`)
  },

  /**
   * Admin: Toggle active status.
   */
  toggleBannerActive: async (id: number): Promise<ApiResponse<Banner>> => {
    return api.post<ApiResponse<Banner>>(`/admin/banners/${id}/toggle`)
  },

  /**
   * Admin: Reorder banners.
   */
  reorderBanners: async (items: { id: number; sort_order: number }[]): Promise<ApiResponse<Banner[]>> => {
    return api.post<ApiResponse<Banner[]>>('/admin/banners/reorder', { items })
  },
}

