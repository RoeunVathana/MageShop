import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { CatalogAdminController } from './catalog/catalog-admin.controller';
import { CatalogDetailController } from './catalog/catalog-detail.controller';
import { CatalogManagementService } from './catalog/catalog-management.service';
import { ProductAdminController } from './catalog/product-admin.controller';
import { ProductManagementService } from './catalog/product-management.service';
import { DatabaseService } from './database/database.service';
import { HealthController } from './health/health.controller';
import { LaravelCompatibilityProxy } from './proxy/laravel-compatibility.proxy';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthRecoveryService } from './auth/auth-recovery.service';
import { SanctumGuard } from './auth/sanctum.guard';
import { UserAuthController } from './auth/user-auth.controller';
import { OrderController } from './orders/order.controller';
import { OrderService } from './orders/order.service';
import { CheckoutController } from './checkout/checkout.controller';
import { CheckoutService } from './checkout/checkout.service';
import { DeliveryController } from './delivery/delivery.controller';
import { DeliveryService } from './delivery/delivery.service';
import { OperationsController, SellerOperationsController } from './operations/operations.controller';
import { OperationsService } from './operations/operations.service';
import { PaymentConfirmationController } from './payments/payment-confirmation.controller';
import { PaymentConfirmationService } from './payments/payment-confirmation.service';
import { PaymentAccountsController } from './payment-accounts/payment-accounts.controller';
import { PaymentAccountsService } from './payment-accounts/payment-accounts.service';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryService } from './inventory/inventory.service';
import { AdminOrderController } from './admin-orders/admin-order.controller';
import { AdminOrderService } from './admin-orders/admin-order.service';
import { AdminSecurityController } from './admin-security/admin-security.controller';
import { AdminSecurityService } from './admin-security/admin-security.service';
import { AdminBannerController } from './banners/admin-banner.controller';
import { BannerController } from './banners/banner.controller';
import { BannerService } from './banners/banner.service';
import { AdminSellerController } from './sellers/admin-seller.controller';
import { SellerController } from './sellers/seller.controller';
import { SellerService } from './sellers/seller.service';
import { AdminCouponController, CouponController, CouponManagementController } from './coupons/coupon.controller';
import { CouponService } from './coupons/coupon.service';
import { StoreSettingsController } from './store-settings/store-settings.controller';
import { StoreSettingsService } from './store-settings/store-settings.service';
import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';
import { DeliverySettingsController } from './delivery/delivery-settings.controller';
import { AdminDeliverySettingsController } from './delivery/admin-delivery-settings.controller';
import { DeliverySettingsService } from './delivery/delivery-settings.service';
import { EngagementController } from './engagement/engagement.controller';
import { EngagementService } from './engagement/engagement.service';
import { ApiTokenController } from './api-tokens/api-token.controller';
import { ApiTokenService } from './api-tokens/api-token.service';
import { ReceiptController } from './receipts/receipt.controller';
import { ReceiptService } from './receipts/receipt.service';
import { TelegramProductsController } from './telegram/telegram-products.controller';
import { TelegramAuthController } from './telegram/telegram-auth.controller';
import { TelegramAuthService } from './telegram/telegram-auth.service';
import { TelegramAdminController } from './telegram/telegram-admin.controller';
import { TelegramAdminService } from './telegram/telegram-admin.service';
import { TelegramAiController } from './telegram/telegram-ai.controller';
import { TelegramAiService } from './telegram/telegram-ai.service';
import { TelegramWebhookController } from './telegram/telegram-webhook.controller';
import { TelegramWebhookService } from './telegram/telegram-webhook.service';
import { AdminMaintenanceController } from './admin-maintenance/admin-maintenance.controller';
import { AdminMaintenanceService } from './admin-maintenance/admin-maintenance.service';
import { AdminDnsController } from './admin-dns/admin-dns.controller';
import { AdminDnsService } from './admin-dns/admin-dns.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AdminBannerController, AdminCouponController, AdminDeliverySettingsController, AdminDnsController, AdminMaintenanceController, AdminOrderController, AdminSecurityController, AdminSellerController, ApiTokenController, AuthController, BannerController, CatalogAdminController, CatalogController, CatalogDetailController, CheckoutController, CouponController, CouponManagementController, DeliveryController, DeliverySettingsController, EngagementController, HealthController, InventoryController, MediaController, OperationsController, OrderController, PaymentAccountsController, PaymentConfirmationController, ProductAdminController, ReceiptController, SellerController, SellerOperationsController, StoreSettingsController, TelegramAdminController, TelegramAiController, TelegramAuthController, TelegramProductsController, TelegramWebhookController, UserAuthController],
  providers: [AdminDnsService, AdminMaintenanceService, AdminOrderService, AdminSecurityService, ApiTokenService, AuthRecoveryService, AuthService, BannerService, CatalogManagementService, CatalogService, CheckoutService, CouponService, DatabaseService, DeliveryService, DeliverySettingsService, EngagementService, InventoryService, LaravelCompatibilityProxy, MediaService, OperationsService, OrderService, PaymentAccountsService, PaymentConfirmationService, ProductManagementService, ReceiptService, SanctumGuard, SellerService, StoreSettingsService, TelegramAdminService, TelegramAiService, TelegramAuthService, TelegramWebhookService],
})
export class AppModule {}
