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
import { productService } from '@/services/product.service'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { useToast } from '@/components/ui/toast'
import type { Product } from '@/types/product.types'

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
  const { addToCart, toggleFavorite, isFavorite, loyaltyPoints, favoritesCount, t, formatPrice } = useShopEngagement()
  const { toast } = useToast()

  useEffect(() => {
    productService
      .getProducts({ per_page: 8, status: 'active', sort_by: 'created_at', sort_direction: 'desc' })
      .then((res) => {
        setFeaturedProducts(res.data)
      })
      .catch((err) => {
        console.error('Failed to load featured products', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <div className="space-y-12 pb-16">
      {/* Dynamic Slide Banner Carousel (Managed via Admin Console) */}
      <HeroBannerSlider />

      {/* Customer Experience Highlights: Loyalty, Coupons, Live GPS Delivery Tracking, Favorites & 24/7 Supporter */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/track-order"
            className="flex items-start gap-3.5 p-4 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
          >
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black">{t('Live GPS Delivery Track', 'តាមដានការដឹកជញ្ជូន GPS ផ្ទាល់')}</h3>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[9px] px-1.5 py-0">
                  REALTIME
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {t(
                  "Watch your driver's live map coordinates, route progress & ETA in real time.",
                  'មើលទីតាំងអ្នកដឹកជញ្ជូនផ្ទាល់លើផែនទី និងពេលវេលាមកដល់ជាក់ស្តែង។'
                )}
              </p>
            </div>
          </Link>

          <Link
            to="/cart"
            className="flex items-start gap-3.5 p-4 rounded-2xl border bg-card hover:border-amber-500/50 hover:shadow-md transition-all group"
          >
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black">{t('100 Pts = Free Item ≤$30', '១០០ ពិន្ទុ = ទំនិញឥតគិតថ្លៃ ≤$30')}</h3>
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 text-[9px] px-1.5 py-0">
                  {loyaltyPoints} PTS
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {t(
                  'Earn +5 points every purchase! Exchange 100 points for any product ≤$30 FREE.',
                  'ទទួលបាន +5 ពិន្ទុរាល់ការទិញ! ប្តូរ ១០០ ពិន្ទុយកទំនិញតម្លៃ ≤$30 ដោយឥតគិតថ្លៃ។'
                )}
              </p>
            </div>
          </Link>

          <Link
            to="/wishlist"
            className="flex items-start gap-3.5 p-4 rounded-2xl border bg-card hover:border-rose-500/50 hover:shadow-md transition-all group"
          >
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black">{t('Customer Favorites & Likes', 'ទំនិញពេញចិត្ត (Favorites)')}</h3>
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-0 text-[9px] px-1.5 py-0">
                  {favoritesCount} SAVED
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {t(
                  'Save items you love with one click and move them straight to your shopping cart.',
                  'រក្សាទុកទំនិញដែលអ្នកពេញចិត្ត ហើយដាក់ចូលកន្ត្រកទិញទំនិញបានភ្លាមៗ។'
                )}
              </p>
            </div>
          </Link>

          <Link
            to="/contact"
            className="flex items-start gap-3.5 p-4 rounded-2xl border bg-card hover:border-purple-500/50 hover:shadow-md transition-all group"
          >
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black">{t('24/7 Supporter & Coupons', 'ជំនួយ 24/7 និងគូប៉ុងបញ្ចុះតម្លៃ')}</h3>
                <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-0 text-[9px] px-1.5 py-0">
                  WELCOME10
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
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
      <section className="container mx-auto px-4 space-y-6">
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
            <p className="text-xs">Loading live catalog items...</p>
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-muted/20">
            <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No active products available in catalog.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {featuredProducts.map((p) => {
              const liked = isFavorite(p.id)
              const isRewardEligible = p.selling_price <= 30

              return (
                <Card key={p.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-square overflow-hidden bg-slate-50/80 dark:bg-slate-900/40 p-4 flex items-center justify-center">
                      <Link to={`/products/${p.slug || p.id}`} className="w-full h-full flex items-center justify-center">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-contain max-h-full max-w-full group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ShoppingBag className="w-12 h-12 opacity-30" />
                          </div>
                        )}
                      </Link>
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <Badge variant="secondary" className="text-[10px] bg-background/90 backdrop-blur font-medium">
                          {p.category?.name || 'Universal'}
                        </Badge>
                        {isRewardEligible && (
                          <Badge className="text-[10px] bg-amber-500 text-white border-0 font-bold gap-1">
                            <Gift className="w-3 h-3" /> 100 Pts Free
                          </Badge>
                        )}
                      </div>

                      {/* Customer Favorite / Like Heart Button */}
                      <button
                        type="button"
                        onClick={() => {
                          toggleFavorite({
                            id: p.id,
                            slug: p.slug || String(p.id),
                            name: p.name,
                            price: p.selling_price,
                            originalPrice: p.discount_price || undefined,
                            image: p.image_url || '',
                            vendor: p.brand || 'TYUSHOP',
                            category: p.category?.name || 'Universal',
                          })
                          toast({
                            title: liked ? 'Removed from Favorites' : 'Saved to Favorites ❤️',
                            description: liked ? `${p.name} removed from your liked items.` : `${p.name} added to your favorite list!`,
                            type: 'info',
                          })
                        }}
                        aria-label="Toggle Favorite"
                        className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${
                          liked
                            ? 'bg-rose-500 text-white scale-105'
                            : 'bg-background/90 text-muted-foreground hover:text-rose-500 backdrop-blur'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <CardContent className="p-4 space-y-2">
                      {p.brand && (
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {p.brand}
                        </div>
                      )}
                      <Link
                        to={`/products/${p.slug || p.id}`}
                        className="font-semibold text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors block leading-snug"
                      >
                        {p.name}
                      </Link>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-lg font-black text-foreground">
                          {formatPrice(p.selling_price)}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {p.stock_quantity > 0
                            ? `${p.stock_quantity} ${t('in stock', 'មានក្នុងស្តុក')}`
                            : t('Out of stock', 'អស់ពីស្តុក')}
                        </span>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-4 pt-0 flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={p.stock_quantity <= 0}
                      onClick={() => {
                        addToCart(
                          {
                            id: p.id,
                            slug: p.slug || String(p.id),
                            name: p.name,
                            price: p.selling_price,
                            originalPrice: p.discount_price || undefined,
                            image: p.image_url || '',
                            vendor: p.brand || 'TYUSHOP',
                          },
                          1
                        )
                        toast({
                          title: t('Added to Cart 🛒', 'បានដាក់ចូលកន្ត្រក 🛒'),
                          description: `${p.name} (+5 Loyalty Points).`,
                          type: 'success',
                        })
                      }}
                      className="flex-1 text-xs gap-1.5 font-semibold"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> {t('Add to Cart', 'ដាក់ចូលកន្ត្រក')}
                    </Button>
                    <Link to={`/products/${p.slug || p.id}`}>
                      <Button size="sm" variant="outline" className="text-xs px-2.5" title="View Product Details">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
