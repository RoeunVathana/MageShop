<?php

use App\Http\Controllers\Api\V1\Admin\AdminBannerController;
use App\Http\Controllers\Api\V1\Admin\AdminMaintenanceController;
use App\Http\Controllers\Api\V1\Admin\AdminOrderController;
use App\Http\Controllers\Api\V1\Admin\ApiTokenController;
use App\Http\Controllers\Api\V1\Admin\DeliveryPricingController;
use App\Http\Controllers\Api\V1\Admin\EmailPasswordOtpController;
use App\Http\Controllers\Api\V1\Admin\RolePermissionController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BannerController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\CategoryAttributeController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CommerceEngagementController;
use App\Http\Controllers\Api\V1\CouponController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\ReceiptController;
use App\Http\Controllers\Api\V1\SellerController;
use App\Http\Controllers\Api\V1\StoreSettingsController;
use App\Http\Controllers\Api\V1\Telegram\TelegramAdminController;
use App\Http\Controllers\Api\V1\Telegram\TelegramAiController;
use App\Http\Controllers\Api\V1\Telegram\TelegramAuthController;
use App\Http\Controllers\Api\V1\Telegram\TelegramProductController;
use App\Http\Controllers\Api\V1\Telegram\TelegramWebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (v1)
|--------------------------------------------------------------------------
| All routes in this file are automatically prefixed with /api/v1
*/

// Health Check Endpoints
Route::get('/health', [HealthController::class, 'index']);
Route::get('/health/ready', [HealthController::class, 'readiness']);

// Authentication Routes (Sanctum SPA Cookie & Rate-Limited)
Route::prefix('auth')->group(function () {
    // Registration
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:6,1');

    // Login
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    // Email OTP Password Recovery
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:5,1');
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp'])
        ->middleware('throttle:10,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:5,1');

    // Google OAuth 2.0 Socialite & Firebase
    Route::get('/google/redirect', [AuthController::class, 'googleRedirect']);
    Route::get('/google/callback', [AuthController::class, 'googleCallback']);
    Route::post('/google/firebase', [AuthController::class, 'googleFirebase']);

    // Authenticated Session & Self-Profile Endpoints
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/avatar', [AuthController::class, 'uploadAvatar']);
        Route::post('/profile/avatar', [AuthController::class, 'uploadAvatar']);
        Route::put('/password', [AuthController::class, 'updatePassword']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/logout-all', [AuthController::class, 'logoutAllDevices']);
    });
});

// Backward-compatible alias for /user & /user/profile
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::get('/user/profile', [AuthController::class, 'me']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::post('/user/profile', [AuthController::class, 'updateProfile']);
    Route::post('/user/avatar', [AuthController::class, 'uploadAvatar']);
});

// Public Store Settings
Route::get('/store-settings', [StoreSettingsController::class, 'show']);

// Authenticated Store Settings Update Aliases
Route::middleware('auth:sanctum')->group(function () {
    Route::patch('/store-settings', [StoreSettingsController::class, 'update']);
    Route::post('/store-settings', [StoreSettingsController::class, 'update']);
    Route::post('/store-settings/currency', [StoreSettingsController::class, 'update']);
});

// Public Slide Banners
Route::get('/banners', [BannerController::class, 'index']);
Route::get('/banners/{banner}', [BannerController::class, 'show']);
Route::post('/banners/{banner}/click', [BannerController::class, 'click']);

// Public Media & Cloud Storage Streaming / Presigned Proxy
Route::get('/media/{path}', [MediaController::class, 'show'])->where('path', '.*');

// Public Universal Categories, Brands & Attributes
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);
Route::get('/categories/{category}/attributes', [CategoryAttributeController::class, 'index']);

// Public Brands
Route::get('/brands', [BrandController::class, 'index']);
Route::get('/brands/{brand}', [BrandController::class, 'show']);

// Core Product & Inventory APIs
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::post('/products', [ProductController::class, 'store'])->middleware('auth:sanctum');
Route::patch('/products/{product}', [ProductController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/products/{product}', [ProductController::class, 'destroy'])->middleware('auth:sanctum');

Route::get('/inventory', [InventoryController::class, 'index']);
Route::get('/inventory/{product}', [InventoryController::class, 'show']);
Route::get('/inventory/{product}/movements', [InventoryController::class, 'movements']);
Route::post('/inventory/{product}/adjust', [InventoryController::class, 'adjust']);

// Admin System Overview, Orders & Store Settings (Read)
Route::get('/admin/stats', [AdminOrderController::class, 'systemStats']);
Route::get('/admin/overview', [AdminOrderController::class, 'systemStats']);
Route::get('/admin/orders', [AdminOrderController::class, 'index']);
Route::get('/admin/orders/{id}', [AdminOrderController::class, 'show']);
Route::get('/admin/store-settings', [StoreSettingsController::class, 'adminShow']);
Route::get('/admin/roles', [RolePermissionController::class, 'indexRoles']);
Route::get('/admin/permissions', [RolePermissionController::class, 'indexPermissions']);
Route::get('/admin/security/users', [EmailPasswordOtpController::class, 'indexUsers']);
Route::get('/admin/users', [EmailPasswordOtpController::class, 'indexUsers']);
Route::post('/admin/users/{user}/roles', [RolePermissionController::class, 'assignRoles']);
Route::put('/admin/users/{user}/roles', [RolePermissionController::class, 'assignRoles']);

Route::post('/admin/seed-all', [AdminMaintenanceController::class, 'seedAll']);
Route::post('/admin/database/seed', [AdminMaintenanceController::class, 'seedAll']);

// Admin Management (Roles, Permissions, Staff, Store Settings, Banners, API Tokens, Security)
Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
    // Database Seeder Execution
    Route::post('/seed-all', [AdminMaintenanceController::class, 'seedAll']);
    Route::post('/database/seed', [AdminMaintenanceController::class, 'seedAll']);
    // Admin Orders & Sales Mutations
    Route::prefix('orders')->group(function () {
        Route::patch('/{id}/status', [AdminOrderController::class, 'updateStatus']);
        Route::patch('/{id}/payment-status', [AdminOrderController::class, 'updatePaymentStatus']);
        Route::delete('/{id}', [AdminOrderController::class, 'destroy']);
    });
    // Admin Category & Attribute Management
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::patch('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

    Route::post('/categories/{category}/attributes', [CategoryAttributeController::class, 'store']);
    Route::patch('/category-attributes/{attribute}', [CategoryAttributeController::class, 'update']);
    Route::delete('/category-attributes/{attribute}', [CategoryAttributeController::class, 'destroy']);

    // Admin Brand Management
    Route::post('/brands', [BrandController::class, 'store']);
    Route::patch('/brands/{brand}', [BrandController::class, 'update']);
    Route::delete('/brands/{brand}', [BrandController::class, 'destroy']);

    // Role & Permission Management
    Route::get('/roles', [RolePermissionController::class, 'indexRoles']);
    Route::get('/permissions', [RolePermissionController::class, 'indexPermissions']);
    Route::get('/staff', [RolePermissionController::class, 'indexStaff']);
    Route::post('/users/{user}/roles', [RolePermissionController::class, 'assignRoles']);
    Route::put('/users/{user}/roles', [RolePermissionController::class, 'assignRoles']);
    Route::patch('/users/{user}/roles', [RolePermissionController::class, 'assignRoles']);
    Route::post('/security/users/{user}/roles', [RolePermissionController::class, 'assignRoles']);

    // Store Settings
    Route::get('/store-settings', [StoreSettingsController::class, 'adminShow']);
    Route::patch('/store-settings', [StoreSettingsController::class, 'update']);
    Route::post('/store-settings/currency', [StoreSettingsController::class, 'update']);

    // Admin Cloud Storage Media Upload
    Route::post('/media/upload', [MediaController::class, 'upload']);

    // Admin Slide Banner Management
    Route::prefix('banners')->group(function () {
        Route::get('/', [AdminBannerController::class, 'index']);
        Route::post('/', [AdminBannerController::class, 'store']);
        Route::get('/{banner}', [AdminBannerController::class, 'show']);
        Route::patch('/{banner}', [AdminBannerController::class, 'update']);
        Route::delete('/{banner}', [AdminBannerController::class, 'destroy']);
        Route::post('/{banner}/toggle', [AdminBannerController::class, 'toggleActive']);
        Route::post('/reorder', [AdminBannerController::class, 'reorder']);
    });

    // API Token Keys Management
    Route::prefix('api-tokens')->group(function () {
        Route::get('/', [ApiTokenController::class, 'index']);
        Route::post('/', [ApiTokenController::class, 'store']);
        Route::delete('/{id}', [ApiTokenController::class, 'destroy']);
        Route::post('/{id}/regenerate', [ApiTokenController::class, 'regenerate']);
    });

    // Email, Password, User Security & Sent OTP Management
    Route::prefix('security')->group(function () {
        // Users & Credentials
        Route::get('/users', [EmailPasswordOtpController::class, 'indexUsers']);
        Route::post('/users', [EmailPasswordOtpController::class, 'storeUser']);
        Route::delete('/users/{user}', [EmailPasswordOtpController::class, 'deleteUser']);
        Route::patch('/users/{user}/email', [EmailPasswordOtpController::class, 'updateEmail']);
        Route::patch('/users/{user}/password', [EmailPasswordOtpController::class, 'updatePassword']);
        Route::post('/users/{user}/send-otp', [EmailPasswordOtpController::class, 'sendUserOtp']);

        // Sent OTP Logs & Real-time Management
        Route::get('/otps', [EmailPasswordOtpController::class, 'indexOtps']);
        Route::post('/otps/dispatch', [EmailPasswordOtpController::class, 'dispatchOtp']);
        Route::post('/otps/{id}/invalidate', [EmailPasswordOtpController::class, 'invalidateOtp']);
        Route::post('/otps/{id}/resend', [EmailPasswordOtpController::class, 'resendOtp']);

        // Email / SMTP Settings & Deliverability Testing
        Route::get('/email-settings', [EmailPasswordOtpController::class, 'getEmailSettings']);
        Route::patch('/email-settings', [EmailPasswordOtpController::class, 'updateEmailSettings']);
        Route::post('/email-settings/test-otp', [EmailPasswordOtpController::class, 'sendTestEmailOtp']);

        // Telegram Bot API Token Key & Webhook Configuration
        Route::get('/telegram-settings', [EmailPasswordOtpController::class, 'getTelegramSettings']);
        Route::patch('/telegram-settings', [EmailPasswordOtpController::class, 'updateTelegramSettings']);
        Route::post('/telegram-settings/test', [EmailPasswordOtpController::class, 'testTelegramBotConnection']);
    });

    // Delivery & Shipping Pricing Management (Free Delivery Toggle, Add/Update/Delete Rates)
    Route::prefix('delivery')->group(function () {
        Route::get('/settings', [DeliveryPricingController::class, 'getSettings']);
        Route::post('/settings', [DeliveryPricingController::class, 'updateSettings']);
        Route::post('/toggle-free', [DeliveryPricingController::class, 'toggleFreeDelivery']);
        Route::post('/methods', [DeliveryPricingController::class, 'addMethod']);
        Route::patch('/methods/{id}', [DeliveryPricingController::class, 'updateMethod']);
        Route::delete('/methods/{id}', [DeliveryPricingController::class, 'deleteMethod']);
    });
});

// Orders & Branded PDF Receipts
Route::get('/orders/{order}/receipt', [ReceiptController::class, 'show']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/admin/orders/{order}/resend-receipt', [ReceiptController::class, 'resend']);
    Route::post('/admin/dns/porkbun-configure', [CommerceEngagementController::class, 'configurePorkbunDns']);
});

// Discounts, Loyalty Points (5 pts/buy, 100 pts = free item <= $30), Cart Checkout, GPS Tracking, Wishlist & Supporter
Route::get('/coupons', [CommerceEngagementController::class, 'coupons']);
Route::post('/coupons/validate', [CommerceEngagementController::class, 'validateCoupon'])
    ->middleware('throttle:coupons');

// Coupon Management CRUD (Admin & Seller)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/coupons/manage', [CouponController::class, 'index']);
    Route::get('/admin/coupons', [CouponController::class, 'index']);
    Route::post('/coupons', [CouponController::class, 'store']);
    Route::post('/admin/coupons', [CouponController::class, 'store']);
    Route::get('/coupons/{id}', [CouponController::class, 'show']);
    Route::match(['put', 'patch'], '/coupons/{id}', [CouponController::class, 'update']);
    Route::match(['put', 'patch'], '/admin/coupons/{id}', [CouponController::class, 'update']);
    Route::delete('/coupons/{id}', [CouponController::class, 'destroy']);
    Route::delete('/admin/coupons/{id}', [CouponController::class, 'destroy']);
    Route::patch('/coupons/{id}/toggle-active', [CouponController::class, 'toggleActive']);
    Route::patch('/admin/coupons/{id}/toggle-active', [CouponController::class, 'toggleActive']);
});
Route::get('/loyalty/summary', [CommerceEngagementController::class, 'loyaltySummary']);
Route::post('/loyalty/redeem-free-item', [CommerceEngagementController::class, 'redeemFreeItem'])
    ->middleware('throttle:checkout');
Route::post('/orders/checkout', [CommerceEngagementController::class, 'checkout'])
    ->middleware('throttle:checkout');
Route::get('/orders/track/{orderNumber}', [CommerceEngagementController::class, 'trackOrder'])
    ->middleware('throttle:tracking');
Route::post('/orders/track/{orderNumber}/confirm-payment', [CommerceEngagementController::class, 'confirmArrivalPayment'])
    ->middleware('throttle:checkout');

// Staff & Delivery Fleet Dispatch & Location Management
Route::prefix('delivery')->group(function () {
    Route::get('/settings', [DeliveryPricingController::class, 'getSettings']);
    Route::post('/settings', [DeliveryPricingController::class, 'updateSettings']);
    Route::post('/toggle-free', [DeliveryPricingController::class, 'toggleFreeDelivery']);
    Route::post('/methods', [DeliveryPricingController::class, 'addMethod']);
    Route::patch('/methods/{id}', [DeliveryPricingController::class, 'updateMethod']);
    Route::delete('/methods/{id}', [DeliveryPricingController::class, 'deleteMethod']);
    Route::get('/orders', [CommerceEngagementController::class, 'deliveryOrders']);
    Route::patch('/orders/{orderNumber}/location', [CommerceEngagementController::class, 'updateDeliveryLocation']);
    Route::post('/orders/{orderNumber}/status', [CommerceEngagementController::class, 'updateDeliveryStatus']);
    Route::post('/broadcast-gps', [CommerceEngagementController::class, 'broadcastDriverGps']);
});
Route::get('/wishlist', [CommerceEngagementController::class, 'wishlist']);
Route::post('/wishlist/toggle', [CommerceEngagementController::class, 'toggleWishlist']);
Route::post('/support/tickets', [CommerceEngagementController::class, 'createSupportTicket'])
    ->middleware('throttle:support');
Route::post('/support/chat', [CommerceEngagementController::class, 'supporterChat'])
    ->middleware('throttle:support');

// Telegram Bot Webhook & Mini App API
Route::prefix('telegram')->group(function () {
    // Webhook receiver (called by Telegram Bot servers)
    Route::post('/webhook', TelegramWebhookController::class);

    // Mini App Authentication (HMAC verification)
    Route::post('/auth', [TelegramAuthController::class, 'authenticate'])
        ->middleware('throttle:10,1');

    // Mini App Catalog Browsing
    Route::get('/products', [TelegramProductController::class, 'index']);
    Route::get('/products/{idOrSku}', [TelegramProductController::class, 'show']);
    Route::get('/categories', [TelegramProductController::class, 'categories']);

    // AI Shopping Assistant Chat & History
    Route::post('/ai/chat', [TelegramAiController::class, 'chat']);
    Route::get('/ai/history/{sessionId}', [TelegramAiController::class, 'history']);

    // Authenticated Mini App Profile & Actions
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/profile', [TelegramAuthController::class, 'profile']);

        // Admin Management over Telegram
        Route::prefix('admin')->group(function () {
            Route::get('/stock', [TelegramAdminController::class, 'stock']);
            Route::post('/stock-adjust', [TelegramAdminController::class, 'adjustStock']);
            Route::get('/sales-summary', [TelegramAdminController::class, 'salesSummary']);
        });
    });
});

// Seller Member Application & Vendor Storefront Management
Route::prefix('sellers')->group(function () {
    Route::post('/apply', [SellerController::class, 'apply']);
    Route::get('/my-application', [SellerController::class, 'myApplication']);
    Route::get('/stores', [SellerController::class, 'publicStores']);
});

// Admin Seller Member Governance & Approvals
Route::prefix('admin/sellers')->group(function () {
    Route::get('/', [SellerController::class, 'adminIndex']);
    Route::post('/{id}/approve', [SellerController::class, 'adminApprove']);
    Route::post('/{id}/reject', [SellerController::class, 'adminReject']);
    Route::patch('/{id}/status', [SellerController::class, 'adminUpdateStatus']);
});

