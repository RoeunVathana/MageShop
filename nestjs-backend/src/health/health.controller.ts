import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { DatabaseService } from '../database/database.service';

@Controller()
export class HealthController {
  private readinessCache: { expiresAt: number; payload: Record<string, unknown>; statusCode: number } | null = null;

  constructor(private readonly database: DatabaseService) {}

  @Get('/up')
  up(): { status: string; service: string; migrationMode: string } {
    return {
      status: 'ok',
      service: 'mageshop-nestjs-compatibility-gateway',
      migrationMode: 'laravel-upstream',
    };
  }

  @Get('/api/v1/health')
  async apiHealth(@Query('details') details?: string, @Query('detailed') detailed?: string, @Res({ passthrough: true }) response?: Response): Promise<Record<string, unknown>> {
    if (details === '1' || details === 'true' || detailed !== undefined) {
      const result = await this.readiness();
      response?.status(result.statusCode);
      return result.payload;
    }
    return { status: 'ok', application: 'MegaCommerce API' };
  }

  @Get('/api/v1/health/ready')
  async apiReadiness(@Res({ passthrough: true }) response: Response): Promise<Record<string, unknown>> {
    const result = await this.readiness();
    response.status(result.statusCode);
    return result.payload;
  }

  private async readiness(): Promise<{ payload: Record<string, unknown>; statusCode: number }> {
    if (this.readinessCache && this.readinessCache.expiresAt > Date.now()) return this.readinessCache;
    const start = Date.now();
    let databaseStatus = 'healthy';
    let databaseError: string | null = null;
    let databaseLatency = 0;
    if (!this.database.enabled) {
      databaseStatus = 'unconfigured';
      databaseError = 'DATABASE_URL is not configured.';
    } else {
      try {
        await this.database.query('SELECT 1');
        databaseLatency = Date.now() - start;
      } catch (error) {
        databaseStatus = 'unhealthy';
        databaseError = error instanceof Error ? error.message : String(error);
        databaseLatency = Date.now() - start;
      }
    }
    const healthy = databaseStatus === 'healthy';
    const result = {
      payload: {
        status: healthy ? 'ok' : 'degraded',
        application: 'MegaCommerce API',
        version: '1.0.0-nestjs-compatibility',
        timestamp: new Date().toISOString(),
        dependencies: {
          database: { driver: 'postgres', status: databaseStatus, latency_ms: databaseLatency, error: databaseError },
          redis: { status: 'skipped_or_idle', latency_ms: 0, message: 'Redis is optional in the compatibility gateway.' },
          storage: { status: 'available' },
        },
      } as Record<string, unknown>,
      statusCode: healthy ? 200 : 503,
      expiresAt: Date.now() + (healthy ? 60_000 : 5_000),
    };
    this.readinessCache = result;
    return result;
  }
}
