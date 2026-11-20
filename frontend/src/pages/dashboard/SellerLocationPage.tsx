import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2, MapPin, Navigation, Save, Store } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { sellerService } from '@/services/seller.service'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { sellerNav } from './SellerDashboard'

type LocationForm = {
  city: string
  address: string
  latitude: string
  longitude: string
}

export function SellerLocationPage() {
  const { toast } = useToast()
  const { t } = useShopEngagement()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [storeName, setStoreName] = useState('Your store')
  const [form, setForm] = useState<LocationForm>({ city: '', address: '', latitude: '', longitude: '' })

  useEffect(() => {
    let mounted = true
    sellerService.getLocation()
      .then((response) => {
        if (!mounted) return
        setStoreName(response.data.store_name || 'Your store')
        setForm({
          city: response.data.city || '',
          address: response.data.address || '',
          latitude: response.data.latitude === null || response.data.latitude === undefined ? '' : String(response.data.latitude),
          longitude: response.data.longitude === null || response.data.longitude === undefined ? '' : String(response.data.longitude),
        })
      })
      .catch((error: any) => {
        if (mounted) toast({ title: t('Location unavailable', 'មិនអាចទាញទីតាំងបានទេ'), description: error?.message || t('Only the seller owner can manage this store location.', 'មានតែម្ចាស់ហាងប៉ុណ្ណោះដែលអាចគ្រប់គ្រងទីតាំងហាងនេះបាន។'), type: 'error' })
      })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [toast])

  const coordinates = useMemo(() => {
    if (!form.latitude.trim() || !form.longitude.trim()) return null
    const latitude = Number(form.latitude)
    const longitude = Number(form.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
    return { latitude, longitude }
  }, [form.latitude, form.longitude])

  const mapUrl = coordinates ? `https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}` : null

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: t('GPS unavailable', 'មិនមាន GPS'), description: t('This browser does not provide location access.', 'កម្មវិធីរុករកនេះមិនអាចផ្តល់សិទ្ធិចូលប្រើទីតាំងបានទេ។'), type: 'error' })
      return
    }
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }))
        setDetecting(false)
        toast({ title: t('GPS location detected', 'រកឃើញទីតាំង GPS'), description: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`, type: 'success' })
      },
      (error) => {
        setDetecting(false)
        toast({ title: t('Could not detect GPS', 'មិនអាចរកទីតាំង GPS បានទេ'), description: error.message, type: 'error' })
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const saveLocation = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.city.trim() || !form.address.trim()) {
      toast({ title: t('Location details required', 'ត្រូវការព័ត៌មានទីតាំង'), description: t('Enter the city and full store address before saving.', 'សូមបញ្ចូលទីក្រុង និងអាសយដ្ឋានហាងពេញលេញមុនរក្សាទុក។'), type: 'error' })
      return
    }
    if ((form.latitude.trim() || form.longitude.trim()) && !coordinates) {
      toast({ title: t('Invalid GPS coordinates', 'កូអរដោនេ GPS មិនត្រឹមត្រូវ'), description: t('Latitude must be between -90 and 90 and longitude between -180 and 180.', 'រយៈទទឹងត្រូវនៅចន្លោះ -90 និង 90 ហើយរយៈបណ្ដោយនៅចន្លោះ -180 និង 180។'), type: 'error' })
      return
    }
    setSaving(true)
    try {
      const response = await sellerService.updateLocation({
        city: form.city.trim(),
        address: form.address.trim(),
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
      })
      toast({ title: t('Store location saved', 'បានរក្សាទុកទីតាំងហាង'), description: response.message || t(`${storeName} location was updated.`, `ទីតាំងរបស់ ${storeName} ត្រូវបានកែប្រែ។`), type: 'success' })
    } catch (error: any) {
      toast({ title: t('Could not save location', 'មិនអាចរក្សាទុកទីតាំងបានទេ'), description: error?.message || t('The server did not update this seller location.', 'ម៉ាស៊ីនមេមិនបានកែប្រែទីតាំងហាងនេះទេ។'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout roleTitle="Store Location" roleTitleKm="ទីតាំងហាង" roleSlug="seller" roleColor="text-emerald-500" navItems={sellerNav}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black tracking-tight">{t('Store Location', 'ទីតាំងហាង')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('Manage the address and map coordinates shown for', 'គ្រប់គ្រងអាសយដ្ឋាន និងកូអរដោនេផែនទីសម្រាប់')} {storeName}.</p>
          </div>
          <Badge className="w-fit gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Store className="h-3.5 w-3.5" /> {t('Seller owner only', 'សម្រាប់ម្ចាស់ហាង')}</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-emerald-600" /> {t('Store address and GPS', 'អាសយដ្ឋានហាង និង GPS')}</CardTitle>
            <CardDescription>{t('This location belongs only to your seller store. It does not change the platform headquarters address.', 'ទីតាំងនេះជារបស់ហាងអ្នកតែប៉ុណ្ណោះ។ វាមិនប្តូរអាសយដ្ឋានការិយាល័យកណ្តាលរបស់ប្រព័ន្ធទេ។')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <div className="h-56 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /> : <form onSubmit={saveLocation} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-semibold">{t('City', 'ទីក្រុង')}
                  <Input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder={t('Phnom Penh', 'ភ្នំពេញ')} />
                </label>
                <div className="flex items-end"><Button type="button" variant="outline" onClick={detectLocation} disabled={detecting} className="w-full gap-2 sm:w-auto"><Navigation className="h-4 w-4" /> {detecting ? t('Detecting GPS…', 'កំពុងរក GPS…') : t('Use current location', 'ប្រើទីតាំងបច្ចុប្បន្ន')}</Button></div>
              </div>
              <label className="block space-y-1.5 text-sm font-semibold">{t('Full address', 'អាសយដ្ឋានពេញលេញ')}
                <Input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder={t('Street, district, city, country', 'ផ្លូវ ខណ្ឌ ទីក្រុង ប្រទេស')} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-semibold">{t('Latitude', 'រយៈទទឹង')}
                  <Input type="number" step="any" min="-90" max="90" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} placeholder="11.5564" />
                </label>
                <label className="space-y-1.5 text-sm font-semibold">{t('Longitude', 'រយៈបណ្ដោយ')}
                  <Input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} placeholder="104.9282" />
                </label>
              </div>
              {mapUrl && <div className="flex flex-col justify-between gap-3 rounded-xl border bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-center"><div><p className="font-semibold">{t('Map preview ready', 'ត្រៀមមើលផែនទី')}</p><p className="text-xs text-muted-foreground">{coordinates?.latitude.toFixed(6)}, {coordinates?.longitude.toFixed(6)}</p></div><a href={mapUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">{t('Open Google Maps', 'បើក Google Maps')}</a></div>}
              <div className="flex justify-end"><Button type="submit" disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t('Save location', 'រក្សាទុកទីតាំង')}</Button></div>
            </form>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
