import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Shield,
  Layers,
  Star,
  Eye,
  SlidersHorizontal,
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { productService } from '@/services/product.service'
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
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background py-12 md:py-20 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/20 backdrop-blur-sm">
                <img
                  src="/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg"
                  alt="MegaCommerce"
                  className="w-4 h-4 rounded-full object-cover"
                />
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Universal Multi-Category Marketplace</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight text-foreground">
                The Next-Gen <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-primary via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Universal Marketplace
                </span>
              </h1>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Engineered with modern multi-vendor commerce architecture. Browse 26 universal departments, dynamic specifications, and multi-SKU variants powered by real-time inventory control and instant Bakong KHQR checkout.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/products">
                  <Button size="lg" className="rounded-full shadow-lg shadow-primary/20 gap-2 font-semibold">
                    <ShoppingBag className="w-4 h-4" /> Explore Catalog
                  </Button>
                </Link>
                <Link to="/categories">
                  <Button variant="outline" size="lg" className="rounded-full gap-2">
                    <Layers className="w-4 h-4" /> Browse 26 Departments
                  </Button>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">Bakong KHQR</div>
                    <div className="text-muted-foreground text-[11px]">Instant 0% Fee Pay</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">Nationwide Express</div>
                    <div className="text-muted-foreground text-[11px]">Live GPS Courier</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">100% Genuine</div>
                    <div className="text-muted-foreground text-[11px]">Enterprise Warranty</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Video & Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl p-2 bg-gradient-to-tr from-primary/30 via-purple-500/20 to-indigo-500/30 shadow-2xl backdrop-blur-xl border border-white/20 dark:border-slate-800">
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video lg:aspect-[4/3] group">
                  <video
                    src="/gemini_generated_video_4b7f1e53.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                  {/* Brand Floating Badge */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-3 rounded-xl bg-background/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src="/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg"
                        alt="MegaCommerce Official Emblem"
                        className="w-10 h-10 rounded-lg object-cover ring-2 ring-primary/40 shadow-sm"
                      />
                      <div>
                        <div className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
                          MegaCommerce Official
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="text-[10px] text-muted-foreground">Premier Universal Marketplace</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                      LIVE
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              Real catalog items synchronized with PostgreSQL and live inventory control.
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
            {featuredProducts.map((p) => (
              <Card key={p.id} className="overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                <div>
                  <Link to={`/products/${p.slug || p.id}`} className="block relative aspect-square overflow-hidden bg-muted">
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
                    <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] bg-background/90 backdrop-blur font-medium">
                      {p.category?.name || 'Universal'}
                    </Badge>
                  </Link>

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

                <div className="p-4 pt-0">
                  <Link to={`/products/${p.slug || p.id}`} className="w-full block">
                    <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Eye className="w-3.5 h-3.5" /> View Product
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
