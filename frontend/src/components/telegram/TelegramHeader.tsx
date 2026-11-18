import React from 'react';
import { Store, ShieldCheck, Sun, Moon, ShieldAlert, BriefcaseBusiness, Languages } from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';
import { useShopEngagement } from '@/context/ShopEngagementContext';
import { StoreSettings } from '@/services/telegramApi';

interface TelegramHeaderProps {
  storeSettings?: StoreSettings;
  userName?: string;
  userPhoto?: string;
  isAdmin?: boolean;
  adminModeActive?: boolean;
  onToggleAdminMode?: () => void;
  isSeller?: boolean;
  sellerModeActive?: boolean;
  onToggleSellerMode?: () => void;
  onOpenProfile?: () => void;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  storeSettings,
  userName = 'Shopper',
  userPhoto,
  isAdmin = false,
  adminModeActive = false,
  onToggleAdminMode,
  isSeller = false,
  sellerModeActive = false,
  onToggleSellerMode,
  onOpenProfile,
}) => {
  const { setTheme, isDark } = useTheme();
  const { language, setLanguage, t } = useShopEngagement();
  const [failedPhoto, setFailedPhoto] = React.useState<string | null>(null);
  const showPhoto = Boolean(userPhoto && failedPhoto !== userPhoto);

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 py-2.5 transition-colors">
      <div className="flex items-center justify-between">
        {/* Brand & Store Name */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm ring-1 ring-primary/30 shrink-0 bg-background flex items-center justify-center">
            <img
              src="/logo.jpg"
              alt="TYUSHOP Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget
                if (target.src.indexOf('Gemini_Generated_Image') === -1) {
                  target.src = '/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg'
                }
              }}
            />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-bold text-sm tracking-tight leading-none text-foreground">
                {storeSettings?.store_name || 'TYUSHOP'}
              </h1>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              {t('Verified Flagship • Bakong KHQR', 'ហាងផ្លូវការ • បាគង KHQR')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Admin Mode Switcher if user is staff */}
          {isAdmin && (
            <button
              onClick={onToggleAdminMode}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                adminModeActive
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
              title={t('Toggle Staff Mode', 'ប្តូររបៀបបុគ្គលិក')}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">{adminModeActive ? t('Admin', 'អ្នកគ្រប់គ្រង') : t('Staff', 'បុគ្គលិក')}</span>
            </button>
          )}

          {isSeller && !isAdmin && (
            <button
              onClick={onToggleSellerMode}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                sellerModeActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
              title={t('Toggle Seller Workspace', 'ប្តូរកន្លែងធ្វើការអ្នកលក់')}
            >
              <BriefcaseBusiness className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">{sellerModeActive ? t('Shop', 'ហាង') : t('Seller', 'អ្នកលក់')}</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setLanguage(language === 'EN' ? 'KM' : 'EN')}
            className="flex items-center gap-1 rounded-xl bg-muted/70 px-2 py-1.5 text-[10px] font-bold text-foreground transition-colors hover:bg-muted"
            title={t('Switch language', 'ប្តូរភាសា')}
            aria-label={t('Switch language', 'ប្តូរភាសា')}
          >
            <Languages className="h-3.5 w-3.5 text-indigo-500" />
            <span>{language === 'EN' ? 'ខ្មែរ' : 'EN'}</span>
          </button>

          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={t('Toggle Theme', 'ប្តូររូបរាង')}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* User Avatar / Profile */}
          <button
            onClick={onOpenProfile}
            className="relative flex items-center p-0.5 rounded-full ring-2 ring-indigo-500/30 hover:ring-indigo-500 transition-all"
            title={userName}
          >
            {showPhoto ? (
              <img
                src={userPhoto}
                alt={userName}
                className="w-7 h-7 rounded-full object-cover"
                onError={() => setFailedPhoto(userPhoto || null)}
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-background" />
          </button>
        </div>
      </div>
    </header>
  );
};

