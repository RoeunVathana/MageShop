import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AnnouncementBar } from './AnnouncementBar'
import { Header } from './Header'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { MobileMenu } from './MobileMenu'
import { MobileBottomNav } from './MobileBottomNav'
import { SupportWidget } from '@/components/storefront/SupportWidget'
import { cn } from '@/lib/utils'

export function StorefrontLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
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
        {/* Top Announcement Bar */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out',
            isScrolled
              ? 'max-h-0 overflow-hidden opacity-0 pointer-events-none'
              : 'max-h-12 overflow-visible opacity-100'
          )}
        >
          <AnnouncementBar />
        </div>

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
        <Outlet />
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

