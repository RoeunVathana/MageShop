import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Filter,
  Eye,
  SlidersHorizontal,
  ArrowUpDown,
  Search,
  RotateCcw,
  Package,
  AlertCircle,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Check,
  RefreshCw,
  ShoppingBag,
  Heart,
  ShoppingCart,
  Gift,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ProductCard } from '@/components/storefront/ProductCard'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { brandService } from '@/services/brand.service'
import { cn } from '@/lib/utils'
import type { Product, ProductType } from '@/types/product.types'
import type { Category } from '@/types/category.types'
import type { Brand } from '@/types/brand.types'
import { SeoHead } from '@/components/seo/SeoHead'
import { Pagination } from '@/components/common/Pagination'

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const { addToCart, toggleFavorite, isFavorite, t, formatPrice } = useShopEngagement()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [totalProducts, setTotalProducts] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)

  // Filters state from searchParams
  const currentPage = Number(searchParams.get('page') || '1')
  const currentCategory = searchParams.get('category_id') || ''
  const currentBrand = searchParams.get('brand') || ''
  const currentSearch = searchParams.get('search') || ''
  const currentType = (searchParams.get('product_type') as ProductType | 'all') || 'all'
  const currentSort = searchParams.get('sort_by') || 'created_at'
  const currentSortDir = (searchParams.get('sort_direction') as 'asc' | 'desc') || 'desc'
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''

  // Local inputs
  const [searchInput, setSearchInput] = useState<string>(currentSearch)
  const [minPriceInput, setMinPriceInput] = useState<string>(minPrice)
  const [maxPriceInput, setMaxPriceInput] = useState<string>(maxPrice)
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({})
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  // Load category tree & brands on mount
  useEffect(() => {
    categoryService
      .getCategories({ tree: true }, { public: true })
      .then((cats) => {
        setCategories(cats)
      })
      .catch((err) => {
        console.error('Failed to load categories', err)
      })

    brandService
      .getBrands({ per_page: 50, is_active: true }, { public: true })
      .then((res) => {
        setBrands(res.data || [])
      })
      .catch((err) => {
        console.error('Failed to load brands', err)
      })
  }, [])

  // Sync products when search params change
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)

    const params: any = {
      page: currentPage,
      per_page: 12,
      status: 'active',
    }

    if (currentSearch) params.search = currentSearch
    if (currentCategory) params.category_id = currentCategory
    if (currentBrand) params.brand = currentBrand
    if (currentType && currentType !== 'all') params.product_type = currentType
    if (minPrice) params.min_price = Number(minPrice)
    if (maxPrice) params.max_price = Number(maxPrice)
    if (currentSort) params.sort_by = currentSort
    if (currentSortDir) params.sort_direction = currentSortDir

    productService
      .getProducts(params, { signal: controller.signal, public: true })
      .then((res) => {
        setProducts(res.data)
        setTotalProducts(res.meta?.total || res.data.length)
        setTotalPages(res.meta?.last_page || 1)
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return
        }
        console.error('Failed to load products', err)
        setProducts([])
        setTotalProducts(0)
        setTotalPages(1)
        setLoadError(
          t(
            'We could not load the catalog. Please try again.',
            'មិនអាចទាញយកកាតាឡុកទំនិញបានទេ។ សូមសាកល្បងម្ដងទៀត។'
          )
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [searchParams, reloadKey])

  const updateParam = (key: string, value: string | null) => {
    const nextParams = new URLSearchParams(searchParams)
    if (value === null || value === '' || value === 'all') {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }
    // Reset to page 1 on filter changes except page itself
    if (key !== 'page') {
      nextParams.delete('page')
    }
    setSearchParams(nextParams)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParam('search', searchInput.trim() || null)
  }

  const handlePriceApply = () => {
    const nextParams = new URLSearchParams(searchParams)
    if (minPriceInput) nextParams.set('min_price', minPriceInput)
    else nextParams.delete('min_price')

    if (maxPriceInput) nextParams.set('max_price', maxPriceInput)
    else nextParams.delete('max_price')

    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleResetFilters = () => {
    setSearchInput('')
    setMinPriceInput('')
    setMaxPriceInput('')
    setSearchParams({})
  }

  const toggleCategoryExpand = (catId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }))
  }

  const hasActiveFilters = Boolean(
    currentCategory || currentSearch || (currentType && currentType !== 'all') || minPrice || maxPrice
  )

  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <SeoHead
        title="All Products | TYUSHOP Cambodia"
        description="Browse and search TYUSHOP's Cambodia marketplace for electronics, mobile phones, fashion, home, beauty and everyday products."
        path="/products"
      />
      {/* Page Title & Breadcrumb */}
      <div className="rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-card to-card px-5 py-6 shadow-sm sm:px-7">
        <div className="text-xs text-muted-foreground mb-2">
          <Link to="/" className="hover:underline">{t('Home', 'ទំព័រដើម')}</Link> /{' '}
          <span className="text-foreground font-medium">{t('Products Catalog', 'កាតាឡុកផលិតផល')}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{t('Marketplace Catalog', 'កាតាឡុកទំនិញ')}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                'Browse authentic products across our universal multi-category departments.',
                'ស្វែងរកផលិតផលសុទ្ធ ១០០% គ្រប់ផ្នែកទំនិញក្នុងតម្លៃសមរម្យ និងដឹកជញ្ជូនរហ័ស។'
              )}
            </p>
          </div>
          <div className="inline-flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="lg:hidden flex items-center gap-1.5 rounded-full text-xs font-semibold shadow-xs"
            >
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span>{isMobileFilterOpen ? t('Hide Filters', 'លាក់តម្រង') : t('Filter Products', 'តម្រងស្វែងរក')}</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
            <Badge variant="outline" className="text-xs py-1 px-3">
              {totalProducts} {t('Products Available', 'មុខទំនិញមានក្នុងស្តុក')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className={cn('space-y-6 lg:sticky lg:top-24 lg:self-start', isMobileFilterOpen ? 'block' : 'hidden lg:block')}>
          <div className="p-5 border rounded-2xl bg-card space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm font-bold flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" /> {t('Filter Results', 'តម្រងស្វែងរក')}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" /> {t('Reset', 'កំណត់ឡើងវិញ')}
                </button>
              )}
            </div>

            {/* Keyword Search */}
            <form onSubmit={handleSearchSubmit} className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('Search Catalog', 'ស្វែងរកទំនិញ')}
              </label>
              <div className="relative">
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t('Keyword, brand, title...', 'ពាក្យគន្លឹះ ម៉ាក ឬឈ្មោះទំនិញ...')}
                  className="h-9 text-xs pr-8"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Departments / Categories Tree */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('Departments', 'ប្រភេទទំនិញ')}
                </label>
                {currentCategory && (
                  <button
                    onClick={() => updateParam('category_id', null)}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {t('Clear', 'សម្អាត')}
                  </button>
                )}
              </div>

              <div className="space-y-1 max-h-72 overflow-y-auto pr-1 text-xs">
                <button
                  type="button"
                  onClick={() => updateParam('category_id', null)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                    !currentCategory
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <span>{t('All Departments', 'ប្រភេទទំនិញទាំងអស់')}</span>
                  {!currentCategory && <Check className="w-3.5 h-3.5" />}
                </button>

                {categories.map((cat) => {
                  const isSelected = currentCategory === cat.id.toString() || currentCategory === cat.slug
                  const hasChildren = cat.children && cat.children.length > 0
                  const isExpanded = expandedCategories[cat.id] || isSelected || cat.children?.some((c) => c.id.toString() === currentCategory || c.slug === currentCategory)

                  return (
                    <div key={cat.id} className="space-y-1">
                      <div
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'hover:bg-muted text-foreground'
                        }`}
                        onClick={() => updateParam('category_id', cat.id.toString())}
                      >
                        <span className="truncate pr-1">{cat.name}</span>
                        {hasChildren && (
                          <button
                            type="button"
                            onClick={(e) => toggleCategoryExpand(cat.id, e)}
                            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>

                      {hasChildren && isExpanded && (
                        <div className="pl-4 space-y-1 border-l ml-3 my-1">
                          {cat.children!.map((sub) => {
                            const isSubSelected = currentCategory === sub.id.toString() || currentCategory === sub.slug
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => updateParam('category_id', sub.id.toString())}
                                className={`w-full text-left px-2 py-1 rounded-md text-[11px] flex items-center justify-between transition-colors ${
                                  isSubSelected
                                    ? 'bg-primary/20 text-primary font-bold'
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <span className="truncate">{sub.name}</span>
                                {isSubSelected && <Check className="w-3 h-3" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Product Type Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('Product Type', 'ប្រភេទផលិតផល')}
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { label: t('All Types', 'ទាំងអស់'), value: 'all' },
                  { label: t('Simple', 'ទូទៅ'), value: 'simple' },
                  { label: t('Variable', 'មានជម្រើស'), value: 'variable' },
                  { label: t('Digital', 'ឌីជីថល'), value: 'digital' },
                ].map((pt) => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => updateParam('product_type', pt.value)}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-medium text-center transition-colors ${
                      currentType === pt.value
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'hover:bg-muted border-input'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('Price Range (USD)', 'ចន្លោះតម្លៃ (ដុល្លារ)')}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder={t('Min $', 'ទាបបំផុត $')}
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  min="0"
                  placeholder={t('Max $', 'ខ្ពស់បំផុត $')}
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePriceApply}
                className="w-full h-8 text-xs mt-1"
              >
                {t('Apply Price', 'អនុវត្តតម្លៃ')}
              </Button>
            </div>

            {/* Brand Filter */}
            {brands.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('Featured Brands', 'ម៉ាកយីហោល្បីៗ')}
                  </label>
                  {currentBrand && (
                    <button
                      type="button"
                      onClick={() => updateParam('brand', '')}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {t('Clear', 'សម្អាត')}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {brands.map((b) => {
                    const isSelected = currentBrand.toLowerCase() === b.name.toLowerCase()
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => updateParam('brand', isSelected ? '' : b.name)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                            : 'bg-background hover:bg-muted border-input text-foreground'
                        }`}
                      >
                        {b.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Catalog Main Panel */}
        <main className="lg:col-span-3 space-y-6">
          {/* Controls bar: Results Count & Sort Dropdown */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-card/80 p-4 text-xs shadow-sm backdrop-blur-sm sm:flex-row sm:items-center dark:border-slate-800/80">
            <div className="text-muted-foreground">
              {t('Showing', 'កំពុងបង្ហាញ')} <span className="font-bold text-foreground">{products.length}</span> {t('of', 'នៃ')}{' '}
              <span className="font-bold text-foreground">{totalProducts}</span> {t('items', 'មុខទំនិញ')}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium shrink-0">{t('Sort By:', 'តម្រៀបតាម៖')}</span>
              <select
                value={`${currentSort}:${currentSortDir}`}
                onChange={(e) => {
                  const [sortBy, sortDir] = e.target.value.split(':')
                  const nextParams = new URLSearchParams(searchParams)
                  nextParams.set('sort_by', sortBy)
                  nextParams.set('sort_direction', sortDir)
                  setSearchParams(nextParams)
                }}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="created_at:desc">{t('Newest Arrivals', 'ទំនិញថ្មីៗ')}</option>
                <option value="selling_price:asc">{t('Price: Low to High', 'តម្លៃ៖ ទាបទៅខ្ពស់')}</option>
                <option value="selling_price:desc">{t('Price: High to Low', 'តម្លៃ៖ ខ្ពស់ទៅទាប')}</option>
                <option value="name:asc">{t('Name: A to Z', 'ឈ្មោះ៖ A ទៅ Z')}</option>
                <option value="stock_quantity:desc">{t('Highest Stock', 'ស្តុកច្រើនជាងគេ')}</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="p-20 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm font-semibold">{t('Loading marketplace products...', 'កំពុងទាញយកទិន្នន័យផលិតផល...')}</p>
            </div>
          ) : loadError ? (
            <div className="p-12 sm:p-16 text-center border border-rose-200 dark:border-rose-900/60 rounded-3xl bg-rose-50/60 dark:bg-rose-950/20">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base">{t('Catalog temporarily unavailable', 'កាតាឡុកមិនអាចប្រើបានបណ្ដោះអាសន្ន')}</h3>
              <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">{loadError}</p>
              <Button size="sm" variant="outline" onClick={() => setReloadKey((key) => key + 1)} className="mt-5 rounded-xl text-xs font-semibold">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {t('Retry loading catalog', 'សាកល្បងទាញយកម្ដងទៀត')}
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-bold text-base">{t('No products found', 'រកមិនឃើញផលិតផលទេ')}</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {t(
                  'No catalog items matched your selected filters. Try widening your search or clearing active filters.',
                  'គ្មានទំនិញណាមួយត្រូវនឹងតម្រងដែលអ្នកបានជ្រើសរើសទេ។ សូមសាកល្បងសម្អាតតម្រង ឬស្វែងរកពាក្យផ្សេង។'
                )}
              </p>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="mt-4 text-xs font-semibold"
                >
                  {t('Clear All Filters', 'សម្អាតតម្រងទាំងអស់')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* Responsive numbered pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalProducts}
            perPage={12}
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
              updateParam('page', page.toString())
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="mt-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-card/80"
          />
        </main>
      </div>
    </div>
  )
}
