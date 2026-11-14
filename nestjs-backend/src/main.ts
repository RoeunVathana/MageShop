import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { json } from 'express';

import { AppModule } from './app.module';
import { LaravelCompatibilityProxy } from './proxy/laravel-compatibility.proxy';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    // The compatibility proxy must receive the original request stream so
    // JSON, multipart uploads, and file bodies reach Laravel unchanged.
    bodyParser: false,
  });
  const config = app.get(ConfigService);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Keep the raw stream available for the Laravel fallback. Parse JSON only
  // for auth routes that are explicitly owned by NestJS during migration.
  const directAuthPaths = new Set([
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/profile',
    '/api/v1/auth/password',
    '/api/v1/auth/logout',
    '/api/v1/auth/logout-all',
    '/api/v1/user/profile',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/verify-otp',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/google/firebase',
    '/api/v1/auth/avatar',
    '/api/v1/auth/profile/avatar',
    '/api/v1/user/avatar',
  ]);
  app.use((request: Request, response: Response, next: NextFunction) => {
    const databaseConfigured = Boolean(config.get<string>('DATABASE_URL', '').trim());
    const directBodyRoute = (
      (directAuthPaths.has(request.path) && config.get<string>('NEST_DIRECT_AUTH', 'false') === 'true')
      || (request.path === '/api/v1/orders/checkout' && config.get<string>('NEST_DIRECT_CHECKOUT', 'false') === 'true')
      || ((request.path === '/api/v1/health' || request.path === '/api/v1/health/ready') && config.get<string>('NEST_DIRECT_HEALTH', 'false') === 'true')
      || (request.path.startsWith('/api/v1/orders/') && request.path.endsWith('/cancel') && config.get<string>('NEST_DIRECT_ORDERS', 'false') === 'true')
      || (request.path.startsWith('/api/v1/orders/track/') && request.path.endsWith('/confirm-payment') && config.get<string>('NEST_DIRECT_PAYMENT_CONFIRM', 'false') === 'true')
      || (request.path.startsWith('/api/v1/payment-accounts') && config.get<string>('NEST_DIRECT_PAYMENT_ACCOUNTS', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/categories') && config.get<string>('NEST_DIRECT_CATALOG_ADMIN', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/category-attributes') && config.get<string>('NEST_DIRECT_CATALOG_ADMIN', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/brands') && config.get<string>('NEST_DIRECT_CATALOG_ADMIN', 'false') === 'true')
      || (request.path === '/api/v1/products' && config.get<string>('NEST_DIRECT_CATALOG_ADMIN', 'false') === 'true')
      || (request.path.startsWith('/api/v1/products/') && config.get<string>('NEST_DIRECT_CATALOG_ADMIN', 'false') === 'true')
      || (request.path.startsWith('/api/v1/inventory/') && request.path.endsWith('/adjust') && config.get<string>('NEST_DIRECT_INVENTORY', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/orders') && config.get<string>('NEST_DIRECT_ADMIN_ORDERS', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/security/users') && config.get<string>('NEST_DIRECT_ADMIN_SECURITY', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/security/') && config.get<string>('NEST_DIRECT_ADMIN_SECURITY', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/users/') && request.path.endsWith('/roles') && config.get<string>('NEST_DIRECT_ADMIN_SECURITY', 'false') === 'true')
      || (request.path === '/api/v1/admin/users/roles/by-email' && config.get<string>('NEST_DIRECT_ADMIN_SECURITY', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/banners') && config.get<string>('NEST_DIRECT_BANNER_ADMIN', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/sellers') && config.get<string>('NEST_DIRECT_SELLERS', 'false') === 'true')
      || (request.path === '/api/v1/sellers/apply' && config.get<string>('NEST_DIRECT_SELLERS', 'false') === 'true')
      || (request.path.startsWith('/api/v1/coupons') && config.get<string>('NEST_DIRECT_COUPONS', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/coupons') && config.get<string>('NEST_DIRECT_COUPONS', 'false') === 'true')
      || (request.path === '/api/v1/store-settings' && config.get<string>('NEST_DIRECT_STORE_SETTINGS', 'false') === 'true')
      || (request.path === '/api/v1/store-settings/currency' && config.get<string>('NEST_DIRECT_STORE_SETTINGS', 'false') === 'true')
      || (request.path === '/api/v1/admin/store-settings' && config.get<string>('NEST_DIRECT_STORE_SETTINGS', 'false') === 'true')
      || (request.path === '/api/v1/admin/store-settings/currency' && config.get<string>('NEST_DIRECT_STORE_SETTINGS', 'false') === 'true')
      || (request.path === '/api/v1/admin/media/upload' && config.get<string>('NEST_DIRECT_MEDIA', 'false') === 'true')
      || (request.path === '/api/v1/delivery/settings' && config.get<string>('NEST_DIRECT_DELIVERY_SETTINGS', 'false') === 'true')
      || (request.path === '/api/v1/admin/delivery/settings' && config.get<string>('NEST_DIRECT_DELIVERY_SETTINGS', 'false') === 'true')
      || (request.path === '/api/v1/delivery/toggle-free' && config.get<string>('NEST_DIRECT_DELIVERY_SETTINGS', 'false') === 'true')
      || (request.path === '/api/v1/admin/delivery/toggle-free' && config.get<string>('NEST_DIRECT_DELIVERY_SETTINGS', 'false') === 'true')
      || (request.path === '/api/v1/delivery/methods' && config.get<string>('NEST_DIRECT_DELIVERY_SETTINGS', 'false') === 'true')
      || (request.path === '/api/v1/admin/delivery/methods' && config.get<string>('NEST_DIRECT_DELIVERY_SETTINGS', 'false') === 'true')
      || (request.path.startsWith('/api/v1/delivery/methods/') && config.get<string>('NEST_DIRECT_DELIVERY_SETTINGS', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/delivery/methods/') && config.get<string>('NEST_DIRECT_DELIVERY_SETTINGS', 'false') === 'true')
      || (request.path === '/api/v1/wishlist/toggle' && config.get<string>('NEST_DIRECT_ENGAGEMENT', 'false') === 'true')
      || (request.path === '/api/v1/support/tickets' && config.get<string>('NEST_DIRECT_ENGAGEMENT', 'false') === 'true')
      || (request.path === '/api/v1/support/chat' && config.get<string>('NEST_DIRECT_ENGAGEMENT', 'false') === 'true')
      || (request.path === '/api/v1/loyalty/redeem-free-item' && config.get<string>('NEST_DIRECT_ENGAGEMENT', 'false') === 'true')
      || (request.path === '/api/v1/admin/api-tokens' && config.get<string>('NEST_DIRECT_API_TOKENS', 'false') === 'true')
      || (request.path.startsWith('/api/v1/telegram/') && (config.get<string>('NEST_DIRECT_TELEGRAM', 'false') === 'true' || config.get<string>('NEST_DIRECT_TELEGRAM_EXTENDED', 'false') === 'true'))
      || (request.path.startsWith('/api/v1/admin/api-tokens/') && config.get<string>('NEST_DIRECT_API_TOKENS', 'false') === 'true')
      || (request.path.startsWith('/api/v1/admin/orders/') && request.path.endsWith('/resend-receipt') && config.get<string>('NEST_DIRECT_RECEIPTS', 'false') === 'true')
      || (request.path === '/api/v1/admin/database/clear-application-data' && config.get<string>('NEST_DIRECT_ADMIN_MAINTENANCE', 'false') === 'true')
      || (request.path === '/api/v1/admin/dns/porkbun-configure' && config.get<string>('NEST_DIRECT_ADMIN_DNS', 'false') === 'true')
      || (request.path.startsWith('/api/v1/delivery/orders/') && config.get<string>('NEST_DIRECT_DELIVERY_MUTATIONS', 'false') === 'true')
      || (request.path === '/api/v1/delivery/broadcast-gps' && config.get<string>('NEST_DIRECT_DELIVERY_MUTATIONS', 'false') === 'true')
      || (request.path.startsWith('/api/v1/operations/orders/') && config.get<string>('NEST_DIRECT_OPERATIONS_MUTATIONS', 'false') === 'true')
    )
      && ['POST', 'PUT', 'PATCH'].includes(request.method)
      && databaseConfigured;
    if (directBodyRoute && String(request.headers['content-type'] ?? '').toLowerCase().includes('application/json')) {
      json()(request, response, next);
      return;
    }
    next();
  });

  const proxy = app.get(LaravelCompatibilityProxy);
  app.use(proxy.middleware());

  const port = Number(config.get<string>('PORT', '8080'));
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
