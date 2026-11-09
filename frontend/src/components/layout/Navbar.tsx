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
  Store,
  ArrowRight,
  Radio,
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
    <nav className="relative z-20 hidden lg:block border-b bg-card/90 backdrop-blur-xs transition-colors duration-300">
      <div className="container mx-auto px-4 flex items-center justify-between gap-4">
        {/* Left: Animated Categories Dropdown Menu */}
        <div className={`relative shrink-0 ${isCategoryOpen ? 'z-50' : ''}`}>
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="group relative overflow-hidden flex items-center gap-2 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:from-primary/95 hover:to-indigo-700 text-primary-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 rounded-t-lg shadow-xs hover:shadow-md active:scale-95 cursor-pointer"
          >
            {/* Shimmer sweep animation */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            <LayoutGrid className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300 ease-out" />
            <span className="relative z-10">{t('All Categories', 'ប្រភេទទំនិញទាំងអស់')}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-300 ease-out relative z-10', isCategoryOpen && 'rotate-180')} />
          </button>

          {isCategoryOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs transition-opacity duration-200"
                onClick={() => setIsCategoryOpen(false)}
              />
              <div className="absolute left-0 top-full w-72 rounded-b-2xl border bg-card/98 backdrop-blur-md p-2 text-card-foreground shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 ease-out">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b mb-1.5 flex items-center justify-between">
                  <span>{t('Department Catalog', 'បញ្ជីប្រភេទទំនិញ')}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                </div>
                {featuredCategories.map((cat, idx) => {
                  const Icon = cat.icon
                  return (
                    <Link
                      key={cat.slug}
                      to={`/categories`}
                      onClick={() => setIsCategoryOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-primary/10 active:scale-98 group transition-all duration-200 text-xs"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/20 text-muted-foreground group-hover:text-primary transition-all duration-200 group-hover:scale-110 shadow-2xs">
                          <Icon className="w-4 h-4 transition-transform duration-200" />
                        </div>
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">{cat.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground font-mono transition-colors">{cat.count}</span>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Center: Primary Navigation Links with Floating Hover & Animated Indicator */}
        <div className="flex flex-1 items-center gap-2 lg:gap-3 xl:gap-4 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'group relative text-[13px] font-medium py-3 px-1.5 transition-all duration-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md',
                  isActive
                    ? 'text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:-translate-y-0.5',
                  link.isHighlight && 'text-amber-600 dark:text-amber-400 font-bold hover:text-amber-700'
                )}
              >
                {link.isHighlight ? (
                  <span className="relative flex items-center justify-center">
                    <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span className="absolute h-2 w-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  </span>
                ) : null}

                <span className="transition-transform duration-200 group-hover:scale-102">
                  {link.label}
                </span>

                {/* Animated Pill / Underline Indicator */}
                <span
                  className={cn(
                    'absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-gradient-to-r from-primary via-blue-500 to-indigo-500 transition-all duration-300 ease-out shadow-xs',
                    isActive
                      ? 'scale-x-100 opacity-100'
                      : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100'
                  )}
                />
              </Link>
            )
          })}
        </div>

        {/* Right: Vendor Callout - Animated Glowing Button to /sell */}
        <div className="shrink-0 hidden xl:flex items-center">
          <Link
            to="/sell"
            className="group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/10 via-primary/15 to-indigo-500/10 hover:from-primary hover:via-blue-600 hover:to-indigo-600 text-foreground hover:text-white border border-primary/25 hover:border-transparent transition-all duration-300 shadow-xs hover:shadow-lg hover:shadow-primary/20 active:scale-95"
          >
            {/* Pulsing beacon indicator */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 group-hover:bg-white" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary group-hover:bg-white transition-colors duration-300" />
            </span>

            <span className="text-muted-foreground group-hover:text-white/90 transition-colors duration-300">
              {t('Sell on TyuShop?', 'ចង់លក់ទំនិញ?')}
            </span>

            <span className="text-primary group-hover:text-white font-bold transition-colors duration-300 flex items-center gap-1">
              <span>{t('Join as Seller', 'ចុះឈ្មោះជាអ្នកលក់')}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300 ease-out" />
            </span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
