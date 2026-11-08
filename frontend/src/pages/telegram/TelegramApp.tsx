import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  SlidersHorizontal,
  Flame,
  Zap,
  Award,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import {
  telegramApi,
  StoreSettings,
  ProductItem,
  CategoryItem,
} from '@/services/telegramApi';
import { TelegramHeader } from '@/components/telegram/TelegramHeader';
import { TelegramHeroBanner } from '@/components/telegram/TelegramHeroBanner';
import { TelegramCategoryBar } from '@/components/telegram/TelegramCategoryBar';
import { TelegramProductCard } from '@/components/telegram/TelegramProductCard';
import { TelegramBottomNav, TelegramViewTab } from '@/components/telegram/TelegramBottomNav';
import { TelegramAiChatModal } from '@/components/telegram/TelegramAiChatModal';
import { TelegramCartDrawer } from '@/components/telegram/TelegramCartDrawer';
import { TelegramOrdersView } from '@/components/telegram/TelegramOrdersView';
import { TelegramAdminView } from '@/components/telegram/TelegramAdminView';
import { TelegramProfileView } from '@/components/telegram/TelegramProfileView';
import { useTelegramCartStore } from '@/context/telegramCartStore';

export const TelegramApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TelegramViewTab>('home');
  const [storeSettings, setStoreSettings] = useState<StoreSettings | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sectionTab, setSectionTab] = useState<string>('all'); // all, featured, new, best_sellers, flash_sales
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Panels
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [adminModeActive, setAdminModeActive] = useState(false);

  // Initialize Telegram WebApp & Auth
  useEffect(() => {
    const tgApp = window.Telegram?.WebApp;
    if (tgApp) {
      tgApp.ready();
      tgApp.expand();
      if (tgApp.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }

    const initAuth = async () => {
      try {
        const initData = tgApp?.initData || '';
        // If no raw initData (running in dev browser), authenticate in demo mode
        const isDev = !initData;
        const authRes = await telegramApi.authenticate(initData, isDev, 'customer');

        // Fetch Store settings & profile
        const [settings, profileRes, catRes] = await Promise.all([
          telegramApi.getStoreSettings(),
          telegramApi.getProfile(),
          telegramApi.getCategories(),
        ]);

        setStoreSettings(settings);
        setUserProfile(profileRes);
        setCategories(catRes);

        // Check if user is staff/admin
        const isAdmin = profileRes?.telegram?.is_bot_admin ||
          profileRes?.user?.roles?.includes('ADMIN') ||
          profileRes?.user?.roles?.includes('SUPER_ADMIN') ||
          profileRes?.user?.roles?.includes('STAFF');

        if (isAdmin) {
          // Keep note of admin eligibility
        }
      } catch (err) {
        console.error('Initialization error', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Fetch Products on filter changes
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await telegramApi.getProducts({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          tab: sectionTab,
          search: searchQuery || undefined,
        });
        setProducts(res.data || []);
      } catch (err) {
        console.error('Failed to load products', err);
      }
    };

    fetchCatalog();
  }, [selectedCategory, sectionTab, searchQuery]);

  const handleSwitchDemoRole = async (role: string) => {
    try {
      setLoading(true);
      await telegramApi.authenticate('', true, role);
      const profileRes = await telegramApi.getProfile();
      setUserProfile(profileRes);
      if (role === 'admin') {
        setAdminModeActive(true);
      } else {
        setAdminModeActive(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isUserStaff =
    userProfile?.telegram?.is_bot_admin ||
    userProfile?.user?.roles?.includes('ADMIN') ||
    userProfile?.user?.roles?.includes('SUPER_ADMIN') ||
    userProfile?.user?.roles?.includes('STAFF');

  const sectionTabs = [
    { id: 'all', label: 'All Items' },
    { id: 'featured', label: 'Featured', icon: Flame },
    { id: 'flash_sales', label: 'Flash Sale', icon: Zap },
    { id: 'best_sellers', label: 'Top Rated', icon: Award },
    { id: 'new', label: 'New Arrivals' },
  ];

  return (
    <div className="min-h-screen bg-muted/20 text-foreground flex justify-center selection:bg-indigo-500 selection:text-white">
      {/* Mobile Frame Container: Centered, max-w-md */}
      <div className="w-full max-w-md min-h-screen bg-background border-x border-border flex flex-col relative shadow-xl">
        {/* Header */}
        <TelegramHeader
          storeSettings={storeSettings}
          userName={userProfile?.telegram?.first_name || userProfile?.user?.name || 'Shopper'}
          userPhoto={userProfile?.telegram?.photo_url}
          isAdmin={isUserStaff}
          adminModeActive={adminModeActive}
          onToggleAdminMode={() => setAdminModeActive(!adminModeActive)}
          onOpenProfile={() => setCurrentTab('profile')}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {adminModeActive ? (
            <TelegramAdminView />
          ) : currentTab === 'home' ? (
            <div className="space-y-3 pb-24">
              {/* Hero Banner with Personalized Greeting */}
              <TelegramHeroBanner
                customerName={userProfile?.telegram?.first_name || 'Shopper'}
                storeSettings={storeSettings}
                onExploreDeals={() => setSectionTab('flash_sales')}
              />

              {/* Category Pills Bar */}
              <TelegramCategoryBar
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />

              {/* Search Bar */}
              <div className="px-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search genuine electronics, SKU, brand..."
                    className="w-full bg-muted/60 border border-border/80 rounded-2xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-foreground placeholder:text-muted-foreground"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Section Tabs (Featured, Flash Sales, Best Sellers, New) */}
              <div className="px-4 overflow-x-auto no-scrollbar">
                <div className="flex items-center space-x-1.5 border-b border-border/60 pb-1 min-w-max">
                  {sectionTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = sectionTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSectionTab(tab.id)}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Product Grid */}
              <div className="px-4">
                {loading ? (
                  <div className="py-16 text-center space-y-2">
                    <RefreshCw className="w-7 h-7 text-indigo-500 animate-spin mx-auto" />
                    <p className="text-xs text-muted-foreground">Retrieving store inventory...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No products found</p>
                    <p className="text-xs text-muted-foreground">Try clearing filters or search query.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {products.map((product) => (
                      <TelegramProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : currentTab === 'categories' ? (
            <div className="p-4 space-y-3 pb-24">
              <h2 className="text-sm font-bold text-foreground">All Departments</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCategory(c.slug);
                      setCurrentTab('home');
                    }}
                    className="bg-card p-3.5 rounded-2xl border border-border text-left hover:border-indigo-500 shadow-2xs transition-all space-y-1"
                  >
                    <div className="font-bold text-xs text-foreground">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.products_count} products</div>
                  </button>
                ))}
              </div>
            </div>
          ) : currentTab === 'cart' ? (
            <div className="pb-24">
              <TelegramCartDrawer
                isOpen={true}
                onClose={() => setCurrentTab('home')}
                storeSettings={storeSettings}
              />
            </div>
          ) : currentTab === 'orders' ? (
            <TelegramOrdersView
              orders={userProfile?.recent_orders || []}
              onStartShopping={() => setCurrentTab('home')}
            />
          ) : (
            <TelegramProfileView
              userProfile={userProfile}
              storeSettings={storeSettings}
              onSwitchRole={handleSwitchDemoRole}
              onOpenSupport={() => setIsAiChatOpen(true)}
            />
          )}
        </main>

        {/* Floating Action Button (FAB) for AI Shopping Assistant */}
        {!adminModeActive && (
          <button
            onClick={() => {
              if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
              }
              setIsAiChatOpen(true);
            }}
            className="fixed bottom-18 right-4 sm:right-[calc(50%-200px)] z-40 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-3.5 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center active:scale-95 transition-all group ring-2 ring-white/20"
            title="Open AI Shopping Assistant"
          >
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold px-0 group-hover:px-1.5">
              AI Assistant
            </span>
          </button>
        )}

        {/* Slide-Up AI Chat Modal */}
        <TelegramAiChatModal
          isOpen={isAiChatOpen}
          onClose={() => setIsAiChatOpen(false)}
          storeName={storeSettings?.store_name}
        />

        {/* Cart Drawer for Quick Checkout */}
        <TelegramCartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          storeSettings={storeSettings}
        />

        {/* Bottom Navigation */}
        <TelegramBottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      </div>
    </div>
  );
};

