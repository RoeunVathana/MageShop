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
  { name: 'Electronics & Computers', slug: 'electronics-computers', icon: Laptop, color: 'text-blue-500' },
  { name: 'Mobile Phones & Accessories', slug: 'mobile-phones-accessories', icon: Smartphone, color: 'text-emerald-500' },
  { name: 'Fashion & Clothing', slug: 'fashion-clothing', icon: Shirt, color: 'text-purple-500' },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', icon: BeautyIcon, color: 'text-pink-500' },
  { name: 'Home & Living', slug: 'home-living', icon: HomeIcon, color: 'text-amber-500' },
  { name: 'Groceries & Food', slug: 'groceries-food', icon: Apple, color: 'text-red-500' },
]

export function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const { addToCart, toggleFavorite, isFavorite, loyaltyPoints, favoritesCount } = useShopEngagement()
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
                <h3 className="text-xs font-black">Live GPS Delivery Track</h3>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[9px] px-1.5 py-0">
                  REALTIME
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Watch your driver&apos;s live map coordinates, route progress &amp; ETA in real time.
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
                <h3 className="text-xs font-black">100 Pts = Free Item &le;$30</h3>
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 text-[9px] px-1.5 py-0">
                  {loyaltyPoints} PTS
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Earn <strong>+5 points</strong> every purchase! Exchange 100 points for any product &le;$30 FREE.
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
                <h3 className="text-xs font-black">Customer Favorites &amp; Likes</h3>
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-0 text-[9px] px-1.5 py-0">
                  {favoritesCount} SAVED
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Save items you love with one click and move them straight to your shopping cart.
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
                <h3 className="text-xs font-black">24/7 Supporter &amp; Coupons</h3>
                <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-0 text-[9px] px-1.5 py-0">
                  WELCOME10
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Instant AI &amp; human support plus promo codes (<code>WELCOME10</code>, <code>SAVE20</code>, <code>KHQR5</code>).
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Quick Departments Carousel / Grid */}
      <section className="container mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Popular Departments</h2>
          <Link to="/categories" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            All 26 Departments <ArrowRight className="w-3.5 h-3.5" />
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
                <span className="text-xs font-bold mt-2 text-foreground line-clamp-1">{dept.name}</span>
                <span className="text-[10px] text-muted-foreground">Department</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Dashboard Role Navigator */}
      <section className="container mx-auto px-4">
        <div className="bg-muted/40 border rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Enterprise Role Portals</h2>
                <Badge variant="outline" className="text-xs">Security Verified</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Access your dedicated portal with granular RBAC permissions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { role: 'Customer', path: '/dashboard/customer', icon: ShoppingBag, color: 'text-blue-500' },
              { role: 'Seller', path: '/dashboard/seller', icon: Store, color: 'text-emerald-500' },
              { role: 'Admin', path: '/dashboard/admin', icon: Shield, color: 'text-purple-500' },
              { role: 'Staff', path: '/dashboard/staff', icon: Layers, color: 'text-indigo-500' },
              { role: 'Driver', path: '/dashboard/delivery', icon: Truck, color: 'text-amber-500' },
              { role: 'Warehouse', path: '/dashboard/warehouse', icon: CheckCircle, color: 'text-teal-500' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.role}
                  to={item.path}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border hover:border-primary/50 hover:shadow-md transition-all text-center group"
                >
                  <div className={`p-2.5 rounded-full bg-muted group-hover:scale-110 transition-transform ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold mt-2 text-foreground">{item.role}</span>
                  <span className="text-[10px] text-muted-foreground">Portal</span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Live Featured Products from Database */}
      <section className="container mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Live Marketplace Catalog</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real catalog items synchronized with PostgreSQL — click the heart to save favorites or add directly to cart.
            </p>
          </div>
          <Link to="/products" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            View All Products <ArrowRight className="w-3.5 h-3.5" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.map((p) => {
              const liked = isFavorite(p.id)
              const isRewardEligible = p.selling_price <= 30

              return (
                <Card key={p.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <Link to={`/products/${p.slug || p.id}`} className="block w-full h-full">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                            vendor: p.brand || 'MegaCommerce',
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
                          ${p.selling_price.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
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
                            vendor: p.brand || 'MegaCommerce',
                          },
                          1
                        )
                        toast({
                          title: 'Added to Cart 🛒',
                          description: `${p.name} added to your cart (+5 Loyalty Points on checkout).`,
                          type: 'success',
                        })
                      }}
                      className="flex-1 text-xs gap-1.5 font-semibold"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
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
