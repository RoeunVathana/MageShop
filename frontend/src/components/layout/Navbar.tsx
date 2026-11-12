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
    { label: t('Contact & Support', 'ទំនាក់ទំនងជំនួយ'), path: '/contact' },
    { label: t('FAQ', 'សំណួរញឹកញាប់'), path: '/faq' },
  ]

  const featuredCategories = [
    // These slugs match the canonical category tree returned by the API.
    // The old short aliases did not resolve on the backend, so ProductService
    // correctly fell back to an unfiltered catalog and showed every product.
    { name: t('Electronics & Gadgets', 'គ្រឿងអេឡិចត្រូនិក'), icon: Laptop, count: t('1,420 items', '១,៤២០ មុខ'), slug: 'electronics-computers' },
    { name: t('Fashion & Apparel', 'សម្លៀកបំពាក់ និងម៉ូដ'), icon: Shirt, count: t('3,850 items', '៣,៨៥០ មុខ'), slug: 'fashion-clothing' },
    { name: t('Home & Kitchen Appliances', 'សម្ភារៈផ្ទះបាយ និងគេហដ្ឋាន'), icon: Home, count: t('890 items', '៨៩០ មុខ'), slug: 'home-living' },
    { name: t('Smartphones & Tablets', 'ទូរស័ព្ទ និងថេប្លេត'), icon: Smartphone, count: t('640 items', '៦៤០ មុខ'), slug: 'mobile-phones-accessories' },
    { name: t('Wearables & Smartwatches', 'នាឡិកាឆ្លាតវៃ'), icon: Watch, count: t('310 items', '៣១០ មុខ'), slug: 'smartwatches-bands' },
    { name: t('Health & Beauty', 'សុខភាព និងសម្រស់'), icon: HeartPulse, count: t('1,120 items', '១,១២០ មុខ'), slug: 'beauty-personal-care' },
  ]

  return (
    <nav className="relative z-[100] hidden overflow-visible border-b bg-background/95 shadow-sm backdrop-blur-xl transition-colors duration-300 lg:block">
      <div className="container mx-auto flex min-h-12 items-center justify-between gap-4 px-4">
        {/* Left: Animated Categories Dropdown Menu */}
        <div className={`relative shrink-0 ${isCategoryOpen ? 'z-[110]' : ''}`}>
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            aria-haspopup="menu"
            aria-expanded={isCategoryOpen}
            className="group relative flex h-12 items-center gap-2 overflow-hidden rounded-t-xl bg-gradient-to-r from-primary via-blue-600 to-indigo-600 px-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap text-primary-foreground shadow-xs transition-all duration-300 hover:from-primary/95 hover:to-indigo-700 hover:shadow-md active:scale-[.98]"
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
                className="fixed inset-0 z-[90] bg-slate-950/25 transition-opacity duration-200"
                onClick={() => setIsCategoryOpen(false)}
              />
              <div
                role="menu"
                className="isolate absolute left-0 top-full z-[120] w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-b-2xl border border-border bg-white p-1.5 text-card-foreground shadow-[0_18px_45px_rgba(15,23,42,0.22)] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 ease-out dark:bg-slate-900"
                style={{ backgroundColor: 'hsl(var(--background))', opacity: 1, mixBlendMode: 'normal' }}
              >
                <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>{t('Department Catalog', 'បញ្ជីប្រភេទទំនិញ')}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                </div>
                <div className="dropdown-scrollbar max-h-[min(28rem,calc(100vh-8rem))] overflow-y-auto scroll-smooth py-1">
                  {featuredCategories.map((cat, idx) => {
                    const Icon = cat.icon
                    return (
                      <Link
                        key={cat.slug}
                        to={`/products?category_id=${encodeURIComponent(cat.slug)}`}
                        onClick={() => setIsCategoryOpen(false)}
                        title={`${cat.name} · ${cat.count}`}
                        role="menuitem"
                        className="group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] leading-5 transition-all duration-200 hover:bg-primary/10 active:scale-[.98]"
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/20 text-muted-foreground group-hover:text-primary transition-all duration-200 group-hover:scale-110 shadow-2xs">
                            <Icon className="w-4 h-4 transition-transform duration-200" />
                          </div>
                          <span className="min-w-0 flex-1 font-medium text-foreground transition-colors group-hover:text-primary">{cat.name}</span>
                        </div>
                        <span className="shrink-0 text-[0.7rem] font-mono text-muted-foreground transition-colors group-hover:text-foreground">{cat.count}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Center: Primary Navigation Links with Floating Hover & Animated Indicator */}
        <div className="flex flex-1 items-center gap-1.5 lg:gap-2.5 xl:gap-3 2xl:gap-4 overflow-x-auto no-scrollbar py-0.5 min-w-0">
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
