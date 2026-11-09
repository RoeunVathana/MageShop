import { Link } from 'react-router-dom'
import {
  X,
  Home,
  ShoppingBag,
  Grid,
  Tag,
  Info,
  Mail,
  HelpCircle,
  Activity,
  LogIn,
  UserPlus,
  LayoutDashboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { authService } from '@/services/auth.service'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { language, setLanguage, currency, setCurrency, usdToKhrRate, allowedCurrencies, t } = useShopEngagement()
  const isAdmin = authService.isAdmin()

  if (!isOpen) return null

  const links = [
    { label: t('Home', 'ទំព័រដើម'), path: '/', icon: Home },
    { label: t('All Products', 'ផលិតផលទាំងអស់'), path: '/products', icon: ShoppingBag },
    { label: t('Categories', 'ប្រភេទទំនិញ'), path: '/categories', icon: Grid },
    { label: t('Brands', 'ម៉ាកយីហោ'), path: '/brands', icon: Tag },
    { label: t('About Us', 'អំពីយើង'), path: '/about', icon: Info },
    { label: t('Contact', 'ទំនាក់ទំនងជំនួយ'), path: '/contact', icon: Mail },
    { label: t('FAQ', 'សំណួរញឹកញាប់'), path: '/faq', icon: HelpCircle },
  ]

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-4/5 max-w-xs bg-background h-full shadow-2xl flex flex-col p-5 overflow-y-auto animate-in slide-in-from-left duration-300">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="font-extrabold text-lg text-primary">TYUSHOP</div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Auth Buttons */}
        <div className="grid grid-cols-2 gap-2 my-4">
          <Link to="/login" onClick={onClose}>
            <Button variant="outline" size="sm" className="w-full text-xs flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5" /> {t('Sign In', 'ចូលគណនី')}
            </Button>
          </Link>
          <Link to="/register" onClick={onClose}>
            <Button size="sm" className="w-full text-xs flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> {t('Register', 'ចុះឈ្មោះ')}
            </Button>
          </Link>
        </div>

        {/* Language & Currency Quick Switcher */}
        <div className="grid grid-cols-2 gap-2 mb-3 p-2 rounded-lg bg-muted/50 border text-xs">
          <div className="flex rounded-md overflow-hidden border">
            <button
              type="button"
              onClick={() => setLanguage('KM')}
              className={`flex-1 py-1.5 px-1.5 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 ${
                language === 'KM' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-background text-muted-foreground'
              }`}
            >
              <img src="/flags/kh.svg" alt="Cambodia" className="w-4 h-3 rounded-[1px] object-cover shrink-0" />
              <span>ខ្មែរ</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('EN')}
              className={`flex-1 py-1.5 px-1.5 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 ${
                language === 'EN' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-background text-muted-foreground'
              }`}
            >
              <img src="/flags/us.svg" alt="English" className="w-4 h-3 rounded-[1px] object-cover shrink-0" />
              <span>EN</span>
            </button>
          </div>
          <div className="flex rounded-md overflow-hidden border">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`flex-1 py-1 text-[11px] font-semibold transition-colors ${
                currency === 'USD' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
              }`}
            >
              USD $
            </button>
            <button
              type="button"
              onClick={() => setCurrency('KHR')}
              className={`flex-1 py-1 text-[11px] font-semibold transition-colors ${
                currency === 'KHR' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
              }`}
            >
              KHR ៛
            </button>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="space-y-1 py-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1">
            Storefront
          </p>
          {links.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-foreground hover:bg-muted"
              >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Admin Section (Strictly Admin Only) */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t space-y-1">
            <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider px-3 mb-1 flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" /> {t('Admin Control', 'គ្រប់គ្រងប្រព័ន្ធ (Admin)')}
            </p>
            <Link
              to="/dashboard/admin"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-1.5 text-xs text-foreground font-semibold hover:bg-muted rounded-md"
            >
              <span>{t('Admin Control Center', 'មជ្ឈមណ្ឌលគ្រប់គ្រង Admin')}</span>
            </Link>
            <Link
              to="/admin/currency"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-1.5 text-xs text-foreground font-semibold hover:bg-muted rounded-md"
            >
              <span>{t('Currency & Exchange Rate', 'រូបិយប័ណ្ណ & អត្រាប្តូរប្រាក់')}</span>
              <span className="text-[10px] text-indigo-500 font-mono">1$ = {usdToKhrRate.toLocaleString()}៛</span>
            </Link>
          </div>
        )}

        <div className="mt-auto pt-6 text-center text-xs text-muted-foreground border-t">
          <p>© 2026 TYUSHOP Inc.</p>
          <p className="text-[10px] mt-1 text-primary">Multi-Vendor Marketplace</p>
        </div>
      </div>
    </div>
  )
}

