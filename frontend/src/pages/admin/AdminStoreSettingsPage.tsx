import React, { useState, useEffect } from 'react'
import {
  SlidersHorizontal,
  Store,
  Award,
  ShieldCheck,
  FileText,
  Clock,
  Phone,
  Mail,
  MapPin,
  Save,
  RefreshCw,
  Coins,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Building,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { api } from '@/lib/api'

export function AdminStoreSettingsPage() {
  const { t } = useShopEngagement()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form State
  const [form, setForm] = useState({
    store_name: '',
    store_description: '',
    tax_id: '',
    brand_color: '#3b82f6',
    receipt_footer_message: '',
    // Loyalty Program
    loyalty_points_for_free_item: 100,
    loyalty_free_item_max_price: 30,
    // Policies
    return_policy_days: 7,
    shipping_policy: '',
    // Currency
    default_currency: 'USD',
    usd_to_khr_rate: 4100,
    allowed_currencies: 'BOTH',
    // Contact & Office
    contact_phone: '',
    support_email: '',
    business_email: '',
    business_hours: '',
    store_address: '',
    company_city: 'Phnom Penh',
    company_country: 'Cambodia',
    // Telegram
    telegram_bot_username: '',
    telegram_support_contact: '',
  })

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res: any = await api.get('/admin/store-settings')
      const data = res?.data || {}
      setForm({
        store_name: data.store_name || 'TYUSHOP Multi-Vendor Flagship',
        store_description: data.store_description || 'Next-Gen Universal Multi-Vendor E-Commerce Platform',
        tax_id: data.tax_id || 'KHM-VAT-9024881',
        brand_color: data.brand_color || '#3b82f6',
        receipt_footer_message:
          data.receipt_footer_message || 'Thank you for shopping at TYUSHOP! Official Bakong KHQR Verified Invoice.',
        loyalty_points_for_free_item: Number(data.loyalty_points_for_free_item || 100),
        loyalty_free_item_max_price: Number(data.loyalty_free_item_max_price || 30),
        return_policy_days: Number(data.return_policy_days || 7),
        shipping_policy:
          data.shipping_policy || 'Express Same-Day Courier within Phnom Penh. 24-48 hours nationwide provinces.',
        default_currency: data.default_currency || 'USD',
        usd_to_khr_rate: Number(data.usd_to_khr_rate || 4100),
        allowed_currencies: data.allowed_currencies || 'BOTH',
        contact_phone: data.contact_phone || '016 555 637',
        support_email: data.support_email || 'Vothanarern@gmail.com',
        business_email: data.business_email || 'business@tyushop.blog',
        business_hours: data.business_hours || 'Mon - Sun: 8:00 AM - 10:00 PM (24/7 Support Desk)',
        store_address: data.store_address || 'Preah Monivong Blvd, Sangkat Boeung Keng Kang 1, Khan Chamkarmon, Phnom Penh',
        company_city: data.company_city || 'Phnom Penh',
        company_country: data.company_country || 'Cambodia',
        telegram_bot_username: data.telegram_bot_username || 'MegaCommerceAiBot',
        telegram_support_contact: data.telegram_support_contact || '@MegaCommerceSupport',
      })
    } catch (err: any) {
      toast({
        title: t('Error loading store settings', 'កំហុសក្នុងការទាញយកការកំណត់'),
        description: err?.message || 'Could not load store configuration.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch('/admin/store-settings', form)
      toast({
        title: t('Settings Saved', 'បានរក្សាទុកការកំណត់ដោយជោគជ័យ'),
        description: t(
          'Store parameters, loyalty rewards program, and policies have been updated across the platform.',
          'ព័ត៌មានហាង ប្រព័ន្ធរង្វាន់ពិន្ទុ និងគោលការណ៍ត្រូវបានកែប្រែទូទាំងប្រព័ន្ធ។'
        ),
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: t('Save Failed', 'ការរក្សាទុកបានបរាជ័យ'),
        description: err?.message || 'Failed to update store settings.',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout
      roleTitle="Store Configuration"
      roleSlug="admin"
      roleColor="text-indigo-500"
      navItems={adminNavItems}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <SlidersHorizontal className="w-7 h-7 text-indigo-600" />
                <span>{t('Store & System Settings', 'ការកំណត់ហាង & ប្រព័ន្ធទាំងមូល')}</span>
              </h1>
              <Badge className="bg-indigo-600/10 text-indigo-600 border-indigo-600/20 text-xs font-bold">
                {t('Global Controls', 'ការគ្រប់គ្រងសកល')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                'Customize store identity, customer loyalty point rules, return policies, receipt messages, and support channels.',
                'កែប្រែព័ត៌មានអត្តសញ្ញាណហាង ក្បួនពិន្ទុរង្វាន់អតិថិជន គោលការណ៍ប្តូរទំនិញ សារបង្កាន់ដៃ និងបណ្តាញទំនាក់ទំនង។'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchSettings}
              disabled={loading || saving}
              className="rounded-xl h-9 text-xs font-bold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('Reset', 'ផ្ទុកឡើងវិញ')}</span>
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={loading || saving}
              className="rounded-xl h-9 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? t('Saving...', 'កំពុងរក្សាទុក...') : t('Save All Changes', 'រក្សាទុកការផ្លាស់ប្តូរ')}</span>
            </Button>
          </div>
        </div>

        {/* 1. Customer Loyalty & Rewards System */}
        <Card className="rounded-3xl border shadow-sm border-amber-500/30 bg-gradient-to-r from-amber-50/50 via-card to-amber-50/20 dark:from-amber-950/20 dark:to-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-black text-foreground">
                    {t('Customer Loyalty Points & Free Rewards Program', 'ប្រព័ន្ធពិន្ទុសន្សំ & រង្វាន់ទំនិញឥតគិតថ្លៃ')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t(
                      'Shoppers automatically earn +5 pts per completed purchase. When reaching the points threshold, they can claim 1 Free item at checkout.',
                      'អតិថិជនទទួលបាន +៥ ពិន្ទុរាល់ពេលទិញទំនិញ។ ពេលគ្រប់ពិន្ទុកំណត់ ពួកគេអាចប្តូរយកទំនិញឥតគិតថ្លៃ ១ មុខបានភ្លាមៗ។'
                    )}
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-amber-500 text-white text-[10px] font-black">
                {t('Active Rule', 'កំពុងដំណើរការ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {t('Points Required for Free Item Redemption', 'ចំនួនពិន្ទុដើម្បីប្តូរទំនិញឥតគិតថ្លៃ (Points)')}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={form.loyalty_points_for_free_item}
                  onChange={(e) => setForm({ ...form, loyalty_points_for_free_item: Number(e.target.value) })}
                  className="rounded-xl h-10 text-xs font-bold pl-10"
                />
                <Award className="absolute left-3 top-3 h-4 w-4 text-amber-500" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('Default is 100 points. Shoppers can choose 1 free eligible product.', 'លំនាំដើមគឺ ១០០ ពិន្ទុ។')}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {t('Maximum Price Eligible for Free Redemption ($ USD)', 'តម្លៃអតិបរមានៃទំនិញឥតគិតថ្លៃ ($ ដុល្លារ)')}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  max="500"
                  value={form.loyalty_free_item_max_price}
                  onChange={(e) => setForm({ ...form, loyalty_free_item_max_price: Number(e.target.value) })}
                  className="rounded-xl h-10 text-xs font-bold pl-10"
                />
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-emerald-600">$</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t(
                  `Only products priced up to $${form.loyalty_free_item_max_price} will feature the "100-Pt Free Eligible" badge.`,
                  `ទំនិញដែលមានតម្លៃត្រឹម $${form.loyalty_free_item_max_price} នឹងបង្ហាញផ្លាកសញ្ញា "100-Pt Free Eligible"។`
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Store Identity & Branding */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-foreground">
                  {t('Store Identity & Official Brand', 'អត្តសញ្ញាណហាង & ម៉ាកផ្លូវការ')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('Public platform name, description, and official tax identifier.', 'ឈ្មោះវេទិកា ការពិពណ៌នា និងលេខអត្តសញ្ញាណពន្ធ')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {t('Store / Marketplace Name', 'ឈ្មោះហាង / ផ្សារទំនើប')}
                </label>
                <Input
                  type="text"
                  value={form.store_name}
                  onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                  className="rounded-xl h-10 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {t('Tax ID / VAT Registration', 'លេខអត្តសញ្ញាណកម្មសារពើពន្ធ (VAT ID)')}
                </label>
                <Input
                  type="text"
                  value={form.tax_id}
                  onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                  className="rounded-xl h-10 text-xs font-semibold font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {t('Store Slogan / Header Tagline', 'ពាក្យស្លោក / ការពិពណ៌នាសង្ខេប')}
              </label>
              <Input
                type="text"
                value={form.store_description}
                onChange={(e) => setForm({ ...form, store_description: e.target.value })}
                className="rounded-xl h-10 text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {t('Official Receipt Footer Note', 'សារនៅខាងក្រោមបង្កាន់ដៃ PDF')}
              </label>
              <Input
                type="text"
                value={form.receipt_footer_message}
                onChange={(e) => setForm({ ...form, receipt_footer_message: e.target.value })}
                className="rounded-xl h-10 text-xs font-medium"
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Policies & Guarantee */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-foreground">
                  {t('Consumer Protection & Delivery Policies', 'គោលការណ៍ការពារអតិថិជន & ការដឹកជញ្ជូន')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('Customer return guarantee window and shipping timeline.', 'រយៈពេលធានាប្តូរទំនិញ និងពេលវេលាដឹកជញ្ជូន')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {t('Return & Refund Guarantee (Days)', 'រយៈពេលធានាប្តូរទំនិញវិញ (ថ្ងៃ)')}
              </label>
              <Input
                type="number"
                min="0"
                max="90"
                value={form.return_policy_days}
                onChange={(e) => setForm({ ...form, return_policy_days: Number(e.target.value) })}
                className="rounded-xl h-10 text-xs font-bold"
              />
              <p className="text-[11px] text-muted-foreground">
                {t('Set 0 to disable returns. Standard is 7 or 14 days.', 'កំណត់ ០ ប្រសិនបើមិនអនុញ្ញាតឱ្យប្តូរ។')}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {t('Shipping Policy Summary', 'គោលការណ៍ដឹកជញ្ជូនសង្ខេប')}
              </label>
              <Input
                type="text"
                value={form.shipping_policy}
                onChange={(e) => setForm({ ...form, shipping_policy: e.target.value })}
                className="rounded-xl h-10 text-xs font-medium"
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Support Contacts & Working Hours */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-foreground">
                  {t('Customer Support & Headquarters Contact', 'ទំនាក់ទំនងជំនួយអតិថិជន & ការិយាល័យ')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('Official helpline, emails, and operating schedule.', 'លេខទូរស័ព្ទជំនួយ អ៊ីមែលផ្លូវការ និងម៉ោងធ្វើការ')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {t('Helpline Phone Number', 'លេខទូរស័ព្ទទាន់ហេតុការណ៍')}
                </label>
                <Input
                  type="text"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className="rounded-xl h-10 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {t('Customer Support Email', 'អ៊ីមែលជំនួយអតិថិជន')}
                </label>
                <Input
                  type="email"
                  value={form.support_email}
                  onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                  className="rounded-xl h-10 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {t('Business Operating Hours', 'ម៉ោងបម្រើអតិថិជន')}
                </label>
                <Input
                  type="text"
                  value={form.business_hours}
                  onChange={(e) => setForm({ ...form, business_hours: e.target.value })}
                  className="rounded-xl h-10 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {t('Telegram Bot Username', 'ឈ្មោះ Telegram Bot (@)')}
                </label>
                <Input
                  type="text"
                  value={form.telegram_bot_username}
                  onChange={(e) => setForm({ ...form, telegram_bot_username: e.target.value })}
                  className="rounded-xl h-10 text-xs font-semibold font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {t('Telegram Admin / Support Contact', 'គណនី Telegram Support (@)')}
                </label>
                <Input
                  type="text"
                  value={form.telegram_support_contact}
                  onChange={(e) => setForm({ ...form, telegram_support_contact: e.target.value })}
                  className="rounded-xl h-10 text-xs font-semibold font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 p-4 rounded-2xl bg-card border shadow-sm">
          <Button
            type="submit"
            disabled={loading || saving}
            className="rounded-xl h-10 px-6 text-xs font-black gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? t('Saving...', 'កំពុងរក្សាទុក...') : t('Save All Changes', 'រក្សាទុកការផ្លាស់ប្តូរទាំងអស់')}</span>
          </Button>
        </div>
      </form>
    </DashboardLayout>
  )
}
