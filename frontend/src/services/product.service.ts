import { apiClient, initCsrf, publicApiClient } from '@/lib/api'
import { cachedRead, invalidateReadCache, stableReadKey } from '@/lib/read-cache'
import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ProductFilterParams,
  PaginatedResponse,
} from '@/types/product.types'

export const productService = {
  /**
   * Fetch paginated products with search, category and status filtering
   */
  async getProducts(
    params?: ProductFilterParams,
    options?: { signal?: AbortSignal; public?: boolean }
  ): Promise<PaginatedResponse<Product>> {
    const request = async (): Promise<PaginatedResponse<Product>> => {
      return this.fetchProducts(params, options)
    }

    if (options?.public) {
      return cachedRead(
        stableReadKey('public:products', params as Record<string, unknown>),
        request,
        30_000,
        !options.signal
      )
    }

    return request()
  },

  async fetchProducts(
    params?: ProductFilterParams,
    options?: { signal?: AbortSignal; public?: boolean }
  ): Promise<PaginatedResponse<Product>> {
    let lastError: unknown
    // Retry only transport/server failures. An empty result is a valid response
    // and must render immediately instead of waiting through artificial retries.
    const client = options?.public ? publicApiClient : apiClient
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await client.get<PaginatedResponse<Product>>('/products', {
          params,
          signal: options?.signal,
        })

        const payload: any = response.data
        const normalized: PaginatedResponse<Product> = Array.isArray(payload?.data)
          ? payload
          : Array.isArray(payload?.data?.data)
            ? payload.data
            : {
                data: [],
                meta: { current_page: 1, last_page: 1, per_page: 0, total: 0 },
              }

        return normalized
      } catch (error) {
        lastError = error
        const code = typeof error === 'object' && error !== null && 'code' in error
          ? Number((error as { code?: number }).code)
          : 0
        const isClientError = code >= 400 && code < 500 && code !== 408 && code !== 429

        if (options?.signal?.aborted || attempt === 1 || isClientError) {
          throw error
        }

        await new Promise((resolve) => setTimeout(resolve, 250))
      }
    }

    throw lastError || new Error('The product catalog did not return a response.')
  },

  /**
   * Fetch a single product by ID or slug
   */
  async getProduct(id: number | string): Promise<Product> {
    const response = await apiClient.get<{ data: Product }>(`/products/${id}`)
    return response.data.data
  },

  /**
   * Create a new product with initial inventory initialization
   */
  async createProduct(payload: CreateProductPayload): Promise<Product> {
    await initCsrf()
    const response = await apiClient.post<{ data: Product }>('/products', payload)
    invalidateReadCache('public:products')
    return response.data.data
  },

  /**
   * Update an existing product
   */
  async updateProduct(id: number | string, payload: UpdateProductPayload): Promise<Product> {
    await initCsrf()
    const response = await apiClient.patch<{ data: Product }>(`/products/${id}`, payload)
    invalidateReadCache('public:products')
    return response.data.data
  },

  /**
   * Safely archive a product (soft delete / status change)
   */
  async deleteProduct(id: number | string): Promise<{ status: string; message: string; data: Product }> {
    await initCsrf()
    const response = await apiClient.delete<{ status: string; message: string; data: Product }>(
      `/products/${id}`
    )
    invalidateReadCache('public:products')
    return response.data
  },

  /**
   * Backwards-compatible alias for the safe DELETE endpoint. The backend
   * archives products instead of physically removing them.
   */
  async archiveProduct(id: number | string): Promise<{ status: string; message: string; data: Product }> {
    return this.deleteProduct(id)
  },

  /**
   * Fetch categories for dropdown selection
   */
  async getCategories(): Promise<Array<{ id: number; name: string; slug: string; parent_id?: number | null; parent_name?: string | null }>> {
    const response = await apiClient.get<any>('/categories')
    return response.data.data || []
  },
}

