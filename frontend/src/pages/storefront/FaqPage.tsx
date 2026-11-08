import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, HelpCircle, Phone, Truck, Gift, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useShopEngagement } from '@/context/ShopEngagementContext'

export function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const { t } = useShopEngagement()

  const faqs = [
    {
      q: t('What is TYUSHOP?', 'តើ TYUSHOP គឺជាអ្វី?'),
      a: t(
        'TYUSHOP (tyushop.blog) is Cambodia’s premier multi-vendor marketplace connecting shoppers with verified brands, instant Bakong KHQR payments, Cash on Hand on delivery arrival, and live GPS courier tracking.',
        'TYUSHOP (tyushop.blog) គឺជាផ្សារទំនើបអនឡាញឈានមុខគេនៅកម្ពុជា ដែលផ្តល់ជូនទំនិញសុទ្ធ ការទូទាត់តាម Bakong KHQR ឬបង់សាច់ប្រាក់ពេលទំនិញមកដល់ទីតាំង និងការតាមដាន GPS ផ្ទាល់។'
      ),
    },
    {
      q: t(
        'How does the 100-Point Free Item Loyalty Program work?',
        'តើកម្មវិធីសន្សំ ១០០ ពិន្ទុប្តូរទំនិញឥតគិតថ្លៃដំណើរការយ៉ាងដូចម្តេច?'
      ),
      a: t(
        'Every time you place an order on TYUSHOP, you automatically earn +5 Loyalty Points. Once you reach 100 Points, you can exchange them in your Cart for any eligible product priced up to $20–$30 for 100% FREE ($0.00)!',
        'រាល់ពេលអ្នកបញ្ជាទិញទំនិញនៅលើ TYUSHOP អ្នកនឹងទទួលបាន +5 ពិន្ទុដោយស្វ័យប្រវត្តិ។ នៅពេលគ្រប់ ១០០ ពិន្ទុ អ្នកអាចប្តូរយកទំនិញដែលមានតម្លៃក្រោម $20–$30 បានដោយឥតគិតថ្លៃ ($0.00) នៅក្នុងកន្ត្រកទិញទំនិញ!'
      ),
    },
    {
      q: t(
        'Can I pay now or pay Cash on Hand when the delivery arrives at my location?',
        'តើខ្ញុំអាចបង់ប្រាក់ឥឡូវ ឬបង់សាច់ប្រាក់ពេលអ្នកដឹកជញ្ជូនមកដល់ទីតាំងបានទេ?'
      ),
      a: t(
        'Yes! At checkout you can choose either "Pay Now (Bakong KHQR / Card)" for instant settlement, or "Cash on Hand When Delivery Arrives at Location" and pay the driver when your package arrives at your door.',
        'បាទ/ចាស បាន! ពេលគិតប្រាក់ អ្នកអាចជ្រើសរើស "បង់ប្រាក់ឥឡូវ (Bakong KHQR / កាត)" ឬជ្រើសរើស "បង់សាច់ប្រាក់ពេលអ្នកដឹកជញ្ជូនមកដល់ទីតាំង" បានយ៉ាងងាយស្រួល។'
      ),
    },
    {
      q: t(
        'How do I reset my password with a 6-digit OTP code?',
        'តើខ្ញុំអាចកំណត់ពាក្យសម្ងាត់ឡើងវិញដោយប្រើលេខកូដ OTP 6 ខ្ទង់ដោយរបៀបណា?'
      ),
      a: t(
        'Go to /forgot-password, enter your registered email address, and click Send 6-Digit OTP Code. Enter the 6-digit code on the Verify OTP screen to set your new password immediately.',
        'សូមចូលទៅកាន់ទំព័រភ្លេចពាក្យសម្ងាត់ (/forgot-password) បញ្ចូលអ៊ីមែលរបស់អ្នក ហើយចុចផ្ញើលេខកូដ OTP 6 ខ្ទង់ បន្ទាប់មកវាយបញ្ចូលលេខកូដ 6 ខ្ទង់ដើម្បីប្តូរពាក្យសម្ងាត់ថ្មី។'
      ),
    },
    {
      q: t(
        'How can I contact TYUSHOP 24/7 Customer Support?',
        'តើខ្ញុំអាចទាក់ទងផ្នែកជំនួយអតិថិជន 24/7 របស់ TYUSHOP តាមណា?'
      ),
      a: t(
        'You can call our direct hotline at 016 555 637, chat via the 24/7 Supporter widget in the bottom-right corner, or open a priority support ticket on /contact.',
        'អ្នកអាចហៅទូរស័ព្ទមកកាន់លេខ 016 555 637 ឬឆាតផ្ទាល់តាមប្រអប់ 24/7 Supporter នៅជ្រុងខាងក្រោមស្ដាំ ឬផ្ញើសំណើនៅលើទំព័រ /contact។'
      ),
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 space-y-8 max-w-4xl">
      <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            <Link to="/" className="hover:underline">{t('Home', 'ទំព័រដើម')}</Link> /{' '}
            <span className="text-foreground font-medium">{t('FAQ', 'សំណួរញឹកញាប់')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('Frequently Asked Questions', 'សំណួរដែលសួរញឹកញាប់ (FAQ)')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t(
              'Everything you need to know about shopping, 100-Point Free Rewards, and live GPS delivery on TYUSHOP.',
              'ព័ត៌មានសំខាន់ៗអំពីការទិញទំនិញ ការសន្សំ ១០០ ពិន្ទុប្តូរទំនិញឥតគិតថ្លៃ និងការដឹកជញ្ជូន GPS ផ្ទាល់នៅលើ TYUSHOP។'
            )}
          </p>
        </div>

        <a href="tel:016555637">
          <Button variant="outline" className="rounded-xl gap-2 text-xs">
            <Phone className="w-4 h-4 text-primary" /> 016 555 637
          </Button>
        </a>
      </div>

      <div className="space-y-3.5">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx
          return (
            <Card key={idx} className="overflow-hidden border transition-all hover:border-primary/40">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-bold text-sm sm:text-base hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-primary shrink-0" />
                  <span>{faq.q}</span>
                </span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform shrink-0',
                    isOpen && 'rotate-180 text-primary'
                  )}
                />
              </button>
              {isOpen && (
                <CardContent className="px-4 sm:px-5 pb-5 pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t bg-muted/10 pt-3">
                  {faq.a}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <Link to="/track-order" className="p-4 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm">{t('Track Live GPS', 'តាមដាន GPS ផ្ទាល់')}</div>
            <div className="text-xs text-muted-foreground">{t('Real-time courier map', 'មើលទីតាំងអ្នកដឹកជញ្ជូន')}</div>
          </div>
        </Link>

        <Link to="/cart" className="p-4 rounded-2xl border bg-card hover:border-amber-500/50 hover:shadow-md transition-all flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm">{t('100 Pts = Free Item', '១០០ ពិន្ទុ = ឥតគិតថ្លៃ')}</div>
            <div className="text-xs text-muted-foreground">{t('Redeem items ≤ $30', 'ប្តូរទំនិញតម្លៃ ≤ $30')}</div>
          </div>
        </Link>

        <Link to="/contact" className="p-4 rounded-2xl border bg-card hover:border-emerald-500/50 hover:shadow-md transition-all flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm">{t('24/7 Support Desk', 'ជំនួយអតិថិជន 24/7')}</div>
            <div className="text-xs text-muted-foreground">016 555 637</div>
          </div>
        </Link>
      </div>
    </div>
  )
}

