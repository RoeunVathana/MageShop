import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  HelpCircle,
  Clock,
  UserCheck,
  MapPin,
  Users,
  Package,
  Truck,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react'
import { DashboardLayout, NavItem } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { staffService, type StaffOverview } from '@/services/staff.service'
import { useShopEngagement } from '@/context/ShopEngagementContext'

const baseStaffNav: NavItem[] = [
  { label: 'Work Queue', labelKm: 'បញ្ជីការងារ', href: '/dashboard/staff', icon: Layers },
  { label: 'Driver Dispatch', labelKm: 'បញ្ជូនអ្នកដឹកជញ្ជូន', href: '/dashboard/delivery', icon: MapPin, badge: 'Live GPS', badgeKm: 'GPS ផ្ទាល់' },
  { label: 'Order Operations', labelKm: 'ប្រតិបត្តិការបញ្ជាទិញ', href: '/dashboard/admin/orders', icon: Package },
]

const number = (value: number | undefined) => (value ?? 0).toLocaleString()

export function StaffDashboard() {
  const { toast } = useToast()
  const { t } = useShopEngagement()
  const [overview, setOverview] = useState<StaffOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  const isAdmin = authService.isAdmin()

  const navItems = useMemo(() => {
    if (!isAdmin) return baseStaffNav
    return [...baseStaffNav, { label: 'Team Directory', labelKm: 'បញ្ជីសមាជិកក្រុម', href: '/dashboard/admin/users', icon: Users }]
  }, [isAdmin])

  const loadOverview = async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    else setRefreshing(true)
    try {
      const response = await staffService.getOverview()
      setOverview(response.data)
    } catch (error: any) {
      toast({
        title: 'Operations data unavailable',
        description: error?.message || 'The staff queue could not be loaded from the server.',
        type: 'error',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [])

  const getNextAction = (status: string) => {
    if (status === 'pending' || status === 'confirmed') return { status: 'processing', label: 'Start processing' }
    if (status === 'processing') return { status: 'shipped', label: 'Ready for dispatch' }
    return null
  }

  const handleAdvanceOrder = async (orderNumber: string, status: string) => {
    setUpdatingOrder(orderNumber)
    try {
      await staffService.updateOrderStatus(orderNumber, status)
      setOverview((previous) => previous ? {
        ...previous,
        queue: previous.queue.map((order) => order.order_number === orderNumber ? { ...order, status } : order),
        stats: {
          ...previous.stats,
          pending_orders: status === 'processing'
            ? Math.max(0, previous.stats.pending_orders - 1)
            : previous.stats.pending_orders,
          processing_orders: status === 'processing'
            ? previous.stats.processing_orders + 1
            : status === 'shipped'
            ? Math.max(0, previous.stats.processing_orders - 1)
            : previous.stats.processing_orders,
        },
      } : previous)
      toast({
        title: 'Order workflow updated',
        description: `Order #${orderNumber} is now ${status.replaceAll('_', ' ')}.`,
        type: 'success',
      })
    } catch (error: any) {
      toast({
        title: 'Could not update order',
        description: error?.message || 'The server rejected this workflow step.',
        type: 'error',
      })
    } finally {
      setUpdatingOrder(null)
    }
  }

  const stats = overview?.stats
  const queue = overview?.queue ?? []

  return (
    <DashboardLayout
      roleTitle="Staff Operations Desk"
      roleTitleKm="ផ្ទាំងប្រតិបត្តិការបុគ្គលិក"
      roleSlug="staff"
      roleColor="text-indigo-600 dark:text-indigo-400"
      navItems={navItems}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('Support, Catalog & Location Operations', 'ប្រតិបត្តិការជំនួយ បញ្ជីទំនិញ & ទីតាំង')}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('Process orders, monitor support, and dispatch assigned deliveries from one live operations queue.', 'ដំណើរការបញ្ជាទិញ តាមដានជំនួយ និងបញ្ជូនការដឹកជញ្ជូនដែលបានចាត់តាំងពីបញ្ជីប្រតិបត្តិការផ្ទាល់តែមួយ។')}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <Link to="/dashboard/admin/users">
                <Button variant="outline" className="rounded-xl h-9 text-xs font-bold gap-2">
                  <Users className="w-4 h-4 text-indigo-600" /> {t('Team Directory', 'បញ្ជីសមាជិកក្រុម')}
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              onClick={() => loadOverview(false)}
              disabled={loading || refreshing}
              className="rounded-xl h-9 text-xs font-bold gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> {t('Refresh', 'ផ្ទុកឡើងវិញ')}
            </Button>
            <Link to="/dashboard/delivery">
              <Button className="rounded-xl h-9 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                <MapPin className="w-4 h-4" /> {t('Open Driver Dispatch', 'បើកការបញ្ជូនអ្នកដឹកជញ្ជូន')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label={t('Pending Orders', 'ការបញ្ជាទិញរង់ចាំ')} value={loading ? '—' : number(stats?.pending_orders)} icon={Clock} tone="amber" />
          <MetricCard label={t('In Fulfillment', 'កំពុងរៀបចំ')} value={loading ? '—' : number(stats?.processing_orders)} icon={Package} tone="indigo" />
          <MetricCard label={t('Open Tickets', 'សំបុត្របើក')} value={loading ? '—' : number(stats?.open_tickets)} icon={HelpCircle} tone="rose" />
          <MetricCard label={t('Delivered Today', 'បានដឹកជញ្ជូនថ្ងៃនេះ')} value={loading ? '—' : number(stats?.delivered_today)} icon={UserCheck} tone="emerald" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">{t('Live Operations Queue', 'បញ្ជីប្រតិបត្តិការផ្ទាល់')}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t('Orders waiting for fulfillment or courier action.', 'ការបញ្ជាទិញដែលកំពុងរង់ចាំរៀបចំ ឬសកម្មភាពអ្នកដឹកជញ្ជូន។')}</p>
              </div>
              <Badge variant="outline" className="text-xs">{queue.length} visible</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && <QueuePlaceholder />}
              {!loading && queue.length === 0 && (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  {t('No open orders in the operations queue.', 'មិនមានការបញ្ជាទិញបើកក្នុងបញ្ជីប្រតិបត្តិការទេ។')}
                </div>
              )}
              {!loading && queue.map((order) => (
                <div key={order.id} className="p-3.5 rounded-xl border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">#{order.order_number}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{order.status.replaceAll('_', ' ')}</Badge>
                      {order.driver && <Badge className="text-[10px] bg-emerald-600 text-white">{order.driver.name}</Badge>}
                    </div>
                    <p className="font-medium text-foreground mt-1 truncate">{order.customer_name || 'Customer'} · {order.items?.[0]?.product_name || 'Order items'}</p>
                    <p className="text-muted-foreground">{order.items?.length || 0} item type(s) · {order.payment_status || 'payment pending'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-sm">${Number(order.total_amount || 0).toFixed(2)}</span>
                    {getNextAction(order.status) && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceOrder(order.order_number, getNextAction(order.status)!.status)}
                        disabled={updatingOrder === order.order_number}
                        className="h-7 text-xs gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {updatingOrder === order.order_number ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        {getNextAction(order.status)!.label === 'Start processing' ? t('Start processing', 'ចាប់ផ្តើមរៀបចំ') : t('Ready for dispatch', 'ត្រៀមបញ្ជូន')}
                      </Button>
                    )}
                    <Link to="/dashboard/delivery">
                      <Button size="sm" variant="outline" className="h-7 text-xs">{t('Open dispatch', 'បើកការបញ្ជូន')}</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">{t('Delivery Team', 'ក្រុមដឹកជញ្ជូន')}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t('Active drivers and their current workload.', 'អ្នកដឹកជញ្ជូនសកម្ម និងបន្ទុកការងារបច្ចុប្បន្នរបស់ពួកគេ។')}</p>
              </div>
              <Truck className="w-5 h-5 text-indigo-500" />
            </CardHeader>
            <CardContent className="space-y-3">
              {!loading && (overview?.drivers ?? []).length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t('No active delivery driver has been created yet.', 'មិនទាន់មានអ្នកដឹកជញ្ជូនសកម្មត្រូវបានបង្កើតទេ។')}
                </div>
              )}
              {(overview?.drivers ?? []).map((driver) => (
                <div key={driver.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{driver.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{driver.phone_number || driver.email}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {driver.assigned_orders_count} {t('active', 'សកម្ម')}
                  </Badge>
                </div>
              ))}
              <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-700 dark:text-indigo-300">
                  <p className="font-semibold">{t('Low stock', 'ស្តុកជិតអស់')}</p>
                  <p className="text-lg font-black mt-1">{loading ? '—' : number(stats?.low_stock_products)}</p>
                </div>
                <div className="rounded-xl bg-purple-500/10 p-3 text-purple-700 dark:text-purple-300">
                  <p className="font-semibold">{t('Seller reviews', 'ពិនិត្យអ្នកលក់')}</p>
                  <p className="text-lg font-black mt-1">{loading ? '—' : number(stats?.pending_seller_applications)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-amber-200/70 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/10">
          <CardContent className="p-4 flex items-start gap-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-200">{t('Operational ownership is now enforced', 'ការគ្រប់គ្រងការងារត្រូវបានអនុវត្តរួចរាល់')}</p>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">{t('Dispatchers assign an order to a driver, drivers only see their assignments, and customers only see their own orders.', 'អ្នកបញ្ជូនចាត់តាំងការបញ្ជាទិញទៅអ្នកដឹកជញ្ជូន អ្នកដឹកជញ្ជូនឃើញតែការងាររបស់ខ្លួន និងអតិថិជនឃើញតែការបញ្ជាទិញរបស់ខ្លួន។')}</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-amber-600 ml-auto shrink-0" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Clock; tone: 'amber' | 'indigo' | 'rose' | 'emerald' }) {
  const colors = {
    amber: 'text-amber-600 bg-amber-500/10',
    indigo: 'text-indigo-600 bg-indigo-500/10',
    rose: 'text-rose-600 bg-rose-500/10',
    emerald: 'text-emerald-600 bg-emerald-500/10',
  }
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-semibold">{label}</p>
          <p className="text-xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${colors[tone]}`}><Icon className="w-5 h-5" /></div>
      </CardContent>
    </Card>
  )
}

function QueuePlaceholder() {
  return <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
}
