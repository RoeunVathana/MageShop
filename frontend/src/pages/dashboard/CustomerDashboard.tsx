import React, { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ShoppingBag,
  Heart,
  MapPin,
  Clock,
  Package,
  CreditCard,
  ChevronRight,
  Truck,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  QrCode,
  DollarSign,
  User as UserIcon,
} from 'lucide-react'
import { DashboardLayout, NavItem } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { authService } from '@/services/auth.service'
import { Pagination } from '@/components/common/Pagination'
import { api } from '@/lib/api'

const customerNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard/customer', icon: ShoppingBag },
  { label: 'My Orders', href: '/dashboard/customer/orders', icon: Package, badge: 'Track GPS' },
  { label: 'Wishlist', href: '/wishlist', icon: Heart },
  { label: 'Saved Addresses', href: '/dashboard/customer/addresses', icon: MapPin },
  { label: 'Payment Methods', href: '/dashboard/customer/payments', icon: CreditCard },
]

export function CustomerDashboard() {
  const location = useLocation()
  const { recentOrders, loyaltyPoints, t, formatPrice } = useShopEngagement()
  const currentUser = authService.getStoredUser()
  const [liveOrders, setLiveOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [copiedOrder, setCopiedOrder] = useState<string | null>(null)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersPerPage, setOrdersPerPage] = useState(5)

  // Determine active view based on URL pathname
  const pathname = location.pathname.toLowerCase()
  const isOrdersView = pathname.includes('/orders')
  const isAddressesView = pathname.includes('/addresses')
  const isPaymentsView = pathname.includes('/payments')

  useEffect(() => {
    let isMounted = true
    const fetchOrders = async () => {
      setLoadingOrders(true)
      try {
        const res = await api.get<any>('/orders')
        if (isMounted && res?.data?.data && Array.isArray(res.data.data)) {
          setLiveOrders(res.data.data)
        }
      } catch {
        // fallback to recentOrders from local engagement context
      } finally {
        if (isMounted) setLoadingOrders(false)
      }
    }
    fetchOrders()
    return () => {
      isMounted = false
    }
  }, [])

  const handleCopyOrder = (orderNum: string) => {
    navigator.clipboard.writeText(orderNum)
    setCopiedOrder(orderNum)
    setTimeout(() => setCopiedOrder(null), 2000)
  }

  // Combined orders (live from database + localStorage recent orders), sorted DESC (newest first)
  const combinedOrders = useMemo(() => {
    const raw = liveOrders.length > 0 ? liveOrders : recentOrders
    return [...raw].sort((a: any, b: any) => {
      const timeA = new Date(a.created_at || a.date || 0).getTime() || (a.id ?? 0)
      const timeB = new Date(b.created_at || b.date || 0).getTime() || (b.id ?? 0)
      return timeB - timeA
    })
  }, [liveOrders, recentOrders])

  const ordersTotalPages = Math.max(1, Math.ceil(combinedOrders.length / ordersPerPage))
  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPerPage
    return combinedOrders.slice(start, start + ordersPerPage)
  }, [combinedOrders, ordersPage, ordersPerPage])

  return (
    <DashboardLayout
      roleTitle="Customer Portal"
      roleSlug="customer"
      roleColor="text-blue-500"
      navItems={customerNav}
    >
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <UserIcon className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                {isOrdersView
                  ? t('My Orders & GPS Tracking', 'ការបញ្ជាទិញ & តាមដានការដឹកជញ្ជូន')
                  : isAddressesView
                  ? t('Saved Delivery Addresses', 'អាសយដ្ឋានដឹកជញ្ជូនដែលបានរក្សាទុក')
                  : isPaymentsView
                  ? t('Payment Methods & Bakong KHQR', 'វិធីសាស្ត្រទូទាត់ប្រាក់ & បាគង KHQR')
                  : t('Customer Account Overview', 'ទិដ្ឋភាពទូទៅនៃគណនី')}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentUser?.email ? (
                <span>
                  {t('Signed in as', 'បានចូលប្រើដោយ')} <strong className="text-foreground">{currentUser.email}</strong> ({currentUser.name || 'Shopper'})
                </span>
              ) : (
                t('Track recent purchases, live GPS delivery, and manage customer preferences.', 'តាមដានការទិញ ទីតាំងដឹកជញ្ជូនផ្ទាល់ និងគ្រប់គ្រងគណនីរបស់អ្នក។')
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/track">
              <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs h-9">
                <Truck className="w-3.5 h-3.5 text-primary" />
                <span>{t('Live GPS Delivery', 'តាមដាន GPS ផ្ទាល់')}</span>
              </Button>
            </Link>
            <Link to="/products">
              <Button size="sm" className="gap-1.5 rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground shadow-sm">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{t('Continue Shopping', 'បន្តការទិញទំនិញ')}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b pb-2 overflow-x-auto text-xs">
          <Link
            to="/dashboard/customer"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              !isOrdersView && !isAddressesView && !isPaymentsView
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t('Account Overview', 'ទិដ្ឋភាពទូទៅ')}
          </Link>
          <Link
            to="/dashboard/customer/orders"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 ${
              isOrdersView
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{t('My Orders', 'ការបញ្ជាទិញ')}</span>
            {combinedOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {combinedOrders.length}
              </span>
            )}
          </Link>
          <Link
            to="/dashboard/customer/addresses"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 ${
              isAddressesView
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{t('Saved Addresses', 'អាសយដ្ឋាន')}</span>
          </Link>
          <Link
            to="/dashboard/customer/payments"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 ${
              isPaymentsView
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{t('Payment Methods', 'ការទូទាត់')}</span>
          </Link>
        </div>

        {/* TAB 1: OVERVIEW & KPI STATS */}
        {!isOrdersView && !isAddressesView && !isPaymentsView && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="rounded-2xl border shadow-sm bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {t('Total Orders', 'ការបញ្ជាទិញសរុប')}
                    </p>
                    <p className="text-2xl font-black mt-0.5">{combinedOrders.length || 2}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border shadow-sm bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {t('Loyalty Points', 'ពិន្ទុសន្សំ (Points)')}
                    </p>
                    <p className="text-2xl font-black mt-0.5 text-amber-600 dark:text-amber-400">
                      {loyaltyPoints} {t('PTS', 'ពិន្ទុ')}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border shadow-sm bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {t('Free Item Reward', 'រង្វាន់ឥតគិតថ្លៃ')}
                    </p>
                    <p className="text-sm font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                      {loyaltyPoints >= 100
                        ? t('Unlocked! (100 PTS)', 'អាចប្តូរយកបាន!')
                        : `${loyaltyPoints}/100 PTS`}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border shadow-sm bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {t('Delivery Mode', 'សេវាដឹកជញ្ជូន')}
                    </p>
                    <p className="text-sm font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                      {t('Real-Time GPS', 'GPS តាមដានផ្ទាល់')}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* TAB 2: MY ORDERS LIST */}
        {(!isAddressesView && !isPaymentsView) && (
          <Card className="rounded-2xl border shadow-sm overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span>{t('Order History & Delivery Status', 'ប្រវត្តិនៃការទិញ និងស្ថានភាពដឹកជញ្ជូន')}</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t(
                      'Live fulfillment status, order totals, and instant GPS tracker link for all purchases.',
                      'ស្ថានភាពដឹកជញ្ជូនផ្ទាល់ និងតំណភ្ជាប់តាមដាន GPS សម្រាប់រាល់ការបញ្ជាទិញ។'
                    )}
                  </CardDescription>
                </div>
                <Link to="/dashboard/customer/orders">
                  <Badge variant="outline" className="text-xs font-mono font-bold cursor-pointer hover:bg-muted">
                    {combinedOrders.length} {t('Orders', 'ការបញ្ជាទិញ')}
                  </Badge>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {loadingOrders ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {t('Loading order history...', 'កំពុងទាញយកប្រវត្តិការបញ្ជាទិញ...')}
                </div>
              ) : combinedOrders.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-xs font-bold text-foreground">
                    {t('No orders placed yet', 'មិនទាន់មានការបញ្ជាទិញនៅឡើយទេ')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('Your placed orders and tracking links will appear here.', 'រាល់ការទិញទំនិញរបស់អ្នកនឹងបង្ហាញនៅទីនេះ។')}
                  </p>
                  <Link to="/products">
                    <Button size="sm" className="rounded-xl text-xs mt-2">
                      {t('Start Shopping Now', 'ចាប់ផ្តើមទិញទំនិញឥឡូវនេះ')}
                    </Button>
                  </Link>
                </div>
              ) : (
                paginatedOrders.map((ord: any, idx: number) => {
                  const orderNum = ord.order_number || ord.orderNumber || ord.id || `ORD-2026-${9040 - idx}`
                  const status = ord.status || 'out_for_delivery'
                  const total = ord.total_amount ? `$${Number(ord.total_amount).toFixed(2)}` : ord.total || '$39.00'
                  const date = ord.created_at ? new Date(ord.created_at).toLocaleDateString() : ord.date || 'Nov 8, 2026'

                  return (
                    <div
                      key={orderNum}
                      className="p-4 rounded-xl border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-foreground">
                            {orderNum}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyOrder(orderNum)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground"
                            title="Copy Order Number"
                          >
                            {copiedOrder === orderNum ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <Badge
                            className={`text-[10px] font-bold ${
                              status === 'delivered'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {status === 'delivered'
                              ? t('Delivered', 'បានដឹកជញ្ជូនដល់')
                              : t('Out for Delivery', 'កំពុងដឹកជញ្ជូន')}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {ord.items?.length
                            ? `${ord.items.length} item(s) • ${ord.items.map((i: any) => i.product_name || i.name).filter(Boolean).slice(0, 2).join(', ')}`
                            : ord.items || 'Standard Express Order • Phnom Penh Hub'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {t('Ordered on:', 'កាលបរិច្ឆេទ៖')} {date}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-black text-base text-foreground">{total}</span>
                        <Link to={`/track/${encodeURIComponent(orderNum)}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                            <Truck className="w-3.5 h-3.5" />
                            <span>{t('Track GPS', 'តាមដាន GPS')}</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>

            {/* Orders Pagination */}
            <Pagination
              currentPage={ordersPage}
              totalPages={ordersTotalPages}
              totalItems={combinedOrders.length}
              perPage={ordersPerPage}
              onPageChange={(p) => setOrdersPage(p)}
              onPerPageChange={(newPerPage) => {
                setOrdersPerPage(newPerPage)
                setOrdersPage(1)
              }}
              perPageOptions={[5, 10, 20]}
              itemName={t('orders', 'ការបញ្ជាទិញ')}
            />
          </Card>
        )}

        {/* TAB 3: SAVED ADDRESSES */}
        {isAddressesView && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{t('Default Delivery Location', 'ទីតាំងដឹកជញ្ជូនចម្បង')}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('Saved address used for 1-click cart checkout.', 'អាសយដ្ឋានសម្រាប់កន្រ្តកទំនិញ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>Phnom Penh Central (BKK1)</span>
                    <Badge className="text-[10px] bg-primary/10 text-primary">Default</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Street 310, Boeung Keng Kang 1, Chamkarmon, Phnom Penh, Cambodia
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    GPS: 11.5564° N, 104.9282° E
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-500" />
                  <span>{t('Speed & Coverage', 'ល្បឿន និងតំបន់គ្របដណ្តប់')}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('Express delivery available across all 14 Khans.', 'សេវាដឹកជញ្ជូនរហ័សទូទាំង ១៤ ខណ្ឌ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('Instant GPS Dispatch Active', 'ប្រព័ន្ធបញ្ជូន GPS កំពុងដំណើរការ')}</span>
                  </div>
                  <p className="text-[11px]">
                    {t('Standard delivery takes 1-2 hours within Phnom Penh, and 24-48 hours across provinces.', 'ដឹកជញ្ជូនក្នុងភ្នំពេញចំណាយពេល ១-២ ម៉ោង និងតាមបណ្តាខេត្ត ១-២ ថ្ងៃ។')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 4: PAYMENT METHODS */}
        {isPaymentsView && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  <span>{t('Bakong KHQR Universal Scan', 'បាគង KHQR')}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('Scan & Pay instantly with any Cambodian mobile banking app.', 'ស្កេនទូទាត់រហ័សជាមួយគ្រប់កម្មវិធីធនាគារ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-muted/40 border space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span>Bakong KHQR (USD / KHR)</span>
                    <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Verified Active
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Supported by 50+ financial institutions: ABA Bank, ACLEDA, Wing, Canadia, TrueMoney, and Bakong.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="p-4 pb-2 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span>{t('Cash on Delivery (COD)', 'ទូទាត់នៅពេលទទួលទំនិញ (COD)')}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('Inspect goods first, pay cash or KHQR to driver upon arrival.', 'ពិនិត្យទំនិញរួចទូទាត់សាច់ប្រាក់ជូនអ្នកដឹកជញ្ជូន')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('Pay on Arrival Supported', 'គាំទ្រការទូទាត់នៅពេលទំនិញទៅដល់')}</span>
                  </div>
                  <p className="text-[11px]">
                    {t('Couriers carry verified dynamic KHQR QR stands for easy cashless scanning at your doorstep.', 'អ្នកដឹកជញ្ជូនមានស្លាក KHQR សម្រាប់ស្កេនទូទាត់នៅមាត់ទ្វាររបស់អ្នក។')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
