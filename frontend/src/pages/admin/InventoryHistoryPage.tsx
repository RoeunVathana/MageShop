import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  History,
  ArrowLeft,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  User,
  FileText,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { inventoryService } from '@/services/inventory.service'
import { productService } from '@/services/product.service'
import { Pagination } from '@/components/common/Pagination'
import type { InventoryMovement } from '@/types/inventory.types'
import type { Product } from '@/types/product.types'

export function InventoryHistoryPage() {
  const { productId } = useParams<{ productId: string }>()
  const { toast } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [perPage, setPerPage] = useState<number>(20)

  const fetchHistory = async () => {
    if (!productId) return
    setLoading(true)
    try {
      const [prodRes, moveRes] = await Promise.all([
        productService.getProduct(productId),
        inventoryService.getMovements(productId, { page: currentPage, per_page: perPage }),
      ])
      setProduct(prodRes)
      setMovements(moveRes.data)
      if (moveRes.meta) {
        setTotalPages(moveRes.meta.last_page)
        setTotalCount(moveRes.meta.total)
      }
    } catch (err: any) {
      toast({
        title: 'Failed to load history',
        description: err?.message || 'Could not retrieve inventory movements.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [productId, currentPage, perPage])

  const getMovementBadge = (type: string) => {
    const upper = type.toUpperCase()
    switch (upper) {
      case 'STOCK_IN':
      case 'RETURN':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1">
            <ArrowUpRight className="w-3 h-3" />
            {upper}
          </Badge>
        )
      case 'STOCK_OUT':
      case 'DAMAGE':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] gap-1">
            <ArrowDownRight className="w-3 h-3" />
            {upper}
          </Badge>
        )
      case 'RESERVE':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">
            RESERVED
          </Badge>
        )
      case 'RELEASE':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-500/30 text-[10px]">
            RELEASED
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-[10px]">
            {upper}
          </Badge>
        )
    }
  }

  return (
    <DashboardLayout
      roleTitle="Inventory History"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/admin/inventory">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-600" />
                  Inventory Audit Ledger
                </h1>
                {product && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {product.sku}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {product ? product.name : 'Immutable transaction movements and cycle counts.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              className="h-8 px-2.5 text-xs"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Current State Summary Card */}
        {product && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Current On Hand</p>
                  <p className="text-xl font-bold mt-1">{product.quantity_on_hand} units</p>
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
                  <p className="text-xl font-bold mt-1 text-amber-600">
                    {product.quantity_reserved} units
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <FileText className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Available to Sell</p>
                  <p className="text-xl font-bold mt-1 text-emerald-600">
                    {product.available_stock} units
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Ledger Events</p>
                  <p className="text-xl font-bold mt-1">{totalCount || movements.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                  <History className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Movements Table */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="dashboard-table-scroll">
            <table className="dashboard-data-table w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 w-12">#</th>
                  <th className="p-3">Timestamp (UTC)</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-center">Change</th>
                  <th className="p-3 text-center">Balance</th>
                  <th className="p-3">Reason & Context</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Initiated By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading movement logs...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No inventory movement records for this product yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isPositive = m.quantity_change > 0
                    return (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-muted-foreground">{m.id}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString()}
                        </td>
                        <td className="p-3">{getMovementBadge(m.movement_type)}</td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span
                            className={
                              isPositive
                                ? 'text-emerald-600'
                                : m.quantity_change === 0
                                  ? 'text-muted-foreground'
                                  : 'text-rose-600'
                            }
                          >
                            {isPositive ? `+${m.quantity_change}` : m.quantity_change}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-xs">
                          <span className="text-muted-foreground">{m.before_quantity}</span>
                          <span className="mx-1 text-muted-foreground/60">&rarr;</span>
                          <span className="font-bold">{m.after_quantity}</span>
                        </td>
                        <td className="p-3 max-w-xs truncate text-foreground" title={m.reason}>
                          {m.reason}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {m.reference ? (
                            <Badge variant="outline" className="text-[10px]">
                              {m.reference}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span>{m.creator_name}</span>
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
            perPageOptions={[10, 20, 50, 100]}
            itemName="audit movements"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

