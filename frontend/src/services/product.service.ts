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
  async getProducts(params?: ProductFilterParams): Promise<PaginatedResponse<Product>> {
    const response = await apiClient.get<PaginatedResponse<Product>>('/products', {
      params,
    })
    return response.data
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

