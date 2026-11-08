import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/context/ThemeProvider'
import { ShopEngagementProvider } from '@/context/ShopEngagementContext'
import { ToastProvider } from '@/components/ui/toast'

// Layouts
import { StorefrontLayout } from '@/components/layout/StorefrontLayout'
import { AdminOnlyRoute, AuthenticatedRoute } from '@/components/auth/AdminOnlyRoute'

// Storefront Pages
import { HomePage } from '@/pages/storefront/HomePage'
import { ProductsPage } from '@/pages/storefront/ProductsPage'
import { ProductDetailPage } from '@/pages/storefront/ProductDetailPage'
import { CategoriesPage } from '@/pages/storefront/CategoriesPage'
import { BrandsPage } from '@/pages/storefront/BrandsPage'
import { CartPage } from '@/pages/storefront/CartPage'
import { WishlistPage } from '@/pages/storefront/WishlistPage'
import { TrackOrderPage } from '@/pages/storefront/TrackOrderPage'
import { AboutPage } from '@/pages/storefront/AboutPage'
import { ContactPage } from '@/pages/storefront/ContactPage'
import { FaqPage } from '@/pages/storefront/FaqPage'

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { VerifyOtpPage } from '@/pages/auth/VerifyOtpPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

// Dashboards
import { CustomerDashboard } from '@/pages/dashboard/CustomerDashboard'
import { SellerDashboard } from '@/pages/dashboard/SellerDashboard'
import { AdminDashboard } from '@/pages/dashboard/AdminDashboard'
import { StaffDashboard } from '@/pages/dashboard/StaffDashboard'
import { DeliveryDashboard } from '@/pages/dashboard/DeliveryDashboard'
import { WarehouseDashboard } from '@/pages/dashboard/WarehouseDashboard'

// Product & Inventory Administration
import { ProductListPage } from '@/pages/admin/ProductListPage'
import { ProductCreatePage } from '@/pages/admin/ProductCreatePage'
import { ProductEditPage } from '@/pages/admin/ProductEditPage'
import { InventoryListPage } from '@/pages/admin/InventoryListPage'
import { InventoryHistoryPage } from '@/pages/admin/InventoryHistoryPage'

// Category & Attribute Administration
import { CategoryListPage } from '@/pages/admin/CategoryListPage'
import { CategoryCreatePage } from '@/pages/admin/CategoryCreatePage'
import { CategoryEditPage } from '@/pages/admin/CategoryEditPage'

// Brand Administration
import { BrandListPage } from '@/pages/admin/BrandListPage'

// API Token Keys & Security Administration
import { AdminSecurityPage } from '@/pages/admin/AdminSecurityPage'

// Currency & Store Settings Administration
import { AdminCurrencyPage } from '@/pages/admin/AdminCurrencyPage'

// Slide Banner Administration
import { BannerListPage } from '@/pages/admin/BannerListPage'

// Team & User Directory Administration
import { UserDirectoryPage } from '@/pages/admin/UserDirectoryPage'

// Telegram Mini App
import { TelegramApp } from '@/pages/telegram/TelegramApp'

// Diagnostics
import { DiagnosticsPage } from '@/pages/DiagnosticsPage'

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

              {/* Customer Account Portal (Authenticated Users Only) */}
              <Route path="/dashboard/customer" element={<AuthenticatedRoute><CustomerDashboard /></AuthenticatedRoute>} />

              {/* Strict Admin-Only System Dashboards (Staff/Seller/Others Cannot Access — Only Admin) */}
              <Route path="/dashboard/admin" element={<AdminOnlyRoute><AdminDashboard /></AdminOnlyRoute>} />
              <Route path="/dashboard/seller" element={<AdminOnlyRoute><SellerDashboard /></AdminOnlyRoute>} />
              <Route path="/dashboard/staff" element={<AdminOnlyRoute><StaffDashboard /></AdminOnlyRoute>} />
              <Route path="/dashboard/delivery" element={<AdminOnlyRoute><DeliveryDashboard /></AdminOnlyRoute>} />
              <Route path="/dashboard/warehouse" element={<AdminOnlyRoute><WarehouseDashboard /></AdminOnlyRoute>} />

              {/* Product & Inventory Management (Admin Only) */}
              <Route path="/admin/products" element={<AdminOnlyRoute><ProductListPage /></AdminOnlyRoute>} />
              <Route path="/admin/products/create" element={<AdminOnlyRoute><ProductCreatePage /></AdminOnlyRoute>} />
              <Route path="/admin/products/:id/edit" element={<AdminOnlyRoute><ProductEditPage /></AdminOnlyRoute>} />
              <Route path="/admin/inventory" element={<AdminOnlyRoute><InventoryListPage /></AdminOnlyRoute>} />
              <Route path="/admin/inventory/:productId/history" element={<AdminOnlyRoute><InventoryHistoryPage /></AdminOnlyRoute>} />

              {/* Universal Category & Attribute Management (Admin Only) */}
              <Route path="/admin/categories" element={<AdminOnlyRoute><CategoryListPage /></AdminOnlyRoute>} />
              <Route path="/admin/categories/create" element={<AdminOnlyRoute><CategoryCreatePage /></AdminOnlyRoute>} />
              <Route path="/admin/categories/:id/edit" element={<AdminOnlyRoute><CategoryEditPage /></AdminOnlyRoute>} />

              {/* Brand Management (Admin Only) */}
              <Route path="/admin/brands" element={<AdminOnlyRoute><BrandListPage /></AdminOnlyRoute>} />

              {/* Currency & Exchange Rate Management (Admin Only) */}
              <Route path="/admin/currency" element={<AdminOnlyRoute><AdminCurrencyPage /></AdminOnlyRoute>} />
              <Route path="/admin/settings" element={<AdminOnlyRoute><AdminCurrencyPage /></AdminOnlyRoute>} />

              {/* API Token Keys & Security Management (Admin Only) */}
              <Route path="/admin/security" element={<AdminOnlyRoute><AdminSecurityPage /></AdminOnlyRoute>} />
              <Route path="/admin/api-tokens" element={<AdminOnlyRoute><AdminSecurityPage /></AdminOnlyRoute>} />

              {/* Slide Banner Management (Admin Only) */}
              <Route path="/admin/banners" element={<AdminOnlyRoute><BannerListPage /></AdminOnlyRoute>} />

              {/* Team Members & User Directory (Admin Only) */}
              <Route path="/dashboard/admin/users" element={<AdminOnlyRoute><UserDirectoryPage /></AdminOnlyRoute>} />
              <Route path="/admin/users" element={<AdminOnlyRoute><UserDirectoryPage /></AdminOnlyRoute>} />

              {/* Default Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ToastProvider>
      </ShopEngagementProvider>
    </ThemeProvider>
  </QueryClientProvider>
  )
}
