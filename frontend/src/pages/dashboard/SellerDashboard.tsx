import { useEffect, useMemo, useState } from 'react'
import {
  Store,
  DollarSign,
  Package,
  TrendingUp,
  PlusCircle,
  Clock,
  Tag,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { DashboardLayout, NavItem } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { sellerService, type SellerDashboardData } from '@/services/seller.service'

const sellerNav: NavItem[] = [
  { label: 'Store Overview', href: '/dashboard/seller', icon: Store },
  { label: 'Product Catalog', href: '/dashboard/seller/products', icon: Package },
  { label: 'Discount Coupons', href: '/dashboard/seller/coupons', icon: Tag, badge: 'Promos' },
  { label: 'Orders & Fulfillment', href: '/dashboard/seller', icon: Clock },
  { label: 'Revenue & Payouts', href: '/dashboard/seller', icon: DollarSign },
]

export function SellerDashboard() {
  const { toast } = useToast()
  const [dashboard, setDashboard] = useState<SellerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const user = authService.getStoredUser()

  const loadDashboard = async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    else setRefreshing(true)
    try {
      const response = await sellerService.getDashboard()
      setDashboard(response.data)
    } catch (error: any) {
      toast({
        title: 'Seller data unavailable',
        description: error?.message || 'The seller dashboard could not be loaded from the server.',
        type: 'error',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const storeName = dashboard?.store.name || user?.name || 'Your Store'
  const storeStatus = dashboard?.store.status || 'pending'
  const stats = dashboard?.stats
  const orders = dashboard?.orders ?? []
  const statusTone = useMemo(() => {
    if (storeStatus === 'approved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
    if (storeStatus === 'suspended' || storeStatus === 'rejected') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
  }, [storeStatus])

  return (
    <DashboardLayout
      roleTitle="Seller Merchant Hub"
      roleSlug="seller"
      roleColor="text-emerald-500"
      navItems={sellerNav}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight">{storeName}</h1>
              <Badge className={`text-[10px] capitalize ${statusTone}`}><ShieldCheck className="w-3 h-3 mr-1" />{storeStatus}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard?.application?.slug ? `Store slug: ${dashboard.application.slug}` : 'Your approved marketplace workspace and fulfillment queue.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadDashboard(false)} disabled={loading || refreshing} className="gap-1.5 rounded-lg text-xs font-semibold">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Link to="/dashboard/seller/coupons">
              <Button size="sm" variant="outline" className="gap-1.5 rounded-lg text-xs font-semibold border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Tag className="w-3.5 h-3.5" /> Manage Coupons
              </Button>
            </Link>
            <Link to="/admin/products/create">
              <Button size="sm" className="gap-1.5 rounded-lg text-xs font-semibold">
                <PlusCircle className="w-3.5 h-3.5" /> Add New Listing
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SellerMetric label="Gross Volume" value={loading ? '—' : `$${Number(stats?.gross_revenue || 0).toFixed(2)}`} icon={DollarSign} tone="emerald" />
          <SellerMetric label="Pending Orders" value={loading ? '—' : String(stats?.pending_orders ?? 0)} icon={Clock} tone="amber" />
          <SellerMetric label="Active Listings" value={loading ? '—' : String(stats?.active_listings ?? 0)} icon={Package} tone="blue" />
          <SellerMetric label="Payout Balance" value={loading ? '—' : `$${Number(stats?.payout_balance || 0).toFixed(2)}`} icon={TrendingUp} tone="indigo" />
        </div>

        {dashboard && stats?.total_listings === 0 && (
          <Card className="border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/10">
            <CardContent className="p-4 flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900 dark:text-emerald-200">Your seller workspace is ready</p>
                <p className="text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">Create your first listing to start receiving seller-scoped orders and revenue records.</p>
              </div>
              <Link className="ml-auto shrink-0 font-bold text-emerald-700 dark:text-emerald-300" to="/admin/products/create">Create listing →</Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Store Fulfillment Queue</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Only orders containing your owned products appear here.</p>
            </div>
            <Badge variant="outline" className="text-xs">{orders.length} visible</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}
            {!loading && orders.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No seller orders yet. Your first order will appear here after checkout.
              </div>
            )}
            {!loading && orders.map((order) => (
              <div key={order.id} className="p-3.5 rounded-xl border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">#{order.order_number}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{order.status.replaceAll('_', ' ')}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 truncate">{order.items?.map((item) => `${item.product_name} × ${item.quantity}`).join(', ') || 'Seller items'} · Buyer: {order.customer?.name || 'Customer'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-sm">${Number(order.items?.reduce((sum, item) => sum + Number(item.total_price || 0), 0) || 0).toFixed(2)}</span>
                  <Link to="/dashboard/delivery"><Button size="sm" variant="outline" className="h-7 text-xs">Track fulfillment</Button></Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

function SellerMetric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof DollarSign; tone: 'emerald' | 'amber' | 'blue' | 'indigo' }) {
  const colors = {
    emerald: 'text-emerald-600 bg-emerald-500/10',
    amber: 'text-amber-600 bg-amber-500/10',
    blue: 'text-blue-600 bg-blue-500/10',
    indigo: 'text-indigo-600 bg-indigo-500/10',
  }
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold mt-1">{value}</p></div>
        <div className={`p-2.5 rounded-lg ${colors[tone]}`}><Icon className="w-5 h-5" /></div>
      </CardContent>
    </Card>
  )
}
