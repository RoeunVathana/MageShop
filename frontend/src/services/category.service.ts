import { apiClient, initCsrf } from '@/lib/api'
import type {
  Category,
  CategoryAttribute,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CreateAttributePayload,
} from '@/types/category.types'

export const categoryService = {
  /**
   * Fetch categories (supports tree=true for nested hierarchy or flat list)
   */
  async getCategories(params?: {
    tree?: boolean
    include_attribute_count?: boolean
    search?: string
    is_active?: boolean
    parent_id?: number | string
  }): Promise<Category[]> {
    const response = await apiClient.get<{ data: Category[] }>('/categories', { params })
    return response.data.data
  },

  /**
   * Fetch single category by ID or slug with children and attributes
   */
  async getCategory(idOrSlug: string | number): Promise<Category> {
    const response = await apiClient.get<{ data: Category }>(`/categories/${idOrSlug}`)
    return response.data.data
  },

  /**
   * Create a new category
   */
  async createCategory(payload: CreateCategoryPayload): Promise<Category> {
    await initCsrf()
    const response = await apiClient.post<{ data: Category }>('/admin/categories', payload)
    return response.data.data
  },

  /**
   * Update an existing category (with circular hierarchy cycle prevention)
   */
  async updateCategory(id: number | string, payload: UpdateCategoryPayload): Promise<Category> {
    await initCsrf()
    const response = await apiClient.patch<{ data: Category }>(`/admin/categories/${id}`, payload)
    return response.data.data
  },

  /**
   * Safely delete a category and reassign child elements
   */
  async deleteCategory(id: number | string): Promise<{ status: string; message: string }> {
    await initCsrf()
    const response = await apiClient.delete<{ status: string; message: string }>(
      `/admin/categories/${id}`
    )
    return response.data
  },

  /**
   * Fetch configured dynamic attributes for a category
   */
  async getCategoryAttributes(categoryId: number | string): Promise<CategoryAttribute[]> {
    const response = await apiClient.get<{ data: CategoryAttribute[] }>(
      `/categories/${categoryId}/attributes`
    )
    return response.data.data
  },

  /**
   * Add a dynamic attribute definition to a category
   */
  async addAttribute(
    categoryId: number | string,
    payload: CreateAttributePayload
  ): Promise<CategoryAttribute> {
    await initCsrf()
    const response = await apiClient.post<{ data: CategoryAttribute }>(
      `/admin/categories/${categoryId}/attributes`,
      payload
    )
    return response.data.data
  },

  /**
   * Update an attribute definition
   */
  async updateAttribute(
    attributeId: number | string,
    payload: Partial<CreateAttributePayload>
  ): Promise<CategoryAttribute> {
    await initCsrf()
    const response = await apiClient.patch<{ data: CategoryAttribute }>(
      `/admin/category-attributes/${attributeId}`,
      payload
    )
    return response.data.data
  },

  /**
   * Delete an attribute definition
   */
  async deleteAttribute(attributeId: number | string): Promise<{ status: string; message: string }> {
    await initCsrf()
    const response = await apiClient.delete<{ status: string; message: string }>(
      `/admin/category-attributes/${attributeId}`
    )
    return response.data
  },
}

