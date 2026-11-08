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
import { HeroBannerSlider } from '@/components/storefront/HeroBannerSlider'
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
      {/* Dynamic Slide Banner Carousel (Managed via Admin Console) */}
      <HeroBannerSlider />

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
