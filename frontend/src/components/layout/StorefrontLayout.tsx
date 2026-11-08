import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AnnouncementBar } from './AnnouncementBar'
import { Header } from './Header'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { MobileMenu } from './MobileMenu'
import { MobileBottomNav } from './MobileBottomNav'
import { SupportWidget } from '@/components/storefront/SupportWidget'

export function StorefrontLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pb-16 md:pb-0 overflow-x-hidden">
      {/* Top Announcement Bar */}
      <AnnouncementBar />

      {/* Main Header with Logo, Search, Cart, Wishlist, Account, Theme Toggle */}
      <Header
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Desktop Navigation & Category bar */}
      <Navbar />

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

