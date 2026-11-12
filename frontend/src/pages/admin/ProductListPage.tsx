import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Archive,
  RefreshCw,
  AlertTriangle,
  ArrowUpDown,
  Boxes,
  Eye,
  CheckCircle2,
  Clock,
  ArchiveRestore,
  FolderTree,
  Layers,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { productService } from '@/services/product.service'
import { Pagination } from '@/components/common/Pagination'
import { StockAdjustmentDialog } from '@/components/admin/StockAdjustmentDialog'
import { ProductPriceDialog } from '@/components/admin/ProductPriceDialog'
import type { Product, ProductStatus } from '@/types/product.types'
import { DollarSign, Tag, Sparkles } from 'lucide-react'

export function ProductListPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Array<{ id: number; name: string; parent_name?: string | null }>>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [perPage, setPerPage] = useState<number>(15)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')
  const [appliedSearch, setAppliedSearch] = useState<string>('')
  const [reloadKey, setReloadKey] = useState<number>(0)
  const [actionProductId, setActionProductId] = useState<number | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null)

  // Quick Adjustment Dialog State
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null)
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState<boolean>(false)

  // Quick Price & Discount Dialog State
  const [pricingProduct, setPricingProduct] = useState<Product | null>(null)
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState<boolean>(false)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await productService.getProducts({
        page: currentPage,
        per_page: perPage,
        search: appliedSearch || undefined,
        status: statusFilter,
        category_id: categoryFilter || undefined,
        product_type: (typeFilter as any) || undefined,
        sort_by: sortBy as any,
        sort_direction: sortDirection,
      })
      setProducts(res.data)
      if (res.meta) {
        setTotalPages(res.meta.last_page)
        setTotalCount(res.meta.total)
      }
    } catch (err: any) {
      toast({
        title: 'Failed to load products',
        description: err?.message || 'Could not retrieve product list from API.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    productService
      .getCategories()
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [currentPage, perPage, statusFilter, categoryFilter, typeFilter, sortBy, sortDirection, appliedSearch, reloadKey])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedSearch(search.trim())
    setCurrentPage(1)
  }

  const handleArchive = (product: Product) => {
    setArchiveTarget(product)
  }

  const confirmArchive = async () => {
    if (!archiveTarget) return
    const product = archiveTarget
    try {
      setActionProductId(product.id)
      await productService.deleteProduct(product.id)
      toast({
        title: 'Product Deleted',
        description: `Product "${product.name}" was safely archived and removed from the active catalog.`,
        type: 'success',
      })
      await fetchProducts()
      setArchiveTarget(null)
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err?.message || 'Could not delete product.',
        type: 'error',
      })
    } finally {
      setActionProductId(null)
    }
  }

  const handleRestore = async (product: Product) => {
    setActionProductId(product.id)
    try {
      await productService.updateProduct(product.id, { status: 'active', is_active: true })
      toast({
        title: 'Product Restored',
        description: `Product "${product.name}" is active again.`,
        type: 'success',
      })
      await fetchProducts()
    } catch (err: any) {
      toast({
        title: 'Restore Failed',
        description: err?.message || 'Could not restore product.',
        type: 'error',
      })
    } finally {
      setActionProductId(null)
    }
  }

  // Summary Metrics
  const activeCount = products.filter((p) => p.status === 'active').length
  const lowStockCount = products.filter((p) => p.available_stock <= p.low_stock_threshold).length

  return (
    <DashboardLayout
      roleTitle="Product Management"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-purple-600" />
              Products Catalog
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage enterprise multi-vendor catalog, pricing tiers, and stock status.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <Link to="/admin/categories">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs text-purple-600 border-purple-500/30">
                <FolderTree className="w-4 h-4" />
                Categories & Taxonomy
              </Button>
            </Link>
            <Link to="/admin/inventory">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Boxes className="w-4 h-4" />
                Inventory Control
              </Button>
            </Link>
            <Link to="/admin/products/create">
              <Button size="sm" className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="w-4 h-4" />
                Add New Product
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Catalog Total</p>
                <p className="text-xl font-bold mt-1">{totalCount || products.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                <Package className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active in Storefront</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">{activeCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Low Stock Warnings</p>
                <p className="text-xl font-bold mt-1 text-amber-600">{lowStockCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Filter Selection</p>
                <p className="text-sm font-bold mt-1 uppercase text-muted-foreground">
                  {statusFilter}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <Filter className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col items-stretch justify-between gap-3 rounded-lg border bg-card p-3 md:flex-row md:items-center">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:max-w-xs relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search title, SKU, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </form>

          {/* Department Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full md:w-48"
          >
            <option value="">All Departments</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent_name ? `— ${c.name}` : c.name}
              </option>
            ))}
          </select>

          {/* Product Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full md:w-36"
          >
            <option value="">All Product Types</option>
            <option value="simple">Simple</option>
            <option value="variable">Variable</option>
            <option value="digital">Digital</option>
          </select>

          {/* Sort By Selector (Defaults to DESC / Newest First) */}
          <select
            value={`${sortBy}:${sortDirection}`}
            onChange={(e) => {
              const [sb, sd] = e.target.value.split(':')
              setSortBy(sb)
              setSortDirection(sd as any)
              setCurrentPage(1)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full md:w-44"
          >
            <option value="created_at:desc">Newest First (DESC)</option>
            <option value="created_at:asc">Oldest First (ASC)</option>
            <option value="selling_price:desc">Price: High to Low</option>
            <option value="selling_price:asc">Price: Low to High</option>
            <option value="stock_quantity:asc">Stock: Low to High</option>
            <option value="name:asc">Name: A to Z</option>
          </select>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex rounded-md border p-0.5 bg-muted/40 text-xs">
              {(['all', 'active', 'draft', 'archived'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status)
                    setCurrentPage(1)
                  }}
                  className={`px-2.5 py-1 rounded text-xs capitalize font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-background shadow-xs text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((key) => key + 1)}
              className="h-9 px-2.5 text-xs ml-auto"
              title="Refresh product list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Products Table */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="dashboard-table-scroll">
            <table className="dashboard-data-table min-w-[1320px] w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="w-12 whitespace-nowrap p-3">#</th>
                  <th className="whitespace-nowrap p-3">Product Name & SKU</th>
                  <th className="whitespace-nowrap p-3">Type & Brand</th>
                  <th className="whitespace-nowrap p-3">Department</th>
                  <th className="whitespace-nowrap p-3">Selling Price</th>
                  <th className="whitespace-nowrap p-3">Cost Price</th>
                  <th className="whitespace-nowrap p-3 text-center">Available Stock</th>
                  <th className="whitespace-nowrap p-3">Status</th>
                  <th className="whitespace-nowrap p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading product catalog...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No products found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isLow = p.available_stock <= p.low_stock_threshold
                    return (
                      <tr key={p.id} className="align-top transition-colors hover:bg-muted/30">
                        <td className="p-3 font-mono text-muted-foreground">{p.id}</td>
                        <td className="min-w-[280px] p-3">
                          <div className="flex items-center gap-3">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-9 h-9 rounded object-cover border bg-muted"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded bg-muted flex items-center justify-center text-muted-foreground font-bold">
                                {p.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="max-w-[22rem] font-bold leading-snug text-foreground hover:underline line-clamp-2">
                                <Link to={`/admin/products/${p.id}/edit`}>{p.name}</Link>
                              </div>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {p.sku}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <Badge
                              variant={p.product_type === 'variable' ? 'default' : 'secondary'}
                              className="text-[9px] py-0 px-1 capitalize"
                            >
                              {p.product_type ?? 'simple'}
                            </Badge>
                            {p.brand && (
                              <div className="text-[10px] text-muted-foreground font-semibold">
                                {p.brand}
                              </div>
                            )}
                            {p.variants && p.variants.length > 0 && (
                              <span className="text-[9px] text-purple-600 font-bold block">
                                {p.variants.length} SKUs
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {p.category ? (
                            <div>
                              <Badge variant="outline" className="text-[10px]">
                                {p.category.name}
                              </Badge>
                              {p.category.parent_name && (
                                <span className="text-[10px] text-muted-foreground block mt-0.5">
                                  {p.category.parent_name}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Uncategorized</span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => {
                              setPricingProduct(p)
                              setIsPriceDialogOpen(true)
                            }}
                            className="text-left group/price hover:opacity-80 transition-opacity cursor-pointer"
                            title="Click to manage price, discounts, and customer offer"
                          >
                            {p.discount_price !== null && p.discount_price !== undefined && Number(p.discount_price) > 0 && Number(p.discount_price) < Number(p.selling_price) ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                    ${Number(p.discount_price).toFixed(2)}
                                  </span>
                                  <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[9px] py-0 px-1 font-bold">
                                    -{Math.round((1 - Number(p.discount_price) / Number(p.selling_price)) * 100)}%
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-muted-foreground line-through font-mono">
                                  ${Number(p.selling_price).toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <div className="font-bold text-foreground flex items-center gap-1">
                                <span>${Number(p.selling_price).toFixed(2)}</span>
                                <DollarSign className="w-3 h-3 text-muted-foreground opacity-0 group-hover/price:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-muted-foreground font-mono">
                          {p.cost_price !== null && p.cost_price !== undefined ? (
                            `$${Number(p.cost_price).toFixed(2)}`
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Restricted</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5 font-bold font-mono">
                            <span className={isLow ? 'text-amber-600' : 'text-emerald-600'}>
                              {p.available_stock}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              / {p.quantity_on_hand} on-hand
                            </span>
                            {isLow && (
                              <Badge variant="destructive" className="text-[9px] py-0 px-1 ml-1">
                                Low
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {p.status === 'active' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 text-[10px]">
                              Active
                            </Badge>
                          ) : p.status === 'archived' ? (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              Archived
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Draft
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Manage Price & Discounts Shortcut */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                              title="Manage Price & Customer Discounts"
                              onClick={() => {
                                setPricingProduct(p)
                                setIsPriceDialogOpen(true)
                              }}
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </Button>

                            {/* Stock Adjust Shortcut */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                              title="Quick Stock Adjustment"
                              onClick={() => {
                                setAdjustingProduct(p)
                                setIsAdjustDialogOpen(true)
                              }}
                            >
                              <Boxes className="w-3.5 h-3.5" />
                            </Button>

                            {/* Edit */}
                            <Link to={`/admin/products/${p.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                title="Edit Product Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </Link>

                            {/* Safe delete: DELETE archives the record so it can be restored. */}
                            {p.status !== 'archived' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionProductId === p.id}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                                title="Delete Product (safe archive)"
                                onClick={() => handleArchive(p)}
                              >
                                {actionProductId === p.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Archive className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionProductId === p.id}
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                                title="Restore Product"
                                onClick={() => handleRestore(p)}
                              >
                                {actionProductId === p.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ArchiveRestore className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            perPage={perPage}
            onPageChange={(p) => setCurrentPage(p)}
            onPerPageChange={(newPerPage) => {
              setPerPage(newPerPage)
              setCurrentPage(1)
            }}
            itemName="products"
          />
        </div>
      </div>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        isOpen={isAdjustDialogOpen}
        onClose={() => {
          setIsAdjustDialogOpen(false)
          setAdjustingProduct(null)
        }}
        product={adjustingProduct}
        onSuccess={() => {
          fetchProducts()
        }}
      />

      {/* Quick Price & Customer Promotion Dialog */}
      <ProductPriceDialog
        isOpen={isPriceDialogOpen}
        onClose={() => {
          setIsPriceDialogOpen(false)
          setPricingProduct(null)
        }}
        product={pricingProduct}
        onSuccess={(updated) => {
          setProducts((prev) =>
            prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          )
          fetchProducts()
        }}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive product?"
        description={archiveTarget
          ? `Archive "${archiveTarget.name}"? It will be hidden from the storefront catalog and can be restored later.`
          : ''}
        confirmLabel="Archive product"
        onConfirm={confirmArchive}
      />
    </DashboardLayout>
  )
}

