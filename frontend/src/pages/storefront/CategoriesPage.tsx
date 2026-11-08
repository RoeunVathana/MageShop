import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Laptop,
  Smartphone,
  Shirt,
  ShoppingBag,
  Sparkles,
  HeartPulse,
  Home,
  Armchair,
  UtensilsCrossed,
  Apple,
  Baby,
  Gamepad2,
  Trophy,
  Car,
  BookOpen,
  Briefcase,
  Dog,
  Flower2,
  Wrench,
  Watch,
  Download,
  Scissors,
  Gift,
  Music,
  Plane,
  Layers,
  Search,
  ArrowRight,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { categoryService } from '@/services/category.service'
import type { Category } from '@/types/category.types'
import { useShopEngagement } from '@/context/ShopEngagementContext'

const iconMap: Record<string, React.ElementType> = {
  Laptop,
  Smartphone,
  Shirt,
  ShoppingBag,
  Sparkles,
  HeartPulse,
  Home,
  Armchair,
  UtensilsCrossed,
  Apple,
  Baby,
  Gamepad2,
  Trophy,
  Car,
  BookOpen,
  Briefcase,
  Dog,
  Flower2,
  Wrench,
  Watch,
  Download,
  Scissors,
  Gift,
  Music,
  Plane,
  Layers,
}

function getCategoryIcon(name: string, iconProp?: string | null): React.ElementType {
  if (iconProp && iconMap[iconProp]) {
    return iconMap[iconProp]
  }

  const lower = name.toLowerCase()
  if (lower.includes('electronic') || lower.includes('computer')) return Laptop
  if (lower.includes('phone') || lower.includes('mobile')) return Smartphone
  if (lower.includes('fashion') || lower.includes('clothing') || lower.includes('apparel')) return Shirt
  if (lower.includes('shoe') || lower.includes('bag')) return ShoppingBag
  if (lower.includes('beauty') || lower.includes('personal')) return Sparkles
  if (lower.includes('health') || lower.includes('wellness')) return HeartPulse
  if (lower.includes('home') || lower.includes('living')) return Home
  if (lower.includes('furniture')) return Armchair
  if (lower.includes('kitchen') || lower.includes('dining')) return UtensilsCrossed
  if (lower.includes('grocer') || lower.includes('food')) return Apple
  if (lower.includes('baby') || lower.includes('kid')) return Baby
  if (lower.includes('toy') || lower.includes('game')) return Gamepad2
  if (lower.includes('sport') || lower.includes('outdoor')) return Trophy
  if (lower.includes('auto') || lower.includes('motorcycle')) return Car
  if (lower.includes('book') || lower.includes('stationery')) return BookOpen
  if (lower.includes('office')) return Briefcase
  if (lower.includes('pet')) return Dog
  if (lower.includes('garden')) return Flower2
  if (lower.includes('tool') || lower.includes('improvement')) return Wrench
  if (lower.includes('jewel') || lower.includes('watch')) return Watch
  if (lower.includes('digital')) return Download
  if (lower.includes('handmade')) return Scissors
  if (lower.includes('gift') || lower.includes('flower')) return Gift
  if (lower.includes('music') || lower.includes('instrument')) return Music
  if (lower.includes('travel')) return Plane

  return Layers
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const { t } = useShopEngagement()

  useEffect(() => {
    categoryService
      .getCategories({ tree: true })
      .then((cats) => {
        setCategories(cats)
      })
      .catch((err) => {
        console.error('Failed to load categories', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const matchesName = cat.name.toLowerCase().includes(q)
    const matchesDesc = cat.description?.toLowerCase().includes(q)
    const matchesChildren = cat.children?.some((sub) => sub.name.toLowerCase().includes(q))
    return matchesName || matchesDesc || matchesChildren
  })

  const totalSubcategories = categories.reduce(
    (acc, cat) => acc + (cat.children?.length || 0),
    0
  )

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header & Breadcrumb */}
      <div className="border-b pb-6">
        <div className="text-xs text-muted-foreground mb-2">
          <Link to="/" className="hover:underline">{t('Home', 'ទំព័រដើម')}</Link> /{' '}
          <span className="text-foreground font-medium">{t('Departments', 'ផ្នែកទំនិញ')}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">{t('Marketplace Departments', 'ផ្នែកទំនិញទាំងអស់')}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                `Explore our universal catalog across ${categories.length} major departments and ${totalSubcategories} subcategories.`,
                `ស្វែងរកកាតាឡុកទំនិញទូទៅក្នុងចំណោម ${categories.length} ផ្នែកធំៗ និង ${totalSubcategories} ប្រភេទរង។`
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs py-1 px-2.5 font-bold">
              {t('Universal Catalog', 'កាតាឡុកទូទៅ')}
            </Badge>
          </div>
        </div>

        {/* Real-time Category Search Filter */}
        <div className="relative mt-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('Search departments and subcategories...', 'ស្វែងរកផ្នែកទំនិញ ឬប្រភេទរង...')}
            className="pl-9 h-10 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {t('Clear', 'សម្អាត')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm font-semibold">{t('Loading marketplace departments...', 'កំពុងទាញយកផ្នែកទំនិញ...')}</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed rounded-2xl bg-muted/20">
          <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-bold text-base">{t(`No departments match "${searchQuery}"`, `រកមិនឃើញផ្នែកទំនិញត្រូវនឹង "${searchQuery}"`)}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t('Try a different search term or clear the filter to view all departments.', 'សូមសាកល្បងពាក្យស្វែងរកផ្សេង ឬសម្អាតការស្វែងរក។')}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSearchQuery('')}
            className="mt-4 text-xs font-bold"
          >
            {t('Clear Search', 'សម្អាតការស្វែងរក')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCategories.map((cat) => {
            const Icon = getCategoryIcon(cat.name, cat.icon)
            const hasSub = cat.children && cat.children.length > 0

            return (
              <Card
                key={cat.id}
                className="group border hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden"
              >
                <CardContent className="p-6 space-y-4">
                  {/* Department Banner & Title */}
                  <div className="flex items-start gap-4">
                    <div className="p-3.5 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0 shadow-sm">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <Link
                        to={`/products?category_id=${cat.id}`}
                        className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center justify-between gap-1"
                      >
                        <span className="truncate">{cat.name}</span>
                        <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary shrink-0" />
                      </Link>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Subcategories list */}
                  {hasSub && (
                    <div className="pt-2 border-t space-y-2">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                        {t('Popular Subcategories', 'ប្រភេទរងពេញនិយម')}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.children!.slice(0, 6).map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/products?category_id=${sub.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/60 hover:bg-primary hover:text-primary-foreground text-[11px] font-medium text-foreground transition-colors"
                          >
                            <span>{sub.name}</span>
                            <ChevronRight className="w-3 h-3 opacity-60" />
                          </Link>
                        ))}
                        {cat.children!.length > 6 && (
                          <Link
                            to={`/products?category_id=${cat.id}`}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                          >
                            +{cat.children!.length - 6} {t('more', 'ទៀត')}
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>

                {/* Footer link */}
                <div className="px-6 py-3 bg-muted/20 border-t flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    {hasSub ? `${cat.children!.length} ${t('subcategories', 'ប្រភេទរង')}` : t('Department', 'ផ្នែកទំនិញ')}
                  </span>
                  <Link
                    to={`/products?category_id=${cat.id}`}
                    className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {t('Browse Products', 'មើលទំនិញ')} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
