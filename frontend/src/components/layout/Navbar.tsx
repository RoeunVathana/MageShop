import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutGrid,
  ChevronDown,
  Laptop,
  Shirt,
  Home,
  Sparkles,
  Smartphone,
  Watch,
  HeartPulse,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useShopEngagement } from '@/context/ShopEngagementContext'

export function Navbar() {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const location = useLocation()
  const { t } = useShopEngagement()

  const navLinks = [
    { label: t('Home', 'ទំព័រដើម'), path: '/' },
    { label: t('All Products', 'ផលិតផលទាំងអស់'), path: '/products' },
    { label: t('Categories', 'ប្រភេទទំនិញ'), path: '/categories' },
    { label: t('Brands', 'ម៉ាកយីហោ'), path: '/brands' },
    { label: t('Track Live Delivery', 'តាមដានការដឹកជញ្ជូន GPS'), path: '/track-order', isHighlight: true },
    { label: t('About Us', 'អំពីយើង'), path: '/about' },
    { label: t('Contact & Supporter', 'ទំនាក់ទំនងជំនួយ'), path: '/contact' },
    { label: t('FAQ', 'សំណួរញឹកញាប់'), path: '/faq' },
  ]

  const featuredCategories = [
    { name: t('Electronics & Gadgets', 'គ្រឿងអេឡិចត្រូនិក'), icon: Laptop, count: t('1,420 items', '១,៤២០ មុខ'), slug: 'electronics' },
    { name: t('Fashion & Apparel', 'សម្លៀកបំពាក់ និងម៉ូដ'), icon: Shirt, count: t('3,850 items', '៣,៨៥០ មុខ'), slug: 'fashion' },
    { name: t('Home & Kitchen Appliances', 'សម្ភារៈផ្ទះបាយ និងគេហដ្ឋាន'), icon: Home, count: t('890 items', '៨៩០ មុខ'), slug: 'home-kitchen' },
    { name: t('Smartphones & Tablets', 'ទូរស័ព្ទ និងថេប្លេត'), icon: Smartphone, count: t('640 items', '៦៤០ មុខ'), slug: 'phones' },
    { name: t('Wearables & Smartwatches', 'នាឡិកាឆ្លាតវៃ'), icon: Watch, count: t('310 items', '៣១០ មុខ'), slug: 'wearables' },
    { name: t('Health & Beauty', 'សុខភាព និងសម្រស់'), icon: HeartPulse, count: t('1,120 items', '១,១២០ មុខ'), slug: 'beauty' },
  ]

  return (
    <nav className="hidden md:block border-b bg-card/60 backdrop-blur-sm">
      <div className="container mx-auto px-4 flex items-center justify-between gap-4">
        {/* Left: Categories Menu */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors rounded-t-md"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>{t('All Categories', 'ប្រភេទទំនិញទាំងអស់')}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isCategoryOpen && 'rotate-180')} />
          </button>

          {isCategoryOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsCategoryOpen(false)}
              />
              <div className="absolute left-0 top-full w-72 rounded-b-xl border bg-card p-2 text-card-foreground shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b mb-1">
                  {t('Department Catalog', 'បញ្ជីប្រភេទទំនិញ')}
                </div>
                {featuredCategories.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <Link
                      key={cat.slug}
                      to={`/categories`}
                      onClick={() => setIsCategoryOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent group transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-muted group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-foreground">{cat.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{cat.count}</span>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Center: Primary Navigation Links */}
        <div className="flex items-center gap-2.5 lg:gap-4 xl:gap-6 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'text-xs font-medium py-3 border-b-2 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0',
                  isActive
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
                  link.isHighlight && 'text-amber-600 dark:text-amber-400 font-bold'
                )}
              >
                {link.isHighlight && <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />}
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Right: Vendor Callout */}
        <div className="text-xs text-muted-foreground shrink-0 hidden xl:block">
          <span>{t('Sell on TyuShop? ', 'ចង់លក់ទំនិញលើ TyuShop? ')}</span>
          <Link to="/register" className="text-primary font-bold hover:underline">
            {t('Join as Seller', 'ចុះឈ្មោះជាអ្នកលក់')}
          </Link>
        </div>
      </div>
    </nav>
  )
}
