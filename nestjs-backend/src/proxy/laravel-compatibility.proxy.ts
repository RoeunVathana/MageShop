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

      if (this.shouldUseNestCatalog(request)) {
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
    ].includes(request.path);
  }

  private shouldUseNestAuth(request: Request): boolean {
    if (!this.database.enabled || this.config.get<string>('NEST_DIRECT_AUTH', 'false') !== 'true') {
      return false;
    }

    return [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/me',
      '/api/v1/auth/logout',
      '/api/v1/auth/logout-all',
    ].includes(request.path);
  }

  private shouldUseNestOrders(request: Request): boolean {
    if (request.method !== 'GET' || !this.database.enabled || this.config.get<string>('NEST_DIRECT_ORDERS', 'false') !== 'true') {
      return false;
    }

    return request.path.startsWith('/api/v1/orders/track/');
  }

  private shouldUseNestCheckout(request: Request): boolean {
    return request.method === 'POST'
      && request.path === '/api/v1/orders/checkout'
      && this.database.enabled
      && this.config.get<string>('NEST_DIRECT_CHECKOUT', 'false') === 'true';
  }

  onModuleDestroy(): void {
    this.proxy.close();
  }
}
