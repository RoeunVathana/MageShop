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

        {/* Right: Actions Cluster in Two Rows */}
        <div className="shrink-0 flex items-center">
          <div className="grid grid-rows-2 grid-cols-3 gap-1 sm:gap-1.5 items-center justify-items-center">
            {/* ROW 1: Delivery Tracking, Wishlist, Cart */}
            {/* Col 1: GPS Delivery Tracker */}
            <Link to="/track-order" title={t('Real-Time GPS Delivery Tracker', 'តាមដានការដឹកជញ្ជូន GPS')}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-emerald-500/15 hover:text-emerald-500 active:scale-95 transition-all text-muted-foreground p-0 flex items-center justify-center"
              >
                <Truck className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                <span className="sr-only">{t('Track Delivery', 'តាមដានការដឹកជញ្ជូន')}</span>
              </Button>
            </Link>

            {/* Col 2: Customer Wishlist / Favorites */}
            <Link to="/wishlist" title={t('Saved Favorites', 'ទំនិញពេញចិត្ត')}>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 rounded-xl hover:bg-rose-500/15 hover:text-rose-500 active:scale-95 transition-all text-muted-foreground p-0 flex items-center justify-center"
              >
                <Heart className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center shadow-xs pointer-events-none">
                    {favoritesCount}
                  </span>
                )}
                <span className="sr-only">{t('Wishlist', 'ពេញចិត្ត')}</span>
              </Button>
            </Link>

            {/* Col 3: Shopping Cart */}
            <Link to="/cart" title={t('Shopping Cart', 'កន្ត្រកទំនិញ')}>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 rounded-xl hover:bg-primary/15 hover:text-primary active:scale-95 transition-all text-muted-foreground p-0 flex items-center justify-center"
              >
                <ShoppingCart className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 rounded-full bg-primary text-[9px] font-black text-primary-foreground flex items-center justify-center shadow-xs pointer-events-none">
                    {cartCount}
                  </span>
                )}
                <span className="sr-only">{t('Cart', 'កន្ត្រក')}</span>
              </Button>
            </Link>

            {/* ROW 2: Loyalty Points, Dark/Light Theme, Account */}
            {/* Col 1: Loyalty Points */}
            <Link
              to="/cart"
              title={t(
                `Loyalty Points: ${loyaltyPoints} pts. Earn +5 pts per buy! 100 pts = Free Item under $20-$30`,
                `ពិន្ទុសន្សំ: ${loyaltyPoints} ពិន្ទុ`
              )}
              className="relative h-8 w-8 rounded-xl hover:bg-amber-500/15 text-amber-500 active:scale-95 transition-all flex items-center justify-center p-0"
            >
              <Award className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-amber-500" />
              <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 rounded-full bg-amber-500 text-[8.5px] font-black text-white flex items-center justify-center shadow-xs pointer-events-none">
                {loyaltyPoints}
              </span>
              <span className="sr-only">{t('Loyalty Points', 'ពិន្ទុសន្សំ')}</span>
            </Link>

            {/* Col 2: Theme Mode Toggle */}
            <div className="flex items-center justify-center">
              <ThemeToggle className="h-8 w-8 rounded-xl border-0 hover:bg-muted/80 active:scale-95" />
            </div>

            {/* Col 3: Account / Profile Dropdown */}
            <div className={`relative ${isAccountOpen ? 'z-50' : ''}`}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                title={currentUser ? currentUser.name : t('Account', 'គណនី')}
                className="h-8 w-8 rounded-xl hover:bg-primary/15 text-primary active:scale-95 transition-all p-0 flex items-center justify-center"
              >
                <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
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
    </div>

      {/* Mobile/iPad Search input bar */}
      <div className="lg:hidden px-3 sm:px-6 pb-2.5 sm:pb-3 max-w-4xl mx-auto w-full">
        <form onSubmit={handleSearch} className="relative w-full flex items-center">
          <Input
            type="text"
            placeholder={t(
              'Search products, brands...',
              'ស្វែងរកផលិតផល ម៉ាក...'
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

