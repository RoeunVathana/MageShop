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
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { bannerService, type Banner } from '@/services/banner.service'
import { mediaService } from '@/services/media.service'

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

export function HeroBannerSlider() {
  const [banners, setBanners] = useState<Banner[]>(defaultFallbackBanners)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

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
      )} py-12 md:py-20 border-b transition-colors duration-1000`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[480px]">
          {/* Left Content Column */}
          <div className="lg:col-span-7 space-y-6">
            {currentBanner.badge_text && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/20 backdrop-blur-sm animate-in fade-in slide-in-from-left duration-500">
                <img
                  src="/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg"
                  alt="TYUSHOP"
                  className="w-4 h-4 rounded-full object-cover"
                />
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>{currentBanner.badge_text}</span>
              </div>
            )}

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight text-foreground key={currentBanner.id}">
              <span className="bg-gradient-to-r from-primary via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {currentBanner.title}
              </span>
            </h1>

            {currentBanner.subtitle && (
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {currentBanner.subtitle}
              </p>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={currentBanner.link_url || '/products'}
                onClick={() => bannerService.trackClick(currentBanner.id)}
              >
                <Button size="lg" className="rounded-full shadow-lg shadow-primary/20 gap-2 font-semibold">
                  <ShoppingBag className="w-4 h-4" /> {currentBanner.button_text || 'Explore Catalog'}
                </Button>
              </Link>
              <Link to="/categories">
                <Button variant="outline" size="lg" className="rounded-full gap-2">
                  <Layers className="w-4 h-4" /> Browse 26 Departments
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-foreground">Bakong KHQR</div>
                  <div className="text-muted-foreground text-[11px]">Instant 0% Fee Pay</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-foreground">Nationwide Express</div>
                  <div className="text-muted-foreground text-[11px]">Live GPS Courier</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-foreground">100% Genuine</div>
                  <div className="text-muted-foreground text-[11px]">Enterprise Warranty</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual Showcase Column */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl p-2 bg-gradient-to-tr from-primary/30 via-purple-500/20 to-indigo-500/30 shadow-2xl backdrop-blur-xl border border-white/20 dark:border-slate-800">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video lg:aspect-[4/3] group">
                {currentBanner.video_url ? (
                  <video
                    key={currentBanner.video_url}
                    src={mediaService.resolveMediaUrl(currentBanner.video_url)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : currentBanner.image_url ? (
                  <img
                    key={currentBanner.image_url}
                    src={mediaService.resolveMediaUrl(currentBanner.image_url)}
                    alt={currentBanner.title}
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
                        TYUSHOP Official
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="text-[10px] text-muted-foreground">Premier Universal Marketplace</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                    SLIDE {currentIndex + 1}/{banners.length}
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

