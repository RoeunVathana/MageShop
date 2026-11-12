import { apiClient, initCsrf } from '@/lib/api'
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
    options?: { signal?: AbortSignal }
  ): Promise<PaginatedResponse<Product>> {
    let response
    let lastError: unknown

    // The public API is hosted on Railway and may need to wake from a cold start.
    // Retry only transient failures so a short network/5xx interruption does not
    // replace the whole catalog with the error state.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await apiClient.get<PaginatedResponse<Product>>('/products', {
          params,
          signal: options?.signal,
        })
        break
      } catch (error) {
        lastError = error
        const code = typeof error === 'object' && error !== null && 'code' in error
          ? Number((error as { code?: number }).code)
          : 0
        const isClientError = code >= 400 && code < 500 && code !== 408 && code !== 429

        if (options?.signal?.aborted || attempt === 2 || isClientError) {
          throw error
        }

        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)))
      }
    }

    if (!response) {
      throw lastError || new Error('The product catalog did not return a response.')
    }

    const payload: any = response.data

    // Accept both Laravel paginator shapes used by deployed API versions:
    // { data: Product[] } and { data: { data: Product[], meta: ... } }.
    if (Array.isArray(payload?.data)) {
      return payload as PaginatedResponse<Product>
    }

    if (Array.isArray(payload?.data?.data)) {
      return payload.data as PaginatedResponse<Product>
    }

    return {
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 0, total: 0 },
    }
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
    return response.data.data
  },

  /**
   * Update an existing product
   */
  async updateProduct(id: number | string, payload: UpdateProductPayload): Promise<Product> {
    await initCsrf()
    const response = await apiClient.patch<{ data: Product }>(`/products/${id}`, payload)
    return response.data.data
  },

  /**
   * Safely archive a product (soft delete / status change)
   */
  async archiveProduct(id: number | string): Promise<{ status: string; message: string; data: Product }> {
    await initCsrf()
    const response = await apiClient.delete<{ status: string; message: string; data: Product }>(
      `/products/${id}`
    )
    return response.data
  },

  /**
   * Fetch categories for dropdown selection
   */
  async getCategories(): Promise<Array<{ id: number; name: string; slug: string; parent_id?: number | null; parent_name?: string | null }>> {
    const response = await apiClient.get<any>('/categories')
    return response.data.data || []
  },
}

