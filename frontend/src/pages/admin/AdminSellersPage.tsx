import React, { useState, useEffect, useMemo } from 'react'
import {
  Store,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Building2,
  ExternalLink,
  RefreshCw,
  Send,
  Eye,
  SlidersHorizontal,
  DollarSign,
  User,
  Sparkles,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import {
  sellerService,
  SellerApplicationData,
  AdminSellersResponse,
} from '@/services/seller.service'

export function AdminSellersPage() {
  const { t } = useShopEngagement()
  const { toast } = useToast()

  const [applications, setApplications] = useState<SellerApplicationData[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  // Selected application for detail modal
  const [selectedApp, setSelectedApp] = useState<SellerApplicationData | null>(null)
  
  // Reject modal state
  const [rejectingApp, setRejectingApp] = useState<SellerApplicationData | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [submittingReject, setSubmittingReject] = useState(false)
  const [approvingId, setApprovingId] = useState<number | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await sellerService.getAdminSellers({
        status: statusFilter,
        search: search.trim() || undefined,
      })
      setApplications(res.data || [])
      if (res.stats) {
        setStats(res.stats)
      }
    } catch (err: any) {
      console.error('Failed to load seller applications:', err)
      toast({ title: err?.message || 'Failed to fetch seller applications', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  const handleApprove = async (app: SellerApplicationData) => {
    setApprovingId(app.id)
    try {
      const res = await sellerService.approveSeller(app.id)
      toast({ title: res.message || `Store "${app.store_name}" approved successfully!`, type: 'success' })
      if (selectedApp?.id === app.id) {
        setSelectedApp(res.data)
      }
      loadData()
    } catch (err: any) {
      toast({ title: err?.message || 'Failed to approve seller application', type: 'error' })
    } finally {
      setApprovingId(null)
    }
  }

  const handleOpenReject = (app: SellerApplicationData) => {
    setRejectingApp(app)
    setRejectionReason('Business verification incomplete or invalid Bakong payout credentials.')
  }

  const handleConfirmReject = async () => {
    if (!rejectingApp) return
    if (!rejectionReason.trim()) {
      toast({ title: 'Please provide a reason for rejection', type: 'error' })
      return
    }

    setSubmittingReject(true)
    try {
      const res = await sellerService.rejectSeller(rejectingApp.id, rejectionReason.trim())
      toast({ title: res.message || `Application for "${rejectingApp.store_name}" rejected.`, type: 'info' })
      setRejectingApp(null)
      setRejectionReason('')
      if (selectedApp?.id === rejectingApp.id) {
        setSelectedApp(res.data)
      }
      loadData()
    } catch (err: any) {
      toast({ title: err?.message || 'Failed to reject seller application', type: 'error' })
    } finally {
      setSubmittingReject(false)
    }
  }

  const handleToggleStatus = async (app: SellerApplicationData) => {
    const nextStatus = app.status === 'approved' ? 'suspended' : 'approved'
    try {
      const res = await sellerService.updateStatus(app.id, nextStatus)
      toast({ title: res.message || `Status updated to ${nextStatus}`, type: 'success' })
      if (selectedApp?.id === app.id) {
        setSelectedApp(res.data)
      }
      loadData()
    } catch (err: any) {
      toast({ title: err?.message || 'Failed to update store status', type: 'error' })
    }
  }

  return (
    <DashboardLayout
      roleTitle={t('Super Administrator', 'អ្នកគ្រប់គ្រងជាន់ខ្ពស់')}
      roleSlug="admin"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <span>{t('Seller Stores & Member Governance', 'ការគ្រប់គ្រងហាង & សមាជិកអ្នកលក់')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {t(
                'Review merchant applications, verify Bakong settlement, and manage store operational status',
                'ត្រួតពិនិត្យពាក្យស្នើសុំបើកហាង ផ្ទៀងផ្ទាត់គណនីបាគង និងគ្រប់គ្រងសិទ្ធិអ្នកលក់'
              )}
            </p>
          </div>
        </div>
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/60 shadow-xs hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('Total Applications', 'ពាក្យស្នើសុំសរុប')}
                </p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.total}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('Registered vendor candidates', 'បេក្ខជនអ្នកលក់បានចុះឈ្មោះ')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Store className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-amber-500/30 bg-amber-500/5 shadow-xs hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  {t('Pending Review', 'រង់ចាំការពិនិត្យ')}
                </p>
                <h3 className="text-2xl font-bold mt-1 text-amber-900 dark:text-amber-300">
                  {stats.pending}
                </h3>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
                  {t('Requires your review & approval', 'ត្រូវការការត្រួតពិនិត្យ និងអនុម័ត')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-xs hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  {t('Approved & Active', 'បានអនុម័ត & កំពុងដំណើរការ')}
                </p>
                <h3 className="text-2xl font-bold mt-1 text-emerald-900 dark:text-emerald-300">
                  {stats.approved}
                </h3>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                  {t('Unlocked SELLER portal role', 'ទទួលបានសិទ្ធិ SELLER ពេញលេញ')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-rose-500/30 bg-rose-500/5 shadow-xs hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  {t('Rejected / Suspended', 'បានបដិសេធ / ផ្អាក')}
                </p>
                <h3 className="text-2xl font-bold mt-1 text-rose-900 dark:text-rose-300">
                  {stats.rejected}
                </h3>
                <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-1">
                  {t('Declined or suspended stores', 'ហាងដែលត្រូវបានផ្អាក ឬបដិសេធ')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <XCircle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search Control Bar */}
        <Card className="border border-border/60">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl overflow-x-auto w-full md:w-auto">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="rounded-lg text-xs font-semibold h-8"
                >
                  {t('All Sellers', 'ទាំងអស់')} ({stats.total})
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                  className="rounded-lg text-xs font-semibold h-8 relative"
                >
                  <span className="flex items-center gap-1.5">
                    {t('Pending', 'រង់ចាំ')}
                    {stats.pending > 0 && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                        {stats.pending}
                      </span>
                    )}
                  </span>
                </Button>
                <Button
                  variant={statusFilter === 'approved' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('approved')}
                  className="rounded-lg text-xs font-semibold h-8"
                >
                  {t('Approved', 'បានអនុម័ត')} ({stats.approved})
                </Button>
                <Button
                  variant={statusFilter === 'rejected' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('rejected')}
                  className="rounded-lg text-xs font-semibold h-8"
                >
                  {t('Rejected', 'បានបដិសេធ')} ({stats.rejected})
                </Button>
              </div>

              {/* Search & Refresh */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-80">
                  <Input
                    type="text"
                    placeholder={t('Search store, applicant, phone...', 'ស្វែងរកឈ្មោះហាង ម្ចាស់ ឬលេខទូរស័ព្ទ...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 h-9 text-xs rounded-xl"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                </form>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl shrink-0"
                  onClick={loadData}
                  disabled={loading}
                  title="Refresh list"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications List */}
        <Card className="border border-border/60">
          <CardHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <span>{t('Registered Merchant Candidates', 'បញ្ជីបេក្ខជនអ្នកលក់')}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({applications.length} {t('applications loaded', 'ពាក្យស្នើសុំ')})
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm">{t('Loading seller applications...', 'កំពុងទាញយកទិន្នន័យពាក្យស្នើសុំ...')}</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <Store className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <h4 className="text-base font-semibold text-foreground">
                  {t('No Seller Applications Found', 'មិនមានពាក្យស្នើសុំអ្នកលក់នៅឡើយទេ')}
                </h4>
                <p className="text-xs max-w-md mx-auto">
                  {statusFilter !== 'all'
                    ? t(`No applications in "${statusFilter}" status matching your criteria.`, `មិនមានពាក្យស្នើសុំស្ថិតក្នុងស្ថានភាព "${statusFilter}" ទេ។`)
                    : t('When users submit store registration via /sell, they will appear here for admin review.', 'នៅពេលអតិថិជនចុះឈ្មោះតាម /sell នោះពាក្យស្នើសុំនឹងបង្ហាញនៅទីនេះ។')}
                </p>
              </div>
            ) : (
              <div className="dashboard-table-scroll seller-applications-table-scroll pb-2">
                <table className="dashboard-data-table seller-applications-table w-full min-w-[1400px] table-auto text-left text-sm">
                  <colgroup>
                    <col className="w-[250px]" />
                    <col className="w-[220px]" />
                    <col className="w-[225px]" />
                    <col className="w-[205px]" />
                    <col className="w-[155px]" />
                    <col className="w-[285px]" />
                  </colgroup>
                  <thead className="bg-muted/40 border-b text-muted-foreground font-bold text-xs tracking-normal">
                    <tr>
                      <th className="px-5 py-4">{t('Store & Category', 'ហាង និងប្រភេទ')}</th>
                      <th className="px-5 py-4">{t('Applicant Member', 'សមាជិកដាក់ពាក្យ')}</th>
                      <th className="px-5 py-4">{t('Location & Contact', 'ទីតាំង និងទំនាក់ទំនង')}</th>
                      <th className="px-5 py-4">{t('Bakong Settlement', 'គណនីទូទាត់ Bakong')}</th>
                      <th className="px-5 py-4">{t('Status', 'ស្ថានភាព')}</th>
                      <th className="px-5 py-4 text-right">{t('Governance Actions', 'សកម្មភាពគ្រប់គ្រង')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {applications.map((app) => {
                      const isPending = app.status === 'pending'
                      const isApproved = app.status === 'approved'
                      const isRejected = app.status === 'rejected'
                      const isSuspended = app.status === 'suspended'

                      return (
                        <tr
                          key={app.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          {/* Store Name & Category */}
                          <td className="px-5 py-5 align-top">
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 rounded-xl border bg-muted/60 overflow-hidden flex items-center justify-center shrink-0">
                                {app.logo_url ? (
                                  <img
                                    src={app.logo_url}
                                    alt={app.store_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Store className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-foreground text-[15px] leading-6 flex items-center gap-1.5">
                                  <span>{app.store_name}</span>
                                  {isApproved && (
                                    <span title="Verified Seller">
                                      <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs leading-5 text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
                                  <span className="font-mono text-primary/80">@{app.slug}</span>
                                  <span>•</span>
                                  <span className="capitalize">{app.category || t('General Store', 'ហាងទូទៅ')}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Applicant Member */}
                          <td className="px-5 py-5 align-top">
                            <div className="space-y-0.5">
                              <div className="font-medium text-foreground text-sm leading-6 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{app.user?.name || 'Member #' + app.user_id}</span>
                              </div>
                              <div className="text-xs leading-5 text-muted-foreground flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="truncate max-w-[190px]">{app.user?.email || t('No email', 'មិនមានអ៊ីមែល')}</span>
                              </div>
                            </div>
                          </td>

                          {/* Location & Contact */}
                          <td className="px-5 py-5 align-top">
                            <div className="space-y-0.5">
                              <div className="font-medium text-foreground text-sm leading-6 flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-mono">{app.phone}</span>
                              </div>
                              <div className="text-xs leading-5 text-muted-foreground flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{app.city || t('Cambodia', 'កម្ពុជា')}</span>
                              </div>
                            </div>
                          </td>

                          {/* Bakong Settlement Info */}
                          <td className="px-5 py-5 align-top">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm leading-6 flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>{app.bank_name || 'Bakong KHQR'}</span>
                              </div>
                              <div className="text-xs leading-5 font-mono text-muted-foreground">
                                {app.bakong_account_id ? (
                                  <span className="bg-muted px-1.5 py-0.5 rounded">
                                    {app.bakong_account_id}
                                  </span>
                                ) : (
                                  <span className="italic text-muted-foreground/60">{t('Not set', 'មិនទាន់កំណត់')}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-5 align-top">
                            {isPending && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold gap-1 text-xs leading-5">
                                <Clock className="h-3 w-3 animate-spin" />
                                {t('Under Review', 'រង់ចាំពិនិត្យ')}
                              </Badge>
                            )}
                            {isApproved && (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold gap-1 text-xs leading-5">
                                <CheckCircle2 className="h-3 w-3" />
                                {t('Approved & Active', 'បានអនុម័ត')}
                              </Badge>
                            )}
                            {isRejected && (
                                <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold gap-1 text-xs leading-5">
                                <XCircle className="h-3 w-3" />
                                {t('Rejected', 'បានបដិសេធ')}
                              </Badge>
                            )}
                            {isSuspended && (
                                <Badge variant="outline" className="bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30 font-semibold gap-1 text-xs leading-5">
                                <AlertCircle className="h-3 w-3" />
                                {t('Suspended', 'បានផ្អាក')}
                              </Badge>
                            )}
                          </td>

                          {/* Governance Action Buttons */}
                          <td className="px-5 py-5 text-right align-top">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {/* View Details */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedApp(app)}
                                className="h-8 px-2.5 text-xs rounded-lg"
                                title="View Store Profile & KYC"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                <span>{t('View', 'មើល')}</span>
                              </Button>

                              {/* Pending State Actions: Approve & Reject */}
                              {isPending && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(app)}
                                    disabled={approvingId === app.id}
                                    className="h-8 px-2.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                    title="Approve application and promote user to SELLER role"
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" />
                                    <span>{approvingId === app.id ? t('Approving...', 'កំពុងអនុម័ត...') : t('Approve', 'អនុម័ត')}</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenReject(app)}
                                    className="h-8 px-2.5 text-xs rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                    title="Reject application"
                                  >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    <span>{t('Reject', 'បដិសេធ')}</span>
                                  </Button>
                                </>
                              )}

                              {/* Active State Actions: Suspend */}
                              {isApproved && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(app)}
                                  className="h-8 px-2.5 text-xs rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  title="Temporarily suspend store"
                                >
                                  {t('Suspend', 'ផ្អាក')}
                                </Button>
                              )}

                              {/* Suspended/Rejected State Actions: Reactivate / Re-Approve */}
                              {(isSuspended || isRejected) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApprove(app)}
                                  disabled={approvingId === app.id}
                                  className="h-8 px-2.5 text-xs rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  title="Re-approve seller"
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  <span>{t('Re-Approve', 'អនុម័តឡើងវិញ')}</span>
                                </Button>
                              )}
                            </div>
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

        {/* Detail & KYC Modal */}
        {selectedApp && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/40">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-base text-foreground">
                    {t('Store & Member KYC Profile', 'ប្រវត្តិហាង & ព័ត៌មានផ្ទៀងផ្ទាត់')}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedApp(null)}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Banner & Logo */}
                <div className="relative rounded-xl overflow-hidden border bg-muted/50 h-32 flex items-center justify-center">
                  {selectedApp.banner_url ? (
                    <img
                      src={selectedApp.banner_url}
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Store className="h-4 w-4" />
                      <span>{t('Default Store Banner', 'បដាហាងលំនាំដើម')}</span>
                    </div>
                  )}

                  <div className="absolute left-6 -bottom-0 translate-y-1/3 h-16 w-16 rounded-xl border-2 border-background bg-card overflow-hidden shadow-md flex items-center justify-center">
                    {selectedApp.logo_url ? (
                      <img
                        src={selectedApp.logo_url}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <span>{selectedApp.store_name}</span>
                      {selectedApp.status === 'approved' && (
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      slug: <span className="font-mono text-primary">tyushop.blog/stores/{selectedApp.slug}</span>
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`capitalize font-semibold text-xs ${
                      selectedApp.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : selectedApp.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {selectedApp.status}
                  </Badge>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">
                    {t('Store Description', 'ការពិពណ៌នាអំពីហាង')}
                  </h4>
                  <p className="text-xs text-foreground bg-muted/30 p-3 rounded-xl border leading-relaxed">
                    {selectedApp.description || t('No description provided by merchant candidate.', 'មិនមានការពិពណ៌នាពីបេក្ខជន។')}
                  </p>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 border p-3 rounded-xl">
                    <span className="text-muted-foreground font-medium">{t('Applicant Member', 'សមាជិកស្នើសុំ')}</span>
                    <p className="font-semibold text-foreground text-sm">{selectedApp.user?.name || 'User #' + selectedApp.user_id}</p>
                    <p className="text-muted-foreground">{selectedApp.user?.email}</p>
                  </div>

                  <div className="space-y-1 border p-3 rounded-xl">
                    <span className="text-muted-foreground font-medium">{t('Phone & Telegram', 'ទូរស័ព្ទ & Telegram')}</span>
                    <p className="font-mono font-semibold text-foreground">{selectedApp.phone}</p>
                    <p className="text-primary font-mono">{selectedApp.telegram_username ? `@${selectedApp.telegram_username}` : 'No telegram'}</p>
                  </div>

                  <div className="space-y-1 border p-3 rounded-xl">
                    <span className="text-muted-foreground font-medium">{t('City & Address', 'ខេត្ត/ក្រុង & អាសយដ្ឋាន')}</span>
                    <p className="font-semibold text-foreground">{selectedApp.city || 'Cambodia'}</p>
                    <p className="text-muted-foreground">{selectedApp.address || 'Standard Storefront'}</p>
                  </div>

                  <div className="space-y-1 border p-3 rounded-xl bg-emerald-500/5 border-emerald-500/20">
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">{t('Bakong Settlement', 'គណនីទូទាត់បាគង')}</span>
                    <p className="font-bold text-foreground">{selectedApp.bank_name || 'Bakong KHQR'}</p>
                    <p className="font-mono text-emerald-600 dark:text-emerald-400">{selectedApp.bakong_account_id || 'Not set'}</p>
                  </div>
                </div>

                {selectedApp.rejection_reason && (
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
                    <p className="font-semibold flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      {t('Previous Rejection Reason', 'មូលហេតុនៃការបដិសេធកន្លងមក')}
                    </p>
                    <p>{selectedApp.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer with Actions */}
              <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)} className="text-xs">
                  {t('Close', 'បិទ')}
                </Button>

                <div className="flex items-center gap-2">
                  {selectedApp.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReject(selectedApp)}
                        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        {t('Reject', 'បដិសេធ')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(selectedApp)}
                        disabled={approvingId === selectedApp.id}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {approvingId === selectedApp.id ? t('Approving...', 'កំពុងអនុម័ត...') : t('Approve Store', 'អនុម័តហាង')}
                      </Button>
                    </>
                  )}
                  {selectedApp.status === 'approved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(selectedApp)}
                      className="text-xs text-amber-600 border-amber-200"
                    >
                      {t('Suspend Store', 'ផ្អាកដំណើរការ')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Dialog */}
        {rejectingApp && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-bold text-base text-foreground">
                  {t('Reject Seller Application', 'បដិសេធពាក្យស្នើសុំ')}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  `Provide a clear reason why "${rejectingApp.store_name}" cannot be approved at this time. The merchant candidate will see this feedback.`,
                  `សូមបញ្ជាក់មូលហេតុដែលមិនអាចអនុម័តហាង "${rejectingApp.store_name}" បាន។ បេក្ខជននឹងឃើញមូលហេតុនេះ។`
                )}
              </p>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  {t('Reason for Rejection', 'មូលហេតុនៃការបដិសេធ')}
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full text-xs rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  placeholder="e.g. Phone number unverified, invalid Bakong KHQR ID, or incomplete business documentation."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingApp(null)}
                  disabled={submittingReject}
                  className="text-xs"
                >
                  {t('Cancel', 'បោះបង់')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmReject}
                  disabled={submittingReject}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  {submittingReject ? t('Rejecting...', 'កំពុងបដិសេធ...') : t('Confirm Rejection', 'យល់ព្រមបដិសេធ')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
