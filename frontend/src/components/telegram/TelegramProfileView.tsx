import React from 'react';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  HelpCircle,
  LogOut,
  ExternalLink,
  Coins,
  QrCode,
} from 'lucide-react';
import { StoreSettings } from '@/services/telegramApi';

interface TelegramProfileViewProps {
  userProfile?: any;
  storeSettings?: StoreSettings;
  onSwitchRole?: (role: string) => void;
  onOpenSupport?: () => void;
}

export const TelegramProfileView: React.FC<TelegramProfileViewProps> = ({
  userProfile,
  storeSettings,
  onSwitchRole,
  onOpenSupport,
}) => {
  const user = userProfile?.user;
  const tg = userProfile?.telegram;

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Profile Header Card */}
      <div className="bg-card rounded-2xl border border-border p-4 flex items-center space-x-3.5 shadow-2xs">
        <div className="relative">
          {tg?.photo_url ? (
            <img src={tg.photo_url} alt="Profile" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/20" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              {(tg?.first_name || user?.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-background">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5">
            <h3 className="font-bold text-base text-foreground truncate">
              {tg?.first_name ? `${tg.first_name} ${tg.last_name || ''}` : user?.name || 'Verified Shopper'}
            </h3>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {tg?.telegram_username ? `@${tg.telegram_username}` : `TG ID: ${tg?.telegram_user_id || 'Linked'}`}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Authenticated Telegram Session</span>
          </div>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              TYUSHOP Wallet
            </div>
            <div className="text-sm font-extrabold text-foreground">
              $0.00 USD <span className="text-[10px] font-normal text-muted-foreground">(0 pts)</span>
            </div>
          </div>
        </div>

        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-card px-2.5 py-1 rounded-xl border border-indigo-500/30">
          Bakong KHQR
        </span>
      </div>

      {/* Real Store Details Card */}
      <div className="bg-card rounded-2xl border border-border p-3.5 space-y-2.5 shadow-2xs">
        <h4 className="text-xs font-bold text-foreground">Verified Store Flagship</h4>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
            <span>{storeSettings?.store_address || 'Phnom Penh, Cambodia'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span>{storeSettings?.support_email || 'support@megacommerce.local'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span>{storeSettings?.contact_phone || '+855 (23) 998-888'}</span>
          </div>
        </div>
      </div>

      {/* Demo Sandbox Role Switcher */}
      <div className="bg-card rounded-2xl border border-border p-3.5 space-y-2">
        <h4 className="text-xs font-bold text-foreground">Developer Preview Roles</h4>
        <p className="text-[11px] text-muted-foreground">
          Test the Mini App experience with different roles in sandbox mode.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onSwitchRole?.('customer')}
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold hover:border-indigo-500 transition-colors"
          >
            Shopper Mode
          </button>
          <button
            onClick={() => onSwitchRole?.('admin')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
          >
            Staff Admin Mode
          </button>
        </div>
      </div>
    </div>
  );
};

