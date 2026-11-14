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

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AuthController, CatalogController, CheckoutController, HealthController, OrderController],
  providers: [AuthService, CatalogService, CheckoutService, DatabaseService, LaravelCompatibilityProxy, OrderService, SanctumGuard],
})
export class AppModule {}
