import { Link, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, Truck, Heart, ShoppingCart } from 'lucide-react'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { cn } from '@/lib/utils'

export function MobileBottomNav() {
  const location = useLocation()
  const { cartCount, favoritesCount, t } = useShopEngagement()

  const items = [
    { label: t('Home', 'ទំព័រដើម'), path: '/', icon: Home },
    { label: t('Shop', 'ទំនិញ'), path: '/products', icon: ShoppingBag },
    { label: t('Track GPS', 'តាមដាន'), path: '/track-order', icon: Truck },
    { label: t('Saved', 'ពេញចិត្ត'), path: '/wishlist', icon: Heart, badge: favoritesCount, badgeColor: 'bg-rose-500' },
    { label: t('Cart', 'កន្ត្រក'), path: '/cart', icon: ShoppingCart, badge: cartCount, badgeColor: 'bg-primary' },
  ]

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-lg border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="grid grid-cols-5 h-16 px-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path)

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center',
                      item.badgeColor
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[64px]">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

