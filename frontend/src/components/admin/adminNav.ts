import {
  Shield,
  Package,
  Boxes,
  FolderTree,
  Award,
  Store,
  Users,
  AlertTriangle,
  Server,
  Settings,
} from 'lucide-react'
import type { NavItem } from '@/components/dashboard/DashboardLayout'

export const adminNavItems: NavItem[] = [
  { label: 'Platform Overview', href: '/dashboard/admin', icon: Shield },
  { label: 'Products Catalog', href: '/admin/products', icon: Package },
  { label: 'Categories & Attributes', href: '/admin/categories', icon: FolderTree },
  { label: 'Brands & Trademarks', href: '/admin/brands', icon: Award },
  { label: 'Inventory & Stock', href: '/admin/inventory', icon: Boxes },
  { label: 'Vendor Management', href: '/dashboard/admin/vendors', icon: Store, badge: '4' },
  { label: 'User Directory', href: '/dashboard/admin/users', icon: Users },
  { label: 'Disputes & Escrow', href: '/dashboard/admin/disputes', icon: AlertTriangle },
  { label: 'System Diagnostics', href: '/diagnostics', icon: Server, badge: 'Live' },
]

