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
    <div className="min-h-screen flex flex-col bg-background text-foreground pb-16 md:pb-0 overflow-x-clip">
      {/* Pinned Top Navigation Bar — Does Not Move When Scrolling Page */}
      <div className="sticky top-0 z-40 w-full shadow-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {/* Top Announcement Bar */}
        <AnnouncementBar />

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

