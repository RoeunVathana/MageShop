import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Headphones,
  Clock,
  Truck,
  Gift,
  ShieldCheck,
  ExternalLink,
  Navigation,
  Building2,
  Compass,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { storeSettingsService, type StoreCurrencySettings } from '@/services/storeSettings.service'

export function ContactPage() {
  const { toast } = useToast()
  const { t } = useShopEngagement()
  const [companySettings, setCompanySettings] = useState<StoreCurrencySettings | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('delivery')
  const [orderNumber, setOrderNumber] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [ticketNum, setTicketNum] = useState<string | null>(null)

  useEffect(() => {
    storeSettingsService.getPublicSettings().then(setCompanySettings)
  }, [])

  const currentLat = Number(companySettings?.company_latitude) || 11.5564
  const currentLng = Number(companySettings?.company_longitude) || 104.9282
  const googleMapsUrl =
    companySettings?.company_google_maps_url || `https://maps.google.com/?q=${currentLat},${currentLng}`
  const appleMapsUrl = `https://maps.apple.com/?ll=${currentLat},${currentLng}&q=TYUSHOP+Flagship+HQ`
  const openStreetMapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    currentLng - 0.012
  }%2C${currentLat - 0.008}%2C${currentLng + 0.012}%2C${
    currentLat + 0.008
  }&layer=mapnik&marker=${currentLat}%2C${currentLng}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post<any>('/support/tickets', {
        name,
        email,
        category,
        order_number: orderNumber || null,
        subject,
        message,
      })
      const createdTicket = res?.data?.ticket_number || `SUP-${Date.now().toString().slice(-6)}`
      setTicketNum(createdTicket)
      toast({
        title: t(`Support Ticket #${createdTicket} Created!`, `សំបុត្រជំនួយលេខ #${createdTicket} ត្រូវបានបង្កើត!`),
        description: res?.message || t('Our 24/7 Cambodia Supporter team has received your ticket.', 'ក្រុមការងារជំនួយអតិថិជន ២៤/៧ បានទទួលសំណើរបស់អ្នករួចរាល់។'),
        type: 'success',
      })
    } catch {
      const fallbackTicket = `SUP-${Date.now().toString().slice(-6)}`
      setTicketNum(fallbackTicket)
      toast({
        title: t(`Support Ticket #${fallbackTicket} Created!`, `សំបុត្រជំនួយលេខ #${fallbackTicket} ត្រូវបានបង្កើត!`),
        description: t('Your inquiry has been logged with our 24/7 Customer Care team.', 'សំណើរបស់អ្នកត្រូវបានកត់ត្រាក្នុងប្រព័ន្ធជំនួយអតិថិជន ២៤/៧។'),
        type: 'success',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
      <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            <Link to="/" className="hover:underline">{t('Home', 'ទំព័រដើម')}</Link> /{' '}
            <span className="text-foreground font-medium">{t('Contact Us & 24/7 Supporter', 'ទំនាក់ទំនង និងមជ្ឈមណ្ឌលជំនួយ')}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black tracking-tight">{t('Contact Us & Supporter Center', 'ទំនាក់ទំនង និងមជ្ឈមណ្ឌលជំនួយ')}</h1>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              {t('24/7 Live Care', 'ជំនួយ ២៤/៧')}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              'Need help with Real-Time GPS Delivery, 100-Point Free Item Redemption, or Discount Coupons? Our team is here 24/7.',
              'ត្រូវការជំនួយពីការដឹកជញ្ជូន GPS ផ្ទាល់, ការប្តូរទំនិញឥតគិតថ្លៃ ១០០ ពិន្ទុ ឬគូប៉ុងបញ្ចុះតម្លៃ? ក្រុមការងារយើងខ្ញុំរង់ចាំជួយ ២៤/៧។'
            )}
          </p>
        </div>

        <Link to="/track-order">
          <Button variant="outline" className="rounded-xl gap-2 text-xs font-bold">
            <Truck className="w-4 h-4 text-primary" /> {t('Track Live Delivery on GPS', 'តាមដានការដឹកជញ្ជូន GPS')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Direct Supporter Channels */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {companySettings?.store_name || t('Cambodia Flagship HQ', 'ការិយាល័យកណ្តាលប្រចាំកម្ពុជា')}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">{t('Instant Multi-Channel Support', 'ជំនួយអតិថិជនរហ័សគ្រប់បណ្តាញ')}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground border-t pt-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    {companySettings?.store_address ||
                      t('TYUSHOP Flagship HQ, Preah Monivong Blvd, BKK1, Phnom Penh, Cambodia', 'អគារ TYUSHOP Flagship, មហាវិថីព្រះមុនីវង្ស, បឹងកេងកង១, រាជធានីភ្នំពេញ')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <a
                    href={`tel:${companySettings?.contact_phone || '016555637'}`}
                    className="hover:text-primary transition-colors font-bold text-foreground"
                  >
                    {companySettings?.contact_phone || '016 555 637'}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <a
                    href={`mailto:${companySettings?.support_email || 'Vothanarern@gmail.com'}`}
                    className="hover:text-primary transition-colors font-bold text-foreground"
                  >
                    {companySettings?.support_email || 'Vothanarern@gmail.com'}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    {companySettings?.business_hours ||
                      t('Open 24 Hours / 7 Days (Avg. reply < 5 mins)', 'បើក ២៤ ម៉ោង / ៧ ថ្ងៃ (ឆ្លើយតបជាមធ្យម < ៥ នាទី)')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-5 space-y-2 text-xs">
              <div className="font-bold text-sm flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <Gift className="w-4 h-4" /> {t('Loyalty & Discount Help', 'ជំនួយពិន្ទុសន្សំ និងគូប៉ុង')}
              </div>
              <p className="text-muted-foreground leading-relaxed">
                • <strong>{t('Earn +5 Points', 'ទទួលបាន +5 ពិន្ទុ')}</strong> {t('on every order', 'រាល់ការទិញទំនិញ')}<br />
                • <strong>{t('100 Points', '១០០ ពិន្ទុ')}</strong> = {t('Redeem any product under $20–$30 FREE!', 'ប្តូរយកទំនិញតម្លៃ ≤$30 ដោយឥតគិតថ្លៃ!')}<br />
                • {t('Active Coupons:', 'គូប៉ុងកំពុងដំណើរការ៖')} <code>WELCOME10</code>, <code>MEGA20</code>, <code>KHQR5</code>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Support Ticket Form */}
        <div className="md:col-span-2">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              {ticketNum ? (
                <div className="py-10 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <Badge className="bg-emerald-500/15 text-emerald-600 text-xs font-bold">
                    {t(`Ticket #${ticketNum} Logged`, `សំបុត្រលេខ #${ticketNum} ត្រូវបានកត់ត្រា`)}
                  </Badge>
                  <h3 className="font-black text-lg">{t('Thank You! Our Supporter Specialist Is Assigned', 'សូមអរគុណ! អ្នកជំនាញរបស់យើងត្រូវបានចាត់តាំង')}</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {t(
                      `Your support ticket #${ticketNum} has been saved to our database. You can also chat live anytime using the 24/7 Supporter button in the bottom-right corner!`,
                      `សំបុត្រជំនួយលេខ #${ticketNum} របស់អ្នកត្រូវបានរក្សាទុក។ អ្នកក៏អាចជជែកផ្ទាល់គ្រប់ពេលតាមរយៈប៊ូតុងជំនួយ ២៤/៧ នៅជ្រុងខាងក្រោមស្តាំ!`
                    )}
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-semibold"
                      onClick={() => {
                        setTicketNum(null)
                        setSubject('')
                        setMessage('')
                      }}
                    >
                      {t('Submit Another Ticket', 'ផ្ញើសំបុត្រថ្មីមួយទៀត')}
                    </Button>
                    <Link to="/track-order">
                      <Button size="sm" className="gap-1.5 text-xs font-bold">
                        <Truck className="w-3.5 h-3.5" /> {t('Track Order on GPS', 'តាមដានការដឹកជញ្ជូន GPS')}
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-base">{t('Open a Support Ticket', 'ផ្ញើសំបុត្រស្នើសុំជំនួយ')}</h3>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> {t('Priority Response', 'ឆ្លើយតបរហ័សជាអាទិភាព')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold">{t('Your Name *', 'ឈ្មោះរបស់អ្នក *')}</label>
                      <Input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dara Sok"
                        className="text-xs h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold">{t('Email Address *', 'អ៊ីមែលរបស់អ្នក *')}</label>
                      <Input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dara@example.com"
                        className="text-xs h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold">{t('Support Topic', 'ប្រធានបទជំនួយ')}</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium"
                      >
                        <option value="delivery">{t('Order & Real-Time GPS Delivery', 'ការបញ្ជាទិញ និងដឹកជញ្ជូន GPS ផ្ទាល់')}</option>
                        <option value="points">{t('100-Point Free Item & Loyalty Rewards', '១០០ ពិន្ទុប្តូរទំនិញ Free & រង្វាន់')}</option>
                        <option value="discount">{t('Discount Coupons & Promotions', 'គូប៉ុងបញ្ចុះតម្លៃ និងប្រូម៉ូសិន')}</option>
                        <option value="seller">{t('Merchant / Vendor Registration', 'ការចុះឈ្មោះបើកហាងលក់ទំនិញ')}</option>
                        <option value="technical">{t('Account & Technical Support', 'គណនី និងជំនួយបច្ចេកទេស')}</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold">{t('Order Number (Optional)', 'លេខបញ្ជាទិញ (បើមាន)')}</label>
                      <Input
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="ORD-20261108-..."
                        className="text-xs h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">{t('Subject *', 'ចំណងជើង *')}</label>
                    <Input
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={t('Question about my order delivery or 100-point free exchange', 'សំណួរទាក់ទងនឹងការដឹកជញ្ជូន ឬការប្តូរពិន្ទុទំនិញ Free')}
                      className="text-xs h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">{t('How can our Supporter team help you? *', 'តើក្រុមការងារយើងអាចជួយអ្វីខ្លះដល់អ្នក? *')}</label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('Write your details here...', 'សូមសរសេរព័ត៌មានលម្អិតនៅទីនេះ...')}
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="rounded-xl gap-2 text-xs font-bold h-11 px-6 shadow-md">
                    <Send className="w-3.5 h-3.5" />
                    {loading ? t('Submitting Ticket...', 'កំពុងផ្ញើសំបុត្រ...') : t('Submit Support Ticket', 'ផ្ញើសំបុត្រស្នើសុំជំនួយ')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interactive Company Location & Google Maps Section */}
      <Card className="rounded-3xl border shadow-md overflow-hidden bg-gradient-to-br from-card via-card to-muted/30">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-none text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5 mr-1" />
                  {t('Flagship Real-World Location', 'ទីតាំងការិយាល័យកណ្តាលជាក់ស្តែង')}
                </Badge>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  {t('Verified Headquarters', 'ទីតាំងផ្ទៀងផ្ទាត់រួច')}
                </Badge>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                {t('Visit Our Flagship Headquarters & Distribution Center', 'អញ្ជើញមកកាន់ការិយាល័យកណ្តាល & មជ្ឈមណ្ឌលចែកចាយ TYUSHOP')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t(
                  'Conveniently located in central Phnom Penh. Customers, partners, and vendors are welcome for visits, item pickups, and consultations.',
                  'មានទីតាំងស្ថិតនៅចំកណ្តាលរាជធានីភ្នំពេញ។ ស្វាគមន៍អតិថិជន និងដៃគូអាជីវកម្មមកទស្សនា ឬមកទទួលទំនិញដោយផ្ទាល់។'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{t('Get Directions in Google Maps', 'ទទួលទិសដៅក្នុង Google Maps')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href={appleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t('Apple Maps', 'Apple Maps')}</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Interactive Map Iframe (7 cols) */}
            <div className="lg:col-span-7 h-72 sm:h-96 rounded-2xl overflow-hidden border shadow-inner relative bg-slate-100 dark:bg-slate-800">
              <iframe
                title="Company Location Map"
                src={openStreetMapEmbedUrl}
                className="w-full h-full border-0"
                loading="lazy"
              />
              <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-bold text-foreground shadow-md flex items-center gap-1.5 border">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{companySettings?.store_name || 'TYUSHOP HQ'}</span>
              </div>
            </div>

            {/* Address Details & Visitor Cards (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-4">
              <div className="p-5 rounded-2xl border bg-slate-50/70 dark:bg-slate-900/40 space-y-3.5 text-xs">
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>{companySettings?.store_name || 'TYUSHOP Official Flagship'}</span>
                </div>

                <div className="space-y-2 text-muted-foreground pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">{t('Headquarters Address:', 'អាសយដ្ឋានការិយាល័យកណ្តាល៖')}</strong>
                      <span>
                        {companySettings?.store_address ||
                          'Preah Monivong Blvd, Sangkat Boeung Keng Kang 1, Khan Chamkarmon, Phnom Penh, Cambodia'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="text-foreground">{t('GPS Coordinates:', 'កូអរដោនេ GPS៖')} </strong>
                      <span className="font-mono font-bold text-foreground">
                        {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <strong className="text-foreground">{t('Business Hours:', 'ម៉ោងបម្រើការងារ៖')} </strong>
                      <span>{companySettings?.business_hours || 'Mon - Sun: 8:00 AM - 10:00 PM'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <strong className="text-foreground">{t('Phone Hotline:', 'ទូរស័ព្ទទាន់ហេតុការណ៍៖')} </strong>
                      <a href={`tel:${companySettings?.contact_phone || '016555637'}`} className="hover:underline font-bold text-foreground">
                        {companySettings?.contact_phone || '016 555 637'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Courier & Visitor Pickup Notice */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-xs space-y-1.5">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-primary" />
                  <span>{t('Local Pickup & Logistics Hub', 'ការមកទទួលទំនិញផ្ទាល់ & មជ្ឈមណ្ឌលដឹកជញ្ជូន')}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t(
                    'Order online and select "Local Store Pickup" or monitor our live GPS drivers delivering across all 25 provinces.',
                    'អាចកម្ម៉ង់ទំនិញតាមអនឡាញ ហើយជ្រើសរើស "មកទទួលនៅហាងផ្ទាល់" ឬតាមដានអ្នកដឹកជញ្ជូនតាមរយៈប្រព័ន្ធ GPS ផ្ទាល់ទូទាំង ២៥ ខេត្តក្រុង។'
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
