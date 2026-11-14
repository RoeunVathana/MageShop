import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { DatabaseService } from './database/database.service';
import { HealthController } from './health/health.controller';
import { LaravelCompatibilityProxy } from './proxy/laravel-compatibility.proxy';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { SanctumGuard } from './auth/sanctum.guard';
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

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AuthController, CatalogController, CheckoutController, DeliveryController, HealthController, OperationsController, OrderController, PaymentConfirmationController],
  providers: [AuthService, CatalogService, CheckoutService, DatabaseService, DeliveryService, LaravelCompatibilityProxy, OperationsService, OrderService, PaymentConfirmationService, SanctumGuard],
})
export class AppModule {}
