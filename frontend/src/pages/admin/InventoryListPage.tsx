import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Boxes,
  Search,
  Filter,
  History,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowUpDown,
  Lock,
  CheckCircle2,
  Package,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { inventoryService } from '@/services/inventory.service'
import { productService } from '@/services/product.service'
import { Pagination } from '@/components/common/Pagination'
import { StockAdjustmentDialog } from '@/components/admin/StockAdjustmentDialog'
import type { Product } from '@/types/product.types'

export function InventoryListPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [perPage, setPerPage] = useState<number>(15)
  const [sortBy, setSortBy] = useState<string>('id')
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')
  const [appliedSearch, setAppliedSearch] = useState<string>('')
  const [reloadKey, setReloadKey] = useState<number>(0)

  // Stock Adjustment Dialog
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const res = await inventoryService.getInventory({
        page: currentPage,
        per_page: perPage,
        search: appliedSearch || undefined,
        low_stock: lowStockOnly ? 'true' : undefined,
        sort_by: sortBy as any,
        sort_direction: sortDirection,
      })
      if (res) {
        setItems(res.data)
        if (res.meta) {
          setTotalPages(res.meta.last_page)
          setTotalCount(res.meta.total)
        }
        // An empty inventory page is a valid result. Do not issue a second
        // full catalog request; that doubled backend latency and could show
        // products without their inventory fields.
        return
      }
    } catch {
      // Graceful fallback to products catalog if inventory service is temporarily restricted
      try {
        const prodRes = await productService.getProducts({
          page: currentPage,
          per_page: perPage,
          search: appliedSearch || undefined,
          sort_by: sortBy as any,
          sort_direction: sortDirection,
        })
        if (prodRes?.data) {
          setItems(prodRes.data)
          if (prodRes.meta) {
            setTotalPages(prodRes.meta.last_page)
            setTotalCount(prodRes.meta.total)
          }
          return
        }
      } catch (err: any) {
        toast({
          title: 'Failed to load inventory',
          description: err?.message || 'Could not fetch stock levels from backend.',
          type: 'error',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [currentPage, perPage, lowStockOnly, sortBy, sortDirection, appliedSearch, reloadKey])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedSearch(search.trim())
    setCurrentPage(1)
  }

  // Summary Metrics calculations
  const totalOnHand = items.reduce((acc, item) => acc + (item.quantity_on_hand ?? 0), 0)
  const totalReserved = items.reduce((acc, item) => acc + (item.quantity_reserved ?? 0), 0)
  const totalAvailable = items.reduce((acc, item) => acc + (item.available_stock ?? 0), 0)
  const lowStockCount = items.filter(
    (item) => (item.available_stock ?? 0) <= (item.low_stock_threshold ?? 5)
  ).length

  return (
    <DashboardLayout
      roleTitle="Inventory Control"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Boxes className="w-6 h-6 text-purple-600" />
              Inventory & Stock Control
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              15-step audited stock adjustments, reserved allocations, and real-time inventory tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/products">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Package className="w-4 h-4" />
                Products Catalog
              </Button>
            </Link>
          </div>
        </div>

        {/* Inventory Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Stock On Hand</p>
                <p className="text-xl font-bold mt-1">{totalOnHand} units</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <Boxes className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Reserved in Orders</p>
                <p className="text-xl font-bold mt-1 text-amber-600">{totalReserved} units</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <Lock className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Available to Sell</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">{totalAvailable} units</p>
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
                <p className="text-xl font-bold mt-1 text-rose-600">{lowStockCount} items</p>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full sm:max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by SKU or item title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Sort Selector (Defaults to DESC / Newest First) */}
            <select
              value={`${sortBy}:${sortDirection}`}
              onChange={(e) => {
                const [sb, sd] = e.target.value.split(':')
                setSortBy(sb)
                setSortDirection(sd as any)
                setCurrentPage(1)
              }}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="id:desc">Newest First (DESC)</option>
              <option value="id:asc">Oldest First (ASC)</option>
              <option value="stock_quantity:asc">Stock: Low to High</option>
              <option value="stock_quantity:desc">Stock: High to Low</option>
              <option value="name:asc">Item Name (A - Z)</option>
            </select>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground select-none">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => {
                  setLowStockOnly(e.target.checked)
                  setCurrentPage(1)
                }}
                className="rounded border-input text-primary focus:ring-ring w-4 h-4"
              />
              <span>Show Low Stock Only</span>
            </label>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((key) => key + 1)}
              className="h-9 px-2.5 text-xs ml-auto"
              title="Refresh inventory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="dashboard-table-scroll">
            <table className="dashboard-data-table w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 w-12">#</th>
                  <th className="p-3">Product Name & SKU</th>
                  <th className="p-3 text-center">On Hand</th>
                  <th className="p-3 text-center">Reserved</th>
                  <th className="p-3 text-center">Available</th>
                  <th className="p-3 text-center">Threshold</th>
                  <th className="p-3">Health Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading inventory levels...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No inventory records found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isLow = (item.available_stock ?? 0) <= (item.low_stock_threshold ?? 5)
                    const isOut = (item.available_stock ?? 0) <= 0

                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-muted-foreground">{item.id}</td>
                        <td className="p-3">
                          <div className="font-bold text-foreground">{item.name}</div>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {item.sku}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          {item.quantity_on_hand}
                        </td>
                        <td className="p-3 text-center font-mono text-amber-600 font-bold">
                          {item.quantity_reserved}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-sm">
                          <span
                            className={
                              isOut
                                ? 'text-destructive'
                                : isLow
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                            }
                          >
                            {item.available_stock}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-muted-foreground">
                          {item.low_stock_threshold}
                        </td>
                        <td className="p-3">
                          {isOut ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Out of Stock
                            </Badge>
                          ) : isLow ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                              Low Stock Warning
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              Optimal Stock
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-[11px] gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => {
                                setSelectedProduct(item)
                                setIsDialogOpen(true)
                              }}
                            >
                              <RefreshCw className="w-3 h-3" />
                              Adjust Stock
                            </Button>
                            <Link to={`/admin/inventory/${item.id}/history`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] gap-1"
                                title="View Movement Audit Logs"
                              >
                                <History className="w-3 h-3" />
                                Audit Log
                              </Button>
                            </Link>
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
            perPageOptions={[10, 15, 25, 50]}
            itemName="inventory records"
          />
        </div>
      </div>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setSelectedProduct(null)
        }}
        product={selectedProduct}
        onSuccess={() => {
          setReloadKey((key) => key + 1)
        }}
      />
    </DashboardLayout>
  )
}

