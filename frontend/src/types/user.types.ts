export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'STAFF'
  | 'SELLER'
  | 'CUSTOMER'
  | 'DELIVERY_DRIVER'
  | 'COURIER'
  | 'DELIVERY'
  | 'SELLER_STAFF'
  | 'ORDER_MANAGER'
  | 'CUSTOMER_SUPPORT'
  | 'LOGISTICS_MANAGER'
  | 'DISPATCHER'
  | 'WAREHOUSE_MANAGER'
  | 'INVENTORY_MANAGER'

export interface Role {
  id: number
  name: UserRole
  slug: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Permission {
  id: number
  name: string
  slug: string
  group?: string
  description?: string
}

export interface User {
  id: number
  name: string
  email: string
  phone_number?: string | null
  avatar_url?: string | null
  address?: string | null
  status: 'active' | 'suspended' | 'pending'
  loyalty_points?: number
  email_verified_at?: string | null
  roles?: Role[]
  created_at?: string
  updated_at?: string
}

