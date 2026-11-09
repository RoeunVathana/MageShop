import { Link } from 'react-router-dom'
import {
  Mail,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  CreditCard,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { useShopEngagement } from '@/context/ShopEngagementContext'

export function Footer() {
  const { t } = useShopEngagement()

  return (
    <footer className="border-t bg-card text-card-foreground">
      {/* Value propositions banner */}
      <div className="border-b bg-muted/40 py-8">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('Reliable Delivery', 'ការដឹកជញ្ជូនរហ័ស')}</p>
              <p className="text-xs text-muted-foreground">
                {t('Nationwide coverage with GPS dispatch', 'គ្របដណ្តប់ទូទាំងប្រទេស និង GPS ផ្ទាល់')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('Buyer Protection', 'ការការពារអតិថិជន')}</p>
              <p className="text-xs text-muted-foreground">
                {t('100% verified authentic multi-vendor', 'ទំនិញសុទ្ធ ១០០% ពីហាងដែលបានបញ្ជាក់')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('Hassle-Free Returns', 'ប្តូរទំនិញងាយស្រួល')}</p>
              <p className="text-xs text-muted-foreground">
                {t('7-day returns on qualifying items', 'ប្តូរទំនិញក្នុងរយៈពេល ៧ ថ្ងៃ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('24/7 Dedicated Support', 'ជំនួយអតិថិជន ២៤/៧')}</p>
              <p className="text-xs text-muted-foreground">
                {t('Expert resolution desk always online', 'ទូរស័ព្ទ hotline 016 555 637 & Telegram')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
        {/* Brand & Mission */}
        <div className="sm:col-span-2 lg:col-span-2 space-y-4">
          <Link to="/" aria-label="TYUSHOP Home">
            <Logo size="md" subtitle={t('Flagship Enterprise Platform', 'ផ្សារទំនើបអនឡាញកម្ពុជា')} />
          </Link>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
            {t(
              'TYUSHOP is a modern multi-vendor e-commerce platform connecting buyers with verified sellers, powered by high-performance Laravel and React architecture.',
              'TYUSHOP គឺជាផ្សារពាណិជ្ជកម្មអេឡិចត្រូនិចទំនើបឈានមុខគេនៅកម្ពុជា ដែលតភ្ជាប់អ្នកទិញជាមួយអ្នកលក់ទំនិញសុទ្ធ ១០០% ជាមួយការទូទាត់បាគង KHQR និងដឹកជញ្ជូនរហ័ស។'
            )}
          </p>

          {/* Newsletter Box */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold">
              {t('Subscribe for vendor promotions & discounts', 'ចុះឈ្មោះទទួលដំណឹងប្រូម៉ូសិនពិសេស')}
            </p>
            <div className="flex gap-2 max-w-sm">
              <Input
                type="email"
                placeholder={t('Enter your email address', 'បញ្ចូលអ៊ីមែលរបស់អ្នក')}
                className="h-10 text-xs rounded-xl"
              />
              <Button size="sm" className="h-10 px-4 text-xs rounded-xl font-bold shrink-0">
                {t('Subscribe', 'ចុះឈ្មោះ')}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
            {t('Explore', 'ស្វែងរក')}
          </h4>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li><Link to="/products" className="hover:text-primary transition-colors">{t('All Products', 'ផលិតផលទាំងអស់')}</Link></li>
            <li><Link to="/categories" className="hover:text-primary transition-colors">{t('Categories', 'ប្រភេទទំនិញ')}</Link></li>
            <li><Link to="/brands" className="hover:text-primary transition-colors">{t('Featured Brands', 'ម៉ាកយីហោល្បីៗ')}</Link></li>
            <li><Link to="/cart" className="hover:text-primary transition-colors">{t('Shopping Cart', 'កន្ត្រកទិញទំនិញ')}</Link></li>
            <li><Link to="/wishlist" className="hover:text-primary transition-colors">{t('My Wishlist', 'ទំនិញពេញចិត្ត')}</Link></li>
          </ul>
        </div>

        {/* Customer Care */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
            {t('Help & Company', 'ក្រុមហ៊ុន និងជំនួយ')}
          </h4>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary transition-colors">{t('About TYUSHOP', 'អំពី TYUSHOP')}</Link></li>
            <li><Link to="/contact" className="hover:text-primary transition-colors">{t('Contact Support', 'ទំនាក់ទំនងជំនួយ')}</Link></li>
            <li><Link to="/faq" className="hover:text-primary transition-colors">{t('Frequently Asked Questions', 'សំណួរញឹកញាប់ (FAQ)')}</Link></li>
            <li><Link to="/track-order" className="hover:text-primary transition-colors">{t('Track Live Delivery', 'តាមដានការដឹកជញ្ជូន GPS')}</Link></li>
            <li><a href="#terms" className="hover:text-primary transition-colors">{t('Terms of Service', 'លក្ខខណ្ឌប្រើប្រាស់')}</a></li>
          </ul>
        </div>

        {/* Customer Account & Services */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
            {t('Customer Services', 'សេវាកម្មអតិថិជន')}
          </h4>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li><Link to="/login" className="hover:text-primary transition-colors">{t('Sign In to Account', 'ចូលគណនី')}</Link></li>
            <li><Link to="/register" className="hover:text-primary transition-colors">{t('Create Free Account', 'បង្កើតគណនីឥតគិតថ្លៃ')}</Link></li>
            <li><Link to="/cart" className="hover:text-primary transition-colors">{t('100-Pt Free Item Rewards', '១០០ ពិន្ទុប្តូរទំនិញ Free')}</Link></li>
            <li><Link to="/wishlist" className="hover:text-primary transition-colors">{t('Saved Favorites', 'ទំនិញពេញចិត្ត')}</Link></li>
            <li><Link to="/contact" className="hover:text-primary transition-colors">{t('24/7 Supporter Desk', 'ជំនួយអតិថិជន ២៤/៧')}</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal bar */}
      <div className="border-t py-6 bg-muted/20">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>{t('© 2026 TYUSHOP Platform. All rights reserved.', '© ២០២៦ TYUSHOP រក្សាសិទ្ធិគ្រប់យ៉ាង។')}</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-primary" />{' '}
              {t('Supported Payments: KHQR Bakong, Visa, Mastercard', 'វិធីទូទាត់៖ បាគង KHQR, វីសា, ម៉ាស្ទ័រកាត')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
