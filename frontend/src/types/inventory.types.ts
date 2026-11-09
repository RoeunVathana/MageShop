export type MovementType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'ADJUSTMENT'
  | 'DAMAGE'
  | 'RETURN'
  | 'RESERVE'
  | 'RELEASE'

export interface InventoryItem {
  id: number
  product_id: number
  product_name: string
  sku: string
  status: 'active' | 'draft' | 'archived'
  quantity_on_hand: number
  quantity_reserved: number
  available_stock: number
  low_stock_threshold: number
  is_low_stock: boolean
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: number
  product_id: number
  movement_type: MovementType
  quantity_change: number
  before_quantity: number
  after_quantity: number
  reason: string
  reference?: string | null
  created_by?: number | null
  creator_name: string
  idempotency_key?: string | null
  created_at: string
}

export interface AdjustStockPayload {
  movement_type: MovementType
  quantity_change: number
  reason: string
  reference?: string
  idempotency_key?: string
}

export interface AdjustStockResponse {
  status: string
  message: string
  data: {
    inventory: InventoryItem
    movement: InventoryMovement
  }
}

export interface InventoryFilterParams {
  page?: number
  per_page?: number
  search?: string
  low_stock?: boolean | string
  status?: string
  sort_by?: string
  sort_direction?: string
}

