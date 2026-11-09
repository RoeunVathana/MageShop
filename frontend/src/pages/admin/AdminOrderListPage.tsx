import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  XCircle,
  FileText,
  MapPin,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Phone,
  Mail,
  ShieldCheck,
  CreditCard,
  QrCode,
  Package,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { adminOrderService, type AdminOrder } from '@/services/adminOrder.service'

const ORDER_STATUSES = [
  { value: 'all', label: 'All Orders', labelKm: 'ទាំងអស់' },
  { value: 'pending', label: 'Pending', labelKm: 'រង់ចាំ' },
  { value: 'processing', label: 'Processing', labelKm: 'កំពុងរៀបចំ' },
  { value: 'shipped', label: 'Shipped / In Transit', labelKm: 'កំពុងដឹកជញ្ជូន' },
  { value: 'delivered', label: 'Delivered', labelKm: 'បានប្រគល់ជោគជ័យ' },
  { value: 'cancelled', label: 'Cancelled', labelKm: 'បានបោះបង់' },
]

export function AdminOrderListPage() {
  const { t, usdToKhrRate } = useShopEngagement()
  const { toast } = useToast()

  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('')
  const [newPaymentStatus, setNewPaymentStatus] = useState<string>('')

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await adminOrderService.getOrders({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        payment_status: paymentFilter !== 'all' ? paymentFilter : undefined,
        page: currentPage,
        per_page: 12,
        sort_by: 'id',
        sort_direction: 'desc',
      })
      setOrders(res.data || [])
      setCurrentPage(res.meta?.current_page || 1)
      setTotalPages(res.meta?.last_page || 1)
      setTotalOrders(res.meta?.total || 0)
    } catch (err: any) {
      console.warn('Orders fetch note:', err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [currentPage, statusFilter, paymentFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchOrders()
  }

  const handleStatusUpdate = async (orderId: number, status: string) => {
    setIsUpdatingStatus(true)
    try {
      const updated = await adminOrderService.updateStatus(orderId, { status })
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated)
      }
      toast({
        title: t('Order Status Updated', 'បានកែប្រែស្ថានភាពបញ្ជាទិញ'),
        description: t(
          `Order #${updated.order_number} marked as ${status.toUpperCase()}.`,
          `ការបញ្ជាទិញ #${updated.order_number} ត្រូវបានប្តូរទៅជា ${status.toUpperCase()}។`
        ),
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: t('Update Failed', 'ការកែប្រែបានបរាជ័យ'),
        description: err?.message || 'Failed to update order status.',
        type: 'error',
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handlePaymentStatusUpdate = async (orderId: number, paymentStatus: string) => {
    setIsUpdatingStatus(true)
    try {
      const updated = await adminOrderService.updatePaymentStatus(orderId, paymentStatus)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated)
      }
      toast({
        title: t('Payment Status Updated', 'បានកែប្រែស្ថានភាពទូទាត់ប្រាក់'),
        description: t(
          `Order #${updated.order_number} payment marked as ${paymentStatus.toUpperCase()}.`,
          `ការទូទាត់ #${updated.order_number} ត្រូវបានប្តូរទៅជា ${paymentStatus.toUpperCase()}។`
        ),
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: t('Update Failed', 'ការកែប្រែបានបរាជ័យ'),
        description: err?.message || 'Failed to update payment status.',
        type: 'error',
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1 font-bold text-xs">
            <CheckCircle2 className="w-3 h-3" />
            <span>{t('Delivered', 'បានប្រគល់')}</span>
          </Badge>
        )
      case 'shipped':
        return (
          <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 gap-1 font-bold text-xs">
            <Truck className="w-3 h-3" />
            <span>{t('In Transit', 'កំពុងដឹកជញ្ជូន')}</span>
          </Badge>
        )
      case 'processing':
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 gap-1 font-bold text-xs">
            <Clock className="w-3 h-3" />
            <span>{t('Processing', 'កំពុងរៀបចំ')}</span>
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 gap-1 font-bold text-xs">
            <XCircle className="w-3 h-3" />
            <span>{t('Cancelled', 'បានបោះបង់')}</span>
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1 font-bold text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>{t('Pending', 'រង់ចាំ')}</span>
          </Badge>
        )
    }
  }

  const getPaymentBadge = (paymentStatus: string, method: string) => {
    const isPaid = paymentStatus === 'completed' || paymentStatus === 'paid'
    const isBakong = method?.toLowerCase().includes('khqr') || method?.toLowerCase().includes('bakong')

    return (
      <div className="flex items-center gap-1.5">
        <Badge
          className={
            isPaid
              ? 'bg-emerald-600 text-white font-bold text-[10px]'
              : 'bg-amber-500 text-white font-bold text-[10px]'
          }
        >
          {isPaid ? t('PAID', 'បានទូទាត់') : t('UNPAID', 'មិនទាន់ទូទាត់')}
        </Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {isBakong ? (
            <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold text-[11px]">
              <QrCode className="w-3 h-3" /> KHQR
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-blue-600 font-bold text-[11px]">
              <CreditCard className="w-3 h-3" /> COD
            </span>
          )}
        </span>
      </div>
    )
  }

  return (
    <DashboardLayout
      roleTitle="Orders Management"
      roleSlug="admin"
      roleColor="text-blue-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <ShoppingBag className="w-7 h-7 text-primary" />
                <span>{t('Customer Orders & Sales', 'ការបញ្ជាទិញ & ការលក់របស់អតិថិជន')}</span>
              </h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                {totalOrders} {t('Orders', 'ការបញ្ជាទិញ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                'Monitor live customer orders, verify Bakong KHQR & COD payments, update shipping statuses, and generate PDF receipts.',
                'គ្រប់គ្រងការបញ្ជាទិញរបស់អតិថិជន ផ្ទៀងផ្ទាត់ការទូទាត់ Bakong KHQR & COD ផ្លាស់ប្តូរស្ថានភាពដឹកជញ្ជូន និងចេញបង្កាន់ដៃ PDF។'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              disabled={loading}
              className="rounded-xl h-9 text-xs font-bold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('Refresh', 'ផ្ទុកឡើងវិញ')}</span>
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search input */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                <Input
                  type="text"
                  placeholder={t(
                    'Search by Order #, customer name, phone, or email...',
                    'ស្វែងរកតាមលេខកូដបញ្ជាទិញ ឈ្មោះ ទូរស័ព្ទ ឬអ៊ីមែល...'
                  )}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-24 h-10 rounded-xl text-xs sm:text-sm"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-1 top-1 h-8 rounded-lg px-3 text-xs font-bold"
                >
                  {t('Search', 'ស្វែងរក')}
                </Button>
              </form>

              {/* Payment Filter */}
              <div className="flex items-center gap-1.5 w-full md:w-auto shrink-0">
                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                  {t('Payment:', 'ការទូទាត់:')}
                </span>
                <select
                  value={paymentFilter}
                  onChange={(e) => {
                    setPaymentFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-10 px-3 rounded-xl border bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">{t('All Payments', 'ការទូទាត់ទាំងអស់')}</option>
                  <option value="completed">{t('Paid (Completed)', 'បានទូទាត់ជោគជ័យ')}</option>
                  <option value="pending">{t('Unpaid / Pending', 'មិនទាន់ទូទាត់ / រង់ចាំ')}</option>
                </select>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
              <span className="text-xs font-bold text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>{t('Status:', 'ស្ថានភាព:')}</span>
              </span>
              {ORDER_STATUSES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st.value)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all duration-200 text-xs ${
                    statusFilter === st.value
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {t(st.label, st.labelKm)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="rounded-2xl border shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground font-medium">
                  {t('Loading customer orders...', 'កំពុងទាញយកទិន្នន័យបញ្ជាទិញ...')}
                </p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                  <Package className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-base">{t('No Orders Found', 'មិនមានការបញ្ជាទិញទេ')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {t(
                    'No orders match your filter criteria or search keyword.',
                    'មិនមានការបញ្ជាទិញដែលត្រូវនឹងការស្វែងរក ឬតម្រងនេះទេ។'
                  )}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="py-3 px-4">{t('Order #', 'លេខបញ្ជាទិញ')}</th>
                      <th className="py-3 px-4">{t('Customer & Contact', 'អតិថិជន & ទំនាក់ទំនង')}</th>
                      <th className="py-3 px-4">{t('Items', 'ទំនិញ')}</th>
                      <th className="py-3 px-4">{t('Total Amount', 'សរុបទឹកប្រាក់')}</th>
                      <th className="py-3 px-4">{t('Payment', 'ការទូទាត់')}</th>
                      <th className="py-3 px-4">{t('Fulfillment', 'ស្ថានភាពដឹក')}</th>
                      <th className="py-3 px-4">{t('Date (DESC)', 'កាលបរិច្ឆេទ')}</th>
                      <th className="py-3 px-4 text-right">{t('Actions', 'សកម្មភាព')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((order) => {
                      const totalKhr = Math.round(Number(order.total_amount) * (usdToKhrRate || 4100))
                      const itemsCount = order.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || order.items?.length || 0

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-muted/30 transition-colors duration-150 group"
                        >
                          {/* Order Number */}
                          <td className="py-3.5 px-4 font-black text-foreground">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="text-primary hover:underline flex items-center gap-1 font-mono text-xs"
                            >
                              <span>{order.order_number}</span>
                            </button>
                            <span className="text-[10px] text-muted-foreground block font-mono">
                              ID: #{order.id}
                            </span>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground text-xs">{order.customer_name}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 shrink-0" />
                              <span>{order.customer_phone}</span>
                            </div>
                            {order.customer_email && (
                              <div className="text-[10.5px] text-muted-foreground/80 truncate max-w-[180px]">
                                {order.customer_email}
                              </div>
                            )}
                          </td>

                          {/* Items */}
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="font-bold text-[10.5px]">
                              {itemsCount} {t('item(s)', 'មុខទំនិញ')}
                            </Badge>
                          </td>

                          {/* Total Amount */}
                          <td className="py-3.5 px-4">
                            <div className="font-black text-xs text-foreground">
                              ${Number(order.total_amount).toFixed(2)}
                            </div>
                            <div className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                              {totalKhr.toLocaleString()} ៛
                            </div>
                          </td>

                          {/* Payment */}
                          <td className="py-3.5 px-4">
                            {getPaymentBadge(order.payment_status, order.payment_method)}
                          </td>

                          {/* Fulfillment Status */}
                          <td className="py-3.5 px-4">
                            {getStatusBadge(order.status)}
                          </td>

                          {/* Date (DESC) */}
                          <td className="py-3.5 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
                            <div>{new Date(order.created_at).toLocaleDateString()}</div>
                            <div className="text-[10px] text-muted-foreground/70">
                              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                                className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1"
                                title={t('View Full Order Details', 'មើលព័ត៌មានលម្អិត')}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t('Details', 'លម្អិត')}</span>
                              </Button>

                              {/* View / Print PDF Receipt */}
                              <a
                                href={`https://api.tyushop.blog/api/v1/orders/${order.id}/receipt`}
                                target="_blank"
                                rel="noreferrer"
                                title={t('Official PDF Receipt', 'បង្កាន់ដៃ PDF ផ្លូវការ')}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                              </a>

                              {/* Live GPS Track */}
                              <Link
                                to={`/track-order/${order.order_number}`}
                                target="_blank"
                                title={t('Track Courier Live GPS', 'តាមដានការដឹកជញ្ជូន GPS')}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                  <Truck className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls (Always Sorted by DESC) */}
            {totalPages > 1 && (
              <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  {t('Showing page', 'បង្ហាញទំព័រ')} <span className="font-black text-foreground">{currentPage}</span> {t('of', 'នៃ')} <span className="font-black text-foreground">{totalPages}</span> ({totalOrders} {t('total orders', 'ការបញ្ជាទិញសរុប')})
                </p>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{t('Previous', 'មុន')}</span>
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((page, idx, arr) => {
                      const showEllipsis = idx > 0 && page - arr[idx - 1] > 1
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="px-1 text-muted-foreground">...</span>}
                          <Button
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="h-8 w-8 p-0 rounded-lg text-xs font-bold"
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      )
                    })}

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages || loading}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1"
                  >
                    <span>{t('Next', 'បន្ទាប់')}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Drawer / Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-card rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-5 animate-in fade-in-0 zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-foreground">
                      {t('Order', 'ការបញ្ជាទិញ')} #{selectedOrder.order_number}
                    </h2>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('Placed on', 'បានបញ្ជាទិញនៅ')} {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-full w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              {/* Status Update Controls */}
              <div className="p-4 rounded-2xl bg-muted/40 border space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  {t('Manage Order & Payment Status', 'គ្រប់គ្រងស្ថានភាពបញ្ជាទិញ & ការទូទាត់')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Fulfillment Status */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground">
                      {t('Fulfillment Status:', 'ស្ថានភាពដឹកជញ្ជូន:')}
                    </label>
                    <select
                      value={selectedOrder.status}
                      disabled={isUpdatingStatus}
                      onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border bg-background text-xs font-bold focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="pending">{t('Pending (Awaiting fulfillment)', 'រង់ចាំការរៀបចំ')}</option>
                      <option value="processing">{t('Processing (Packing goods)', 'កំពុងវេចខ្ចប់')}</option>
                      <option value="shipped">{t('Shipped (Out with courier)', 'កំពុងដឹកជញ្ជូន')}</option>
                      <option value="delivered">{t('Delivered (Customer received)', 'បានប្រគល់ជោគជ័យ')}</option>
                      <option value="cancelled">{t('Cancelled', 'បានបោះបង់')}</option>
                    </select>
                  </div>

                  {/* Payment Status */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground">
                      {t('Payment Verification:', 'ការផ្ទៀងផ្ទាត់ការទូទាត់:')}
                    </label>
                    <select
                      value={selectedOrder.payment_status}
                      disabled={isUpdatingStatus}
                      onChange={(e) => handlePaymentStatusUpdate(selectedOrder.id, e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border bg-background text-xs font-bold focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="pending">{t('Pending / Unpaid', 'មិនទាន់ទូទាត់')}</option>
                      <option value="completed">{t('Paid & Verified (Completed)', 'បានទូទាត់ជោគជ័យ')}</option>
                      <option value="failed">{t('Payment Failed / Rejected', 'ការទូទាត់បរាជ័យ')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer & Shipping Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl border bg-card/60 space-y-1.5">
                  <div className="font-black text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>{t('Customer Information', 'ព័ត៌មានអតិថិជន')}</span>
                  </div>
                  <div className="text-foreground font-semibold">{selectedOrder.customer_name}</div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{selectedOrder.customer_phone}</span>
                  </div>
                  {selectedOrder.customer_email && (
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>{selectedOrder.customer_email}</span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl border bg-card/60 space-y-1.5">
                  <div className="font-black text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>{t('Delivery Destination', 'អាសយដ្ឋានដឹកជញ្ជូន')}</span>
                  </div>
                  <p className="text-foreground text-xs leading-relaxed">
                    {selectedOrder.delivery_address}
                  </p>
                  {selectedOrder.notes && (
                    <p className="text-muted-foreground italic text-[11px] pt-1">
                      "{selectedOrder.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Ordered Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  {t('Purchased Products', 'មុខទំនិញដែលបានបញ្ជាទិញ')}
                </h4>
                <div className="divide-y rounded-2xl border bg-card/40 overflow-hidden text-xs">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{item.product_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.quantity} x ${Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <div className="font-black text-foreground shrink-0">
                          ${Number(item.total_price).toFixed(2)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-muted-foreground text-center">
                      {t('No line items recorded.', 'មិនមានទំនិញ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Totals */}
              <div className="p-4 rounded-2xl bg-muted/30 border space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('Subtotal', 'សរុបរង')}</span>
                  <span>${Number(selectedOrder.subtotal || selectedOrder.total_amount).toFixed(2)}</span>
                </div>
                {Number(selectedOrder.discount) > 0 && (
                  <div className="flex justify-between text-rose-500 font-semibold">
                    <span>{t('Discount Applied', 'បញ្ចុះតម្លៃ')}</span>
                    <span>-${Number(selectedOrder.discount).toFixed(2)}</span>
                  </div>
                )}
                {Number(selectedOrder.shipping_fee) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('Shipping Fee', 'ថ្លៃដឹកជញ្ជូន')}</span>
                    <span>${Number(selectedOrder.shipping_fee).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-foreground pt-2 border-t">
                  <span>{t('Grand Total', 'សរុបទាំងអស់')}</span>
                  <div className="text-right">
                    <span>${Number(selectedOrder.total_amount).toFixed(2)}</span>
                    <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ≈ {Math.round(Number(selectedOrder.total_amount) * (usdToKhrRate || 4100)).toLocaleString()} ៛
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={`https://api.tyushop.blog/api/v1/orders/${selectedOrder.id}/receipt`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto rounded-xl h-9 text-xs font-bold gap-1.5"
                    >
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>{t('Download PDF Receipt', 'ទាញយកបង្កាន់ដៃ PDF')}</span>
                    </Button>
                  </a>

                  <Link
                    to={`/track-order/${selectedOrder.order_number}`}
                    target="_blank"
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto rounded-xl h-9 text-xs font-bold gap-1.5 text-emerald-600"
                    >
                      <Truck className="w-4 h-4" />
                      <span>{t('Live GPS Courier', 'តាមដាន GPS')}</span>
                    </Button>
                  </Link>
                </div>

                <Button
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                  className="w-full sm:w-auto rounded-xl h-9 text-xs font-bold"
                >
                  {t('Close', 'បិទ')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
