import { useState, useEffect } from 'react'
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
  Shield,
  Award,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { authService } from '@/services/auth.service'
import type { User } from '@/types/user.types'

interface HeaderProps {
  onToggleMobileMenu: () => void
  isMobileMenuOpen: boolean
}

export function Header({ onToggleMobileMenu, isMobileMenuOpen }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getStoredUser())
  const navigate = useNavigate()
  const { cartCount, favoritesCount, loyaltyPoints, t } = useShopEngagement()

  useEffect(() => {
    const syncAuth = () => setCurrentUser(authService.getStoredUser())
    window.addEventListener('tyushop-auth-changed', syncAuth)
    window.addEventListener('storage', syncAuth)
    return () => {
      window.removeEventListener('tyushop-auth-changed', syncAuth)
      window.removeEventListener('storage', syncAuth)
    }
  }, [])

  const isAdmin = authService.isAdmin(currentUser)

  const handleLogout = async () => {
    setIsAccountOpen(false)
    await authService.logout()
    setCurrentUser(null)
    navigate('/login')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="relative z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile/iPad Navigation Toggle & Brand Logo */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-accent/80 active:scale-95 transition-all text-foreground shrink-0"
            onClick={onToggleMobileMenu}
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
          </Button>

          <Link to="/" aria-label="TYUSHOP Home" className="shrink-0 min-w-0 flex items-center">
            <Logo size="md" subtitle={t('Multi-Vendor', 'ផ្សារទំនើបអនឡាញ')} />
          </Link>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-2xl mx-4 xl:mx-6">
          <div className="relative w-full flex items-center">
            <Input
              type="text"
              placeholder={t(
                'Search across 50,000+ products, categories, or vendors...',
                'ស្វែងរកផលិតផល ប្រភេទទំនិញ ឬហាងលក់ទំនិញ...'
              )}
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
              {t('Search', 'ស្វែងរក')}
            </Button>
          </div>
        </form>

        {/* Right: Actions (Loyalty Points, Track GPS, Wishlist, Cart, Account, Theme Toggle) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Loyalty Points Pill (Desktop/Tablet) */}
          <Link
            to="/cart"
            title="Earn +5 pts per buy! 100 pts = Free Item under $20-$30"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-500/25 transition-colors"
          >
            <Award className="h-3.5 w-3.5 text-amber-500" />
            <span>{loyaltyPoints} {t('pts', 'ពិន្ទុ')}</span>
          </Link>

          {/* Live GPS Delivery Tracker Link (Desktop/Tablet; Mobile users have it in MobileBottomNav) */}
          <Link to="/track-order" className="hidden md:flex">
            <Button variant="ghost" size="icon" className="relative rounded-full" title="Real-Time GPS Delivery Tracker">
              <Truck className="h-5 w-5 text-muted-foreground hover:text-emerald-500 transition-colors" />
              <span className="sr-only">Track Delivery</span>
            </Button>
          </Link>

          {/* Wishlist Link (Desktop/Tablet; Mobile users have it in MobileBottomNav) */}
          <Link to="/wishlist" className="hidden md:flex">
            <Button variant="ghost" size="icon" className="relative rounded-full" title="Customer Favorites">
              <Heart className="h-5 w-5 text-muted-foreground hover:text-rose-500 transition-colors" />
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                {favoritesCount}
              </span>
              <span className="sr-only">Wishlist</span>
            </Button>
          </Link>

          {/* Cart Link (Always visible with badge) */}
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9 p-0" title="Shopping Cart">
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
          <div className={`relative ${isAccountOpen ? 'z-50' : ''}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAccountOpen(!isAccountOpen)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-full pl-2 pr-2.5 sm:pr-3 h-9"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <span className="hidden lg:inline text-xs font-semibold max-w-[120px] truncate">
                {currentUser ? currentUser.name : t('Account', 'គណនី')}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            </Button>

            {isAccountOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/5"
                  onClick={() => setIsAccountOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-white dark:bg-slate-900 p-2 text-card-foreground shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b">
                    <p className="text-xs font-medium text-muted-foreground truncate">
                      {currentUser ? currentUser.email : t('Welcome to TYUSHOP', 'សូមស្វាគមន៍មកកាន់ TYUSHOP')}
                    </p>
                    <p className="text-sm font-semibold truncate">
                      {currentUser
                        ? isAdmin
                          ? t('Administrator Account', 'គណនីអ្នកគ្រប់គ្រង (Admin)')
                          : currentUser.name
                        : t('Customer Account', 'គណនីអតិថិជន')}
                    </p>
                  </div>

                  {!currentUser ? (
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        {t('Authentication', 'ការចូលប្រើប្រាស់')}
                      </div>
                      <Link
                        to="/login"
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-primary" />
                        <span>{t('Sign In', 'ចូលគណនី')}</span>
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{t('Create Free Account', 'បង្កើតគណនីថ្មី')}</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="py-1">
                      {isAdmin && (
                        <div className="pb-1 mb-1 border-b">
                          <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase">
                            {t('Admin Only System', 'ប្រព័ន្ធគ្រប់គ្រង (Admin Only)')}
                          </div>
                          <Link
                            to="/dashboard/admin"
                            onClick={() => setIsAccountOpen(false)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors font-semibold"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5 text-purple-500" />
                            <span>{t('Admin Control Center', 'មជ្ឈមណ្ឌលគ្រប់គ្រង Admin')}</span>
                          </Link>
                          <Link
                            to="/admin/products"
                            onClick={() => setIsAccountOpen(false)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                            <span>{t('Manage Products & Stock', 'គ្រប់គ្រងទំនិញ និងស្តុក')}</span>
                          </Link>
                          <Link
                            to="/admin/security"
                            onClick={() => setIsAccountOpen(false)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                          >
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{t('Security & OTP Settings', 'សុវត្ថិភាព និង OTP')}</span>
                          </Link>
                        </div>
                      )}

                      <Link
                        to="/dashboard/customer"
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                        <span>{t('My Account & Orders', 'គណនី និងការបញ្ជាទិញ')}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md text-destructive hover:bg-destructive/10 transition-colors mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('Sign Out', 'ចាកចេញពីគណនី')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile/iPad Search input bar */}
      <div className="lg:hidden px-3 sm:px-6 pb-2.5 sm:pb-3 max-w-4xl mx-auto w-full">
        <form onSubmit={handleSearch} className="relative w-full flex items-center">
          <Input
            type="text"
            placeholder={t(
              'Search across 50,000+ products, categories, or vendors...',
              'ស្វែងរកផលិតផល ប្រភេទទំនិញ ឬហាងលក់ទំនិញ...'
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 sm:pl-10 pr-20 sm:pr-24 h-9 sm:h-10 rounded-full text-xs sm:text-sm border-muted-foreground/20 focus-visible:ring-primary shadow-inner"
          />
          <Search className="absolute left-3 sm:left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1 rounded-full h-7 sm:h-8 px-3 sm:px-4 text-xs font-semibold"
          >
            {t('Search', 'ស្វែងរក')}
          </Button>
        </form>
      </div>
    </header>
  )
}

