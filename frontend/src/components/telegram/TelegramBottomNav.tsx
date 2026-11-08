import React from 'react';
import { Home, Grid, ShoppingBag, Package, User } from 'lucide-react';
import { useTelegramCartStore } from '@/context/telegramCartStore';

export type TelegramViewTab = 'home' | 'categories' | 'cart' | 'orders' | 'profile';

interface TelegramBottomNavProps {
  currentTab: TelegramViewTab;
  onTabChange: (tab: TelegramViewTab) => void;
}

export const TelegramBottomNav: React.FC<TelegramBottomNavProps> = ({ currentTab, onTabChange }) => {
  const totalItems = useTelegramCartStore((state) => state.totalItems());

  const navItems = [
    { id: 'home' as TelegramViewTab, label: 'Home', icon: Home },
    { id: 'categories' as TelegramViewTab, label: 'Catalog', icon: Grid },
    { id: 'cart' as TelegramViewTab, label: 'Cart', icon: ShoppingBag, badge: totalItems },
    { id: 'orders' as TelegramViewTab, label: 'Orders', icon: Package },
    { id: 'profile' as TelegramViewTab, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto bg-background/95 backdrop-blur-md border-t border-border px-3 py-1.5 transition-colors">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (window.Telegram?.WebApp?.HapticFeedback) {
                  window.Telegram.WebApp.HapticFeedback.selectionChanged();
                }
                onTabChange(item.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-background animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

