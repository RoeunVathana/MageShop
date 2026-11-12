import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  Sparkles,
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
  const [accountMenuPosition, setAccountMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 288,
  })
  const accountButtonRef = useRef<HTMLButtonElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
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

  useLayoutEffect(() => {
    if (!isAccountOpen) return

    const updateAccountMenuPosition = () => {
      const buttonRect = accountButtonRef.current?.getBoundingClientRect()
      if (!buttonRect) return

      const viewportGutter = 8
      const menuGap = 8
      const menuWidth = Math.min(288, window.innerWidth - viewportGutter * 2)
      const maxLeft = Math.max(viewportGutter, window.innerWidth - menuWidth - viewportGutter)
      const left = Math.min(
        Math.max(viewportGutter, buttonRect.right - menuWidth),
        maxLeft
      )
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const menuHeight = accountMenuRef.current?.getBoundingClientRect().height ?? 0
      const preferredTop = buttonRect.bottom + menuGap
      const fitsBelow = preferredTop + menuHeight <= viewportHeight - viewportGutter
      const top = fitsBelow
        ? preferredTop
        : Math.max(
            viewportGutter,
            Math.min(
              buttonRect.top - menuHeight - menuGap,
              viewportHeight - menuHeight - viewportGutter
            )
          )

      setAccountMenuPosition({
        top: Math.round(top),
        left: Math.round(left),
        width: Math.round(menuWidth),
      })
    }

    updateAccountMenuPosition()
    window.addEventListener('resize', updateAccountMenuPosition)
    window.addEventListener('scroll', updateAccountMenuPosition, true)
    window.visualViewport?.addEventListener('resize', updateAccountMenuPosition)
    window.visualViewport?.addEventListener('scroll', updateAccountMenuPosition)
    return () => {
      window.removeEventListener('resize', updateAccountMenuPosition)
      window.removeEventListener('scroll', updateAccountMenuPosition, true)
      window.visualViewport?.removeEventListener('resize', updateAccountMenuPosition)
      window.visualViewport?.removeEventListener('scroll', updateAccountMenuPosition)
    }
  }, [isAccountOpen])

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
    <header
      className={`relative w-full border-b border-border bg-background ${
        // Lift the whole header above the desktop navbar while the account
        // menu is open; a child z-index cannot beat a higher sibling layer.
        isAccountOpen ? 'z-[150]' : 'z-30'
      }`}
    >
      <div className="container mx-auto flex min-h-16 items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 lg:min-h-[4.25rem] lg:gap-4">
        {/* Left: Mobile/iPad Navigation Toggle & Brand Logo */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="group lg:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-accent/80 active:scale-90 transition-all duration-200 text-foreground shrink-0"
            onClick={onToggleMobileMenu}
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 rotate-90" />
            ) : (
              <Menu className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover:scale-110" />
            )}
          </Button>

          <Link to="/" aria-label="TYUSHOP Home" className="shrink-0 min-w-0 flex items-center transition-transform duration-200 hover:scale-[1.02] active:scale-98">
            <Logo size="md" subtitle={t('Multi-Vendor', 'ផ្សារទំនើបអនឡាញ')} />
          </Link>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 min-w-0 max-w-2xl mx-3 xl:mx-6 group">
          <div className="relative w-full flex items-center">
            <Input
              type="text"
              placeholder={t(
                'Search across 50,000+ products, categories, or vendors...',
                'ស្វែងរកផលិតផល ប្រភេទទំនិញ ឬហាងលក់ទំនិញ...'
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-24 h-10 rounded-full border-muted-foreground/20 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary shadow-inner transition-all duration-300"
            />
            <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-200" />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 rounded-full h-8 px-4 text-xs font-semibold hover:shadow-md hover:scale-102 active:scale-95 transition-all duration-200"
            >
              {t('Search', 'ស្វែងរក')}
            </Button>
          </div>
        </form>

        {/* Right: Actions Cluster - Guaranteed Single-Row Layout (No 2-Row Wrapping) */}
        <div className="shrink-0 flex items-center">
          <div className="flex items-center flex-nowrap gap-1 sm:gap-1.5 lg:gap-2 shrink-0">
            {/* 1. Real-Time GPS Delivery Tracker (Desktop only; on mobile it lists down in menu) */}
            <Link
              to="/track-order"
              title={t('Real-Time GPS Delivery Tracker', 'តាមដានការដឹកជញ្ជូន GPS')}
              className="hidden lg:inline-flex shrink-0"
            >
              <Button
                variant="ghost"
                size="icon"
                className="group h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-emerald-500/15 hover:text-emerald-500 active:scale-90 transition-all duration-200 text-muted-foreground p-0 flex items-center justify-center shrink-0"
              >
                <Truck className="h-4 w-4 sm:h-4.5 sm:w-4.5 group-hover:translate-x-0.5 group-hover:scale-110 transition-transform duration-200" />
                <span className="sr-only">{t('Track Delivery', 'តាមដានការដឹកជញ្ជូន')}</span>
              </Button>
            </Link>

            {/* 2. Customer Loyalty Points Award (Desktop only; on mobile it lists down in menu) */}
            <Link
              to="/cart"
              title={t(
                `Loyalty Points: ${loyaltyPoints} pts. Earn +5 pts per buy! 100 pts = Free Item under $20-$30`,
                `ពិន្ទុសន្សំ: ${loyaltyPoints} ពិន្ទុ`
              )}
              className="hidden lg:inline-flex group relative h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-amber-500/15 text-amber-500 active:scale-90 transition-all duration-200 items-center justify-center p-0 shrink-0"
            >
              <Award className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-amber-500 group-hover:rotate-12 group-hover:scale-115 transition-transform duration-200" />
              <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 rounded-full bg-amber-500 text-[8.5px] font-black text-white flex items-center justify-center shadow-xs pointer-events-none animate-in zoom-in-75 duration-200">
                {loyaltyPoints}
              </span>
              <span className="sr-only">{t('Loyalty Points', 'ពិន្ទុសន្សំ')}</span>
            </Link>

            {/* 3. Customer Wishlist / Favorites (Desktop only; on mobile it lists down in menu or bottom bar) */}
            <Link to="/wishlist" title={t('Saved Favorites', 'ទំនិញពេញចិត្ត')} className="hidden lg:inline-flex shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="group relative h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-rose-500/15 hover:text-rose-500 active:scale-90 transition-all duration-200 text-muted-foreground p-0 flex items-center justify-center shrink-0"
              >
                <Heart className="h-4 w-4 sm:h-4.5 sm:w-4.5 group-hover:scale-120 group-hover:fill-rose-500/20 transition-all duration-200" />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center shadow-xs pointer-events-none animate-in zoom-in-75 duration-200">
                    {favoritesCount}
                  </span>
                )}
                <span className="sr-only">{t('Wishlist', 'ពេញចិត្ត')}</span>
              </Button>
            </Link>

            {/* 4. Shopping Cart (Always visible for quick checkout) */}
            <Link to="/cart" title={t('Shopping Cart', 'កន្ត្រកទំនិញ')} className="shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="group relative h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-primary/15 hover:text-primary active:scale-90 transition-all duration-200 text-muted-foreground p-0 flex items-center justify-center shrink-0"
              >
                <ShoppingCart className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary group-hover:-rotate-12 group-hover:scale-115 transition-transform duration-200" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 rounded-full bg-primary text-[9px] font-black text-primary-foreground flex items-center justify-center shadow-xs pointer-events-none animate-in zoom-in-75 duration-200">
                    {cartCount}
                  </span>
                )}
                <span className="sr-only">{t('Cart', 'កន្ត្រក')}</span>
              </Button>
            </Link>

            {/* 5. Theme Mode Toggle (Desktop only; on mobile inside list down) */}
            <div className="hidden lg:flex items-center justify-center shrink-0">
              <ThemeToggle className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border-0 hover:bg-muted/80 active:scale-90 transition-all duration-200" />
            </div>

            {/* 6. Account & Quick Actions Menu ("List Down" Trigger on Mobile) */}
            <div className={`relative shrink-0 ${isAccountOpen ? 'z-50' : ''}`}>
              <Button
                variant="ghost"
                ref={accountButtonRef}
                onClick={() => setIsAccountOpen((previous) => !previous)}
                aria-expanded={isAccountOpen}
                aria-haspopup="menu"
                title={currentUser ? currentUser.name : t('Account & Menu', 'គណនី & ម៉ឺនុយ')}
                className="group h-8 sm:h-9 px-1.5 sm:px-2 rounded-xl hover:bg-primary/15 text-primary active:scale-90 transition-all duration-200 flex items-center gap-1 shrink-0"
              >
                {currentUser?.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser?.name || 'User'}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover ring-1 ring-primary/30 shrink-0 group-hover:scale-110 transition-all duration-200"
                  />
                ) : (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:ring-2 group-hover:ring-primary/30 transition-all duration-200">
                    <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${isAccountOpen ? 'rotate-180' : ''}`} />
              </Button>

            {isAccountOpen && typeof document !== 'undefined' && createPortal(
              <>
                <div
                  className="fixed inset-0 z-[9998] bg-slate-950/10"
                  onMouseDown={() => setIsAccountOpen(false)}
                  aria-hidden="true"
                />
                <div
                  ref={accountMenuRef}
                  role="menu"
                  aria-label={t('Account menu', 'ម៉ឺនុយគណនី')}
                  className="account-menu-scroll pointer-events-auto fixed rounded-2xl border border-border bg-white p-2 text-card-foreground shadow-2xl shadow-slate-950/20 z-[9999] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 dark:bg-slate-900"
                  style={{
                    top: accountMenuPosition.top,
                    left: accountMenuPosition.left,
                    width: accountMenuPosition.width,
                  }}
                >
                  {/* User Profile Header */}
                  <div className="px-3 py-2.5 border-b flex items-center gap-2.5">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {currentUser
                          ? isAdmin
                            ? t('Admin: ', 'អ្នកគ្រប់គ្រង៖ ') + currentUser.name
                            : currentUser.name
                          : t('Welcome to TYUSHOP', 'សូមស្វាគមន៍មកកាន់ TYUSHOP')}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {currentUser ? currentUser.email : t('Customer / Guest Account', 'គណនីអតិថិជន')}
                      </p>
                    </div>
                  </div>

                  {/* Mobile "List Down" Quick Actions Section */}
                  <div className="py-1.5 space-y-0.5 border-b">
                    {/* 1. Customer Loyalty Points */}
                    <Link
                      to="/cart"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-amber-500/10 text-foreground transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground leading-tight">
                            {t('Loyalty Rewards', 'ពិន្ទុរង្វាន់')}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {t('Earn +5 pts per order', 'ទទួលបាន +៥ ពិន្ទុរាល់ពេលទិញ')}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-mono font-black text-[10px] shadow-xs shrink-0">
                        {loyaltyPoints} Pts
                      </span>
                    </Link>

                    {/* 2. Real-Time GPS Delivery Tracker */}
                    <Link
                      to="/track-order"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-emerald-500/10 text-foreground transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground leading-tight">
                            {t('Track Live Delivery', 'តាមដានការដឹកជញ្ជូន GPS')}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {t('Real-Time Map & Status', 'ផែនទីផ្សាយផ្ទាល់ & ស្ថានភាព')}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                        Live GPS
                      </span>
                    </Link>

                    {/* 3. Customer Saved Wishlist */}
                    <Link
                      to="/wishlist"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-rose-500/10 text-foreground transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                          <Heart className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-xs text-foreground">
                          {t('Saved Favorites', 'ទំនិញពេញចិត្ត')}
                        </span>
                      </div>
                      {favoritesCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold text-[10px] shrink-0">
                          {favoritesCount}
                        </span>
                      )}
                    </Link>

                    {/* 4. Shopping Cart */}
                    <Link
                      to="/cart"
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-primary/10 text-foreground transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                          <ShoppingCart className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-xs text-foreground">
                          {t('Shopping Cart', 'កន្ត្រកទំនិញ')}
                        </span>
                      </div>
                      {cartCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-mono font-bold text-[10px] shrink-0">
                          {cartCount}
                        </span>
                      )}
                    </Link>

                    {/* 5. Theme Appearance Switcher */}
                    <div className="flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-foreground flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-xs text-foreground">
                          {t('Theme Appearance', 'ពន្លឺ / ងងឹត')}
                        </span>
                      </div>
                      <ThemeToggle />
                    </div>
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
                        to={isAdmin ? '/admin/profile' : '/profile'}
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md hover:bg-accent transition-colors font-semibold text-indigo-600 dark:text-indigo-400"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>{isAdmin ? t('Admin Profile & Settings', 'ប្រវត្តិរូប Admin & ការកំណត់') : t('My Profile & Settings', 'ប្រវត្តិរូបរបស់ខ្ញុំ & ការកំណត់')}</span>
                      </Link>

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
              </>,
              document.body
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

