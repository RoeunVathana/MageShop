export type ProductStatus = 'active' | 'draft' | 'archived'
export type ProductType = 'simple' | 'variable' | 'digital' | 'bundle'

export interface ProductCategory {
  id: number
  name: string
  slug: string
  parent_id?: number | null
  parent_name?: string | null
}

export interface ProductAttributeValueItem {
  id?: number
  attribute_id: number
  name?: string
  code?: string
  type?: string
  value?: string | null
  selected_option_id?: number | null
  display_value?: string
}

export interface ProductVariantItem {
  id?: number
  product_id?: number
  sku: string
  name: string
  selling_price: number
  cost_price?: number | null
  stock_quantity: number
  available_stock?: number
  low_stock_threshold?: number
  image_url?: string | null
  is_active?: boolean
  attribute_values?: Array<{
    attribute_id?: number
    code?: string
    option_id?: number
    custom_value?: string
    display_value?: string
  }>
}

export interface Product {
  id: number
  name: string
  brand?: string | null
  brand_id?: number | null
  brand_record?: {
    id: number
    name: string
    slug: string
    logo_url?: string | null
  } | null
  sku: string
  slug: string
  product_type: ProductType
  description?: string | null
  selling_price: number
  cost_price?: number | null
  currency: string
  price: number
  discount_price?: number | null
  status: ProductStatus
  is_active: boolean
  is_featured?: boolean
  is_new_arrival?: boolean
  is_best_seller?: boolean
  is_flash_sale?: boolean
  rating?: number
  reviews_count?: number
  stock_quantity: number
  available_stock: number
  quantity_on_hand: number
  quantity_reserved: number
  low_stock_threshold: number
  weight?: number | null
  dimensions?: {
    length?: number
    width?: number
    height?: number
    unit?: string
  } | null
  specifications?: Record<string, any> | null
  category?: ProductCategory | null
  categories?: Array<{
    id: number
    name: string
    slug: string
    is_primary: boolean
  }>
  attributes?: ProductAttributeValueItem[]
  variants?: ProductVariantItem[]
  image_url?: string | null
  gallery_urls?: string[]
  created_at?: string
  updated_at?: string
}

export interface ProductFilterParams {
  page?: number
  per_page?: number
  search?: string
  category_id?: number | string
  brand?: string
  product_type?: ProductType | 'all'
  status?: ProductStatus | 'all'
  min_price?: number
  max_price?: number
  sort_by?: 'created_at' | 'name' | 'selling_price' | 'stock_quantity'
  sort_direction?: 'asc' | 'desc'
}

export interface CreateProductPayload {
  name: string
  sku: string
  brand?: string
  brand_id?: number | null
  product_type?: ProductType
  description?: string
  selling_price: number
  cost_price?: number
  discount_price?: number | null
  currency?: string
  category_id?: number
  category_ids?: number[]
  initial_stock?: number
  low_stock_threshold?: number
  weight?: number
  dimensions?: Record<string, any>
  status?: ProductStatus
  is_active?: boolean
  is_featured?: boolean
  is_new_arrival?: boolean
  is_best_seller?: boolean
  is_flash_sale?: boolean
  image_url?: string
  gallery_urls?: string[]
  attributes?: Array<{
    attribute_id?: number
    code?: string
    value?: string
    selected_option_id?: number
  }>
  variants?: Array<{
    sku: string
    name: string
    selling_price?: number
    cost_price?: number
    initial_stock?: number
    attribute_values?: Array<{
      attribute_id?: number
      code?: string
      option_id?: number
      custom_value?: string
    }>
  }>
}

export interface UpdateProductPayload {
  name?: string
  sku?: string
  brand?: string
  brand_id?: number | null
  product_type?: ProductType
  description?: string
  selling_price?: number
  cost_price?: number
  discount_price?: number | null
  currency?: string
  category_id?: number
  category_ids?: number[]
  low_stock_threshold?: number
  weight?: number
  dimensions?: Record<string, any>
  status?: ProductStatus
  is_active?: boolean
  is_featured?: boolean
  is_new_arrival?: boolean
  is_best_seller?: boolean
  is_flash_sale?: boolean
  image_url?: string
  gallery_urls?: string[]
  attributes?: Array<{
    attribute_id?: number
    code?: string
    value?: string
    selected_option_id?: number
  }>
  variants?: Array<{
    id?: number
    sku: string
    name: string
    selling_price?: number
    cost_price?: number
    initial_stock?: number
    attribute_values?: Array<{
      attribute_id?: number
      code?: string
      option_id?: number
      custom_value?: string
    }>
  }>
}

export interface PaginatedResponse<T> {
  data: T[]
  links?: {
    first?: string
    last?: string
    prev?: string | null
    next?: string | null
  }
  meta?: {
    current_page: number
    from?: number | null
    last_page: number
    per_page: number
    to?: number | null
    total: number
  }
}
