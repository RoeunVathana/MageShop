import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/context/ThemeProvider'
import { ToastProvider } from '@/components/ui/toast'

// Layouts
import { StorefrontLayout } from '@/components/layout/StorefrontLayout'

// Storefront Pages
import { HomePage } from '@/pages/storefront/HomePage'
import { ProductsPage } from '@/pages/storefront/ProductsPage'
import { ProductDetailPage } from '@/pages/storefront/ProductDetailPage'
import { CategoriesPage } from '@/pages/storefront/CategoriesPage'
import { BrandsPage } from '@/pages/storefront/BrandsPage'
import { CartPage } from '@/pages/storefront/CartPage'
import { WishlistPage } from '@/pages/storefront/WishlistPage'
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

// Slide Banner Administration
import { BannerListPage } from '@/pages/admin/BannerListPage'

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
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/diagnostics" element={<DiagnosticsPage />} />
              </Route>

              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/login" element={<Navigate to="/login" replace />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/register" element={<Navigate to="/register" replace />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Multi-Vendor Role Dashboards */}
              <Route path="/dashboard/customer" element={<CustomerDashboard />} />
              <Route path="/dashboard/seller" element={<SellerDashboard />} />
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
              <Route path="/dashboard/staff" element={<StaffDashboard />} />
              <Route path="/dashboard/delivery" element={<DeliveryDashboard />} />
              <Route path="/dashboard/warehouse" element={<WarehouseDashboard />} />

              {/* Product & Inventory Management */}
              <Route path="/admin/products" element={<ProductListPage />} />
              <Route path="/admin/products/create" element={<ProductCreatePage />} />
              <Route path="/admin/products/:id/edit" element={<ProductEditPage />} />
              <Route path="/admin/inventory" element={<InventoryListPage />} />
              <Route path="/admin/inventory/:productId/history" element={<InventoryHistoryPage />} />

              {/* Universal Category & Attribute Management */}
              <Route path="/admin/categories" element={<CategoryListPage />} />
              <Route path="/admin/categories/create" element={<CategoryCreatePage />} />
              <Route path="/admin/categories/:id/edit" element={<CategoryEditPage />} />

              {/* Brand Management */}
              <Route path="/admin/brands" element={<BrandListPage />} />

              {/* API Token Keys & Security Management */}
              <Route path="/admin/security" element={<AdminSecurityPage />} />
              <Route path="/admin/api-tokens" element={<AdminSecurityPage />} />

              {/* Slide Banner Management */}
              <Route path="/admin/banners" element={<BannerListPage />} />

              {/* Default Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
