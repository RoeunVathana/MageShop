import { useEffect, useState, type FormEvent } from 'react'
import { KeyRound, Loader2, Mail, Phone, Plus, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { sellerNav } from './SellerDashboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { sellerService, type SellerStaffMember } from '@/services/seller.service'

const STAFF_PERMISSION_OPTIONS = [
  { value: 'products.view', label: 'View products', labelKm: 'មើលមុខទំនិញ' },
  { value: 'products.create', label: 'Create products', labelKm: 'បង្កើតមុខទំនិញ' },
  { value: 'products.update', label: 'Update products', labelKm: 'កែប្រែមុខទំនិញ' },
  { value: 'products.delete', label: 'Delete products', labelKm: 'លុបមុខទំនិញ' },
  { value: 'orders.view', label: 'View orders', labelKm: 'មើលការបញ្ជាទិញ' },
  { value: 'orders.update', label: 'Update orders', labelKm: 'កែប្រែការបញ្ជាទិញ' },
  { value: 'delivery.assign', label: 'Assign delivery', labelKm: 'ចាត់តាំងការដឹកជញ្ជូន' },
  { value: 'delivery.update', label: 'Update delivery', labelKm: 'កែប្រែការដឹកជញ្ជូន' },
  { value: 'delivery.location.manage', label: 'Manage delivery locations', labelKm: 'គ្រប់គ្រងទីតាំងដឹកជញ្ជូន' },
  { value: 'delivery.tracking.view', label: 'View live tracking', labelKm: 'មើលការតាមដានបន្តផ្ទាល់' },
] as const

const ALL_STAFF_PERMISSIONS = STAFF_PERMISSION_OPTIONS.map((permission) => permission.value)

export function SellerStaffPage() {
  const { toast } = useToast()
  const { t } = useShopEngagement()
  const [members, setMembers] = useState<SellerStaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{ name: string; email: string; password: string; phone_number: string; permissions: string[] }>({ name: '', email: '', password: '', phone_number: '', permissions: [...ALL_STAFF_PERMISSIONS] })
  const [permissionDrafts, setPermissionDrafts] = useState<Record<number, string[]>>({})
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null)
  const [savingMemberId, setSavingMemberId] = useState<number | null>(null)

  const loadStaff = async () => {
    setLoading(true)
    try {
      const response = await sellerService.getStaff()
      setMembers(response.data || [])
      setPermissionDrafts(Object.fromEntries((response.data || []).map((member) => [member.staff_user_id, member.permissions?.length ? [...member.permissions] : [...ALL_STAFF_PERMISSIONS]])))
    } catch (error: any) {
      toast({ title: t('Staff list unavailable', 'មិនអាចទាញបញ្ជីបុគ្គលិកបានទេ'), description: error?.message || t('The seller staff list could not be loaded.', 'មិនអាចទាញបញ្ជីបុគ្គលិកហាងបានទេ។'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadStaff() }, [])

  const createStaff = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await sellerService.createStaff(form)
      toast({ title: t('Staff added', 'បានបន្ថែមបុគ្គលិក'), description: response.message || t('SELLER_STAFF role assigned automatically.', 'តួនាទី SELLER_STAFF ត្រូវបានកំណត់ដោយស្វ័យប្រវត្តិ។'), type: 'success' })
      setForm({ name: '', email: '', password: '', phone_number: '', permissions: [...ALL_STAFF_PERMISSIONS] })
      await loadStaff()
    } catch (error: any) {
      toast({ title: t('Could not add staff', 'មិនអាចបន្ថែមបុគ្គលិកបានទេ'), description: error?.message || t('The server did not create the staff account.', 'ម៉ាស៊ីនមេមិនបានបង្កើតគណនីបុគ្គលិកទេ។'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const toggleFormPermission = (permission: string) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }))
  }

  const toggleMemberPermission = (memberId: number, permission: string) => {
    setPermissionDrafts((current) => {
      const permissions = current[memberId] || []
      return {
        ...current,
        [memberId]: permissions.includes(permission)
          ? permissions.filter((item) => item !== permission)
          : [...permissions, permission],
      }
    })
  }

  const saveMemberAccess = async (member: SellerStaffMember) => {
    setSavingMemberId(member.staff_user_id)
    try {
      const response = await sellerService.updateStaff(member.staff_user_id, { permissions: permissionDrafts[member.staff_user_id] || [] })
      setMembers((current) => current.map((item) => item.staff_user_id === member.staff_user_id ? (response.data || item) : item))
      setEditingMemberId(null)
      toast({ title: t('Staff access updated', 'បានកែប្រែសិទ្ធិបុគ្គលិក'), description: t(`${member.name} can now use the selected seller tools.`, `${member.name} អាចប្រើឧបករណ៍ហាងដែលបានជ្រើសរើស។`), type: 'success' })
    } catch (error: any) {
      toast({ title: t('Could not update staff access', 'មិនអាចកែប្រែសិទ្ធិបុគ្គលិកបានទេ'), description: error?.message || t('The server did not update this staff member.', 'ម៉ាស៊ីនមេមិនបានកែប្រែបុគ្គលិកនេះទេ។'), type: 'error' })
    } finally {
      setSavingMemberId(null)
    }
  }

  const removeStaff = async (member: SellerStaffMember) => {
    if (!window.confirm(t(`Remove ${member.name} from this seller store?`, `តើលុប ${member.name} ចេញពីហាងនេះមែនទេ?`))) return
    try {
      await sellerService.removeStaff(member.staff_user_id)
      toast({ title: t('Staff removed', 'បានលុបបុគ្គលិក'), description: t(`${member.name} no longer has access to this store.`, `${member.name} លែងមានសិទ្ធិចូលប្រើហាងនេះទៀតហើយ។`), type: 'success' })
      await loadStaff()
    } catch (error: any) {
      toast({ title: t('Could not remove staff', 'មិនអាចលុបបុគ្គលិកបានទេ'), description: error?.message || t('The server did not remove this staff member.', 'ម៉ាស៊ីនមេមិនបានលុបបុគ្គលិកនេះទេ។'), type: 'error' })
    }
  }

  return (
    <DashboardLayout roleTitle="Seller Staff" roleTitleKm="បុគ្គលិកហាង" roleSlug="seller" roleColor="text-emerald-500" navItems={sellerNav}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black tracking-tight">{t('Seller Staff', 'បុគ្គលិកហាង')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('Add trusted staff to manage your products, seller orders, and delivery workflow.', 'បន្ថែមបុគ្គលិកដែលទុកចិត្ត ដើម្បីគ្រប់គ្រងមុខទំនិញ ការបញ្ជាទិញ និងការដឹកជញ្ជូនរបស់ហាង។')}</p>
          </div>
          <Badge className="w-fit gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> {t('Store-scoped access', 'សិទ្ធិតាមហាង')}</Badge>
        </div>

        <Card className="border-emerald-200/70 dark:border-emerald-900/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-emerald-600" /> {t('Add staff account', 'បន្ថែមគណនីបុគ្គលិក')}</CardTitle>
            <CardDescription>{t('The account receives the SELLER_STAFF role automatically and can only work with this store.', 'គណនីនេះទទួលតួនាទី SELLER_STAFF ដោយស្វ័យប្រវត្តិ ហើយអាចធ្វើការបានតែក្នុងហាងនេះ។')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createStaff} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t('Full name', 'ឈ្មោះពេញ')} />
              <div className="relative"><Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="pl-9" placeholder={t('Email address', 'អាសយដ្ឋានអ៊ីមែល')} /></div>
              <div className="relative"><KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input required minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="pl-9" placeholder={t('Temporary password', 'ពាក្យសម្ងាត់បណ្តោះអាសន្ន')} /></div>
              <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={form.phone_number} onChange={(event) => setForm({ ...form, phone_number: event.target.value })} className="pl-9" placeholder={t('Phone (optional)', 'ទូរស័ព្ទ (ជាជម្រើស)')} /></div><Button type="submit" disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t('Add', 'បន្ថែម')}</Button></div>
              <div className="rounded-xl border bg-slate-50/70 p-3 sm:col-span-2 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('Default access for this staff account', 'សិទ្ធិលំនាំដើមសម្រាប់គណនីនេះ')}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {STAFF_PERMISSION_OPTIONS.map((permission) => (
                    <label key={permission.value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.permissions.includes(permission.value)} onChange={() => toggleFormPermission(permission.value)} className="h-4 w-4 accent-emerald-600" />
                      {t(permission.label, permission.labelKm)}
                    </label>
                  ))}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-indigo-600" /> {t('Store staff', 'បុគ្គលិកហាង')} <Badge variant="outline">{members.length}</Badge></CardTitle><CardDescription>{t('Staff access is limited to your seller scope.', 'សិទ្ធិបុគ្គលិកត្រូវបានកំណត់តាមហាងរបស់អ្នក។')}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {loading && <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />}
            {!loading && members.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t('No seller staff accounts yet.', 'មិនទាន់មានគណនីបុគ្គលិកហាងទេ។')}</div>}
            {!loading && members.map((member) => (
              <div key={member.staff_user_id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><div className="flex items-center gap-2"><p className="font-bold">{member.name}</p><Badge variant="outline" className={member.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}>{t(member.status, member.status === 'active' ? 'សកម្ម' : 'ផ្អាក')}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">{member.email}{member.phone_number ? ` · ${member.phone_number}` : ''}</p><p className="mt-2 text-[11px] text-muted-foreground">{member.permissions?.length || 0} {t('store permissions', 'សិទ្ធិហាង')} · {member.roles?.join(', ') || 'SELLER_STAFF'}</p></div>
                <div className="flex flex-wrap gap-2 self-start sm:self-center">
                  <Button type="button" variant="outline" onClick={() => setEditingMemberId((current) => current === member.staff_user_id ? null : member.staff_user_id)} className="gap-1.5"><ShieldCheck className="h-4 w-4" /> {editingMemberId === member.staff_user_id ? t('Close access', 'បិទសិទ្ធិ') : t('Manage access', 'គ្រប់គ្រងសិទ្ធិ')}</Button>
                  <Button type="button" variant="outline" onClick={() => void removeStaff(member)} className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /> {t('Remove', 'លុប')}</Button>
                </div>
                </div>
                {editingMemberId === member.staff_user_id && <div className="mt-4 rounded-xl border-t pt-4 dark:border-slate-800">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('Assigned seller staff permissions', 'សិទ្ធិបុគ្គលិកហាងដែលបានកំណត់')}</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {STAFF_PERMISSION_OPTIONS.map((permission) => {
                      const permissions = permissionDrafts[member.staff_user_id] || []
                      return <label key={permission.value} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" checked={permissions.includes(permission.value)} onChange={() => toggleMemberPermission(member.staff_user_id, permission.value)} className="h-4 w-4 accent-indigo-600" />
                        {t(permission.label, permission.labelKm)}
                      </label>
                    })}
                  </div>
                  <div className="mt-3 flex justify-end"><Button type="button" onClick={() => void saveMemberAccess(member)} disabled={savingMemberId === member.staff_user_id} className="gap-1.5">{savingMemberId === member.staff_user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} {t('Save access', 'រក្សាទុកសិទ្ធិ')}</Button></div>
                </div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
