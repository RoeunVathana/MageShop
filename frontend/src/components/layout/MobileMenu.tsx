import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  X,
  Home,
  ShoppingBag,
  Grid,
  Tag,
  Info,
  Mail,
  HelpCircle,
  LogIn,
  UserPlus,
  LayoutDashboard,
  User as UserIcon,
  LogOut,
  Truck,
  Sparkles,
  Laptop,
  Shirt,
  Smartphone,
  Watch,
  HeartPulse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { authService } from '@/services/auth.service'
import type { User } from '@/types/user.types'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { language, setLanguage, currency, setCurrency, usdToKhrRate, t } = useShopEngagement()
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getStoredUser())
  const navigate = useNavigate()

  useEffect(() => {
    const syncAuth = () => setCurrentUser(authService.getStoredUser())
    window.addEventListener('tyushop-auth-changed', syncAuth)
    window.addEventListener('storage', syncAuth)
    return () => {
      window.removeEventListener('tyushop-auth-changed', syncAuth)
      window.removeEventListener('storage', syncAuth)
    }
  }, [])

  if (!isOpen) return null

  const isAdmin = authService.isAdmin(currentUser)

  const handleLogout = async () => {
    onClose()
    await authService.logout()
    setCurrentUser(null)
    navigate('/login')
  }

  const links = [
    { label: t('Home', 'ទំព័រដើម'), path: '/', icon: Home },
    { label: t('All Products', 'ផលិតផលទាំងអស់'), path: '/products', icon: ShoppingBag },
    { label: t('Categories', 'ប្រភេទទំនិញ'), path: '/categories', icon: Grid },
    { label: t('Brands', 'ម៉ាកយីហោ'), path: '/brands', icon: Tag },
    { label: t('About Us', 'អំពីយើង'), path: '/about', icon: Info },
    { label: t('Contact & Support', 'ទំនាក់ទំនងជំនួយ'), path: '/contact', icon: Mail },
    { label: t('FAQ', 'សំណួរញឹកញាប់'), path: '/faq', icon: HelpCircle },
  ]

  const featuredCategories = [
    { name: t('Electronics & Gadgets', 'គ្រឿងអេឡិចត្រូនិក'), icon: Laptop, count: '1,420', slug: 'electronics' },
    { name: t('Fashion & Apparel', 'សម្លៀកបំពាក់ និងម៉ូដ'), icon: Shirt, count: '3,850', slug: 'fashion' },
    { name: t('Home & Kitchen', 'សម្ភារៈផ្ទះបាយ'), icon: Home, count: '890', slug: 'home-kitchen' },
    { name: t('Smartphones & Tablets', 'ទូរស័ព្ទ & ថេប្លេត'), icon: Smartphone, count: '640', slug: 'phones' },
    { name: t('Smartwatches', 'នាឡិកាឆ្លាតវៃ'), icon: Watch, count: '310', slug: 'wearables' },
    { name: t('Health & Beauty', 'សុខភាព & សម្រស់'), icon: HeartPulse, count: '1,120', slug: 'beauty' },
  ]

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Tablet/Mobile Slide-Out Drawer */}
      <div className="relative w-5/6 sm:w-96 max-w-sm bg-background h-full shadow-2xl flex flex-col p-4 sm:p-5 overflow-y-auto animate-in slide-in-from-left duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b">
          <Link to="/" onClick={onClose} className="flex items-center gap-2">
            <Logo size="md" subtitle={t('Multi-Vendor', 'ផ្សារទំនើបអនឡាញ')} />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full h-8 w-8 sm:h-9 sm:w-9"
              aria-label="Close Navigation Drawer"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* User Account / Auth Section */}
        {currentUser ? (
          <div className="my-3 p-3 rounded-2xl bg-card border shadow-xs space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{currentUser.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{currentUser.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t text-xs">
              <Link
                to="/dashboard/customer"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-muted hover:bg-accent text-foreground font-semibold text-[11px] transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                <span>{t('My Orders', 'ការបញ្ជាទិញ')}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold text-[11px] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('Sign Out', 'ចាកចេញ')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 my-3">
            <Link to="/login" onClick={onClose}>
              <Button variant="outline" size="sm" className="w-full text-xs flex items-center gap-1.5 h-9">
                <LogIn className="w-3.5 h-3.5 text-primary" /> {t('Sign In', 'ចូលគណនី')}
              </Button>
            </Link>
            <Link to="/register" onClick={onClose}>
              <Button size="sm" className="w-full text-xs flex items-center gap-1.5 h-9">
                <UserPlus className="w-3.5 h-3.5" /> {t('Register', 'ចុះឈ្មោះ')}
              </Button>
            </Link>
          </div>
        )}

        {/* GPS Live Delivery Tracker Highlight Button */}
        <Link
          to="/track-order"
          onClick={onClose}
          className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-500/20 transition-colors mb-3"
        >
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{t('Track Live Delivery GPS', 'តាមដានការដឹកជញ្ជូន GPS')}</span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
        </Link>

        {/* Language & Currency Quick Switcher */}
        <div className="grid grid-cols-2 gap-2 mb-3 p-2 rounded-xl bg-muted/50 border text-xs">
          <div className="flex rounded-lg overflow-hidden border bg-background">
            <button
              type="button"
              onClick={() => setLanguage('KM')}
              className={`flex-1 py-1.5 px-1 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
                language === 'KM' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              <img src="/flags/kh.svg" alt="Cambodia" className="w-3.5 h-2.5 rounded-[1px] object-cover shrink-0" />
              <span>ខ្មែរ</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('EN')}
              className={`flex-1 py-1.5 px-1 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
                language === 'EN' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              <img src="/flags/us.svg" alt="English" className="w-3.5 h-2.5 rounded-[1px] object-cover shrink-0" />
              <span>EN</span>
            </button>
          </div>
          <div className="flex rounded-lg overflow-hidden border bg-background">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`flex-1 py-1 text-[11px] font-bold transition-colors ${
                currency === 'USD' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              USD $
            </button>
            <button
              type="button"
              onClick={() => setCurrency('KHR')}
              className={`flex-1 py-1 text-[11px] font-bold transition-colors ${
                currency === 'KHR' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              KHR ៛
            </button>
          </div>
        </div>

        {/* Department Catalog (Categories on Mobile & iPad) */}
        <div className="py-2 border-t">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
            {t('Department Catalog', 'បញ្ជីប្រភេទទំនិញ')}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {featuredCategories.map((cat) => {
              const Icon = cat.icon
              return (
                <Link
                  key={cat.slug}
                  to="/categories"
                  onClick={onClose}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-xs text-foreground group"
                >
                  <div className="p-1 rounded-md bg-muted group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate font-medium text-[11px]">{cat.name}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Primary Navigation Links */}
        <div className="space-y-1 py-2 border-t">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1">
            {t('Navigation', 'មឺនុយទូទៅ')}
          </p>
          {links.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onClose}
                className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-foreground hover:bg-muted"
              >
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Admin Section (Strictly Admin Only) */}
        {isAdmin && (
          <div className="mt-2 pt-2 border-t space-y-1">
            <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" /> {t('Admin Control', 'គ្រប់គ្រងប្រព័ន្ធ (Admin)')}
            </p>
            <Link
              to="/dashboard/admin"
              onClick={onClose}
              className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground font-semibold hover:bg-muted rounded-md"
            >
              <span>{t('Admin Control Center', 'មជ្ឈមណ្ឌលគ្រប់គ្រង Admin')}</span>
            </Link>
            <Link
              to="/admin/products"
              onClick={onClose}
              className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground font-medium hover:bg-muted rounded-md"
            >
              <span>{t('Manage Products & Stock', 'គ្រប់គ្រងទំនិញ និងស្តុក')}</span>
            </Link>
            <Link
              to="/admin/currency"
              onClick={onClose}
              className="flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground font-medium hover:bg-muted rounded-md"
            >
              <span>{t('Currency & Rates', 'រូបិយប័ណ្ណ & អត្រាប្តូរប្រាក់')}</span>
              <span className="text-[10px] text-indigo-500 font-mono">1$ = {usdToKhrRate.toLocaleString()}៛</span>
            </Link>
          </div>
        )}

        {/* Sell on TyuShop Vendor Callout */}
        <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
          <p className="font-semibold text-foreground text-[11px]">{t('Sell on TyuShop?', 'ចង់លក់ទំនិញលើ TyuShop?')}</p>
          <Link
            to="/register"
            onClick={onClose}
            className="text-primary font-bold text-xs hover:underline mt-1 inline-flex items-center gap-1"
          >
            <span>{t('Join as Seller & Open Store', 'ចុះឈ្មោះជាអ្នកលក់')}</span>
            <span>→</span>
          </Link>
        </div>

        {/* Drawer Footer */}
        <div className="mt-auto pt-4 text-center text-xs text-muted-foreground border-t">
          <p className="text-[11px] font-semibold text-foreground">TYUSHOP Enterprise</p>
          <p className="text-[10px] mt-0.5 text-muted-foreground">{t('Multi-Vendor Marketplace Platform', 'ផ្សារទំនើបអនឡាញ')}</p>
        </div>
      </div>
    </div>
  )
}
