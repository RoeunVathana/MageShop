import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerResponse } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import * as httpProxy from 'http-proxy';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class LaravelCompatibilityProxy implements OnModuleDestroy {
  private readonly logger = new Logger(LaravelCompatibilityProxy.name);
  private readonly proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    xfwd: true,
    ignorePath: false,
    secure: true,
  });

  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {
    this.proxy.on('error', (error, _request, response) => {
      this.logger.error(`Laravel upstream proxy failed: ${error.message}`);
      const serverResponse = response as ServerResponse;
      if (!serverResponse.headersSent) {
        serverResponse.writeHead(502, { 'content-type': 'application/json' });
      }
      serverResponse.end(JSON.stringify({
        status: 'error',
        message: 'The API service is temporarily unavailable.',
      }));
    });
  }

  middleware(): (request: Request, response: Response, next: NextFunction) => void {
    return (request, response, next) => {
      if (request.path === '/up') {
        next();
        return;
      }

      if (this.shouldUseNestHealth(request)) {
        next();
        return;
      }

      if (this.shouldUseNestCatalog(request)) {
        next();
        return;
      }

      if (this.shouldUseNestBanners(request)) {
        next();
        return;
      }

      if (this.shouldUseNestSellers(request)) {
        next();
        return;
      }

      if (this.shouldUseNestCoupons(request)) {
        next();
        return;
      }

      if (this.shouldUseNestStoreSettings(request)) {
        next();
        return;
      }

      if (this.shouldUseNestMedia(request)) {
        next();
        return;
      }

      if (this.shouldUseNestDeliverySettings(request)) {
        next();
        return;
      }

      if (this.shouldUseNestEngagement(request)) {
        next();
        return;
      }

      if (this.shouldUseNestApiTokens(request)) {
        next();
        return;
      }

      if (this.shouldUseNestCatalogAdmin(request)) {
        next();
        return;
      }

      if (this.shouldUseNestAuth(request)) {
        next();
        return;
      }

      if (this.shouldUseNestOrders(request)) {
        next();
        return;
      }

      if (this.shouldUseNestCheckout(request)) {
        next();
        return;
      }

      if (this.shouldUseNestDeliveryReads(request)) {
        next();
        return;
      }

      if (this.shouldUseNestDeliveryMutations(request)) {
        next();
        return;
      }

      if (this.shouldUseNestOperationsReads(request)) {
        next();
        return;
      }

      if (this.shouldUseNestOperationsMutations(request)) {
        next();
        return;
      }

      if (this.shouldUseNestPaymentConfirmation(request)) {
        next();
        return;
      }

      if (this.shouldUseNestPaymentAccounts(request)) {
        next();
        return;
      }

      if (this.shouldUseNestInventory(request)) {
        next();
        return;
      }

      if (this.shouldUseNestAdminOrders(request)) {
        next();
        return;
      }

      if (this.shouldUseNestAdminSecurity(request)) {
        next();
        return;
      }

      if (this.shouldUseNestReceipts(request)) {
        next();
        return;
      }

      const origin = this.config.get<string>('LARAVEL_API_ORIGIN', 'https://api.tyushop.blog');
      this.proxy.web(request, response, {
        target: origin,
        ignorePath: false,
      });
    };
  }

  private shouldUseNestCatalog(request: Request): boolean {
    if (request.method !== 'GET' || !this.database.enabled) {
      return false;
    }

    // Until NestJS auth/role guards are migrated, authenticated catalog
    // requests stay on Laravel so admin/seller visibility is unchanged.
    if (request.headers.authorization || request.headers.cookie) {
      return false;
    }

    if (this.config.get<string>('NEST_DIRECT_CATALOG', 'false') !== 'true') {
      return false;
    }

    return [
      '/api/v1/categories',
      '/api/v1/brands',
      '/api/v1/products',
    ].includes(request.path)
      || /^\/api\/v1\/categories\/[^/]+(?:\/attributes)?$/.test(request.path)
      || /^\/api\/v1\/brands\/[^/]+$/.test(request.path)
      || /^\/api\/v1\/products\/[^/]+$/.test(request.path);
  }

  private shouldUseNestHealth(request: Request): boolean {
    return this.config.get<string>('NEST_DIRECT_HEALTH', 'false') === 'true'
      && ['/api/v1/health', '/api/v1/health/ready'].includes(request.path)
      && request.method === 'GET';
  }

  private shouldUseNestBanners(request: Request): boolean {
    if (!this.database.enabled) return false;
    const publicReads = this.config.get<string>('NEST_DIRECT_BANNER_READS', 'false') === 'true';
    const adminWrites = this.config.get<string>('NEST_DIRECT_BANNER_ADMIN', 'false') === 'true';
    if (request.path === '/api/v1/banners' || /^\/api\/v1\/banners\/\d+(\/click)?$/.test(request.path)) {
      return publicReads && (request.method === 'GET' || (request.method === 'POST' && request.path.endsWith('/click')));
    }
    if (!request.path.startsWith('/api/v1/admin/banners')) return false;
    if (!adminWrites || (!request.headers.authorization && !request.headers.cookie)) return false;
    return ['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method);
  }

  private shouldUseNestSellers(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_SELLERS', 'false') !== 'true') return false;
    if (request.path === '/api/v1/sellers/stores') return request.method === 'GET';
    if (request.path === '/api/v1/sellers/apply') return request.method === 'POST';
    if (request.path === '/api/v1/sellers/my-application') return request.method === 'GET' && Boolean(request.headers.authorization || request.headers.cookie);
    if (!request.path.startsWith('/api/v1/admin/sellers')) return false;
    if (!request.headers.authorization && !request.headers.cookie) return false;
    return ['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method);
  }

  private shouldUseNestCoupons(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_COUPONS', 'false') !== 'true') return false;
    if (request.path === '/api/v1/coupons' || request.path === '/api/v1/coupons/validate') return request.method === 'GET' || request.method === 'POST';
    if (request.path.startsWith('/api/v1/coupons/') || request.path.startsWith('/api/v1/admin/coupons')) {
      if (!request.headers.authorization && !request.headers.cookie) return false;
      return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    }
    return false;
  }

  private shouldUseNestStoreSettings(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_STORE_SETTINGS', 'false') !== 'true') return false;
    if (request.path === '/api/v1/store-settings') return ['GET', 'PATCH', 'POST'].includes(request.method);
    if (request.path === '/api/v1/store-settings/currency') return request.method === 'POST';
    if (request.path === '/api/v1/admin/store-settings') return ['GET', 'PATCH'].includes(request.method);
    return request.path === '/api/v1/admin/store-settings/currency' && request.method === 'POST';
  }

  private shouldUseNestMedia(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_MEDIA', 'false') !== 'true') return false;
    if (request.path === '/api/v1/admin/media/upload') return request.method === 'POST' && Boolean(request.headers.authorization || request.headers.cookie);
    return request.method === 'GET' && request.path.startsWith('/api/v1/media/');
  }

  private shouldUseNestDeliverySettings(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_DELIVERY_SETTINGS', 'false') !== 'true') return false;
    if (request.path === '/api/v1/delivery/settings') return ['GET', 'POST'].includes(request.method);
    if (request.path === '/api/v1/delivery/toggle-free' || request.path === '/api/v1/delivery/methods') return request.method === 'POST';
    return request.path.startsWith('/api/v1/delivery/methods/') && ['PATCH', 'DELETE'].includes(request.method);
  }

  private shouldUseNestEngagement(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_ENGAGEMENT', 'false') !== 'true') return false;
    if (request.path === '/api/v1/loyalty/summary' || request.path === '/api/v1/wishlist') return request.method === 'GET';
    return ['/api/v1/wishlist/toggle', '/api/v1/support/tickets', '/api/v1/support/chat', '/api/v1/loyalty/redeem-free-item'].includes(request.path) && request.method === 'POST';
  }

  private shouldUseNestApiTokens(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_API_TOKENS', 'false') !== 'true') return false;
    if (!request.headers.authorization && !request.headers.cookie) return false;
    if (request.path === '/api/v1/admin/api-tokens') return ['GET', 'POST'].includes(request.method);
    return /^\/api\/v1\/admin\/api-tokens\/\d+(\/regenerate)?$/.test(request.path) && ['POST', 'DELETE'].includes(request.method);
  }

  private shouldUseNestCatalogAdmin(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_CATALOG_ADMIN', 'false') !== 'true') {
      return false;
    }
    return (/^\/api\/v1\/admin\/(?:categories(?:\/\d+(?:\/attributes)?)?|category-attributes\/\d+|brands(?:\/\d+)?)$/.test(request.path)
      || request.path === '/api/v1/products'
      || /^\/api\/v1\/products\/\d+$/.test(request.path))
      && ['POST', 'PATCH', 'DELETE'].includes(request.method);
  }

  private shouldUseNestAuth(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_AUTH', 'false') !== 'true') {
      return false;
    }

    if (request.method === 'GET') {
      return ['/api/v1/auth/me', '/api/v1/user', '/api/v1/user/profile', '/api/v1/auth/google/redirect', '/api/v1/auth/google/callback'].includes(request.path);
    }
    if (request.method === 'POST') {
      return ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/profile', '/api/v1/auth/logout', '/api/v1/auth/logout-all', '/api/v1/user/profile', '/api/v1/auth/forgot-password', '/api/v1/auth/verify-otp', '/api/v1/auth/reset-password', '/api/v1/auth/google/firebase', '/api/v1/auth/avatar', '/api/v1/auth/profile/avatar', '/api/v1/user/avatar'].includes(request.path);
    }
    if (request.method === 'PUT') {
      return ['/api/v1/auth/profile', '/api/v1/auth/password', '/api/v1/user/profile'].includes(request.path);
    }
    return false;
  }

  private shouldUseNestOrders(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_ORDERS', 'false') !== 'true') {
      return false;
    }
    if (request.method === 'GET') {
      return request.path.startsWith('/api/v1/orders/track/') || request.path === '/api/v1/orders';
    }
    return request.method === 'POST' && /^\/api\/v1\/orders\/[^/]+\/cancel$/.test(request.path);
  }

  private shouldUseNestCheckout(request: Request): boolean {
    return request.method === 'POST'
      && request.path === '/api/v1/orders/checkout'
      && this.database.enabled
      && this.config.get<string>('NEST_DIRECT_CHECKOUT', 'false') === 'true';
  }

  private shouldUseNestDeliveryReads(request: Request): boolean {
    return request.method === 'GET'
      && request.path === '/api/v1/delivery/orders'
      && this.database.enabled
      && this.config.get<string>('NEST_DIRECT_DELIVERY_READS', 'false') === 'true';
  }

  private shouldUseNestDeliveryMutations(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_DELIVERY_MUTATIONS', 'false') !== 'true') return false;
    if (!request.headers.authorization && !request.headers.cookie) return false;
    if (/^\/api\/v1\/delivery\/orders\/[^/]+\/(location|status)$/.test(request.path)) return ['PATCH', 'POST'].includes(request.method);
    return request.path === '/api/v1/delivery/broadcast-gps' && request.method === 'POST';
  }

  private shouldUseNestOperationsReads(request: Request): boolean {
    return request.method === 'GET'
      && this.database.enabled
      && this.config.get<string>('NEST_DIRECT_OPERATIONS_READS', 'false') === 'true'
      && ['/api/v1/operations/overview', '/api/v1/operations/drivers', '/api/v1/operations/seller-dashboard', '/api/v1/seller/dashboard'].includes(request.path);
  }

  private shouldUseNestOperationsMutations(request: Request): boolean {
    return request.method === 'POST'
      && /^\/api\/v1\/operations\/orders\/[^/]+\/assign-driver$/.test(request.path)
      && this.database.enabled
      && this.config.get<string>('NEST_DIRECT_OPERATIONS_MUTATIONS', 'false') === 'true'
      && Boolean(request.headers.authorization || request.headers.cookie);
  }

  private shouldUseNestPaymentConfirmation(request: Request): boolean {
    return request.method === 'POST'
      && /^\/api\/v1\/orders\/track\/[^/]+\/confirm-payment$/.test(request.path)
      && this.database.enabled
      && this.config.get<string>('NEST_DIRECT_PAYMENT_CONFIRM', 'false') === 'true';
  }

  private shouldUseNestPaymentAccounts(request: Request): boolean {
    return /^\/api\/v1\/payment-accounts(?:\/\d+)?(?:\/default)?$/.test(request.path)
      && this.database.enabled
      && this.config.get<string>('NEST_DIRECT_PAYMENT_ACCOUNTS', 'false') === 'true';
  }

  private shouldUseNestInventory(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_INVENTORY', 'false') !== 'true') {
      return false;
    }
    if (request.method === 'GET') {
      if (request.headers.authorization || request.headers.cookie) return false;
      return request.path === '/api/v1/inventory'
        || /^\/api\/v1\/inventory\/\d+$/.test(request.path)
        || /^\/api\/v1\/inventory\/\d+\/movements$/.test(request.path);
    }
    return request.method === 'POST' && /^\/api\/v1\/inventory\/\d+\/adjust$/.test(request.path);
  }

  private shouldUseNestAdminOrders(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_ADMIN_ORDERS', 'false') !== 'true') {
      return false;
    }
    if (!request.headers.authorization && !request.headers.cookie) return false;
    if (request.path === '/api/v1/admin/stats' || request.path === '/api/v1/admin/overview' || request.path === '/api/v1/admin/orders') {
      return request.method === 'GET';
    }
    if (/^\/api\/v1\/admin\/orders\/\d+$/.test(request.path)) return ['GET', 'PATCH', 'DELETE'].includes(request.method);
    return /^\/api\/v1\/admin\/orders\/\d+\/(status|payment-status)$/.test(request.path) && request.method === 'PATCH';
  }

  private shouldUseNestAdminSecurity(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_ADMIN_SECURITY', 'false') !== 'true') return false;
    if (!request.headers.authorization && !request.headers.cookie) return false;
    if (['/api/v1/admin/roles', '/api/v1/admin/permissions', '/api/v1/admin/staff', '/api/v1/admin/users'].includes(request.path)) return request.method === 'GET';
    if (request.path === '/api/v1/admin/users/roles/by-email') return request.method === 'POST';
    if (/^\/api\/v1\/admin\/users\/\d+\/roles$/.test(request.path)) return ['POST', 'PUT', 'PATCH'].includes(request.method);
    if (request.path === '/api/v1/admin/security/users') return ['GET', 'POST'].includes(request.method);
    if (/^\/api\/v1\/admin\/security\/users\/\d+$/.test(request.path)) return ['PATCH', 'DELETE'].includes(request.method);
    return /^\/api\/v1\/admin\/security\/users\/\d+\/(email|password)$/.test(request.path) && request.method === 'PATCH';
  }

  private shouldUseNestReceipts(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_RECEIPTS', 'false') !== 'true') return false;
    if (!request.headers.authorization && !request.headers.cookie) return false;
    if (/^\/api\/v1\/orders\/[^/]+\/receipt$/.test(request.path)) return request.method === 'GET';
    return /^\/api\/v1\/admin\/orders\/[^/]+\/resend-receipt$/.test(request.path) && request.method === 'POST';
  }

  onModuleDestroy(): void {
    this.proxy.close();
  }
}
