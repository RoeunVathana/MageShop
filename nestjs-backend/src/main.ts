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
  const directJsonPaths = new Set([
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/logout',
    '/api/v1/auth/logout-all',
    '/api/v1/orders/checkout',
  ]);
  app.use((request: Request, response: Response, next: NextFunction) => {
    const databaseConfigured = Boolean(config.get<string>('DATABASE_URL', '').trim());
    const directBodyRoute = directJsonPaths.has(request.path)
      && ['POST', 'PUT', 'PATCH'].includes(request.method)
      && databaseConfigured
      && (
        config.get<string>('NEST_DIRECT_AUTH', 'false') === 'true'
        || (request.path === '/api/v1/orders/checkout' && config.get<string>('NEST_DIRECT_CHECKOUT', 'false') === 'true')
      );
    if (
      directBodyRoute
    ) {
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
