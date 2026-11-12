import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ShoppingBag,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Truck,
  Shield,
  Pause,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { bannerService, type Banner } from '@/services/banner.service'
import { mediaService } from '@/services/media.service'
import { useShopEngagement } from '@/context/ShopEngagementContext'

const defaultFallbackBanners: Banner[] = [
  {
    id: 1,
    title: 'The Next-Gen Universal Marketplace',
    subtitle:
      'Engineered with modern multi-vendor commerce architecture. Browse 26 universal departments, dynamic specifications, and multi-SKU variants powered by real-time inventory control and instant Bakong KHQR checkout.',
    badge_text: 'Universal Multi-Category Marketplace',
    image_url: '/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg',
    video_url: '/gemini_generated_video_4b7f1e53.mp4',
    link_url: '/products',
    button_text: 'Explore Catalog',
    background_style: 'gradient-primary',
    placement: 'hero',
    sort_order: 1,
    is_active: true,
    clicks_count: 0,
    start_at: null,
    end_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Cambodia Flagship Tech & Mobile Deals',
    subtitle:
      'Official Apple, Sony, Samsung, DJI & tech accessories with nationwide express delivery and 0% fee Bakong KHQR checkout.',
    badge_text: 'Official Tech Flagship',
    image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    video_url: null,
    link_url: '/products?category=electronics-computers',
    button_text: 'Shop Electronics',
    background_style: 'gradient-purple',
    placement: 'hero',
    sort_order: 2,
    is_active: true,
    clicks_count: 0,
    start_at: null,
    end_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// Khmer translations for known banner copy (admin-entered text not listed here is shown as-is)
const BANNER_KM: Record<string, string> = {
  'The Next-Gen Universal Marketplace': 'ផ្សារអនឡាញទំនើបជំនាន់ថ្មី សម្រាប់គ្រប់មុខទំនិញ',
  'Engineered with modern multi-vendor commerce architecture. Browse 26 universal departments, dynamic specifications, and multi-SKU variants powered by real-time inventory control and instant Bakong KHQR checkout.':
    'រចនាឡើងជាមួយប្រព័ន្ធពាណិជ្ជកម្មពហុអ្នកលក់ទំនើប។ ស្វែងរកទំនិញក្នុង ២៦ ផ្នែក ជាមួយលក្ខណៈបច្ចេកទេសលម្អិត ការគ្រប់គ្រងស្តុកភ្លាមៗ និងការទូទាត់រហ័សតាម Bakong KHQR។',
  'Engineered with modern multi-vendor commerce architecture. Browse 26 universal departments, dynamic specifications, and multi-SKU variants powered by real-time inventory control.':
    'រចនាឡើងជាមួយប្រព័ន្ធពាណិជ្ជកម្មពហុអ្នកលក់ទំនើប។ ស្វែងរកទំនិញក្នុង ២៦ ផ្នែក ជាមួយលក្ខណៈបច្ចេកទេសលម្អិត និងការគ្រប់គ្រងស្តុកភ្លាមៗ។',
  'Universal Multi-Category Marketplace': 'ផ្សារអនឡាញគ្រប់ប្រភេទទំនិញ',
  'Explore Catalog': 'មើលទំនិញទាំងអស់',
  'Cambodia Flagship Tech & Mobile Deals': 'ការផ្តល់ជូនពិសេស បច្ចេកវិទ្យា និងទូរស័ព្ទ នៅកម្ពុជា',
  'Official Apple, Sony, Samsung, DJI & tech accessories with nationwide express delivery and 0% fee Bakong KHQR checkout.':
    'ផលិតផលផ្លូវការ Apple, Sony, Samsung, DJI និងគ្រឿងបន្លាស់ ជាមួយការដឹកជញ្ជូនរហ័សទូទាំងប្រទេស និងទូទាត់តាម Bakong KHQR ឥតគិតថ្លៃសេវា។',
  'Official Tech Flagship': 'ហាងបច្ចេកវិទ្យាផ្លូវការ',
  'Shop Electronics': 'ទិញគ្រឿងអេឡិចត្រូនិក',
  "Men's & Women's Fashion Master Showcase": 'ម៉ូដសម្លៀកបំពាក់បុរស និងនារី',
  'Curated premium apparel, streetwear, athletic sportswear, and handcrafted traditional Khmer silk collections.':
    'សម្លៀកបំពាក់គុណភាពខ្ពស់ ម៉ូដទំនើប សម្លៀកបំពាក់កីឡា និងសូត្រខ្មែរប្រពៃណីធ្វើដោយដៃ។',
  'Trending Collections': 'ម៉ូដពេញនិយម',
  'Browse Fashion': 'មើលម៉ូដសម្លៀកបំពាក់',
  'Nationwide Express Courier & Live GPS Tracking': 'ដឹកជញ្ជូនរហ័សទូទាំងប្រទេស និងតាមដាន GPS ផ្ទាល់',
  'Order before 2 PM for same-day delivery across Phnom Penh. Real-time driver parcel tracking with verified delivery security.':
    'បញ្ជាទិញមុនម៉ោង ២ រសៀល ដើម្បីទទួលបានទំនិញក្នុងថ្ងៃតែមួយ នៅភ្នំពេញ។ តាមដានអ្នកដឹកជញ្ជូនផ្ទាល់ ប្រកបដោយសុវត្ថិភាព។',
  'Fast Dispatch': 'ដឹកជញ្ជូនរហ័ស',
  'Learn About Delivery': 'ស្វែងយល់ពីការដឹកជញ្ជូន',
}

export function HeroBannerSlider() {
  const [banners, setBanners] = useState<Banner[]>(defaultFallbackBanners)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [failedVideoKey, setFailedVideoKey] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const { t, language } = useShopEngagement()
  const tb = (text?: string | null) =>
    text ? (language === 'KM' ? BANNER_KM[text.trim()] || text : text) : ''

  useEffect(() => {
    bannerService
      .getBanners('hero')
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setBanners(res.data)
        }
      })
      .catch(() => {
        // Graceful fallback to default banners
      })
  }, [])

  // Auto-advance slider
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 6500)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [banners.length, isPaused, currentIndex])

  const currentBanner = banners[currentIndex] || defaultFallbackBanners[0]
  const currentVideoKey = currentBanner.video_url
    ? `${currentBanner.id}:${currentBanner.video_url}`
    : null

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length)
  }

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  }

  const getGradientClass = (style: string | null) => {
    switch (style) {
      case 'gradient-purple':
        return 'from-purple-900/15 via-indigo-950/10 to-background'
      case 'gradient-emerald':
        return 'from-emerald-900/15 via-teal-950/10 to-background'
      case 'gradient-amber':
        return 'from-amber-900/15 via-orange-950/10 to-background'
      case 'gradient-primary':
      default:
        return 'from-primary/10 via-background to-background'
    }
  }

  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-b ${getGradientClass(
        currentBanner.background_style
      )} pt-2 pb-6 sm:pt-4 sm:pb-10 md:pt-6 md:pb-16 border-b transition-colors duration-1000`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center min-h-0 lg:min-h-[440px]">
          {/* Left Content Column */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            {currentBanner.badge_text && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/20 backdrop-blur-sm animate-in fade-in slide-in-from-left duration-500">
                <img
                  src="/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg"
                  alt="TYUSHOP"
                  className="w-4 h-4 rounded-full object-cover"
                />
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>{tb(currentBanner.badge_text)}</span>
              </div>
            )}

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-foreground">
              <span className="bg-gradient-to-r from-primary via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {tb(currentBanner.title)}
              </span>
            </h1>

            {currentBanner.subtitle && (
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {tb(currentBanner.subtitle)}
              </p>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to={currentBanner.link_url || '/products'}
                onClick={() => bannerService.trackClick(currentBanner.id)}
              >
                <Button size="lg" className="rounded-full shadow-lg shadow-primary/20 gap-2 font-semibold">
                  <ShoppingBag className="w-4 h-4" /> {currentBanner.button_text ? tb(currentBanner.button_text) : t('Explore Catalog', 'មើលទំនិញទាំងអស់')}
                </Button>
              </Link>
              <Link to="/categories">
                <Button variant="outline" size="lg" className="rounded-full gap-2">
                  <Layers className="w-4 h-4" /> {t('Browse 26 Departments', 'មើល ២៦ ផ្នែកទំនិញ')}
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border/60">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-card/60 border border-border/50">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-foreground">{t('Bakong KHQR & COD', 'Bakong KHQR និងសាច់ប្រាក់')}</div>
                  <div className="text-muted-foreground text-[11px]">{t('Pay Now or On Arrival', 'បង់ឥឡូវ ឬពេលទំនិញមកដល់')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-card/60 border border-border/50">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-foreground">{t('Nationwide Express', 'ដឹកជញ្ជូនទូទាំងប្រទេស')}</div>
                  <div className="text-muted-foreground text-[11px]">{t('Live GPS Courier', 'តាមដាន GPS ផ្ទាល់')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-card/60 border border-border/50">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-foreground">{t('100 Pts = Free Item', '១០០ ពិន្ទុ = ទំនិញឥតគិតថ្លៃ')}</div>
                  <div className="text-muted-foreground text-[11px]">{t('+5 Pts Every Purchase', '+5 ពិន្ទុរាល់ការទិញ')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual Showcase Column */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl p-2 bg-gradient-to-tr from-primary/30 via-purple-500/20 to-indigo-500/30 shadow-2xl backdrop-blur-xl border border-white/20 dark:border-slate-800">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video lg:aspect-[4/3] group">
                {currentBanner.video_url && currentVideoKey !== failedVideoKey ? (
                  <video
                    key={`${currentBanner.id}-${currentBanner.video_url}`}
                    src={mediaService.resolveMediaUrl(currentBanner.video_url)}
                    poster={currentBanner.image_url ? mediaService.resolveMediaUrl(currentBanner.image_url) : undefined}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    onError={() => {
                      if (currentVideoKey) setFailedVideoKey(currentVideoKey)
                    }}
                    aria-label={tb(currentBanner.title)}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : currentBanner.image_url ? (
                  <img
                    key={currentBanner.image_url}
                    src={mediaService.resolveMediaUrl(currentBanner.image_url)}
                    alt={tb(currentBanner.title)}
                    fetchPriority="high"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/40">
                    <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                {/* Brand Floating Badge Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-3 rounded-xl bg-background/85 dark:bg-slate-900/85 backdrop-blur-md border border-white/10 shadow-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src="/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg"
                      alt="TYUSHOP Official Emblem"
                      className="w-10 h-10 rounded-lg object-cover ring-2 ring-primary/40 shadow-sm"
                    />
                    <div>
                      <div className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
                        {t('TYUSHOP Official', 'TYUSHOP ផ្លូវការ')}
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="text-[10px] text-muted-foreground">{t('Premier Universal Marketplace', 'ផ្សារអនឡាញឈានមុខគេ')}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                    {t('SLIDE', 'ស្លាយ')} {currentIndex + 1}/{banners.length}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Navigation Controls */}
        {banners.length > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-border/40 mt-6">
            {/* Slide Indicator Dots */}
            <div className="flex items-center gap-2">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentIndex === idx
                      ? 'w-8 bg-primary shadow-sm shadow-primary/50'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}

              <button
                onClick={() => setIsPaused(!isPaused)}
                className="ml-3 p-1 rounded-full text-muted-foreground hover:text-foreground text-xs"
                title={isPaused ? 'Resume auto-advance' : 'Pause auto-advance'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Prev / Next Arrows */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrev}
                className="h-8 w-8 rounded-full p-0 bg-background/80 backdrop-blur-sm"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                className="h-8 w-8 rounded-full p-0 bg-background/80 backdrop-blur-sm"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

