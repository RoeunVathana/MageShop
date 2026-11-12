import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, CreditCard, Pencil, Plus, ShieldCheck, Star, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import {
  paymentAccountsService,
  type MerchantPaymentAccount,
  type PaymentAccountPayload,
} from '@/services/paymentAccounts.service'

interface PaymentAccountsPanelProps {
  adminMode?: boolean
}

const emptyForm: PaymentAccountPayload = {
  account_type: 'bakong',
  bank_name: 'Bakong',
  account_id: '',
  merchant_name: 'TYUSHOP',
  merchant_city: 'Phnom Penh',
  merchant_phone: '',
  currency: 'USD',
  is_active: true,
}

export function PaymentAccountsPanel({ adminMode = false }: PaymentAccountsPanelProps) {
  const { t } = useShopEngagement()
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<MerchantPaymentAccount[]>([])
  const [form, setForm] = useState<PaymentAccountPayload>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const defaultAccount = useMemo(() => accounts.find((account) => account.is_default), [accounts])

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      setAccounts(await paymentAccountsService.list())
    } catch (error: any) {
      toast({
        title: t('Could not load payment accounts', 'មិនអាចទាញយកគណនីទូទាត់បានទេ'),
        description: error?.message || t('Please try again.', 'សូមព្យាយាមម្តងទៀត។'),
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const resetForm = () => {
    setForm({ ...emptyForm })
    setEditingId(null)
  }

  const startEdit = (account: MerchantPaymentAccount) => {
    setEditingId(account.id)
    setForm({
      account_type: account.account_type,
      bank_name: account.bank_name,
      account_id: account.account_id,
      merchant_name: account.merchant_name,
      merchant_city: account.merchant_city,
      merchant_phone: account.merchant_phone || '',
      currency: account.currency,
      is_active: account.is_active,
    })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.account_id.trim() || !form.account_id.includes('@')) {
      toast({
        title: t('Invalid Bakong Account ID', 'គណនី Bakong មិនត្រឹមត្រូវ'),
        description: t('Use the format account@bank, for example vathana@bakong.', 'សូមប្រើទម្រង់ account@bank ឧទាហរណ៍ vathana@bakong។'),
        type: 'error',
      })
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await paymentAccountsService.update(editingId, form)
      } else {
        await paymentAccountsService.create(form)
      }
      await loadAccounts()
      resetForm()
      toast({
        title: editingId ? t('Payment account updated', 'បានកែប្រែគណនីទូទាត់') : t('Payment account added', 'បានបន្ថែមគណនីទូទាត់'),
        description: adminMode
          ? t('The admin default receives admin, fallback, and mixed-seller checkout QR payments.', 'គណនី Admin លំនាំដើមទទួល QR ពី Admin ករណី fallback និងការទិញពីអ្នកលក់ច្រើន។')
          : t('Customers buying only your products will receive a QR for your active default account. If none is configured, checkout uses the admin account.', 'អតិថិជនដែលទិញតែទំនិញរបស់អ្នកនឹងទទួល QR សម្រាប់គណនីលំនាំដើមរបស់អ្នក។ ប្រសិនបើមិនបានកំណត់ នោះប្រើគណនី Admin។'),
        type: 'success',
      })
    } catch (error: any) {
      toast({
        title: t('Payment account save failed', 'ការរក្សាទុកគណនីទូទាត់បានបរាជ័យ'),
        description: error?.message || t('Please check the account details.', 'សូមពិនិត្យព័ត៌មានគណនីឡើងវិញ។'),
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const makeDefault = async (account: MerchantPaymentAccount) => {
    try {
      await paymentAccountsService.makeDefault(account.id)
      await loadAccounts()
      toast({
        title: t('Default account updated', 'បានកំណត់គណនីលំនាំដើម'),
        description: adminMode
          ? t('New customer QR payments will use this account.', 'QR ទូទាត់ថ្មីរបស់អតិថិជននឹងប្រើគណនីនេះ។')
          : t('This account is now your default payout account.', 'គណនីនេះជាគណនីទូទាត់ចំណូលលំនាំដើមរបស់អ្នក។'),
        type: 'success',
      })
    } catch (error: any) {
      toast({ title: t('Could not change default account', 'មិនអាចប្តូរគណនីលំនាំដើមបានទេ'), description: error?.message, type: 'error' })
    }
  }

  const remove = async (account: MerchantPaymentAccount) => {
    if (!window.confirm(t(`Remove ${account.account_id}?`, `តើលុប ${account.account_id} ឬទេ?`))) return
    try {
      await paymentAccountsService.remove(account.id)
      await loadAccounts()
      if (editingId === account.id) resetForm()
      toast({ title: t('Payment account removed', 'បានលុបគណនីទូទាត់'), type: 'success' })
    } catch (error: any) {
      toast({ title: t('Could not remove payment account', 'មិនអាចលុបគណនីទូទាត់បានទេ'), description: error?.message, type: 'error' })
    }
  }

  return (
    <Card className="rounded-3xl border shadow-sm border-indigo-500/20 bg-gradient-to-r from-indigo-50/30 via-card to-cyan-50/20 dark:from-indigo-950/20 dark:to-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-black text-foreground">
                {t('Payment Accounts', 'គណនីទូទាត់')}
                <Badge className="bg-indigo-600 text-[9px] font-bold text-white">{adminMode ? 'ADMIN' : 'SELLER'}</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {adminMode
                  ? t('Add multiple Bakong accounts and choose the admin account used for fallback checkout payments.', 'បន្ថែមគណនី Bakong ច្រើន និងជ្រើសរើសគណនី Admin សម្រាប់ការទូទាត់ fallback។')
                  : t('Manage the Bakong account that receives QR payments for your seller products.', 'គ្រប់គ្រងគណនី Bakong ដែលទទួល QR ពីការទិញទំនិញរបស់អ្នក។')}
              </CardDescription>
            </div>
          </div>
          {editingId === null && (
            <Button type="button" size="sm" onClick={() => setEditingId(0)} className="gap-1.5 rounded-xl">
              <Plus className="h-4 w-4" /> {t('Add account', 'បន្ថែមគណនី')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingId !== null && (
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-indigo-500/20 bg-background/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">{editingId ? t('Edit payment account', 'កែប្រែគណនីទូទាត់') : t('Add payment account', 'បន្ថែមគណនីទូទាត់')}</p>
              <Button type="button" variant="ghost" size="icon" onClick={resetForm} aria-label={t('Cancel', 'បោះបង់')}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{t('Bank / wallet', 'ធនាគារ / កាបូប')}</label>
                <Input value={form.bank_name} onChange={(event) => setForm({ ...form, bank_name: event.target.value })} placeholder="Bakong" className="h-10 rounded-xl text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{t('Bakong Account ID', 'គណនី Bakong ID')}</label>
                <Input value={form.account_id} onChange={(event) => setForm({ ...form, account_id: event.target.value })} placeholder="vathana@bakong" className="h-10 rounded-xl font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{t('Merchant name', 'ឈ្មោះអាជីវកម្ម')}</label>
                <Input value={form.merchant_name} onChange={(event) => setForm({ ...form, merchant_name: event.target.value })} placeholder="TYUSHOP" className="h-10 rounded-xl text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{t('Merchant city', 'ទីក្រុង')}</label>
                <Input value={form.merchant_city} onChange={(event) => setForm({ ...form, merchant_city: event.target.value })} placeholder="Phnom Penh" className="h-10 rounded-xl text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{t('Merchant phone', 'លេខទូរស័ព្ទអាជីវកម្ម')}</label>
                <Input value={form.merchant_phone || ''} onChange={(event) => setForm({ ...form, merchant_phone: event.target.value })} placeholder="855976554143" className="h-10 rounded-xl font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{t('Currency', 'រូបិយប័ណ្ណ')}</label>
                <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as PaymentAccountPayload['currency'] })} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold">
                  <option value="USD">USD</option>
                  <option value="KHR">KHR</option>
                  <option value="BOTH">USD + KHR</option>
                </select>
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold">
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
                {t('Account is active', 'គណនីកំពុងដំណើរការ')}
              </label>
            </div>
            {!adminMode && (
              <p className="text-[11px] text-muted-foreground">
                {t('Your active default account receives QR payments for your products. Bakong API URL and token remain controlled by the platform admin for security.', 'គណនីលំនាំដើមសកម្មរបស់អ្នកនឹងទទួល QR សម្រាប់ទំនិញរបស់អ្នក។ Bakong API URL និង token ត្រូវបានគ្រប់គ្រងដោយ Admin សម្រាប់សុវត្ថិភាព។')}
              </p>
            )}
            <Button type="submit" disabled={saving} className="rounded-xl text-xs font-bold">
              {saving ? t('Saving...', 'កំពុងរក្សាទុក...') : editingId ? t('Save account', 'រក្សាទុកគណនី') : t('Add account', 'បន្ថែមគណនី')}
            </Button>
          </form>
        )}

        {loading && <div className="h-16 animate-pulse rounded-2xl bg-muted" />}
        {!loading && accounts.length === 0 && (
          <div className="rounded-2xl border border-dashed p-5 text-center text-xs text-muted-foreground">
            {t('No payment accounts yet. Add one to enable managed Bakong payouts.', 'មិនទាន់មានគណនីទូទាត់ទេ។ សូមបន្ថែមគណនីមួយដើម្បីបើកការទូទាត់ Bakong។')}
          </div>
        )}
        {!loading && accounts.map((account) => (
          <div key={account.id} className="flex flex-col gap-3 rounded-2xl border bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                {account.is_default ? <Star className="h-4 w-4 fill-current" /> : <ShieldCheck className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-mono text-sm font-black">{account.account_id}</p>
                  {account.is_default && <Badge variant="success" className="text-[10px]">{t('Default', 'លំនាំដើម')}</Badge>}
                  {!account.is_active && <Badge variant="warning" className="text-[10px]">{t('Inactive', 'មិនដំណើរការ')}</Badge>}
                </div>
                <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{account.bank_name} · {account.merchant_name} · {account.currency}</p>
                {adminMode && account.owner && <p className="mt-0.5 text-[11px] text-muted-foreground">Owner: {account.owner.name} ({account.owner.email})</p>}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {!account.is_default && account.is_active && <Button type="button" variant="outline" size="sm" onClick={() => makeDefault(account)} className="gap-1.5 rounded-lg text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> {t('Set default', 'កំណត់លំនាំដើម')}</Button>}
              <Button type="button" variant="outline" size="icon" onClick={() => startEdit(account)} aria-label={t('Edit account', 'កែប្រែគណនី')}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button type="button" variant="destructive" size="icon" onClick={() => remove(account)} aria-label={t('Remove account', 'លុបគណនី')}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
        {defaultAccount && adminMode && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {t('Admin-owned, fallback, and mixed-seller checkouts use this selected default account. Seller-only carts use the seller default when configured.', 'ការទិញពី Admin, fallback និងអ្នកលក់ច្រើនប្រើគណនីលំនាំដើមនេះ។ ការទិញតែពីអ្នកលក់ប្រើគណនីអ្នកលក់ ប្រសិនបើបានកំណត់។')}</p>
        )}
      </CardContent>
    </Card>
  )
}
