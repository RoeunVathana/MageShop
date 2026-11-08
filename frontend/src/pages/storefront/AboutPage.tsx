import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Users,
  Globe,
  Cpu,
  Gift,
  Truck,
  Heart,
  Headphones,
  ArrowRight,
  Award,
  Building2,
  MapPin,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { storeSettingsService, type StoreCurrencySettings } from '@/services/storeSettings.service'

export function AboutPage() {
  const { t } = useShopEngagement()
  const [settings, setSettings] = useState<StoreCurrencySettings | null>(null)

  useEffect(() => {
    storeSettingsService.getPublicSettings().then(setSettings)
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      <div className="border-b pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <div className="text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">{t('Home', 'ទំព័រដើម')}</Link> /{' '}
            <span className="text-foreground font-medium">{t('About TYUSHOP', 'អំពី TYUSHOP')}</span>
          </div>
          <Badge className="bg-primary/15 text-primary text-xs font-bold">
            {t('Cambodia & Southeast Asia Flagship Multi-Vendor Marketplace', 'ផ្សារទំនើបពហុវិស័យឈានមុខគេប្រចាំប្រទេសកម្ពុជា')}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black">
            {t('About TYUSHOP & Supporter Ecosystem', 'អំពី TYUSHOP និងប្រព័ន្ធគាំទ្រអតិថិជន')}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(
              'TYUSHOP unites 26 universal product departments, instant Bakong KHQR payments, a generous 100-Point Free Item Loyalty Program, and Real-Time Satellite GPS Delivery Tracking in one secure platform.',
              'TYUSHOP ប្រមូលផ្តុំទំនិញ ២៦ ប្រភេទ ការទូទាត់ប្រាក់រហ័សតាម Bakong KHQR កម្មវិធីសន្សំពិន្ទុ ១០០ ពិន្ទុប្តូរទំនិញឥតគិតថ្លៃ និងការតាមដានការដឹកជញ្ជូនតាមផ្កាយរណប GPS ផ្ទាល់ក្នុងប្រព័ន្ធតែមួយ។'
            )}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/products">
              <Button className="rounded-xl gap-2 text-xs font-bold">
                {t('Explore Catalog', 'មើលទំនិញទាំងអស់')} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/track-order">
              <Button variant="outline" className="rounded-xl gap-2 text-xs font-bold">
                <Truck className="w-4 h-4 text-primary" /> {t('Watch Live GPS Delivery', 'តាមដានការដឹកជញ្ជូន GPS')}
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="rounded-xl gap-2 text-xs font-bold">
                <Headphones className="w-4 h-4 text-emerald-500" /> {t('Contact 24/7 Supporter', 'ទាក់ទងជំនួយ 24/7')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="p-4 rounded-2xl border bg-card text-center">
            <div className="text-2xl font-black text-primary">+5 Pts</div>
            <div className="text-[11px] text-muted-foreground">{t('Earned Every Purchase', 'ទទួលបានរាល់ការទិញ')}</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card text-center">
            <div className="text-2xl font-black text-emerald-500">100 Pts</div>
            <div className="text-[11px] text-muted-foreground">{t('Free Item Under $20–$30', 'ទំនិញឥតគិតថ្លៃ $20–$30')}</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card text-center">
            <div className="text-2xl font-black text-purple-500">24/7</div>
            <div className="text-[11px] text-muted-foreground">{t('Live Supporter & GPS', 'ជំនួយ និង GPS ផ្ទាល់')}</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card text-center">
            <div className="text-2xl font-black text-amber-500">100%</div>
            <div className="text-[11px] text-muted-foreground">{t('Buyer Protection', 'ការធានាជូនអ្នកទិញ')}</div>
          </div>
        </div>
      </div>

      {/* Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-amber-500/10 text-amber-500">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">{t('100-Point Free Rewards', 'រង្វាន់ទំនិញឥតគិតថ្លៃ ១០០ ពិន្ទុ')}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                'Every purchase automatically awards +5 Loyalty Points. Collect 100 points to redeem any eligible product priced under $20–$30 for FREE ($0.00)!',
                'រាល់ការបញ្ជាទិញទទួលបាន +៥ ពិន្ទុដោយស្វ័យប្រវត្តិ។ សន្សំគ្រប់ ១០០ ពិន្ទុដើម្បីប្តូរយកទំនិញតម្លៃ $20–$30 ដោយឥតគិតថ្លៃ ($0.00)!'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-emerald-500/10 text-emerald-500">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">{t('Real-Time GPS Delivery', 'ដឹកជញ្ជូនតាមដាន GPS ផ្ទាល់')}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                'Watch your courier move in real time on our interactive Phnom Penh map with live coordinates, speed, ETA, and direct driver phone contact.',
                'មើលការធ្វើដំណើររបស់អ្នកដឹកជញ្ជូនក្នុងពេលជាក់ស្តែងលើផែនទីរាជធានីភ្នំពេញ ជាមួយនឹងល្បឿន ម៉ោងមកដល់ និងលេខទូរស័ព្ទទាក់ទងផ្ទាល់។'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-purple-500/10 text-purple-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">{t('OWASP Hardened Security', 'ប្រព័ន្ធសុវត្ថិភាពស្តង់ដារ')}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                'Protected by Argon2id hashing, HSTS, Content-Security-Policy, WAF query inspection, Sanctum token scopes, and 24/7 self-healing cloud watchdog.',
                'ការពារដោយការអ៊ិនគ្រីបកម្រិតខ្ពស់ Argon2id, HSTS, Content-Security-Policy និងការត្រួតពិនិត្យសុវត្ថិភាព ២៤ ម៉ោងលើ ២៤ ម៉ោង។'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">{t('24/7 Customer Supporter', 'ជំនួយអតិថិជន ២៤/៧')}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                'Instant live chat assistant and priority ticket routing for order inquiries, discount coupons, and merchant onboarding.',
                'ប្រព័ន្ធជជែកផ្ទាល់ និងការឆ្លើយតបរហ័សសម្រាប់រាល់សំណួរការបញ្ជាទិញ គូប៉ុងបញ្ចុះតម្លៃ និងការចុះឈ្មោះហាងលក់។'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Flagship Headquarters & Location */}
      <div className="rounded-3xl border bg-gradient-to-br from-card to-muted/30 p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary font-bold text-xs">
                <Building2 className="w-3.5 h-3.5 mr-1" />
                {t('Headquarters & Official Office', 'ការិយាល័យកណ្តាល & ទីតាំងផ្លូវការ')}
              </Badge>
              <Badge className="bg-emerald-500/15 text-emerald-600 font-bold text-xs">
                {t('Verified Physical Address', 'អាសយដ្ឋានជាក់ស្តែង')}
              </Badge>
            </div>
            <h2 className="text-2xl font-black text-foreground">
              {settings?.store_name || 'TYUSHOP'} {t('Flagship Center', 'មជ្ឈមណ្ឌលធំ')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={settings?.company_google_maps_url || `https://maps.google.com/?q=${settings?.company_latitude || 11.5564},${settings?.company_longitude || 104.9282}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="rounded-xl text-xs font-bold gap-2">
                <ExternalLink className="w-4 h-4 text-primary" />
                {t('Open Google Maps', 'បើកលើ Google Maps')}
              </Button>
            </a>
            <Link to="/contact">
              <Button className="rounded-xl text-xs font-bold gap-2">
                <MapPin className="w-4 h-4" />
                {t('View Full Map & Contact', 'មើលផែនទី & ទំនាក់ទំនង')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl border bg-background/80 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {t('Headquarters Address', 'អាសយដ្ឋានការិយាល័យកណ្តាល')}
            </span>
            <p className="text-sm font-semibold text-foreground">
              {settings?.store_address || 'Monivong Blvd, BKK1, Chamkarmon, Phnom Penh, Cambodia'}
            </p>
          </div>

          <div className="p-4 rounded-2xl border bg-background/80 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {t('Operating Hours', 'ម៉ោងធ្វើការ')}
            </span>
            <p className="text-sm font-semibold text-foreground">
              {settings?.business_hours || 'Mon - Sun: 08:00 AM - 09:00 PM (24/7 Online Supporter)'}
            </p>
          </div>

          <div className="p-4 rounded-2xl border bg-background/80 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              {t('GPS Coordinates', 'កូអរដោនេ GPS')}
            </span>
            <p className="text-sm font-mono font-semibold text-foreground">
              {settings?.company_latitude || '11.5564'}° N, {settings?.company_longitude || '104.9282'}° E
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
