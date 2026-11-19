import { useEffect, useState, type FormEvent } from 'react'
import { KeyRound, Loader2, Mail, Phone, Plus, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { sellerNav } from './SellerDashboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { sellerService, type SellerStaffMember } from '@/services/seller.service'

export function SellerStaffPage() {
  const { toast } = useToast()
  const [members, setMembers] = useState<SellerStaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone_number: '' })

  const loadStaff = async () => {
    setLoading(true)
    try {
      const response = await sellerService.getStaff()
      setMembers(response.data || [])
    } catch (error: any) {
      toast({ title: 'Staff list unavailable', description: error?.message || 'The seller staff list could not be loaded.', type: 'error' })
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
      toast({ title: 'Staff added', description: response.message || 'SELLER_STAFF role assigned automatically.', type: 'success' })
      setForm({ name: '', email: '', password: '', phone_number: '' })
      await loadStaff()
    } catch (error: any) {
      toast({ title: 'Could not add staff', description: error?.message || 'The server did not create the staff account.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const removeStaff = async (member: SellerStaffMember) => {
    if (!window.confirm(`Remove ${member.name} from this seller store?`)) return
    try {
      await sellerService.removeStaff(member.staff_user_id)
      toast({ title: 'Staff removed', description: `${member.name} no longer has access to this store.`, type: 'success' })
      await loadStaff()
    } catch (error: any) {
      toast({ title: 'Could not remove staff', description: error?.message || 'The server did not remove this staff member.', type: 'error' })
    }
  }

  return (
    <DashboardLayout roleTitle="Seller Staff" roleTitleKm="បុគ្គលិកហាង" roleSlug="seller" roleColor="text-emerald-500" navItems={sellerNav}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Seller Staff</h1>
            <p className="mt-1 text-sm text-muted-foreground">Add trusted staff to manage your products, seller orders, and delivery workflow.</p>
          </div>
          <Badge className="w-fit gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Store-scoped access</Badge>
        </div>

        <Card className="border-emerald-200/70 dark:border-emerald-900/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-emerald-600" /> Add staff account</CardTitle>
            <CardDescription>The account receives the SELLER_STAFF role automatically and can only work with this store.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createStaff} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" />
              <div className="relative"><Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="pl-9" placeholder="Email address" /></div>
              <div className="relative"><KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input required minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="pl-9" placeholder="Temporary password" /></div>
              <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={form.phone_number} onChange={(event) => setForm({ ...form, phone_number: event.target.value })} className="pl-9" placeholder="Phone (optional)" /></div><Button type="submit" disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add</Button></div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-indigo-600" /> Store staff <Badge variant="outline">{members.length}</Badge></CardTitle><CardDescription>Staff access is limited to your seller scope.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {loading && <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />}
            {!loading && members.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No seller staff accounts yet.</div>}
            {!loading && members.map((member) => (
              <div key={member.staff_user_id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><div className="flex items-center gap-2"><p className="font-bold">{member.name}</p><Badge variant="outline" className={member.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}>{member.status}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">{member.email}{member.phone_number ? ` · ${member.phone_number}` : ''}</p><p className="mt-2 text-[11px] text-muted-foreground">{member.permissions?.length || 0} store permissions · {member.roles?.join(', ') || 'SELLER_STAFF'}</p></div>
                <Button type="button" variant="outline" onClick={() => void removeStaff(member)} className="gap-1.5 self-start text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:self-center"><Trash2 className="h-4 w-4" /> Remove</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
