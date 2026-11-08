import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  ShoppingCart,
  Heart,
  User as UserIcon,
  Menu,
  X,
  ShoppingBag,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  SlidersHorizontal,
  Award,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'
import { useShopEngagement } from '@/context/ShopEngagementContext'

interface HeaderProps {
  onToggleMobileMenu: () => void
  isMobileMenuOpen: boolean
}

export function Header({ onToggleMobileMenu, isMobileMenuOpen }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const navigate = useNavigate()
  const { cartCount, favoritesCount, loyaltyPoints } = useShopEngagement()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onToggleMobileMenu}
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link to="/" aria-label="MegaCommerce Home">
            <Logo size="md" subtitle="Multi-Vendor" />
          </Link>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-4">
          <div className="relative w-full flex items-center">
            <Input
              type="text"
              placeholder="Search across 50,000+ products, categories, or vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-24 h-10 rounded-full border-muted-foreground/20 focus-visible:ring-primary shadow-inner"
            />
            <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 rounded-full h-8 px-4 text-xs font-semibold"
            >
              Search
            </Button>
          </div>
        </form>

        {/* Right: Actions (Loyalty Points, Track GPS, Wishlist, Cart, Account, Theme Toggle) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Loyalty Points Pill */}
          <Link
            to="/cart"
            title="Earn +5 pts per buy! 100 pts = Free Item under $20-$30"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-500/25 transition-colors"
          >
            <Award className="h-3.5 w-3.5 text-amber-500" />
            <span>{loyaltyPoints} pts</span>
          </Link>

          {/* Live GPS Delivery Tracker Link */}
          <Link to="/track-order">
            <Button variant="ghost" size="icon" className="relative rounded-full" title="Real-Time GPS Delivery Tracker">
              <Truck className="h-5 w-5 text-muted-foreground hover:text-emerald-500 transition-colors" />
              <span className="sr-only">Track Delivery</span>
            </Button>
          </Link>

          {/* Wishlist Link */}
          <Link to="/wishlist">
            <Button variant="ghost" size="icon" className="relative rounded-full" title="Customer Favorites">
              <Heart className="h-5 w-5 text-muted-foreground hover:text-rose-500 transition-colors" />
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                {favoritesCount}
              </span>
              <span className="sr-only">Wishlist</span>
            </Button>
          </Link>

          {/* Cart Link */}
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative rounded-full" title="Shopping Cart">
              <ShoppingCart className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {cartCount}
              </span>
              <span className="sr-only">Shopping Cart</span>
            </Button>
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Account Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAccountOpen(!isAccountOpen)}
              className="flex items-center gap-2 rounded-full pl-2 pr-3 h-9"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <span className="hidden lg:inline text-xs font-semibold">Account</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Button>

            {isAccountOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsAccountOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border bg-card p-2 text-card-foreground shadow-xl z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b">
                    <p className="text-xs font-medium text-muted-foreground">Welcome to MegaCommerce</p>
                    <p className="text-sm font-semibold truncate">Phase 1 Foundation</p>
                  </div>

                  <div className="py-1">
                    <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                      Authentication
                    </div>
                    <Link
                      to="/login"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-primary" />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Create Free Account</span>
                    </Link>
                  </div>

                  <div className="py-1 border-t">
                    <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                      Phase 1 Dashboard Previews
                    </div>
                    <Link
                      to="/dashboard/customer"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-blue-500" />
                      <span>Customer Portal</span>
                    </Link>
                    <Link
                      to="/dashboard/seller"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Seller Merchant Hub</span>
                    </Link>
                    <Link
                      to="/dashboard/admin"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-purple-500" />
                      <span>Admin Control Center</span>
                    </Link>
                    <Link
                      to="/diagnostics"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors text-amber-600 dark:text-amber-400 font-medium"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>API Diagnostics Page</span>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search input bar */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="relative w-full">
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-16 h-9 rounded-full text-xs"
          />
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1 top-0.5 rounded-full h-8 px-3 text-xs"
          >
            Go
          </Button>
        </form>
      </div>
    </header>
  )
}

