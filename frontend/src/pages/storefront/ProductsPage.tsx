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
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { brandService } from '@/services/brand.service'
import type { Product, ProductType } from '@/types/product.types'
import type { Category } from '@/types/category.types'
import type { Brand } from '@/types/brand.types'

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const { addToCart, toggleFavorite, isFavorite } = useShopEngagement()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState<boolean>(true)
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

  // Load category tree & brands on mount
  useEffect(() => {
    categoryService
      .getCategories({ tree: true })
      .then((cats) => {
        setCategories(cats)
      })
      .catch((err) => {
        console.error('Failed to load categories', err)
      })

    brandService
      .getBrands({ per_page: 50, is_active: true })
      .then((res) => {
        setBrands(res.data || [])
      })
      .catch((err) => {
        console.error('Failed to load brands', err)
      })
  }, [])

  // Sync products when search params change
  useEffect(() => {
    setLoading(true)

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
      .getProducts(params)
      .then((res) => {
        setProducts(res.data)
        setTotalProducts(res.meta?.total || res.data.length)
        setTotalPages(res.meta?.last_page || 1)
      })
      .catch((err) => {
        console.error('Failed to load products', err)
        setProducts([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [searchParams])

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
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
      {/* Page Title & Breadcrumb */}
      <div className="border-b pb-6">
        <div className="text-xs text-muted-foreground mb-2">
          <Link to="/" className="hover:underline">Home</Link> /{' '}
          <span className="text-foreground font-medium">Products Catalog</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Marketplace Catalog</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Browse authentic products across our universal multi-category departments.
            </p>
          </div>
          <div className="inline-flex items-center gap-2">
            <Badge variant="outline" className="text-xs py-1 px-3">
              {totalProducts} Products Available
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="space-y-6">
          <div className="p-5 border rounded-2xl bg-card space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm font-bold flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" /> Filter Results
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            {/* Keyword Search */}
            <form onSubmit={handleSearchSubmit} className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Search Catalog
              </label>
              <div className="relative">
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Keyword, brand, title..."
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
                  Departments
                </label>
                {currentCategory && (
                  <button
                    onClick={() => updateParam('category_id', null)}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
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
                  <span>All Departments</span>
                  {!currentCategory && <Check className="w-3.5 h-3.5" />}
                </button>

                {categories.map((cat) => {
                  const isSelected = currentCategory === cat.id.toString()
                  const hasChildren = cat.children && cat.children.length > 0
                  const isExpanded = expandedCategories[cat.id] || isSelected || cat.children?.some((c) => c.id.toString() === currentCategory)

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
                            const isSubSelected = currentCategory === sub.id.toString()
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
                Product Type
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { label: 'All Types', value: 'all' },
                  { label: 'Simple', value: 'simple' },
                  { label: 'Variable', value: 'variable' },
                  { label: 'Digital', value: 'digital' },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => updateParam('product_type', t.value)}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-medium text-center transition-colors ${
                      currentType === t.value
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'hover:bg-muted border-input'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Price Range (USD)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Min $"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="Max $"
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
                Apply Price
              </Button>
            </div>

            {/* Brand Filter */}
            {brands.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Featured Brands
                  </label>
                  {currentBrand && (
                    <button
                      type="button"
                      onClick={() => updateParam('brand', '')}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Clear
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-2xl bg-card shadow-sm text-xs">
            <div className="text-muted-foreground">
              Showing <span className="font-bold text-foreground">{products.length}</span> of{' '}
              <span className="font-bold text-foreground">{totalProducts}</span> items
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium shrink-0">Sort By:</span>
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
                <option value="created_at:desc">Newest Arrivals</option>
                <option value="selling_price:asc">Price: Low to High</option>
                <option value="selling_price:desc">Price: High to Low</option>
                <option value="name:asc">Name: A to Z</option>
                <option value="stock_quantity:desc">Highest Stock</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="p-20 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm font-semibold">Loading marketplace products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-bold text-base">No products found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No catalog items matched your selected filters. Try widening your search or clearing active filters.
              </p>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="mt-4 text-xs"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => {
                const isOutOfStock = p.stock_quantity <= 0
                const isVariable = p.product_type === 'variable'
                const isDigital = p.product_type === 'digital'

                return (
                  <Card
                    key={p.id}
                    className="group border hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {/* Product Media */}
                      <Link to={`/products/${p.slug || p.id}`} className="block relative aspect-square bg-muted/30 overflow-hidden">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ShoppingBag className="w-12 h-12 opacity-30" />
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                          {p.category && (
                            <Badge className="bg-background/90 text-foreground text-[10px] backdrop-blur font-medium shadow-xs">
                              {p.category.name}
                            </Badge>
                          )}
                          {(p.discount_price ? p.discount_price <= 30 : p.selling_price <= 30) && (
                            <Badge className="bg-emerald-600/95 text-white text-[10px] backdrop-blur font-semibold gap-1">
                              <Gift className="w-3 h-3" /> 100-Pt Free Eligible
                            </Badge>
                          )}
                          {isVariable && (
                            <Badge className="bg-purple-600/90 text-white text-[10px] backdrop-blur font-medium">
                              Options Available
                            </Badge>
                          )}
                          {isDigital && (
                            <Badge className="bg-blue-600/90 text-white text-[10px] backdrop-blur font-medium">
                              Digital Product
                            </Badge>
                          )}
                        </div>

                        {/* Heart Favorite Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const effPrice = p.discount_price && p.discount_price > 0 ? p.discount_price : p.selling_price
                            const liked = toggleFavorite({
                              id: p.id,
                              slug: p.slug || String(p.id),
                              name: p.name,
                              price: effPrice,
                              originalPrice: p.discount_price ? p.selling_price : undefined,
                              image: p.image_url || '',
                              vendor: p.brand || 'MegaCommerce Official',
                            })
                            toast({
                              title: liked ? '❤️ Added to Favorites!' : 'Removed from Favorites',
                              description: p.name,
                              type: liked ? 'success' : 'info',
                            })
                          }}
                          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:scale-110 transition-transform shadow-sm cursor-pointer"
                          title="Like / Save to Favorites"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              isFavorite(p.id) ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground'
                            }`}
                          />
                        </button>

                        {/* Stock status overlay badge */}
                        <div className="absolute bottom-2.5 right-2.5">
                          {isOutOfStock ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Out of Stock
                            </Badge>
                          ) : p.stock_quantity <= p.low_stock_threshold ? (
                            <Badge className="bg-amber-500 text-white text-[10px]">
                              Only {p.stock_quantity} left
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              In Stock
                            </Badge>
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <CardContent className="p-4 space-y-2">
                        {p.brand && (
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {p.brand}
                          </div>
                        )}

                        <Link
                          to={`/products/${p.slug || p.id}`}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-2 block leading-snug"
                        >
                          {p.name}
                        </Link>

                        <div className="flex items-baseline gap-2 pt-1">
                          <span className="text-lg font-black text-foreground">
                            ${p.selling_price.toFixed(2)}
                          </span>
                          {p.discount_price && (
                            <span className="text-xs text-muted-foreground line-through">
                              ${p.discount_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </div>

                    {/* Card Footer Action */}
                    <div className="p-4 pt-0 flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={isOutOfStock}
                        onClick={() => {
                          const effPrice = p.discount_price && p.discount_price > 0 ? p.discount_price : p.selling_price
                          addToCart({
                            id: p.id,
                            slug: p.slug || String(p.id),
                            name: p.name,
                            price: effPrice,
                            originalPrice: p.discount_price ? p.selling_price : undefined,
                            image: p.image_url || '',
                            vendor: p.brand || 'MegaCommerce Official',
                          })
                          toast({
                            title: '🛒 Added to Cart!',
                            description: `${p.name} added to your shopping cart (+5 Loyalty Pts on checkout).`,
                            type: 'success',
                          })
                        }}
                        className="flex-1 text-xs font-semibold gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Add to Cart
                      </Button>
                      <Link to={`/products/${p.slug || p.id}`}>
                        <Button variant="outline" size="sm" className="text-xs font-semibold px-2.5" title="View Details">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => updateParam('page', (currentPage - 1).toString())}
                className="text-xs"
              >
                Previous
              </Button>
              <div className="text-xs font-semibold text-muted-foreground px-3">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => updateParam('page', (currentPage + 1).toString())}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
