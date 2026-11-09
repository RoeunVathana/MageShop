import React, { useState, useEffect } from 'react'
import {
  Tag,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Percent,
  DollarSign,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { DashboardLayout, type NavItem } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { couponService } from '@/services/coupon.service'
import type { Coupon, CreateCouponPayload, UpdateCouponPayload } from '@/types/coupon.types'

const sellerNav: NavItem[] = [
  { label: 'Store Overview', href: '/dashboard/seller', icon: Tag },
  { label: 'Product Catalog', href: '/admin/products', icon: Tag, badge: 'Catalog' },
  { label: 'Discount Coupons', href: '/dashboard/seller/coupons', icon: Tag, badge: 'Promos' },
  { label: 'Orders & Fulfillment', href: '/dashboard/seller/orders', icon: Tag, badge: '6 pending' },
  { label: 'Revenue & Payouts', href: '/dashboard/seller/payouts', icon: DollarSign },
]

interface CouponListPageProps {
  isSellerView?: boolean
}

export function CouponListPage({ isSellerView = false }: CouponListPageProps) {
  const { toast } = useToast()
  const { t } = useShopEngagement()

  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | '1' | '0'>('all')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [saving, setSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState<{
    code: string
    description: string
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    min_order_amount: number
    max_discount_amount: number | null
    is_active: boolean
    expires_at: string
  }>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 0,
    max_discount_amount: null,
    is_active: true,
    expires_at: '',
  })

  // Delete State
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await couponService.getCoupons({
        search: search || undefined,
        discount_type: typeFilter,
        is_active: statusFilter,
        seller_only: isSellerView,
      })
      setCoupons(res.data)
    } catch (err: any) {
      toast({
        title: t('Error Loading Coupons', 'កំហុសក្នុងការទាញយកគូប៉ុង'),
        description: err?.message || 'Failed to fetch coupons from server.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [typeFilter, statusFilter, isSellerView])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCoupons()
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast({
      title: t('Code Copied', 'បានចម្លងកូដ'),
      description: `Coupon code '${code}' copied to clipboard.`,
      type: 'info',
    })
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleOpenCreate = () => {
    setEditingCoupon(null)
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 15,
      min_order_amount: 0,
      max_discount_amount: null,
      is_active: true,
      expires_at: '',
    })
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      min_order_amount: Number(coupon.min_order_amount || 0),
      max_discount_amount: coupon.max_discount_amount !== null ? Number(coupon.max_discount_amount) : null,
      is_active: Boolean(coupon.is_active),
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
    })
    setIsDialogOpen(true)
  }

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const updated = await couponService.toggleActive(coupon.id)
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, is_active: updated.is_active } : c)))
      toast({
        title: updated.is_active
          ? t('Coupon Activated', 'គូប៉ុងត្រូវបានបើកដំណើរការ')
          : t('Coupon Deactivated', 'គូប៉ុងត្រូវបានបិទ'),
        description: `Coupon '${coupon.code}' is now ${updated.is_active ? 'Active' : 'Inactive'}.`,
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: t('Action Failed', 'បរាជ័យ'),
        description: err?.message || 'Could not toggle coupon status.',
        type: 'error',
      })
    }
  }

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = formData.code.trim().toUpperCase()
    if (!cleanCode) {
      toast({
        title: t('Validation Error', 'កំហុសផ្ទៀងផ្ទាត់'),
        description: 'Coupon code cannot be empty.',
        type: 'error',
      })
      return
    }

    if (formData.discount_type === 'percentage' && (formData.discount_value <= 0 || formData.discount_value > 100)) {
      toast({
        title: t('Invalid Percentage', 'ភាគរយមិនត្រឹមត្រូវ'),
        description: 'Percentage discount must be between 1% and 100%.',
        type: 'error',
      })
      return
    }

    if (formData.discount_type === 'fixed' && formData.discount_value <= 0) {
      toast({
        title: t('Invalid Amount', 'ចំនួនទឹកប្រាក់មិនត្រឹមត្រូវ'),
        description: 'Fixed discount amount must be greater than $0.',
        type: 'error',
      })
      return
    }

    setSaving(true)
    try {
      if (editingCoupon) {
        const payload: UpdateCouponPayload = {
          code: cleanCode,
          description: formData.description || undefined,
          discount_type: formData.discount_type,
          discount_value: Number(formData.discount_value),
          min_order_amount: Number(formData.min_order_amount || 0),
          max_discount_amount: formData.max_discount_amount !== null ? Number(formData.max_discount_amount) : null,
          is_active: formData.is_active,
          expires_at: formData.expires_at || null,
        }
        await couponService.updateCoupon(editingCoupon.id, payload)
        toast({
          title: t('Coupon Updated', 'គូប៉ុងត្រូវបានកែប្រែជោគជ័យ'),
          description: `Coupon '${cleanCode}' updated successfully.`,
          type: 'success',
        })
      } else {
        const payload: CreateCouponPayload = {
          code: cleanCode,
          description: formData.description || undefined,
          discount_type: formData.discount_type,
          discount_value: Number(formData.discount_value),
          min_order_amount: Number(formData.min_order_amount || 0),
          max_discount_amount: formData.max_discount_amount !== null ? Number(formData.max_discount_amount) : null,
          is_active: formData.is_active,
          expires_at: formData.expires_at || null,
        }
        await couponService.createCoupon(payload)
        toast({
          title: t('Coupon Created', 'គូប៉ុងថ្មីត្រូវបានបង្កើតជោគជ័យ'),
          description: `Coupon '${cleanCode}' is now live and ready for customer checkout.`,
          type: 'success',
        })
      }
      setIsDialogOpen(false)
      fetchCoupons()
    } catch (err: any) {
      toast({
        title: t('Save Failed', 'រក្សាទុកបរាជ័យ'),
        description: err?.response?.data?.message || err?.message || 'Could not save coupon.',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingCoupon) return
    setDeleting(true)
    try {
      await couponService.deleteCoupon(deletingCoupon.id)
      toast({
        title: t('Coupon Deleted', 'បានលុបគូប៉ុង'),
        description: `Coupon '${deletingCoupon.code}' has been permanently deleted.`,
        type: 'success',
      })
      setDeletingCoupon(null)
      fetchCoupons()
    } catch (err: any) {
      toast({
        title: t('Delete Failed', 'លុបបរាជ័យ'),
        description: err?.message || 'Could not delete coupon.',
        type: 'error',
      })
    } finally {
      setDeleting(false)
    }
  }

  // Calculate live preview badge text
  const previewBadge = () => {
    const code = formData.code.trim().toUpperCase() || 'PROMO'
    let discountStr = ''
    if (formData.discount_type === 'percentage') {
      discountStr = `${formData.discount_value || 0}% OFF`
    } else {
      discountStr = `$${Number(formData.discount_value || 0).toFixed(2)} OFF`
    }
    const min = Number(formData.min_order_amount || 0)
    if (min > 0) {
      return `${code} (${discountStr} (≥$${min.toFixed(0)}))`
    }
    return `${code} (${discountStr})`
  }

  const activeCount = coupons.filter((c) => c.is_active).length
  const percentageCount = coupons.filter((c) => c.discount_type === 'percentage').length
  const fixedCount = coupons.filter((c) => c.discount_type === 'fixed').length

  return (
    <DashboardLayout
      roleTitle={isSellerView ? 'Seller Merchant Hub' : 'Admin Control Center'}
      roleSlug={isSellerView ? 'seller' : 'admin'}
      roleColor={isSellerView ? 'text-emerald-500' : 'text-purple-500'}
      navItems={isSellerView ? sellerNav : adminNavItems}
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Tag className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">
                {t('Discount Coupons & Promos', 'គូប៉ុងបញ្ចុះតម្លៃ និងប្រូម៉ូសិន')}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                'Create and manage promotional discount vouchers for customer checkout and cart redemption.',
                'បង្កើត និងគ្រប់គ្រងកូដគូប៉ុងបញ្ចុះតម្លៃសម្រាប់អតិថិជនប្រើប្រាស់នៅកន្រ្តកទំនិញ។'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCoupons}
              disabled={loading}
              className="gap-1.5 rounded-xl text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('Refresh', 'ផ្ទុកឡើងវិញ')}</span>
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 rounded-xl text-xs h-9 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('Add New Coupon', 'បន្ថែមគូប៉ុងថ្មី')}</span>
            </Button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="rounded-2xl border shadow-sm bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {t('Total Coupons', 'គូប៉ុងសរុប')}
                </p>
                <p className="text-2xl font-black mt-0.5">{coupons.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {t('Active Coupons', 'កំពុងដំណើរការ')}
                </p>
                <p className="text-2xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
                  {activeCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {t('Percentage Deals', 'បញ្ចុះជាភាគរយ')}
                </p>
                <p className="text-2xl font-black mt-0.5 text-blue-600 dark:text-blue-400">
                  {percentageCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Percent className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {t('Fixed Cash Deals', 'បញ្ចុះជាសាច់ប្រាក់')}
                </p>
                <p className="text-2xl font-black mt-0.5 text-amber-600 dark:text-amber-400">
                  {fixedCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <Card className="rounded-2xl border shadow-sm bg-card/60">
          <CardContent className="p-3.5">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t(
                    'Search coupons by code or description (e.g. VIP30, WELCOME10)...',
                    'ស្វែងរកគូប៉ុងតាមលេខកូដ ឬការពិពណ៌នា...'
                  )}
                  className="w-full pl-9 pr-20 py-2 rounded-xl text-xs bg-muted/40 border focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-[11px] rounded-lg px-2.5"
                >
                  {t('Search', 'ស្វែងរក')}
                </Button>
              </form>

              <div className="flex items-center gap-2 overflow-x-auto">
                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-muted/40 border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">{t('All Types', 'គ្រប់ប្រភេទ')}</option>
                  <option value="percentage">{t('% Percentage Discount', '% បញ្ចុះតម្លៃភាគរយ')}</option>
                  <option value="fixed">{t('$ Fixed Cash Discount', '$ បញ្ចុះសាច់ប្រាក់')}</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-muted/40 border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">{t('All Status', 'គ្រប់ស្ថានភាព')}</option>
                  <option value="1">{t('Active Only', 'ដំណើរការ')}</option>
                  <option value="0">{t('Inactive Only', 'ផ្អាក')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coupons List Table */}
        <Card className="rounded-2xl border shadow-sm overflow-hidden">
          <CardHeader className="p-4 pb-2 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">
                  {t('Active Coupon Directory', 'បញ្ជីកូដគូប៉ុងទាំងអស់')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t(
                    'Coupons listed below are available for customer application in the cart checkout.',
                    'គូប៉ុងខាងក្រោមនេះអាចឱ្យអតិថិជនជ្រើសរើស និងប្រើប្រាស់នៅទំព័រកន្រ្តកទំនិញ។'
                  )}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-bold">
                {coupons.length} {t('Coupons', 'គូប៉ុង')}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">{t('Loading coupon catalog...', 'កំពុងទាញយកទិន្នន័យគូប៉ុង...')}</p>
              </div>
            ) : coupons.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {t('No Coupons Found', 'រកមិនឃើញគូប៉ុងឡើយ')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(
                      'Get started by creating your first promotional discount coupon.',
                      'ចាប់ផ្តើមដោយការបង្កើតកូដគូប៉ុងបញ្ចុះតម្លៃដំបូងរបស់អ្នក។'
                    )}
                  </p>
                </div>
                <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 rounded-xl text-xs font-bold mt-2">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('Create Coupon Now', 'បង្កើតគូប៉ុងឥឡូវនេះ')}</span>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b text-[11px] font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-left">{t('Coupon Code & Preview', 'កូដគូប៉ុង & ទម្រង់បង្ហាញ')}</th>
                      <th className="py-3 px-4 text-left">{t('Discount Value', 'ទំហំបញ្ចុះតម្លៃ')}</th>
                      <th className="py-3 px-4 text-left">{t('Description', 'ការពិពណ៌នា')}</th>
                      <th className="py-3 px-4 text-left">{t('Requirements', 'លក្ខខណ្ឌកំណត់')}</th>
                      <th className="py-3 px-4 text-left">{t('Status', 'ស្ថានភាព')}</th>
                      <th className="py-3 px-4 text-right">{t('Actions', 'សកម្មភាព')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {coupons.map((coupon) => {
                      const isPct = coupon.discount_type === 'percentage'
                      const valDisplay = isPct
                        ? `${coupon.discount_value}% OFF`
                        : `$${Number(coupon.discount_value).toFixed(2)} OFF`
                      const minSpend = Number(coupon.min_order_amount || 0)
                      const maxCap = coupon.max_discount_amount !== null ? Number(coupon.max_discount_amount) : null

                      return (
                        <tr
                          key={coupon.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          {/* Code & Chip Preview */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                                {coupon.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(coupon.code)}
                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy code"
                              >
                                {copiedCode === coupon.code ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="mt-1">
                              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-muted/60 font-semibold text-muted-foreground inline-flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                {coupon.cart_label || `${coupon.code} (${valDisplay}${minSpend > 0 ? ` (≥$${minSpend.toFixed(0)})` : ''})`}
                              </span>
                            </div>
                          </td>

                          {/* Discount Value */}
                          <td className="py-3 px-4">
                            <Badge
                              className={`text-xs font-bold ${
                                isPct
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {valDisplay}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {isPct ? t('Percentage', 'ភាគរយ') : t('Fixed Cash', 'សាច់ប្រាក់សុទ្ធ')}
                            </p>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-4 max-w-[240px]">
                            <p className="font-medium text-foreground truncate">
                              {coupon.description || '—'}
                            </p>
                            {coupon.expires_at ? (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                {t('Expires:', 'ផុតកំណត់៖')}{' '}
                                {new Date(coupon.expires_at).toLocaleDateString()}
                              </p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {t('No Expiry (Never)', 'គ្មានថ្ងៃផុតកំណត់')}
                              </p>
                            )}
                          </td>

                          {/* Requirements */}
                          <td className="py-3 px-4 text-muted-foreground">
                            <div>
                              <span className="font-semibold text-foreground">
                                {minSpend > 0 ? `$${minSpend.toFixed(2)}` : t('None ($0)', 'គ្មាន ($0)')}
                              </span>{' '}
                              <span className="text-[10px] text-muted-foreground">
                                ({t('Min Spend', 'ការទិញអប្បបរមា')})
                              </span>
                            </div>
                            {maxCap !== null && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                {t('Max Discount Cap:', 'បញ្ចុះជាអតិបរមា៖')} ${maxCap.toFixed(2)}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(coupon)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                                coupon.is_active
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-muted/80 text-muted-foreground border-border hover:bg-muted'
                              }`}
                            >
                              {coupon.is_active ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>{t('Active', 'ដំណើរការ')}</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                  <span>{t('Inactive', 'បានផ្អាក')}</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEdit(coupon)}
                                className="h-7 px-2.5 text-xs rounded-lg gap-1"
                                title="Edit Coupon"
                              >
                                <Edit2 className="w-3 h-3 text-primary" />
                                <span className="hidden sm:inline">{t('Edit', 'កែប្រែ')}</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeletingCoupon(coupon)}
                                className="h-7 px-2 text-xs rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/40"
                                title="Delete Coupon"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
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
      </div>

      {/* Create / Edit Coupon Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-card border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              <span>
                {editingCoupon
                  ? t('Edit Discount Coupon', 'កែប្រែគូប៉ុងបញ្ចុះតម្លៃ')
                  : t('Create New Discount Coupon', 'បង្កើតគូប៉ុងបញ្ចុះតម្លៃថ្មី')}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t(
                'Configure discount codes, percentages, minimum cart spend, and customer promotional chips.',
                'កំណត់កូដបញ្ចុះតម្លៃ ភាគរយ ការទិញអប្បបរមា និងទម្រង់បង្ហាញនៅកន្រ្តកទំនិញ។'
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCoupon} className="space-y-4 pt-2">
            {/* Live Customer Cart Chip Preview */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1 text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {t('Live Customer Cart Preview', 'ទម្រង់បង្ហាញផ្ទាល់លើទំព័រកន្រ្តក')}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t('Real-time chip badge', 'ស្លាកសញ្ញាក្នុងកន្រ្តក')}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs px-3 py-1 rounded-full border border-primary bg-primary text-primary-foreground font-bold shadow-sm inline-flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  {previewBadge()}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight pt-0.5">
                {t(
                  'This is exactly how shoppers will see and 1-click apply this coupon at checkout.',
                  'នេះជាទម្រង់ពិតប្រាកដដែលអតិថិជននឹងមើលឃើញ និងចុចប្រើប្រាស់នៅពេលគិតលុយ។'
                )}
              </p>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {t('Coupon Code', 'លេខកូដគូប៉ុង')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. VIP30, MEGA20, WELCOME10, KHQR5"
                className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold tracking-wider bg-muted/40 border focus:outline-none focus:ring-1 focus:ring-primary uppercase"
              />
              <p className="text-[10px] text-muted-foreground">
                {t('Only letters, numbers, hyphens and underscores.', 'ប្រើតែអក្សរ លេខ សញ្ញាដក ឬសញ្ញា _ ប៉ុណ្ណោះ។')}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {t('Description / Promotion Title', 'ការពិពណ៌នា / ចំណងជើងប្រូម៉ូសិន')}
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. 30% VIP Storewide Discount for VIP Shoppers"
                className="w-full px-3 py-2 rounded-xl text-xs bg-muted/40 border focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Discount Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {t('Discount Type', 'ប្រភេទបញ្ចុះតម្លៃ')} <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discount_type: 'percentage' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    formData.discount_type === 'percentage'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>{t('Percentage (%)', 'បញ្ចុះជាភាគរយ (%)')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discount_type: 'fixed' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    formData.discount_type === 'fixed'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{t('Fixed Cash ($)', 'បញ្ចុះសាច់ប្រាក់ ($)')}</span>
                </button>
              </div>
            </div>

            {/* Discount Value with Quick Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  {formData.discount_type === 'percentage'
                    ? t('Discount Percentage (%)', 'ភាគរយបញ្ចុះតម្លៃ (%)')
                    : t('Discount Cash Amount ($)', 'ចំនួនទឹកប្រាក់បញ្ចុះ ($)')}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formData.discount_type === 'percentage' ? 'Max: 100%' : 'USD ($)'}
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={formData.discount_type === 'percentage' ? '100' : '9999'}
                required
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-muted/40 border focus:outline-none focus:ring-1 focus:ring-primary"
              />

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-muted-foreground mr-1">
                  {t('Presets:', 'គំរូរហ័ស៖')}
                </span>
                {formData.discount_type === 'percentage'
                  ? [5, 10, 15, 20, 25, 30, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setFormData({ ...formData, discount_value: pct })}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition-colors ${
                          formData.discount_value === pct
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))
                  : [2, 5, 10, 15, 20, 50].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFormData({ ...formData, discount_value: amt })}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition-colors ${
                          formData.discount_value === amt
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
              </div>
            </div>

            {/* Spend Requirements: Min Order & Max Discount Cap */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">
                  {t('Min Order Spend ($)', 'ការទិញអប្បបរមា ($)')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-muted/40 border focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[9px] text-muted-foreground">
                  {t('Set 0 for no minimum spend.', 'កំណត់ 0 ប្រសិនបើគ្មានអប្បបរមា។')}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">
                  {t('Max Discount Cap ($)', 'បញ្ចុះជាអតិបរមា ($)')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.max_discount_amount !== null ? formData.max_discount_amount : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_discount_amount: e.target.value === '' ? null : parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder={t('Optional cap', 'មិនកំណត់')}
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-muted/40 border focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[9px] text-muted-foreground">
                  {t('Leave empty for unlimited discount.', 'ទុកទទេ ប្រសិនបើមិនកំណត់កម្រិត។')}
                </p>
              </div>
            </div>

            {/* Expiry Date & Active Switch */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">
                  {t('Expiration Date', 'កាលបរិច្ឆេទផុតកំណត់')}
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-muted/40 border focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <label className="text-[11px] font-bold text-foreground block">
                  {t('Active Status', 'ស្ថានភាពដំណើរការ')}
                </label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    formData.is_active
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-muted/40 text-muted-foreground'
                  }`}
                >
                  {formData.is_active ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('Active (Enabled)', 'បើកដំណើរការ')}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{t('Inactive (Disabled)', 'ផ្អាក')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex flex-row items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl text-xs"
              >
                {t('Cancel', 'បោះបង់')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>
                  {editingCoupon
                    ? t('Update Coupon', 'រក្សាទុកការកែប្រែ')
                    : t('Save & Publish Coupon', 'បង្កើត និងផ្សព្វផ្សាយ')}
                </span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deletingCoupon)} onOpenChange={(open) => !open && setDeletingCoupon(null)}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-card border shadow-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-2 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-base font-black text-center">
              {t('Delete Coupon Code?', 'លុបកូដគូប៉ុងនេះមែនទេ?')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center">
              {t(
                `Are you sure you want to permanently delete coupon '${deletingCoupon?.code}'? Shoppers will no longer be able to redeem it.`,
                `តើអ្នកពិតជាចង់លុបកូដគូប៉ុង '${deletingCoupon?.code}' មែនទេ? អតិថិជននឹងមិនអាចប្រើប្រាស់វាបានទៀតឡើយ។`
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 flex flex-row items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingCoupon(null)}
              className="rounded-xl text-xs flex-1"
            >
              {t('Cancel', 'បោះបង់')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDeleteConfirm}
              className="rounded-xl text-xs font-bold gap-1.5 flex-1 bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
            >
              {deleting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>{t('Delete Permanently', 'លុបជារៀងរហូត')}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
