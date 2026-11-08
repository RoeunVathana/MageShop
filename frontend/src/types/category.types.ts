export type AttributeType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'date'

export interface CategoryAttributeOption {
  id: number
  value: string
  label: string
  sort_order: number
}

export interface CategoryAttribute {
  id: number
  category_id: number
  name: string
  code: string
  type: AttributeType
  is_required: boolean
  is_filterable: boolean
  is_variant_option: boolean
  sort_order: number
  validation_rules?: Record<string, any> | null
  options?: CategoryAttributeOption[]
  created_at?: string
  updated_at?: string
}

export interface Category {
  id: number
  name: string
  slug: string
  parent_id?: number | null
  parent_name?: string | null
  icon?: string | null
  image_url?: string | null
  description?: string | null
  sort_order: number
  is_active: boolean
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
  products_count?: number
  children?: Category[]
  attributes?: CategoryAttribute[]
  created_at?: string
  updated_at?: string
}

export interface CreateCategoryPayload {
  name: string
  slug?: string
  parent_id?: number | null
  icon?: string
  image_url?: string
  description?: string
  sort_order?: number
  is_active?: boolean
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
}

export interface UpdateCategoryPayload {
  name?: string
  slug?: string
  parent_id?: number | null
  icon?: string
  image_url?: string
  description?: string
  sort_order?: number
  is_active?: boolean
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
}

export interface CreateAttributePayload {
  name: string
  code?: string
  type: AttributeType
  is_required?: boolean
  is_filterable?: boolean
  is_variant_option?: boolean
  sort_order?: number
  options?: Array<{
    id?: number
    value: string
    label: string
    sort_order?: number
  }>
}

