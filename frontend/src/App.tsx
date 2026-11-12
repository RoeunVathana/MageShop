import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/context/ThemeProvider'
import { ShopEngagementProvider } from '@/context/ShopEngagementContext'
import { ToastProvider } from '@/components/ui/toast'
import { SeoHead } from '@/components/seo/SeoHead'
import { ScrollToTop } from '@/components/routing/ScrollToTop'

// Layouts
import { StorefrontLayout } from '@/components/layout/StorefrontLayout'
import {
  AdminOnlyRoute,
  AuthenticatedRoute,
  AdminOrSellerRoute,
  StaffOrAdminRoute,
  DeliveryOrAdminRoute,
  WarehouseOrAdminRoute,
} from '@/components/auth/AdminOnlyRoute'

// Route-level code splitting keeps the public storefront fast and loads admin,
// dashboard, and Telegram code only when the user actually opens those areas.
const HomePage = lazy(() => import('@/pages/storefront/HomePage').then((m) => ({ default: m.HomePage })))
const ProductsPage = lazy(() => import('@/pages/storefront/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const ProductDetailPage = lazy(() => import('@/pages/storefront/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })))
const CategoriesPage = lazy(() => import('@/pages/storefront/CategoriesPage').then((m) => ({ default: m.CategoriesPage })))
const BrandsPage = lazy(() => import('@/pages/storefront/BrandsPage').then((m) => ({ default: m.BrandsPage })))
const CartPage = lazy(() => import('@/pages/storefront/CartPage').then((m) => ({ default: m.CartPage })))
const WishlistPage = lazy(() => import('@/pages/storefront/WishlistPage').then((m) => ({ default: m.WishlistPage })))
const TrackOrderPage = lazy(() => import('@/pages/storefront/TrackOrderPage').then((m) => ({ default: m.TrackOrderPage })))
const AboutPage = lazy(() => import('@/pages/storefront/AboutPage').then((m) => ({ default: m.AboutPage })))
const ContactPage = lazy(() => import('@/pages/storefront/ContactPage').then((m) => ({ default: m.ContactPage })))
const FaqPage = lazy(() => import('@/pages/storefront/FaqPage').then((m) => ({ default: m.FaqPage })))
const JoinSellerPage = lazy(() => import('@/pages/storefront/JoinSellerPage').then((m) => ({ default: m.JoinSellerPage })))

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const VerifyOtpPage = lazy(() => import('@/pages/auth/VerifyOtpPage').then((m) => ({ default: m.VerifyOtpPage })))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))

const CustomerDashboard = lazy(() => import('@/pages/dashboard/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard })))
const SellerDashboard = lazy(() => import('@/pages/dashboard/SellerDashboard').then((m) => ({ default: m.SellerDashboard })))
const AdminDashboard = lazy(() => import('@/pages/dashboard/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const StaffDashboard = lazy(() => import('@/pages/dashboard/StaffDashboard').then((m) => ({ default: m.StaffDashboard })))
const DeliveryDashboard = lazy(() => import('@/pages/dashboard/DeliveryDashboard').then((m) => ({ default: m.DeliveryDashboard })))
const WarehouseDashboard = lazy(() => import('@/pages/dashboard/WarehouseDashboard').then((m) => ({ default: m.WarehouseDashboard })))

const ProductListPage = lazy(() => import('@/pages/admin/ProductListPage').then((m) => ({ default: m.ProductListPage })))
const ProductCreatePage = lazy(() => import('@/pages/admin/ProductCreatePage').then((m) => ({ default: m.ProductCreatePage })))
const ProductEditPage = lazy(() => import('@/pages/admin/ProductEditPage').then((m) => ({ default: m.ProductEditPage })))
const InventoryListPage = lazy(() => import('@/pages/admin/InventoryListPage').then((m) => ({ default: m.InventoryListPage })))
const InventoryHistoryPage = lazy(() => import('@/pages/admin/InventoryHistoryPage').then((m) => ({ default: m.InventoryHistoryPage })))
const CategoryListPage = lazy(() => import('@/pages/admin/CategoryListPage').then((m) => ({ default: m.CategoryListPage })))
const CategoryCreatePage = lazy(() => import('@/pages/admin/CategoryCreatePage').then((m) => ({ default: m.CategoryCreatePage })))
const CategoryEditPage = lazy(() => import('@/pages/admin/CategoryEditPage').then((m) => ({ default: m.CategoryEditPage })))
const BrandListPage = lazy(() => import('@/pages/admin/BrandListPage').then((m) => ({ default: m.BrandListPage })))
const AdminSecurityPage = lazy(() => import('@/pages/admin/AdminSecurityPage').then((m) => ({ default: m.AdminSecurityPage })))
const AdminCurrencyPage = lazy(() => import('@/pages/admin/AdminCurrencyPage').then((m) => ({ default: m.AdminCurrencyPage })))
const AdminCompanyLocationPage = lazy(() => import('@/pages/admin/AdminCompanyLocationPage').then((m) => ({ default: m.AdminCompanyLocationPage })))
const BannerListPage = lazy(() => import('@/pages/admin/BannerListPage').then((m) => ({ default: m.BannerListPage })))
const CouponListPage = lazy(() => import('@/pages/admin/CouponListPage').then((m) => ({ default: m.CouponListPage })))
const AdminOrderListPage = lazy(() => import('@/pages/admin/AdminOrderListPage').then((m) => ({ default: m.AdminOrderListPage })))
const AdminStoreSettingsPage = lazy(() => import('@/pages/admin/AdminStoreSettingsPage').then((m) => ({ default: m.AdminStoreSettingsPage })))
const UserDirectoryPage = lazy(() => import('@/pages/admin/UserDirectoryPage').then((m) => ({ default: m.UserDirectoryPage })))
const AdminSellersPage = lazy(() => import('@/pages/admin/AdminSellersPage').then((m) => ({ default: m.AdminSellersPage })))

const TelegramApp = lazy(() => import('@/pages/telegram/TelegramApp').then((m) => ({ default: m.TelegramApp })))
const DiagnosticsPage = lazy(() => import('@/pages/DiagnosticsPage').then((m) => ({ default: m.DiagnosticsPage })))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="megacommerce-theme">
        <ShopEngagementProvider>
          <ToastProvider>
            <Router>
              <ScrollToTop />
              <SeoHead />
              <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading TYUSHOP…</div>}>
              <Routes>
                {/* Official Telegram Mini App Interface */}
                <Route path="/telegram-app" element={<TelegramApp />} />
                <Route path="/telegram" element={<Navigate to="/telegram-app" replace />} />

                {/* Storefront Layout Routes */}
                <Route element={<StorefrontLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/products/:slug" element={<ProductDetailPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/brands" element={<BrandsPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/track-order" element={<TrackOrderPage />} />
                  <Route path="/track-order/:orderNumber" element={<TrackOrderPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/sell" element={<JoinSellerPage />} />
                  <Route path="/seller/register" element={<JoinSellerPage />} />
                  <Route path="/seller/join" element={<JoinSellerPage />} />
                  <Route path="/diagnostics" element={<AdminOnlyRoute><DiagnosticsPage /></AdminOnlyRoute>} />
                </Route>

              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/login" element={<Navigate to="/login" replace />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/register" element={<Navigate to="/register" replace />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* User Profile & Account Settings (All Users & Admins) */}
              <Route path="/profile" element={<AuthenticatedRoute><ProfilePage /></AuthenticatedRoute>} />
              <Route path="/admin/profile" element={<AdminOnlyRoute><ProfilePage /></AdminOnlyRoute>} />
              <Route path="/dashboard/profile" element={<AuthenticatedRoute><ProfilePage /></AuthenticatedRoute>} />
              <Route path="/dashboard/customer/profile" element={<AuthenticatedRoute><ProfilePage /></AuthenticatedRoute>} />

              {/* Customer Account Portal (Authenticated Users Only) */}
              <Route path="/dashboard/customer" element={<AuthenticatedRoute><CustomerDashboard /></AuthenticatedRoute>} />
              <Route path="/dashboard/customer/orders" element={<AuthenticatedRoute><CustomerDashboard /></AuthenticatedRoute>} />
              <Route path="/dashboard/customer/addresses" element={<AuthenticatedRoute><CustomerDashboard /></AuthenticatedRoute>} />
              <Route path="/dashboard/customer/payments" element={<AuthenticatedRoute><CustomerDashboard /></AuthenticatedRoute>} />
              <Route path="/account" element={<AuthenticatedRoute><CustomerDashboard /></AuthenticatedRoute>} />
              <Route path="/orders" element={<AuthenticatedRoute><CustomerDashboard /></AuthenticatedRoute>} />

              {/* System Dashboards */}
              <Route path="/dashboard/admin" element={<AdminOnlyRoute><AdminDashboard /></AdminOnlyRoute>} />
              <Route path="/dashboard/seller" element={<AdminOrSellerRoute><SellerDashboard /></AdminOrSellerRoute>} />
              <Route path="/dashboard/staff" element={<StaffOrAdminRoute><StaffDashboard /></StaffOrAdminRoute>} />
              <Route path="/dashboard/delivery" element={<DeliveryOrAdminRoute><DeliveryDashboard /></DeliveryOrAdminRoute>} />
              <Route path="/dashboard/warehouse" element={<WarehouseOrAdminRoute><WarehouseDashboard /></WarehouseOrAdminRoute>} />

              {/* Product & Inventory Management (Admin & Seller Accessible) */}
              <Route path="/admin/products" element={<AdminOrSellerRoute><ProductListPage /></AdminOrSellerRoute>} />
              <Route path="/admin/products/create" element={<AdminOrSellerRoute><ProductCreatePage /></AdminOrSellerRoute>} />
              <Route path="/admin/products/:id/edit" element={<AdminOrSellerRoute><ProductEditPage /></AdminOrSellerRoute>} />
              <Route path="/dashboard/seller/products" element={<AdminOrSellerRoute><ProductListPage /></AdminOrSellerRoute>} />
              <Route path="/admin/inventory" element={<AdminOnlyRoute><InventoryListPage /></AdminOnlyRoute>} />
              <Route path="/admin/inventory/:productId/history" element={<AdminOnlyRoute><InventoryHistoryPage /></AdminOnlyRoute>} />

              {/* Promotional Discount Coupons (Admin & Seller Accessible) */}
              <Route path="/admin/coupons" element={<AdminOrSellerRoute><CouponListPage /></AdminOrSellerRoute>} />
              <Route path="/dashboard/seller/coupons" element={<AdminOrSellerRoute><CouponListPage isSellerView /></AdminOrSellerRoute>} />

              {/* Universal Category & Attribute Management (Admin Only) */}
              <Route path="/admin/categories" element={<AdminOnlyRoute><CategoryListPage /></AdminOnlyRoute>} />
              <Route path="/admin/categories/create" element={<AdminOnlyRoute><CategoryCreatePage /></AdminOnlyRoute>} />
              <Route path="/admin/categories/:id/edit" element={<AdminOnlyRoute><CategoryEditPage /></AdminOnlyRoute>} />

              {/* Brand Management (Admin Only) */}
              <Route path="/admin/brands" element={<AdminOnlyRoute><BrandListPage /></AdminOnlyRoute>} />

              {/* Customer Orders & Transactions Management (Admin Only) */}
              <Route path="/admin/orders" element={<AdminOnlyRoute><AdminOrderListPage /></AdminOnlyRoute>} />
              <Route path="/dashboard/admin/orders" element={<AdminOnlyRoute><AdminOrderListPage /></AdminOnlyRoute>} />
              <Route path="/dashboard/admin/disputes" element={<AdminOnlyRoute><AdminOrderListPage /></AdminOnlyRoute>} />

              {/* Currency & Exchange Rate Management (Admin Only) */}
              <Route path="/admin/currency" element={<AdminOnlyRoute><AdminCurrencyPage /></AdminOnlyRoute>} />

              {/* Global Store & Loyalty System Settings (Admin Only) */}
              <Route path="/admin/settings" element={<AdminOnlyRoute><AdminStoreSettingsPage /></AdminOnlyRoute>} />
              <Route path="/admin/store-settings" element={<AdminOnlyRoute><AdminStoreSettingsPage /></AdminOnlyRoute>} />

              {/* Company Profile & Location Management (Admin Only) */}
              <Route path="/admin/company" element={<AdminOnlyRoute><AdminCompanyLocationPage /></AdminOnlyRoute>} />
              <Route path="/admin/location" element={<AdminOnlyRoute><AdminCompanyLocationPage /></AdminOnlyRoute>} />

              {/* API Token Keys & Security Management (Admin Only) */}
              <Route path="/admin/security" element={<AdminOnlyRoute><AdminSecurityPage /></AdminOnlyRoute>} />
              <Route path="/admin/api-tokens" element={<AdminOnlyRoute><AdminSecurityPage /></AdminOnlyRoute>} />

              {/* Slide Banner Management (Admin Only) */}
              <Route path="/admin/banners" element={<AdminOnlyRoute><BannerListPage /></AdminOnlyRoute>} />

              {/* Team Members & User Directory (Admin Only) */}
              <Route path="/dashboard/admin/users" element={<AdminOnlyRoute><UserDirectoryPage /></AdminOnlyRoute>} />
              <Route path="/dashboard/admin/vendors" element={<AdminOnlyRoute><UserDirectoryPage /></AdminOnlyRoute>} />
              <Route path="/admin/users" element={<AdminOnlyRoute><UserDirectoryPage /></AdminOnlyRoute>} />

              {/* Seller Member Governance & Applications (Admin Only) */}
              <Route path="/admin/sellers" element={<AdminOnlyRoute><AdminSellersPage /></AdminOnlyRoute>} />
              <Route path="/dashboard/admin/sellers" element={<AdminOnlyRoute><AdminSellersPage /></AdminOnlyRoute>} />

              {/* Default Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
          </Router>
        </ToastProvider>
      </ShopEngagementProvider>
    </ThemeProvider>
  </QueryClientProvider>
  )
}
