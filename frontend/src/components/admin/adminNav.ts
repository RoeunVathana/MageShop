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
  Key,
  Sliders,
  MapPin,
  Coins,
  Building2,
} from 'lucide-react'
import type { NavItem } from '@/components/dashboard/DashboardLayout'

export const adminNavItems: NavItem[] = [
  { label: 'Platform Overview', href: '/dashboard/admin', icon: Shield },
  { label: 'Company & Location', href: '/admin/company', icon: Building2, badge: 'HQ' },
  { label: 'Currency & Exchange Rate', href: '/admin/currency', icon: Coins, badge: 'USD/KHR' },
  { label: 'Delivery Location Manager', href: '/dashboard/delivery', icon: MapPin, badge: 'Live GPS' },
  { label: 'Hero Slide Banners', href: '/admin/banners', icon: Sliders },
  { label: 'Products Catalog', href: '/admin/products', icon: Package },
  { label: 'Categories & Attributes', href: '/admin/categories', icon: FolderTree },
  { label: 'Brands & Trademarks', href: '/admin/brands', icon: Award },
  { label: 'Inventory & Stock', href: '/admin/inventory', icon: Boxes },
  { label: 'Telegram API Token & OTP', href: '/admin/security', icon: Key },
  { label: 'Vendor Management', href: '/dashboard/admin/vendors', icon: Store, badge: '4' },
  { label: 'User Directory', href: '/dashboard/admin/users', icon: Users },
  { label: 'Disputes & Escrow', href: '/dashboard/admin/disputes', icon: AlertTriangle },
  { label: 'System Diagnostics', href: '/diagnostics', icon: Server, badge: 'Live' },
]

