import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnnouncementBar } from './AnnouncementBar'
import { Header } from './Header'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { MobileMenu } from './MobileMenu'
import { MobileBottomNav } from './MobileBottomNav'
import { SupportWidget } from '@/components/storefront/SupportWidget'
import { cn } from '@/lib/utils'

export function StorefrontLayout() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAnnouncementHidden, setIsAnnouncementHidden] = useState(false)
  const lastScrollY = useRef(0)
  const scrollDirection = useRef(0)
  const directionDistance = useRef(0)
  const announcementHiddenRef = useRef(false)
  const scrollFrame = useRef<number | null>(null)

  useEffect(() => {
    const applyScrollState = () => {
      scrollFrame.current = null
      const currentScrollY = Math.max(window.scrollY, 0)
      const previousScrollY = lastScrollY.current
      const scrollDelta = currentScrollY - previousScrollY
      const nextDirection = scrollDelta > 0 ? 1 : scrollDelta < 0 ? -1 : 0

      setIsScrolled(currentScrollY > 15)

      // Use separate hide/show thresholds so small wheel or touchpad reversals
      // cannot make the announcement bar rapidly toggle while scrolling.
      if (currentScrollY <= 20) {
        scrollDirection.current = 0
        directionDistance.current = 0
        if (announcementHiddenRef.current) {
          announcementHiddenRef.current = false
          setIsAnnouncementHidden(false)
        }
      } else if (nextDirection !== 0) {
        if (nextDirection !== scrollDirection.current) {
          scrollDirection.current = nextDirection
          directionDistance.current = 0
        }
        directionDistance.current += Math.abs(scrollDelta)

        if (!announcementHiddenRef.current && nextDirection > 0 && currentScrollY > 64 && directionDistance.current >= 20) {
          announcementHiddenRef.current = true
          setIsAnnouncementHidden(true)
          directionDistance.current = 0
        } else if (announcementHiddenRef.current && nextDirection < 0 && directionDistance.current >= 80) {
          announcementHiddenRef.current = false
          setIsAnnouncementHidden(false)
          directionDistance.current = 0
        }
      }

      lastScrollY.current = currentScrollY
    }

    const handleScroll = () => {
      if (scrollFrame.current !== null) return
      scrollFrame.current = window.requestAnimationFrame(applyScrollState)
    }

    lastScrollY.current = Math.max(window.scrollY, 0)
    setIsScrolled(lastScrollY.current > 15)
    if (lastScrollY.current > 64) {
      announcementHiddenRef.current = true
      setIsAnnouncementHidden(true)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollFrame.current !== null) window.cancelAnimationFrame(scrollFrame.current)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pb-16 md:pb-0 overflow-x-clip">
      {/* Pinned Top Navigation Bar with Smooth Scroll Glassmorphism Transition */}
      <div
        className={cn(
          // Keep the sticky navigation above floating storefront widgets while
          // an account/category popover is open. The popover's z-index cannot
          // escape a lower stacking context created by this wrapper.
          'sticky top-0 z-[60] isolate w-full overflow-visible border-b border-border bg-background transition-shadow duration-300 ease-in-out',
          isScrolled
            ? 'shadow-lg shadow-slate-950/10'
            : 'shadow-sm'
        )}
        id="storefront-navigation"
      >
        {/* The utility bar stays mounted while its height and opacity animate
            so the scroll transition remains smooth. */}
        <AnnouncementBar isHidden={isAnnouncementHidden} />

        {/* Main Header with Logo, Search, Cart, Wishlist, Account, Theme Toggle */}
        <Header
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Desktop Navigation & Category bar */}
        <Navbar />
      </div>

      {/* Mobile Menu Drawer */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        <div key={location.pathname} className="page-enter min-w-0">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile App-Style Sticky Bottom Navigation */}
      <MobileBottomNav />

      {/* Floating 24/7 Customer Supporter Widget */}
      <SupportWidget />
    </div>
  )
}

