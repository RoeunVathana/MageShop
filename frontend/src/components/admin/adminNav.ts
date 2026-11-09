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
  Tag,
  UserCog,
} from 'lucide-react'
import type { NavItem } from '@/components/dashboard/DashboardLayout'

export const adminNavItems: NavItem[] = [
  { label: 'Platform Overview', labelKm: 'ទិដ្ឋភាពទូទៅវេទិកា', href: '/dashboard/admin', icon: Shield },
  { label: 'My Admin Profile', labelKm: 'ប្រវត្តិរូប Admin ខ្ញុំ', href: '/admin/profile', icon: UserCog, badge: 'Self', badgeKm: 'ផ្ទាល់ខ្លួន' },
  { label: 'Company & Location', labelKm: 'ក្រុមហ៊ុន & ទីតាំងការិយាល័យ', href: '/admin/company', icon: Building2, badge: 'HQ', badgeKm: 'កណ្តាល' },
  { label: 'Currency & Exchange Rate', labelKm: 'រូបិយប័ណ្ណ & អត្រាប្តូរប្រាក់', href: '/admin/currency', icon: Coins, badge: 'USD/KHR', badgeKm: 'USD/KHR' },
  { label: 'Delivery Location Manager', labelKm: 'ការគ្រប់គ្រងទីតាំងដឹកជញ្ជូន', href: '/dashboard/delivery', icon: MapPin, badge: 'Live GPS', badgeKm: 'GPS ផ្ទាល់' },
  { label: 'Hero Slide Banners', labelKm: 'បដាផ្សាយពាណិជ្ជកម្មធំៗ', href: '/admin/banners', icon: Sliders },
  { label: 'Products Catalog', labelKm: 'បញ្ជីមុខទំនិញ', href: '/admin/products', icon: Package },
  { label: 'Discount Coupons & Promos', labelKm: 'គូប៉ុងបញ្ចុះតម្លៃ & ប្រូម៉ូសិន', href: '/admin/coupons', icon: Tag, badge: 'Promo', badgeKm: 'ប្រូម៉ូសិន' },
  { label: 'Categories & Attributes', labelKm: 'ប្រភេទ & គុណលក្ខណៈទំនិញ', href: '/admin/categories', icon: FolderTree },
  { label: 'Brands & Trademarks', labelKm: 'ម៉ាក & ពាណិជ្ជសញ្ញា', href: '/admin/brands', icon: Award },
  { label: 'Inventory & Stock', labelKm: 'សារពើភ័ណ្ឌ & ស្តុកទំនិញ', href: '/admin/inventory', icon: Boxes },
  { label: 'Telegram API Token & OTP', labelKm: 'Telegram API & សុវត្ថិភាព OTP', href: '/admin/security', icon: Key },
  { label: 'Vendor Management', labelKm: 'ការគ្រប់គ្រងអ្នកលក់', href: '/dashboard/admin/vendors', icon: Store, badge: '4', badgeKm: '៤' },
  { label: 'User Directory', labelKm: 'បញ្ជីអ្នកប្រើប្រាស់ & បុគ្គលិក', href: '/dashboard/admin/users', icon: Users },
  { label: 'Disputes & Escrow', labelKm: 'វិវាទ & ប្រព័ន្ធទូទាត់ Escrow', href: '/dashboard/admin/disputes', icon: AlertTriangle },
  { label: 'System Diagnostics', labelKm: 'វិភាគ & ពិនិត្យប្រព័ន្ធ', href: '/diagnostics', icon: Server, badge: 'Live', badgeKm: 'ដំណើរការ' },
]

