import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield,
  ShoppingBag,
  Package,
  Boxes,
  FolderTree,
  Award,
  Sliders,
  Tag,
  Truck,
  SlidersHorizontal,
  Coins,
  Building2,
  Key,
  Users,
  Server,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Plus,
  UserCog,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { adminOrderService, type SystemOverviewStats, type AdminOrder } from '@/services/adminOrder.service'

export function AdminDashboard() {
  const { t, usdToKhrRate } = useShopEngagement()

  const [stats, setStats] = useState<SystemOverviewStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const res = await adminOrderService.getSystemStats()
      setStats(res.overview)
      setRecentOrders(res.recent_orders || [])
    } catch (err) {
      console.error('Failed to load admin stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const systemModules = [
    {
      title: t('Customer Orders & Sales', 'ការបញ្ជាទិញ & ការលក់'),
      description: t(
        'Verify Bakong KHQR & COD payments, manage fulfillment status, download PDF invoices.',
        'ផ្ទៀងផ្ទាត់ការទូទាត់ Bakong KHQR & COD ផ្លាស់ប្តូរស្ថានភាពដឹកជញ្ជូន និងចេញវិក្កយបត្រ PDF។'
      ),
      href: '/admin/orders',
      icon: ShoppingBag,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      badge: stats ? `${stats.total_orders} Orders` : 'Live',
      badgeColor: 'bg-blue-600',
    },
    {
      title: t('Products Catalog', 'បញ្ជីមុខទំនិញ'),
      description: t(
        'Create and update multi-variant catalog, specifications, SKU stock, and retail prices.',
        'បង្កើត និងកែប្រែទំនិញច្រើនប្រភេទ គុណលក្ខណៈ ស្តុក SKU និងតម្លៃលក់រាយ។'
      ),
      href: '/admin/products',
      icon: Package,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      badge: stats ? `${stats.total_products} Items` : 'Catalog',
      badgeColor: 'bg-indigo-600',
    },
    {
      title: t('Universal Categories', 'ប្រភេទ & គុណលក្ខណៈ'),
      description: t(
        'Manage 26 universal departments, dynamic attribute specifications, and filters.',
        'គ្រប់គ្រង ២៦ ផ្នែកទំនិញ គុណលក្ខណៈបច្ចេកទេស និងតម្រងស្វែងរក។'
      ),
      href: '/admin/categories',
      icon: FolderTree,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      badge: stats ? `${stats.total_categories} Depts` : 'System',
      badgeColor: 'bg-emerald-600',
    },
    {
      title: t('Brands & Trademarks', 'ម៉ាក & ពាណិជ្ជសញ្ញា'),
      description: t(
        'Authorize official manufacturer brands, logos, verified merchant badges, and origin.',
        'គ្រប់គ្រងម៉ាកយីហោផ្លូវការ រូបសញ្ញា ផ្លាកសញ្ញាបញ្ជាក់ និងប្រទេសដើម។'
      ),
      href: '/admin/brands',
      icon: Award,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      badge: stats ? `${stats.total_brands} Brands` : 'Brands',
      badgeColor: 'bg-amber-600',
    },
    {
      title: t('Inventory & Stock Movements', 'សារពើភ័ណ្ឌ & ស្តុក'),
      description: t(
        'Real-time warehouse stock tracking, batch inventory adjustments, and movement logs.',
        'តាមដានស្តុកទំនិញក្នុងឃ្លាំងផ្ទាល់ កែសម្រួលចំនួនស្តុក និងកំណត់ហេតុផ្លាស់ទី។'
      ),
      href: '/admin/inventory',
      icon: Boxes,
      color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
      badge: stats?.low_stock_products ? `${stats.low_stock_products} Low Stock` : 'Stock OK',
      badgeColor: stats?.low_stock_products ? 'bg-amber-500' : 'bg-cyan-600',
    },
    {
      title: t('Promo Coupons & Discounts', 'គូប៉ុងបញ្ចុះតម្លៃ'),
      description: t(
        'Configure percentage and fixed discount vouchers, minimum orders, and expiry dates.',
        'កំណត់កូដបញ្ចុះតម្លៃជាភាគរយ ឬទឹកប្រាក់ កម្រិតបញ្ជាទិញអប្បបរមា និងកាលកំណត់។'
      ),
      href: '/admin/coupons',
      icon: Tag,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      badge: stats ? `${stats.active_coupons} Active` : 'Promo',
      badgeColor: 'bg-rose-600',
    },
    {
      title: t('Hero Slide Banners', 'បដាផ្សាយពាណិជ្ជកម្ម'),
      description: t(
        'Homepage slider carousels, video banners, custom badge tags, and promo links.',
        'បដាផ្សាយពាណិជ្ជកម្មធំលើទំព័រដើម វីដេអូបដា ផ្លាកសញ្ញាពិសេស និងតំណភ្ជាប់។'
      ),
      href: '/admin/banners',
      icon: Sliders,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      badge: stats ? `${stats.active_banners} Slides` : 'Hero',
      badgeColor: 'bg-purple-600',
    },
    {
      title: t('Delivery Fleet & Live GPS', 'ការដឹកជញ្ជូន & Live GPS'),
      description: t(
        'Set shipping fees, toggle Free Express delivery, and track real-time courier GPS.',
        'កំណត់តម្លៃដឹកជញ្ជូន បើក/បិទការដឹកជញ្ជូនឥតគិតថ្លៃ និងតាមដាន GPS ផ្ទាល់។'
      ),
      href: '/dashboard/delivery',
      icon: Truck,
      color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
      badge: 'Live GPS',
      badgeColor: 'bg-teal-600',
    },
    {
      title: t('Store & Loyalty Rules', 'ការកំណត់ហាង & រង្វាន់'),
      description: t(
        'Loyalty point rules (100 pts = Free Item), return policies, store metadata, and invoice notes.',
        'ក្បួនពិន្ទុសន្សំ (១០០ ពិន្ទុ = ទំនិញហ្វ្រី) គោលការណ៍ប្តូរទំនិញ និងព័ត៌មានហាង។'
      ),
      href: '/admin/settings',
      icon: SlidersHorizontal,
      color: 'text-indigo-600 bg-indigo-600/10 border-indigo-600/20',
      badge: '100 Pts Rule',
      badgeColor: 'bg-indigo-600',
    },
    {
      title: t('Currency & Exchange Rate', 'រូបិយប័ណ្ណ & អត្រាប្តូរប្រាក់'),
      description: t(
        'Configure USD / Khmer Riel (៛) rates, NBC commercial averages, and currency visibility.',
        'កំណត់អត្រាប្តូរប្រាក់ ដុល្លារ / រៀល (៛) អត្រាធនាគារជាតិ និងការបង្ហាញតម្លៃ។'
      ),
      href: '/admin/currency',
      icon: Coins,
      color: 'text-amber-600 bg-amber-600/10 border-amber-600/20',
      badge: 'USD / KHR',
      badgeColor: 'bg-amber-600',
    },
    {
      title: t('Company HQ & Location', 'ក្រុមហ៊ុន & ទីតាំងការិយាល័យ'),
      description: t(
        'Headquarters physical address, Google Maps geolocation coordinates, and business hours.',
        'អាសយដ្ឋានការិយាល័យកណ្តាល កូអរដោនេ Google Maps និងម៉ោងធ្វើការ។'
      ),
      href: '/admin/company',
      icon: Building2,
      color: 'text-slate-600 bg-slate-600/10 border-slate-600/20',
      badge: 'HQ Office',
      badgeColor: 'bg-slate-700',
    },
    {
      title: t('Telegram Bot & Security', 'Telegram API & OTP សុវត្ថិភាព'),
      description: t(
        'Configure Telegram Bot Token, Webhook endpoint, OTP security logs, and developer API keys.',
        'កំណត់ Telegram Bot Token, Webhook, កំណត់ហេតុ OTP និងកូនសោ API។'
      ),
      href: '/admin/security',
      icon: Key,
      color: 'text-sky-600 bg-sky-600/10 border-sky-600/20',
      badge: 'Telegram Bot',
      badgeColor: 'bg-sky-600',
    },
    {
      title: t('User & Staff Directory', 'បញ្ជីអ្នកប្រើប្រាស់ & បុគ្គលិក'),
      description: t(
        'View all registered customers, grant Admin/Staff/Seller roles, send OTP resets.',
        'មើលបញ្ជីអតិថិជន កំណត់តួនាទី Admin/បុគ្គលិក/អ្នកលក់ និងផ្ញើលេខកូដ OTP។'
      ),
      href: '/dashboard/admin/users',
      icon: Users,
      color: 'text-violet-600 bg-violet-600/10 border-violet-600/20',
      badge: stats ? `${stats.total_users} Users` : 'Directory',
      badgeColor: 'bg-violet-600',
    },
    {
      title: t('System Diagnostics', 'វិភាគ & ពិនិត្យប្រព័ន្ធ'),
      description: t(
        'Monitor database connections, PgBouncer pooler, Redis cache, and S3 media storage.',
        'ពិនិត្យសុខភាពមូលដ្ឋានទិន្នន័យ PgBouncer, Redis cache និងកន្លែងផ្ទុកឯកសារ S3។'
      ),
      href: '/diagnostics',
      icon: Server,
      color: 'text-emerald-600 bg-emerald-600/10 border-emerald-600/20',
      badge: 'Microservices',
      badgeColor: 'bg-emerald-600',
    },
  ]

  const totalRevenueUsd = stats?.total_revenue || 0
  const totalRevenueKhr = Math.round(totalRevenueUsd * (usdToKhrRate || 4100))

  return (
    <DashboardLayout
      roleTitle="Admin Control Center"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Shield className="w-7 h-7 text-purple-600" />
                <span>{t('All-in-One Admin Governance', 'មជ្ឈមណ្ឌលគ្រប់គ្រងប្រព័ន្ធ Admin ទាំងមូល')}</span>
              </h1>
              <Badge className="bg-purple-600 text-white font-bold text-xs">
                {t('Super Admin', 'អ្នកគ្រប់គ្រងជាន់ខ្ពស់')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                'Complete command over customer orders, merchandise catalogs, loyalty rewards, delivery fleet, and system settings.',
                'គ្រប់គ្រងការបញ្ជាទិញ បញ្ជីទំនិញ ប្រព័ន្ធពិន្ទុរង្វាន់ កងដឹកជញ្ជូន និងការកំណត់ប្រព័ន្ធទាំងអស់។'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              disabled={loading}
              className="rounded-xl h-9 text-xs font-bold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('Refresh Live Stats', 'ផ្ទុកឡើងវិញ')}</span>
            </Button>
          </div>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <Link to="/admin/orders">
            <Button size="sm" className="rounded-xl h-8 px-3 text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{t('View All Orders', 'មើលការបញ្ជាទិញទាំងអស់')}</span>
            </Button>
          </Link>
          <Link to="/admin/products/create">
            <Button size="sm" variant="outline" className="rounded-xl h-8 px-3 text-xs font-bold gap-1">
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t('Add Product', 'បន្ថែមទំនិញ')}</span>
            </Button>
          </Link>
          <Link to="/admin/coupons">
            <Button size="sm" variant="outline" className="rounded-xl h-8 px-3 text-xs font-bold gap-1">
              <Plus className="w-3.5 h-3.5 text-rose-500" />
              <span>{t('Create Coupon', 'បង្កើតគូប៉ុង')}</span>
            </Button>
          </Link>
          <Link to="/admin/banners">
            <Button size="sm" variant="outline" className="rounded-xl h-8 px-3 text-xs font-bold gap-1">
              <Sliders className="w-3.5 h-3.5 text-purple-600" />
              <span>{t('Hero Banners', 'បដាពាណិជ្ជកម្ម')}</span>
            </Button>
          </Link>
          <Link to="/admin/settings">
            <Button size="sm" variant="outline" className="rounded-xl h-8 px-3 text-xs font-bold gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('Loyalty & Policies', 'ក្បួនពិន្ទុ & គោលការណ៍')}</span>
            </Button>
          </Link>
        </div>

        {/* Top 4 Real Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Revenue */}
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">{t('Total Revenue (Paid)', 'ចំណូលសរុប (បានទូទាត់)')}</p>
                <p className="text-xl font-black mt-1 text-purple-600">
                  ${totalRevenueUsd.toFixed(2)}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  ≈ {totalRevenueKhr.toLocaleString()} ៛
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Total Orders */}
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">{t('Customer Orders', 'ការបញ្ជាទិញសរុប')}</p>
                <p className="text-xl font-black mt-1 text-blue-600">
                  {stats ? stats.total_orders : '...'}
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground">
                  {stats?.pending_orders || 0} {t('Pending', 'រង់ចាំ')} • {stats?.delivered_orders || 0} {t('Delivered', 'បានប្រគល់')}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Catalog Products */}
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">{t('Active Products', 'ទំនិញក្នុងស្តុក')}</p>
                <p className="text-xl font-black mt-1 text-indigo-600">
                  {stats ? stats.total_products : '...'}
                </p>
                <p className="text-[10px] font-semibold text-amber-600">
                  {stats?.low_stock_products || 0} {t('Low Stock Alerts', 'ជិតអស់ពីស្តុក')}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Package className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Registered Users */}
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">{t('Total Users', 'អ្នកប្រើប្រាស់សរុប')}</p>
                <p className="text-xl font-black mt-1 text-emerald-600">
                  {stats ? stats.total_users : '...'}
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground">
                  {t('Customers, Staff & Admins', 'អតិថិជន បុគ្គលិក & Admin')}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Live Orders Section */}
        <Card className="rounded-3xl border shadow-sm overflow-hidden">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-black flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <span>{t('Recent Live Customer Orders', 'ការបញ្ជាទិញថ្មីៗចុងក្រោយ')}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                {t('Latest purchase orders submitted by customers via Bakong KHQR or Cash on Delivery.', 'ការបញ្ជាទិញចុងក្រោយដែលបានដាក់ដោយអតិថិជន')}
              </CardDescription>
            </div>
            <Link to="/admin/orders">
              <Button size="sm" variant="ghost" className="rounded-xl h-8 text-xs font-bold gap-1 text-primary">
                <span>{t('Manage All Orders', 'គ្រប់គ្រងទាំងអស់')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {t('No customer orders recorded yet.', 'មិនទាន់មានការបញ្ជាទិញនៅឡើយទេ')}
              </div>
            ) : (
              <div className="dashboard-table-scroll">
                <table className="dashboard-data-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">{t('Order #', 'លេខបញ្ជាទិញ')}</th>
                      <th className="py-2.5 px-4">{t('Customer', 'អតិថិជន')}</th>
                      <th className="py-2.5 px-4">{t('Total Amount', 'សរុបទឹកប្រាក់')}</th>
                      <th className="py-2.5 px-4">{t('Payment', 'ការទូទាត់')}</th>
                      <th className="py-2.5 px-4">{t('Status', 'ស្ថានភាព')}</th>
                      <th className="py-2.5 px-4 text-right">{t('Action', 'សកម្មភាព')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders.map((order) => {
                      const totalKhr = Math.round(Number(order.total_amount) * (usdToKhrRate || 4100))
                      const isPaid = order.payment_status === 'completed' || order.payment_status === 'paid'

                      return (
                        <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-black font-mono text-primary">
                            <Link to="/admin/orders" className="hover:underline">
                              {order.order_number}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground">{order.customer_name}</div>
                            <div className="text-[10px] text-muted-foreground">{order.customer_phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground">${Number(order.total_amount).toFixed(2)}</div>
                            <div className="text-[10px] text-emerald-600">{totalKhr.toLocaleString()} ៛</div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={isPaid ? 'bg-emerald-600 text-white text-[10px]' : 'bg-amber-500 text-white text-[10px]'}>
                              {isPaid ? t('PAID', 'បានទូទាត់') : t('PENDING', 'រង់ចាំ')}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="capitalize text-[10px] font-bold">
                              {order.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link to="/admin/orders">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs font-bold">
                                {t('Manage', 'គ្រប់គ្រង')}
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All-in-One System Governance Modules Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>{t('System Governance & Management Modules', 'ម៉ូឌុលគ្រប់គ្រងប្រព័ន្ធទាំងអស់')}</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {t(
                  'Select any subsystem below to configure, manage, or audit across the TYUSHOP platform.',
                  'ជ្រើសរើសផ្នែកណាមួយខាងក្រោមដើម្បីកំណត់ គ្រប់គ្រង ឬពិនិត្យក្នុងប្រព័ន្ធ TYUSHOP។'
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemModules.map((mod) => {
              const Icon = mod.icon
              return (
                <Link
                  key={mod.href}
                  to={mod.href}
                  className="group block p-4 rounded-3xl border bg-card hover:bg-accent/40 hover:border-primary/40 transition-all duration-200 hover:shadow-md relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${mod.color}`}>
                      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <Badge className={`${mod.badgeColor} text-white text-[10px] font-bold`}>
                      {mod.badge}
                    </Badge>
                  </div>

                  <div className="mt-3.5 space-y-1">
                    <h3 className="font-black text-sm text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                      <span>{mod.title}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 text-primary" />
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {mod.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
