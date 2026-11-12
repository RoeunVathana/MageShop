import { apiClient, initCsrf, publicApiClient } from '@/lib/api'
import { cachedRead, invalidateReadCache, stableReadKey } from '@/lib/read-cache'
import type { Brand, BrandFormData } from '@/types/brand.types'

export const brandService = {
  /**
   * Get paginated or filtered list of brands.
   */
  async getBrands(
    params: Record<string, any> = {},
    options?: { public?: boolean }
  ): Promise<{ data: Brand[]; meta?: any }> {
    const request = async () => {
      const client = options?.public ? publicApiClient : apiClient
      const response = await client.get<{ data: Brand[]; meta: any }>('/brands', { params })
      return response.data
    }

    if (options?.public) {
      return cachedRead(
        stableReadKey('public:brands', params),
        request,
        60_000
      )
    }

    return request()
  },

  /**
   * Get single brand by ID or slug.
   */
  async getBrand(idOrSlug: string | number): Promise<Brand> {
    const response = await apiClient.get<{ status: string; data: Brand }>(`/brands/${idOrSlug}`)
    return response.data.data
  },

  /**
   * Create a new brand with optional translations (Admin/Staff only).
   */
  async createBrand(payload: BrandFormData): Promise<Brand> {
    await initCsrf()
    const response = await apiClient.post<{ data: Brand }>('/admin/brands', payload)
    invalidateReadCache('public:brands')
    return response.data.data
  },

  /**
   * Update existing brand (Admin/Staff only).
   */
  async updateBrand(id: number, payload: Partial<BrandFormData>): Promise<Brand> {
    await initCsrf()
    const response = await apiClient.patch<{ data: Brand }>(`/admin/brands/${id}`, payload)
    invalidateReadCache('public:brands')
    return response.data.data
  },

  /**
   * Safely archive a brand (Admin only).
   */
  async archiveBrand(id: number): Promise<Brand> {
    await initCsrf()
    const response = await apiClient.delete<{ status: string; message: string; data: Brand }>(
      `/admin/brands/${id}`
    )
    invalidateReadCache('public:brands')
    return response.data.data
  },
}

