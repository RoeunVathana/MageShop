import React from 'react';
import { Sparkles, Wallet, QrCode, Truck, ArrowRight } from 'lucide-react';
import { StoreSettings } from '@/services/telegramApi';

interface TelegramHeroBannerProps {
  customerName?: string;
  storeSettings?: StoreSettings;
  onExploreDeals?: () => void;
}

export const TelegramHeroBanner: React.FC<TelegramHeroBannerProps> = ({
  customerName = 'Shopper',
  storeSettings,
  onExploreDeals,
}) => {
  return (
    <div className="px-4 pt-3 pb-2 space-y-3">
      {/* Welcome & Wallet Bar */}
      <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border/80 shadow-xs">
        <div>
          <span className="text-[11px] font-medium text-muted-foreground">Welcome back,</span>
          <h2 className="text-base font-bold text-foreground leading-tight">
            {customerName} 👋
          </h2>
        </div>

        <div className="flex items-center space-x-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-3 py-1.5 rounded-xl">
          <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Store Credit</div>
            <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">$0.00 USD</div>
          </div>
        </div>
      </div>

      {/* Featured Banner Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-900 text-white p-4 shadow-md">
        {/* Decorative background glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center space-x-1 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-semibold text-indigo-100 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Flagship Season 2026</span>
            </span>

            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-emerald-500/90 text-white px-2 py-0.5 rounded-full">
              <QrCode className="w-3 h-3" />
              <span>Bakong KHQR</span>
            </span>
          </div>

          <div>
            <h3 className="text-lg font-extrabold leading-tight tracking-tight">
              Genuine Tech & Lifestyles
            </h3>
            <p className="text-xs text-indigo-100/90 line-clamp-1 mt-0.5">
              {storeSettings?.shipping_policy || 'Free express nationwide delivery in Cambodia over $50.'}
            </p>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-[11px] text-indigo-200">
              <Truck className="w-3.5 h-3.5" />
              <span>24h – 48h Delivery</span>
            </div>

            <button
              onClick={onExploreDeals}
              className="bg-white text-indigo-800 hover:bg-indigo-50 font-semibold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center space-x-1 active:scale-95 transition-all"
            >
              <span>Shop Deals</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

