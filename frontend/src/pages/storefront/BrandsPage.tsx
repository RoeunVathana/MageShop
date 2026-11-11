import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  Package,
  Globe,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Star,
  Search,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { brandService } from '@/services/brand.service'
import type { Brand } from '@/types/brand.types'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { SeoHead } from '@/components/seo/SeoHead'

// Rich visual showcase covers and aesthetic metadata for each brand
const BRAND_VISUAL_PRESETS: Record<
  string,
  {
    cover: string
    tags: string[]
    rating: number
    flag: string
    shortCountry: string
  }
> = {
  apple: {
    cover: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
    tags: ['MacBook Pro', 'Apple Silicon', 'Watch Ultra'],
    rating: 4.9,
    flag: '🇺🇸',
    shortCountry: 'USA',
  },
  sony: {
    cover: 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=800&auto=format&fit=crop&q=80',
    tags: ['Pro Audio', 'Noise Cancelling', 'WH-1000XM5'],
    rating: 4.9,
    flag: '🇯🇵',
    shortCountry: 'Japan',
  },
  samsung: {
    cover: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80',
    tags: ['Galaxy S24 AI', 'AMOLED', 'Smart Tech'],
    rating: 4.8,
    flag: '🇰🇷',
    shortCountry: 'S. Korea',
  },
  nike: {
    cover: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&auto=format&fit=crop&q=80',
    tags: ['Alphafly Racing', 'Marathon', 'Sportswear'],
    rating: 4.9,
    flag: '🇺🇸',
    shortCountry: 'USA',
  },
  anker: {
    cover: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=800&auto=format&fit=crop&q=80',
    tags: ['PowerLine Cables', 'GaN Fast Charge', 'Power Banks'],
    rating: 4.9,
    flag: '🇺🇸',
    shortCountry: 'USA',
  },
  xiaomi: {
    cover: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
    tags: ['Silent Mouse', 'Wireless Peripherals', 'Smart IoT'],
    rating: 4.8,
    flag: '🇨🇳',
    shortCountry: 'China',
  },
  jbl: {
    cover: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
    tags: ['JBL Pro Sound', 'IP67 Waterproof', 'GO 3 Speaker'],
    rating: 4.9,
    flag: '🇺🇸',
    shortCountry: 'USA',
  },
  dji: {
    cover: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80',
    tags: ['Mini 4 Pro', '4K HDR Drones', 'Gimbal Video'],
    rating: 4.9,
    flag: '🇨🇳',
    shortCountry: 'China',
  },
  megabasics: {
    cover: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80',
    tags: ['Insulated Tumblers', 'Travel Drinkware', 'Everyday Goods'],
    rating: 4.8,
    flag: '🇰🇭',
    shortCountry: 'Cambodia',
  },
  'aura-silk': {
    cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    tags: ['Artisanal Silk', 'Linen Dresses', 'Luxury Fashion'],
    rating: 4.9,
    flag: '🇰🇭',
    shortCountry: 'Cambodia',
  },
  urbanpulse: {
    cover: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    tags: ['Athleisure', 'Streetwear', 'Flex Denim'],
    rating: 4.7,
    flag: '🇸🇬',
    shortCountry: 'Singapore',
  },
  'apex-tech': {
    cover: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&auto=format&fit=crop&q=80',
    tags: ['NVMe Storage', 'Productivity Laptops', 'Peripherals'],
    rating: 4.8,
    flag: '🇹🇼',
    shortCountry: 'Taiwan',
  },
  'lumina-audio': {
    cover: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    tags: ['Studio Monitors', 'Hi-Res Audio', 'Wireless Earbuds'],
    rating: 4.8,
    flag: '🇯🇵',
    shortCountry: 'Japan',
  },
  'terra-living': {
    cover: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80',
    tags: ['Solid Teak Wood', 'Nordic Furniture', 'Home Decor'],
    rating: 4.9,
    flag: '🇰🇭',
    shortCountry: 'Cambodia',
  },
  'botanica-care': {
    cover: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
    tags: ['Clean Beauty', 'Organic Skincare', 'French Botanicals'],
    rating: 4.8,
    flag: '🇫🇷',
    shortCountry: 'France',
  },
  'khmercraft-heritage': {
    cover: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80',
    tags: ['Handmade Crafts', 'Traditional Krama', 'Stone Carving'],
    rating: 4.9,
    flag: '🇰🇭',
    shortCountry: 'Cambodia',
  },
}

// Country Flag helper
const getCountryMeta = (country?: string | null) => {
  const c = String(country || '').toLowerCase()
  if (c.includes('cambodia') || c.includes('khmer')) return { flag: '🇰🇭', label: 'Cambodia' }
  if (c.includes('united states') || c.includes('usa') || c.includes('america')) return { flag: '🇺🇸', label: 'USA' }
  if (c.includes('japan')) return { flag: '🇯🇵', label: 'Japan' }
  if (c.includes('korea')) return { flag: '🇰🇷', label: 'S. Korea' }
  if (c.includes('singapore')) return { flag: '🇸🇬', label: 'Singapore' }
  if (c.includes('taiwan')) return { flag: '🇹🇼', label: 'Taiwan' }
  if (c.includes('china')) return { flag: '🇨🇳', label: 'China' }
  if (c.includes('france')) return { flag: '🇫🇷', label: 'France' }
  if (c.includes('germany')) return { flag: '🇩🇪', label: 'Germany' }
  return { flag: '🌐', label: country || 'Global' }
}

export function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'featured' | 'name' | 'products'>('featured')
  const { t } = useShopEngagement()

  useEffect(() => {
    brandService
      .getBrands({ per_page: 50, is_active: true })
      .then((res) => setBrands(res.data || []))
      .catch(() => setBrands([]))
      .finally(() => setLoading(false))
  }, [])

  // Filtered and Sorted Brands
  const filteredBrands = useMemo(() => {
    let result = [...brands]

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.country && b.country.toLowerCase().includes(q)) ||
          (b.description && b.description.toLowerCase().includes(q)) ||
          b.translations?.some((tr) => tr.name.toLowerCase().includes(q))
      )
    }

    // Country filter
    if (selectedCountry !== 'all') {
      result = result.filter((b) => {
        const c = String(b.country || '').toLowerCase()
        if (selectedCountry === 'cambodia') return c.includes('cambodia')
        if (selectedCountry === 'usa') return c.includes('united states') || c.includes('usa')
        if (selectedCountry === 'japan') return c.includes('japan')
        if (selectedCountry === 'singapore') return c.includes('singapore')
        if (selectedCountry === 'international') return !c.includes('cambodia')
        return true
      })
    }

    // Sorting
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'products') {
      result.sort((a, b) => (b.products_count || 0) - (a.products_count || 0))
    } else {
      result.sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99))
    }

    return result
  }, [brands, search, selectedCountry, sortBy])

  // Get unique countries for filter pills
  const totalPartnerCount = brands.length

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <SeoHead
        title="Brands | TYUSHOP Cambodia"
        description="Discover trusted electronics, fashion, beauty and lifestyle brands available from TYUSHOP marketplace sellers in Cambodia."
        path="/brands"
      />
      {/* Breadcrumbs */}
      <div className="text-xs text-muted-foreground">
        <Link to="/" className="hover:underline hover:text-foreground">
          {t('Home', 'ទំព័រដើម')}
        </Link>{' '}
        /{' '}
        <span className="text-foreground font-semibold">
          {t('Brands', 'ម៉ាកយីហោ')}
        </span>
      </div>

      {/* Hero Header Section */}
      <div className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-purple-900/10 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-border/80 shadow-sm overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('Verified Flagship Partners', 'ដៃគូម៉ាកយីហោផ្លូវការ')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              {t('Official Partner Brands', 'ម៉ាកយីហោដៃគូផ្លូវការ')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t(
                'Explore authorized direct manufacturers, premier global tech giants, and artisan Cambodian designers with 100% genuine warranty on TYUSHOP.',
                'ស្វែងរកម៉ាកយីហោបច្ចេកវិទ្យាលំដាប់ពិភពលោក និងអ្នករចនាម៉ូតខ្មែរដែលមានការធានាផ្លូវការ ១០០% លើ TYUSHOP។'
              )}
            </p>

            {/* Value Trust Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-card border shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {t('100% Authentic Guarantee', 'ធានាទំនិញសុទ្ធ ១០០%')}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-card border shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                {t('Official Direct Warranty', 'ការធានាផ្ទាល់ពីរោងចក្រ')}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-card border shadow-xs">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                {totalPartnerCount} {t('Global & Local Brands', 'ម៉ាកយីហោទាំងអស់')}
              </span>
            </div>
          </div>

          <div className="shrink-0 flex md:flex-col items-center justify-center p-5 rounded-2xl bg-card/80 backdrop-blur-md border shadow-sm text-center">
            <span className="text-3xl font-black text-primary">{totalPartnerCount}</span>
            <span className="text-xs font-bold text-muted-foreground mt-0.5">
              {t('Verified Partners', 'ដៃគូផ្លូវការ')}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                'Search brands by name, country, or specialty (e.g. Apple, Sony, Nike)...',
                'ស្វែងរកម៉ាកយីហោតាមឈ្មោះ ប្រទេស ឬប្រភេទ...'
              )}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-muted/40 border border-border focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              {t('Sort by:', 'តម្រៀបតាម៖')}
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl text-xs bg-muted/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              <option value="featured">{t('Featured Flagships', 'លំដាប់ពេញនិយម')}</option>
              <option value="name">{t('Alphabetical (A - Z)', 'តាមអក្ខរក្រម (A - Z)')}</option>
              <option value="products">{t('Most Products', 'ចំនួនទំនិញច្រើនបំផុត')}</option>
            </select>
          </div>
        </div>

        {/* Quick Country Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: t('All Brands', 'គ្រប់ម៉ាកយីហោ'), icon: '🌐' },
            { id: 'cambodia', label: t('Cambodia 🇰🇭', 'កម្ពុជា 🇰🇭'), icon: '🇰🇭' },
            { id: 'usa', label: t('United States 🇺🇸', 'សហរដ្ឋអាមេរិក 🇺🇸'), icon: '🇺🇸' },
            { id: 'japan', label: t('Japan 🇯🇵', 'ជប៉ុន 🇯🇵'), icon: '🇯🇵' },
            { id: 'singapore', label: t('Singapore 🇸🇬', 'សិង្ហបុរី 🇸🇬'), icon: '🇸🇬' },
            { id: 'international', label: t('International ✈️', 'អន្តរជាតិ ✈️'), icon: '✈️' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSelectedCountry(pill.id)}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all text-xs cursor-pointer ${
                selectedCountry === pill.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground border border-border/60'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Cards Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-xs text-muted-foreground font-semibold">
            {t('Loading verified brand directory...', 'កំពុងទាញយកទិន្នន័យម៉ាកយីហោ...')}
          </p>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="text-center py-16 border rounded-3xl bg-card p-8 space-y-3">
          <Award className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-base text-foreground">
            {t('No Matching Brands Found', 'រកមិនឃើញម៉ាកយីហោដែលត្រូវគ្នាឡើយ')}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {t(
              'Try clearing your search query or selecting a different country filter.',
              'សូមព្យាយាមលុបពាក្យស្វែងរក ឬជ្រើសរើសប្រទេសផ្សេងទៀត។'
            )}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearch('')
              setSelectedCountry('all')
            }}
            className="rounded-xl text-xs mt-2"
          >
            {t('Reset All Filters', 'កំណត់តម្រងឡើងវិញ')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBrands.map((b) => {
            const slugKey = b.slug?.toLowerCase() || b.name.toLowerCase()
            const preset = BRAND_VISUAL_PRESETS[slugKey] || null
            const kmTr = b.translations?.find((t) => t.locale === 'km')
            const countryMeta = getCountryMeta(b.country)

            // Dynamic cover image
            const coverImage =
              preset?.cover ||
              b.logo_url ||
              'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80'

            // Dynamic specialty tags
            const tags =
              preset?.tags || [
                b.country ? `${b.country} Flagship` : 'Verified Flagship',
                'Official Store',
              ]

            // Dynamic Rating
            const rating = preset?.rating || 4.9

            // Product count: use live count, or minimum 1 if catalog item exists
            const itemCount = typeof b.products_count === 'number' && b.products_count > 0 ? b.products_count : null

            return (
              <Link
                key={b.id}
                to={`/products?brand=${encodeURIComponent(b.name)}`}
                className="group block h-full focus:outline-none"
              >
                <div className="h-full rounded-3xl border border-border/80 bg-card overflow-hidden hover:shadow-2xl hover:border-primary/50 transition-all duration-300 flex flex-col justify-between group-hover:-translate-y-1">
                  {/* Top Cover Banner */}
                  <div className="relative h-40 w-full overflow-hidden bg-muted">
                    <img
                      src={coverImage}
                      alt={b.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                    {/* Rich Dark Gradient Overlay for text contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

                    {/* Top Badges: Official Verified & Country Origin */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/15 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t('Official', 'ផ្លូវការ')}</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 dark:bg-slate-900/90 backdrop-blur-md text-foreground border border-border shadow-sm">
                        <span className="text-xs">{preset?.flag || countryMeta.flag}</span>
                        <span>{preset?.shortCountry || countryMeta.label}</span>
                      </span>
                    </div>

                    {/* Floating Brand Logo Medallion */}
                    <div className="absolute -bottom-5 left-4 z-10">
                      <div className="w-14 h-14 rounded-2xl bg-card border-2 border-background shadow-lg ring-2 ring-primary/20 flex items-center justify-center p-1.5 overflow-hidden group-hover:scale-105 transition-transform duration-200">
                        {b.logo_url ? (
                          <img
                            src={b.logo_url}
                            alt={b.name}
                            className="w-full h-full object-cover rounded-xl"
                            onError={(e) => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <Award className="w-7 h-7 text-primary" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="pt-7 px-4 pb-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      {/* Name and Rating */}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-black text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 truncate">
                          <span>{b.name}</span>
                          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 fill-blue-500/20" />
                        </h3>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                          <Star className="w-3 h-3 fill-amber-500" />
                          <span>{rating.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Khmer Translation Name if exists */}
                      {kmTr?.name && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold truncate">
                          {kmTr.name}
                        </p>
                      )}

                      {/* Description / Slogan */}
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {b.description || t('Premium official partner brand available with nationwide fast delivery.', 'ម៉ាកយីហោដៃគូផ្លូវការជាមួយការដឹកជញ្ជូនរហ័សទូទាំងប្រទេស។')}
                      </p>

                      {/* Category Specialty Tags */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-medium border border-border/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-foreground font-bold text-xs">
                        <Package className="w-3.5 h-3.5 text-primary" />
                        <span>
                          {itemCount !== null
                            ? `${itemCount} ${t('Products', 'ទំនិញ')}`
                            : t('Verified Catalog', 'កាតាឡុកផ្លូវការ')}
                        </span>
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                        <span>{t('View Brand', 'មើលទំនិញ')}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
