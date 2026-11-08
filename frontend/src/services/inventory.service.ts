import { apiClient, initCsrf } from '@/lib/api'
import type {
  InventoryItem,
  InventoryMovement,
  AdjustStockPayload,
  AdjustStockResponse,
  InventoryFilterParams,
} from '@/types/inventory.types'
import type { PaginatedResponse, Product } from '@/types/product.types'

export const inventoryService = {
  /**
   * View stock levels across all products
   */
  async getInventory(params?: InventoryFilterParams): Promise<PaginatedResponse<Product>> {
    const response = await apiClient.get<PaginatedResponse<Product>>('/inventory', {
      params,
    })
    return response.data
  },

  /**
   * View inventory details for a specific product
   */
  async getProductInventory(productId: number | string): Promise<InventoryItem> {
    const response = await apiClient.get<{ status: string; data: InventoryItem }>(
      `/inventory/${productId}`
    )
    return response.data.data
  },

  /**
   * Adjust stock atomically with 15-step transaction verification and movement logging
   */
  async adjustStock(
    productId: number | string,
    payload: AdjustStockPayload
  ): Promise<AdjustStockResponse> {
    await initCsrf()
    const response = await apiClient.post<AdjustStockResponse>(
      `/inventory/${productId}/adjust`,
      payload
    )
    return response.data
  },

  /**
   * View immutable inventory audit movements for a product
   */
  async getMovements(
    productId: number | string,
    params?: { page?: number; per_page?: number }
  ): Promise<PaginatedResponse<InventoryMovement>> {
    const response = await apiClient.get<PaginatedResponse<InventoryMovement>>(
      `/inventory/${productId}/movements`,
      { params }
    )
    return response.data
  },
}

