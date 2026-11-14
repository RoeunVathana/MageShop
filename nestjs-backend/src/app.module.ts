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
import { SanctumGuard } from './auth/sanctum.guard';
import { UserAuthController } from './auth/user-auth.controller';
import { OrderController } from './orders/order.controller';
import { OrderService } from './orders/order.service';
import { CheckoutController } from './checkout/checkout.controller';
import { CheckoutService } from './checkout/checkout.service';
import { DeliveryController } from './delivery/delivery.controller';
import { DeliveryService } from './delivery/delivery.service';
import { OperationsController } from './operations/operations.controller';
import { OperationsService } from './operations/operations.service';
import { PaymentConfirmationController } from './payments/payment-confirmation.controller';
import { PaymentConfirmationService } from './payments/payment-confirmation.service';
import { PaymentAccountsController } from './payment-accounts/payment-accounts.controller';
import { PaymentAccountsService } from './payment-accounts/payment-accounts.service';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryService } from './inventory/inventory.service';
import { AdminOrderController } from './admin-orders/admin-order.controller';
import { AdminOrderService } from './admin-orders/admin-order.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AdminOrderController, AuthController, CatalogAdminController, CatalogController, CatalogDetailController, CheckoutController, DeliveryController, HealthController, InventoryController, OperationsController, OrderController, PaymentAccountsController, PaymentConfirmationController, ProductAdminController, UserAuthController],
  providers: [AdminOrderService, AuthService, CatalogManagementService, CatalogService, CheckoutService, DatabaseService, DeliveryService, InventoryService, LaravelCompatibilityProxy, OperationsService, OrderService, PaymentAccountsService, PaymentConfirmationService, ProductManagementService, SanctumGuard],
})
export class AppModule {}
