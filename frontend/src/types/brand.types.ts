export interface BrandTranslation {
  id?: number
  locale: 'en' | 'km'
  name: string
  description?: string
}

export interface Brand {
  id: number
  name: string
  slug: string
  logo_url?: string | null
  description?: string | null
  country?: string | null
  website?: string | null
  status: 'active' | 'inactive' | 'archived'
  is_active: boolean
  sort_order: number
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
  products_count?: number
  translations?: BrandTranslation[]
  created_at?: string
  updated_at?: string
}

export interface BrandFormData {
  name: string
  slug?: string
  logo_url?: string
  description?: string
  country?: string
  website?: string
  status?: 'active' | 'inactive' | 'archived'
  is_active?: boolean
  sort_order?: number
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  translations?: {
    locale: 'en' | 'km'
    name: string
    description?: string
  }[]
}

