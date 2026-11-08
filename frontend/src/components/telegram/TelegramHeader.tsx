import React from 'react';
import { Store, ShieldCheck, Sun, Moon, Bell, User as UserIcon, ShieldAlert } from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';
import { StoreSettings } from '@/services/telegramApi';

interface TelegramHeaderProps {
  storeSettings?: StoreSettings;
  userName?: string;
  userPhoto?: string;
  isAdmin?: boolean;
  adminModeActive?: boolean;
  onToggleAdminMode?: () => void;
  onOpenProfile?: () => void;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  storeSettings,
  userName = 'Shopper',
  userPhoto,
  isAdmin = false,
  adminModeActive = false,
  onToggleAdminMode,
  onOpenProfile,
}) => {
  const { setTheme, isDark } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 py-2.5 transition-colors">
      <div className="flex items-center justify-between">
        {/* Brand & Store Name */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm ring-1 ring-indigo-400/30">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-bold text-sm tracking-tight leading-none text-foreground">
                {storeSettings?.store_name || 'MegaCommerce'}
              </h1>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Verified Flagship • Bakong KHQR
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
              title="Toggle Staff Mode"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">{adminModeActive ? 'Admin' : 'Staff'}</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* User Avatar / Profile */}
          <button
            onClick={onOpenProfile}
            className="relative flex items-center p-0.5 rounded-full ring-2 ring-indigo-500/30 hover:ring-indigo-500 transition-all"
            title={userName}
          >
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={userName}
                className="w-7 h-7 rounded-full object-cover"
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

