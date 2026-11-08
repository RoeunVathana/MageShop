import React, { useState, useEffect } from 'react'
import {
  Building2,
  MapPin,
  Compass,
  Phone,
  Mail,
  Clock,
  Save,
  RefreshCw,
  ExternalLink,
  Globe,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  FileText,
  Map,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { storeSettingsService } from '@/services/storeSettings.service'

const CAMBODIA_LOCATION_PRESETS = [
  {
    name: 'Phnom Penh (Flagship HQ - Monivong)',
    nameKm: 'រាជធានីភ្នំពេញ (ការិយាល័យកណ្តាល មហាវិថីព្រះមុនីវង្ស)',
    address: 'Preah Monivong Blvd, Sangkat Boeung Keng Kang 1, Khan Chamkarmon, Phnom Penh, Cambodia',
    city: 'Phnom Penh',
    postalCode: '120101',
    lat: 11.5564,
    lng: 104.9282,
  },
  {
    name: 'BKK1 Flagship Hub (Street 310)',
    nameKm: 'បឹងកេងកង ១ (ផ្លូវ ៣១០)',
    address: 'Street 310, Sangkat BKK1, Khan Chamkarmon, Phnom Penh',
    city: 'Phnom Penh',
    postalCode: '120102',
    lat: 11.551,
    lng: 104.9262,
  },
  {
    name: 'Siem Reap Logistics Center',
    nameKm: 'មជ្ឈមណ្ឌលខេត្តសៀមរាប (ក្រុងសៀមរាប)',
    address: 'Sivatha Rd, Krong Siem Reap, Siem Reap Province, Cambodia',
    city: 'Siem Reap',
    postalCode: '17252',
    lat: 13.3671,
    lng: 103.8448,
  },
  {
    name: 'Sihanoukville Express Depot',
    nameKm: 'សាខាកំពង់ផែក្រុងព្រះសីហនុ',
    address: 'Ekareach Street, Sangkat 4, Krong Preah Sihanouk, Cambodia',
    city: 'Sihanoukville',
    postalCode: '18000',
    lat: 10.6275,
    lng: 103.5221,
  },
  {
    name: 'Battambang Regional Branch',
    nameKm: 'សាខាប្រចាំខេត្តបាត់ដំបង',
    address: 'Street 3, Krong Battambang, Battambang Province, Cambodia',
    city: 'Battambang',
    postalCode: '02352',
    lat: 13.0957,
    lng: 103.2022,
  },
]

export function AdminCompanyLocationPage() {
  const { toast } = useToast()
  const { t, language } = useShopEngagement()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detectingGps, setDetectingGps] = useState(false)

  // Form State
  const [storeName, setStoreName] = useState('TYUSHOP Official Flagship')
  const [storeDescription, setStoreDescription] = useState(
    'Cambodia & Southeast Asia Verified Multi-Vendor Flagship Marketplace'
  )
  const [taxId, setTaxId] = useState('KHM-VAT-9024881')
  const [storeAddress, setStoreAddress] = useState(
    'Preah Monivong Blvd, Sangkat Boeung Keng Kang 1, Khan Chamkarmon, Phnom Penh, Cambodia'
  )
  const [city, setCity] = useState('Phnom Penh')
  const [country, setCountry] = useState('Cambodia')
  const [postalCode, setPostalCode] = useState('120101')
  const [latitude, setLatitude] = useState('11.5564')
  const [longitude, setLongitude] = useState('104.9282')
  const [mapEmbedUrl, setMapEmbedUrl] = useState('')
  const [businessHours, setBusinessHours] = useState('Mon - Sun: 8:00 AM - 10:00 PM (24/7 Care Desk)')
  const [contactPhone, setContactPhone] = useState('016 555 637')
  const [supportEmail, setSupportEmail] = useState('Vothanarern@gmail.com')
  const [businessEmail, setBusinessEmail] = useState('business@megacommerce.local')
  const [telegramSupport, setTelegramSupport] = useState('@MegaCommerceSupport')

  // Load initial company settings
  useEffect(() => {
    let mounted = true
    setLoading(true)
    storeSettingsService
      .getAdminSettings()
      .then((data: any) => {
        if (!mounted) return
        if (data.store_name) setStoreName(data.store_name)
        if (data.store_description) setStoreDescription(data.store_description)
        if (data.tax_id) setTaxId(data.tax_id)
        if (data.store_address) setStoreAddress(data.store_address)
        if (data.company_city) setCity(data.company_city)
        if (data.company_country) setCountry(data.company_country)
        if (data.company_postal_code) setPostalCode(data.company_postal_code)
        if (data.company_latitude) setLatitude(String(data.company_latitude))
        if (data.company_longitude) setLongitude(String(data.company_longitude))
        if (data.company_map_embed_url) setMapEmbedUrl(data.company_map_embed_url)
        if (data.business_hours) setBusinessHours(data.business_hours)
        if (data.contact_phone) setContactPhone(data.contact_phone)
        if (data.support_email) setSupportEmail(data.support_email)
        if (data.business_email) setBusinessEmail(data.business_email)
        if (data.telegram_support_contact) setTelegramSupport(data.telegram_support_contact)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const currentLat = Number(latitude) || 11.5564
  const currentLng = Number(longitude) || 104.9282
  const googleMapsDirectionsUrl = `https://maps.google.com/?q=${currentLat},${currentLng}`
  const openStreetMapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    currentLng - 0.015
  }%2C${currentLat - 0.01}%2C${currentLng + 0.015}%2C${
    currentLat + 0.01
  }&layer=mapnik&marker=${currentLat}%2C${currentLng}`

  // Apply location preset
  const handleApplyPreset = (preset: (typeof CAMBODIA_LOCATION_PRESETS)[0]) => {
    setStoreAddress(preset.address)
    setCity(preset.city)
    setPostalCode(preset.postalCode)
    setLatitude(String(preset.lat))
    setLongitude(String(preset.lng))
    toast({
      title: t('Location Preset Applied', 'បានកំណត់ទីតាំងគំរូ'),
      description: preset.name,
      type: 'success',
    })
  }

  // Detect GPS from browser
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      toast({
        title: t('GPS Not Supported', 'ឧបករណ៍មិនគាំទ្រ GPS ទេ'),
        description: t('Your browser does not support geolocation.', 'កម្មវិធីរុករកមិនគាំទ្រការទាញទីតាំងទេ។'),
        type: 'error',
      })
      return
    }

    setDetectingGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6))
        setLongitude(pos.coords.longitude.toFixed(6))
        setDetectingGps(false)
        toast({
          title: t('GPS Coordinates Detected!', 'ចាប់ទីតាំង GPS បានជោគជ័យ!'),
          description: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          type: 'success',
        })
      },
      (err) => {
        setDetectingGps(false)
        toast({
          title: t('GPS Detection Failed', 'មិនអាចចាប់ទីតាំង GPS បានទេ'),
          description: err.message,
          type: 'error',
        })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Save changes
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        store_name: storeName.trim(),
        store_description: storeDescription.trim(),
        tax_id: taxId.trim(),
        store_address: storeAddress.trim(),
        company_city: city.trim(),
        company_country: country.trim(),
        company_postal_code: postalCode.trim(),
        company_latitude: Number(latitude) || 11.5564,
        company_longitude: Number(longitude) || 104.9282,
        company_map_embed_url: mapEmbedUrl.trim(),
        company_google_maps_url: googleMapsDirectionsUrl,
        business_hours: businessHours.trim(),
        contact_phone: contactPhone.trim(),
        support_email: supportEmail.trim(),
        business_email: businessEmail.trim(),
      }

      await storeSettingsService.updateCompanySettings(payload)

      toast({
        title: t('Company Location Saved!', 'បានរក្សាទុកទីតាំងក្រុមហ៊ុនជោគជ័យ!'),
        description: t(
          'Headquarters address and GPS coordinates are now published on storefront contact and maps.',
          'អាសយដ្ឋានការិយាល័យ និងផែនទី GPS ត្រូវបានផ្សាយផ្ទាល់លើគេហទំព័ររួចរាល់។'
        ),
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: t('Failed to save settings', 'មិនអាចរក្សាទុកព័ត៌មានបានទេ'),
        description: err.message,
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout
      roleTitle="Company & Headquarters Location"
      roleSlug="admin"
      roleColor="text-indigo-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6 w-full pb-12">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-bold text-xs uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 mr-1" />
                {t('Headquarters & Real Estate', 'ការិយាល័យកណ្តាល & ទីតាំងក្រុមហ៊ុន')}
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-200 border-none font-bold text-xs">
                {t('● Verified GPS Pin', '● ទីតាំង GPS ផ្ទៀងផ្ទាត់រួច')}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {t('Company Profile & Headquarters Location', 'ប្រវត្តិក្រុមហ៊ុន & ទីតាំងការិយាល័យកណ្តាល')}
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {t(
                'Manage your registered enterprise profile, physical store location, satellite GPS coordinates, and interactive Google Maps pin for buyers and logistics dispatch.',
                'គ្រប់គ្រងព័ត៌មានសហគ្រាស អាសយដ្ឋានហាងផ្ទាល់ កូអរដោនេផ្កាយរណប GPS និងផែនទី Google Maps សម្រាប់អតិថិជន និងការដឹកជញ្ជូន។'
              )}
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Company Info & Location Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Enterprise Profile */}
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 border-b pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  {t('1. Company Enterprise Profile', '១. ព័ត៌មានសហគ្រាសក្រុមហ៊ុន')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('Legal registered name and tax classification for receipts and invoices.', 'ឈ្មោះស្របច្បាប់ និងលេខសម្គាល់សារពើពន្ធលើវិក្កយបត្រ។')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('Company / Store Brand Name', 'ឈ្មោះក្រុមហ៊ុន / ម៉ាកយីហោ')}
                  </label>
                  <Input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="TYUSHOP Official Flagship"
                    className="h-11 rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('Company Tagline & Description', 'ការពិពណ៌នាអំពីក្រុមហ៊ុន')}
                  </label>
                  <Input
                    type="text"
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    placeholder="Cambodia Flagship Multi-Vendor Marketplace"
                    className="h-11 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('Official Tax / VAT Registration ID', 'លេខអត្តសញ្ញាណសារពើពន្ធ (Tax / VAT ID)')}
                  </label>
                  <Input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="KHM-VAT-9024881"
                    className="h-11 rounded-xl text-xs font-mono"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Physical Address & Headquarters Location */}
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 border-b pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  {t('2. Headquarters Physical Address', '២. អាសយដ្ឋានការិយាល័យកណ្តាលជាក់ស្តែង')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('Street address where customers and delivery couriers visit.', 'ទីតាំងផ្ទាល់សម្រាប់អតិថិជនមកទស្សនា ឬអ្នកដឹកជញ្ជូនមកទទួលទំនិញ។')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('Street Address & Landmark', 'អាសយដ្ឋានផ្លូវ និងទីតាំងចំណាំ')}
                  </label>
                  <Input
                    type="text"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    placeholder="Preah Monivong Blvd, Sangkat BKK1, Khan Chamkarmon"
                    className="h-11 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      {t('City / Capital', 'រាជធានី / ខេត្ត')}
                    </label>
                    <Input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Phnom Penh"
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      {t('Country', 'ប្រទេស')}
                    </label>
                    <Input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Cambodia"
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      {t('Postal Code', 'លេខកូដប្រៃសណីយ៍')}
                    </label>
                    <Input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="120101"
                      className="h-11 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t space-y-2">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {t('Quick Presets in Cambodia (Click to apply):', 'ទីតាំងគំរូពេញនិយមក្នុងប្រទេសកម្ពុជា (ចុចដើម្បីជ្រើសរើស)៖')}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {CAMBODIA_LOCATION_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: GPS Coordinates & Google Maps Pin */}
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 border-b pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    {t('3. Satellite GPS Coordinates & Maps', '៣. កូអរដោនេផ្កាយរណប GPS & ផែនទី')}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDetectGps}
                    disabled={detectingGps}
                    className="h-8 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    {detectingGps ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Navigation className="w-3 h-3 text-primary" />
                    )}
                    {t('Detect Current GPS', 'ចាប់ទីតាំង GPS ផ្ទាល់')}
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  {t(
                    'Precision latitude & longitude for live dispatch calculation and navigation.',
                    'កូអរដោនេជាក់លាក់សម្រាប់គណនាចម្ងាយដឹកជញ្ជូន និងការរុករកលើផែនទី។'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      {t('Latitude (អ័ក្សទទឹង)', 'Latitude (អ័ក្សទទឹង)')}
                    </label>
                    <Input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="11.5564"
                      className="h-11 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      {t('Longitude (អ័ក្សបណ្តោយ)', 'Longitude (អ័ក្សបណ្តោយ)')}
                    </label>
                    <Input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="104.9282"
                      className="h-11 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Map className="w-4 h-4 text-primary" />
                      {t('Google Maps Direct Directions Link:', 'តំណភ្ជាប់ទៅកាន់ Google Maps ដោយផ្ទាល់៖')}
                    </span>
                    <a
                      href={googleMapsDirectionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary font-bold text-xs hover:underline"
                    >
                      <span>{t('Open in Google Maps', 'បើកក្នុង Google Maps')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <code className="block p-2 rounded-xl bg-white dark:bg-slate-800 text-[11px] font-mono text-muted-foreground break-all select-all border">
                    {googleMapsDirectionsUrl}
                  </code>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Operating Hours & Direct Contacts */}
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 border-b pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  {t('4. Operating Hours & Direct Supporter Contacts', '៤. ម៉ោងធ្វើការ & ទំនាក់ទំនងផ្ទាល់')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('Displayed on customer invoices, contact page, and footer.', 'បង្ហាញលើវិក្កយបត្រ ទំព័រទំនាក់ទំនង និងផ្នែកខាងក្រោមនៃគេហទំព័រ។')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {t('Store Operating & Support Hours', 'ម៉ោងបើកដំណើរការ & ផ្ដល់សេវា')}
                  </label>
                  <Input
                    type="text"
                    value={businessHours}
                    onChange={(e) => setBusinessHours(e.target.value)}
                    placeholder="Mon - Sun: 8:00 AM - 10:00 PM (24/7 Care)"
                    className="h-11 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      {t('Support Phone Hotline', 'លេខទូរស័ព្ទជំនួយការ')}
                    </label>
                    <Input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="016 555 637"
                      className="h-11 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      {t('Support Email', 'អ៊ីមែលជំនួយការ')}
                    </label>
                    <Input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="Vothanarern@gmail.com"
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      {t('Business Inquiries Email', 'អ៊ីមែលកិច្ចការអាជីវកម្ម')}
                    </label>
                    <Input
                      type="email"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder="business@megacommerce.local"
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      {t('Telegram Support Bot / Handle', 'Telegram Support Handle')}
                    </label>
                    <Input
                      type="text"
                      value={telegramSupport}
                      onChange={(e) => setTelegramSupport(e.target.value)}
                      placeholder="@MegaCommerceSupport"
                      className="h-11 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Live Interactive Map Preview & Customer View (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Interactive Map Box */}
            <Card className="rounded-3xl border shadow-sm overflow-hidden sticky top-20">
              <CardHeader className="bg-slate-900 text-white border-b border-white/10 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    {t('Live Interactive Company Map', 'ផែនទីបង្ហាញទីតាំងក្រុមហ៊ុនជាក់ស្តែង')}
                  </CardTitle>
                  <Badge className="bg-white/10 text-white border-white/20 text-[10px] font-mono">
                    {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
                  </Badge>
                </div>
                <CardDescription className="text-slate-300 text-xs">
                  {t('Satellite pinned to your exact coordinates:', 'ចំណុចសម្គាល់លើកូអរដោនេពិតប្រាកដរបស់អ្នក៖')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Embed Map Iframe */}
                <div className="w-full h-64 sm:h-72 rounded-2xl overflow-hidden border shadow-inner relative bg-slate-100 dark:bg-slate-800">
                  <iframe
                    title="Company Location Map"
                    src={openStreetMapEmbedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                  <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold shadow">
                    TYUSHOP HQ PIN
                  </div>
                </div>

                {/* Customer Location Card Preview */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {t('Storefront Display Preview', 'ទម្រង់បង្ហាញលើគេហទំព័រ')}
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-none text-[10px] font-bold">
                      {t('Live on /contact & /about', 'ផ្សាយផ្ទាល់លើទំព័រ')}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="font-black text-sm text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span>{storeName}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {storeDescription}
                    </p>
                    <div className="flex items-start gap-2 pt-1 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>
                        {storeAddress}, {city}, {country} ({postalCode})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-bold">{contactPhone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{businessHours}</span>
                    </div>
                  </div>

                  <a
                    href={googleMapsDirectionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5 text-primary" />
                    <span>{t('Get Directions in Google Maps', 'ទទួលទិសដៅក្នុង Google Maps')}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </a>
                </div>

                {/* Save button */}
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-12 rounded-2xl text-xs sm:text-sm font-bold gap-2 shadow-lg shadow-primary/25 cursor-pointer"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t('Publish Company Location Live', 'ផ្សាយផ្ទាល់ទីតាំងក្រុមហ៊ុនឥឡូវនេះ')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
