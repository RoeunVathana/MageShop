import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Shield,
  Layers,
  Eye,
  Store,
  Truck,
  CheckCircle,
  RefreshCw,
  Laptop,
  Smartphone,
  Shirt,
  Sparkles as BeautyIcon,
  Home as HomeIcon,
  Apple,
  Heart,
  ShoppingCart,
  Gift,
  MapPin,
  Headphones,
  TicketPercent,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { HeroBannerSlider } from '@/components/storefront/HeroBannerSlider'
import { ProductCard } from '@/components/storefront/ProductCard'
import { productService } from '@/services/product.service'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { useToast } from '@/components/ui/toast'
import type { Product } from '@/types/product.types'
import { SeoHead } from '@/components/seo/SeoHead'
import { Pagination } from '@/components/common/Pagination'

const quickDepartments = [
  { name: 'Electronics & Computers', nameKm: 'គ្រឿងអេឡិចត្រូនិក និងកុំព្យូទ័រ', slug: 'electronics-computers', icon: Laptop, color: 'text-blue-500' },
  { name: 'Mobile Phones & Accessories', nameKm: 'ទូរស័ព្ទ និងគ្រឿងបន្លាស់', slug: 'mobile-phones-accessories', icon: Smartphone, color: 'text-emerald-500' },
  { name: 'Fashion & Clothing', nameKm: 'សម្លៀកបំពាក់ និងម៉ូដ', slug: 'fashion-clothing', icon: Shirt, color: 'text-purple-500' },
  { name: 'Beauty & Personal Care', nameKm: 'គ្រឿងសម្អាង និងសម្រស់', slug: 'beauty-personal-care', icon: BeautyIcon, color: 'text-pink-500' },
  { name: 'Home & Living', nameKm: 'សម្ភារៈគេហដ្ឋាន', slug: 'home-living', icon: HomeIcon, color: 'text-amber-500' },
  { name: 'Groceries & Food', nameKm: 'គ្រឿងទេស និងអាហារ', slug: 'groceries-food', icon: Apple, color: 'text-red-500' },
]

export function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [featuredPage, setFeaturedPage] = useState(1)
  const [featuredTotal, setFeaturedTotal] = useState(0)
  const [featuredTotalPages, setFeaturedTotalPages] = useState(1)
  const { addToCart, toggleFavorite, isFavorite, loyaltyPoints, favoritesCount, t, formatPrice } = useShopEngagement()
  const { toast } = useToast()

  useEffect(() => {
    productService
      .getProducts({
        page: featuredPage,
        per_page: 8,
        view: 'card',
        status: 'active',
        sort_by: 'created_at',
        sort_direction: 'desc',
      }, { public: true })
      .then((res) => {
        setFeaturedProducts(res.data)
        setFeaturedTotal(res.meta?.total || res.data.length)
        setFeaturedTotalPages(res.meta?.last_page || 1)
      })
      .catch((err) => {
        console.error('Failed to load featured products', err)
        setFeaturedProducts([])
        setFeaturedTotal(0)
        setFeaturedTotalPages(1)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [featuredPage])

  return (
    <div className="space-y-12 pb-16">
      <SeoHead
        title="TYUSHOP | Cambodia Online Marketplace"
        description="Shop authentic electronics, fashion, beauty, home goods and groceries in Cambodia. Pay with Bakong KHQR or cash on delivery and track your order with live GPS delivery."
        path="/"
      />
      {/* Dynamic Slide Banner Carousel (Managed via Admin Console) */}
      <HeroBannerSlider />

      {/* Customer Experience Highlights: Loyalty, Coupons, Live GPS Delivery Tracking, Favorites & 24/7 Supporter */}
      <section className="container mx-auto px-4 py-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            to="/track-order"
            className="feature-highlight-card flex items-start gap-3 p-[18px] rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
          >
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start justify-between gap-1.5">
                <h3 className="min-w-0 flex-1 text-[13px] sm:text-sm font-bold leading-snug">{t('Live GPS Delivery Track', 'តាមដានការដឹកជញ្ជូន GPS ផ្ទាល់')}</h3>
                <Badge className="feature-highlight-badge bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-0 text-[9px] px-1.5 py-1">
                  REALTIME
                </Badge>
              </div>
              <p className="feature-highlight-description mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t(
                  "Watch your driver's live map coordinates, route progress & ETA in real time.",
                  'មើលទីតាំងអ្នកដឹកជញ្ជូនផ្ទាល់លើផែនទី និងពេលវេលាមកដល់ជាក់ស្តែង។'
                )}
              </p>
            </div>
          </Link>

          <Link
            to="/cart"
            className="feature-highlight-card flex items-start gap-3 p-[18px] rounded-2xl border bg-card hover:border-amber-500/50 hover:shadow-md transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start justify-between gap-1.5">
                <h3 className="min-w-0 flex-1 text-[13px] sm:text-sm font-bold leading-snug">{t('100 Pts = Free Item ≤$30', '១០០ ពិន្ទុ = ទំនិញឥតគិតថ្លៃ ≤$30')}</h3>
                <Badge className="feature-highlight-badge bg-amber-500/15 text-amber-600 dark:text-amber-300 border-0 text-[9px] px-1.5 py-1">
                  {loyaltyPoints} PTS
                </Badge>
              </div>
              <p className="feature-highlight-description mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t(
                  'Earn +5 points every purchase! Exchange 100 points for any product ≤$30 FREE.',
                  'ទទួលបាន +5 ពិន្ទុរាល់ការទិញ! ប្តូរ ១០០ ពិន្ទុយកទំនិញតម្លៃ ≤$30 ដោយឥតគិតថ្លៃ។'
                )}
              </p>
            </div>
          </Link>

          <Link
            to="/wishlist"
            className="feature-highlight-card flex items-start gap-3 p-[18px] rounded-2xl border bg-card hover:border-rose-500/50 hover:shadow-md transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start justify-between gap-1.5">
                <h3 className="min-w-0 flex-1 text-[13px] sm:text-sm font-bold leading-snug">{t('Customer Favorites & Likes', 'ទំនិញពេញចិត្ត (Favorites)')}</h3>
                <Badge className="feature-highlight-badge bg-rose-500/15 text-rose-600 dark:text-rose-300 border-0 text-[9px] px-1.5 py-1">
                  {favoritesCount} SAVED
                </Badge>
              </div>
              <p className="feature-highlight-description mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t(
                  'Save items you love with one click and move them straight to your shopping cart.',
                  'រក្សាទុកទំនិញដែលអ្នកពេញចិត្ត ហើយដាក់ចូលកន្ត្រកទិញទំនិញបានភ្លាមៗ។'
                )}
              </p>
            </div>
          </Link>

          <Link
            to="/contact"
            className="feature-highlight-card flex items-start gap-3 p-[18px] rounded-2xl border bg-card hover:border-purple-500/50 hover:shadow-md transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start justify-between gap-1.5">
                <h3 className="min-w-0 flex-1 text-[13px] sm:text-sm font-bold leading-snug">{t('24/7 Supporter & Coupons', 'ជំនួយ 24/7 និងគូប៉ុងបញ្ចុះតម្លៃ')}</h3>
                <Badge className="feature-highlight-badge bg-purple-500/15 text-purple-600 dark:text-purple-300 border-0 text-[9px] px-1.5 py-1">
                  WELCOME10
                </Badge>
              </div>
              <p className="feature-highlight-description mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t(
                  'Instant AI & human support plus promo codes (WELCOME10, SAVE20, KHQR5).',
                  'ជំនួយអតិថិជនរហ័ស និងកូដបញ្ចុះតម្លៃពិសេស (WELCOME10, SAVE20, KHQR5)។'
                )}
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Quick Departments Carousel / Grid */}
      <section className="container mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">{t('Popular Departments', 'ផ្នែកទំនិញពេញនិយម')}</h2>
          <Link to="/categories" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            {t('All 26 Departments', 'មើលប្រភេទទាំងអស់')} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickDepartments.map((dept) => {
            const Icon = dept.icon
            return (
              <Link
                key={dept.slug}
                to={`/categories`}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border hover:border-primary/50 hover:shadow-md transition-all text-center group"
              >
                <div className={`p-3 rounded-full bg-muted group-hover:scale-110 transition-transform ${dept.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold mt-2 text-foreground line-clamp-1">{t(dept.name, dept.nameKm)}</span>
                <span className="text-[10px] text-muted-foreground">{t('Department', 'ផ្នែកទំនិញ')}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Live Featured Products from Database */}
      <section id="live-catalog" className="container mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('Live Marketplace Catalog', 'បញ្ជីផលិតផលផ្ទាល់ពីស្តុក')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                'Real catalog items synchronized with PostgreSQL — click the heart to save favorites or add directly to cart.',
                'ផលិតផលក្នុងស្តុកជាក់ស្តែង — ចុចរូបបេះដូងដើម្បីរក្សាទុក ឬដាក់ចូលកន្ត្រកទិញទំនិញផ្ទាល់។'
              )}
            </p>
          </div>
          <Link to="/products" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            {t('View All Products', 'មើលផលិតផលទាំងអស់')} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-16 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-xs">
              {t('Loading live catalog items...', 'កំពុងទាញយកទិន្នន័យផលិតផលផ្ទាល់...')}
            </p>
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-muted/20">
            <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {t('No active products available in catalog.', 'មិនមានផលិតផលសកម្មនៅក្នុងបញ្ជីទំនិញទេ។')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-0 gap-y-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        <Pagination
          currentPage={featuredPage}
          totalPages={featuredTotalPages}
          totalItems={featuredTotal}
          perPage={8}
          itemName={t('products', 'ទំនិញ')}
          labels={{
            showing: t('Showing', 'បង្ហាញ'),
            to: t('to', 'ដល់'),
            of: t('of', 'នៃ'),
            perPage: t('Per page', 'ក្នុងមួយទំព័រ'),
            previous: t('Prev', 'មុន'),
            next: t('Next', 'បន្ទាប់'),
            firstPage: t('First Page', 'ទំព័រដំបូង'),
            lastPage: t('Last Page', 'ទំព័រចុងក្រោយ'),
          }}
          onPageChange={(page) => {
            setFeaturedPage(page)
            document.getElementById('live-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-card/80"
        />
      </section>
    </div>
  )
}
