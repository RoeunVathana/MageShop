import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Award, Package, Globe, RefreshCw, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { brandService } from '@/services/brand.service'
import type { Brand } from '@/types/brand.types'

export function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    brandService
      .getBrands({ per_page: 50, is_active: true })
      .then((res) => setBrands(res.data || []))
      .catch(() => setBrands([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="border-b pb-6">
        <div className="text-xs text-muted-foreground mb-2">
          <Link to="/" className="hover:underline">Home</Link> / <span className="text-foreground font-medium">Brands</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Official Partner Brands</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Verified flagship brands, authorized manufacturers, and artisan designers on TYUSHOP.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">Verified Direct Partners</Badge>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Loading verified brand directory...</p>
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card">
          <Award className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <h3 className="font-semibold text-sm">No Brands Available</h3>
          <p className="text-xs text-muted-foreground mt-1">Check back soon for new partner brand launches.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
          {brands.map((b) => {
            const kmTr = b.translations?.find((t) => t.locale === 'km')

            return (
              <Link key={b.id} to={`/products?brand=${encodeURIComponent(b.name)}`} className="group">
                <Card className="h-full border hover:border-primary/50 hover:shadow-lg transition-all text-center flex flex-col justify-between">
                  <CardContent className="p-6 flex flex-col items-center justify-center space-y-3">
                    <div className="h-20 w-full rounded-xl bg-muted/40 border flex items-center justify-center p-3 overflow-hidden group-hover:scale-105 transition-transform duration-200">
                      {b.logo_url ? (
                        <img
                          src={b.logo_url}
                          alt={b.name}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <Award className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-foreground pt-1 group-hover:text-primary transition-colors">
                        {b.name}
                      </h3>
                      {kmTr?.name && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          🇰🇭 {kmTr.name}
                        </p>
                      )}
                      {b.country && (
                        <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mt-1">
                          <Globe className="w-3 h-3 text-muted-foreground" />
                          <span>{b.country}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t w-full flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 text-primary font-medium text-[11px]">
                        <Package className="w-3 h-3" />
                        {b.products_count || 0} items
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
