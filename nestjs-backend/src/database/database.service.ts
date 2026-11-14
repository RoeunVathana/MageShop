import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool | null;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL')?.trim();

    if (!connectionString) {
      this.pool = null;
      return;
    }

    this.pool = new Pool({
      connectionString,
      max: Number(config.get<string>('DB_POOL_MAX', '10')),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: config.get<string>('DB_SSL', 'true') === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  get enabled(): boolean {
    return this.pool !== null;
  }

  async query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('NestJS database access is not configured. Set DATABASE_URL before enabling direct modules.');
    }

    return this.pool.query<T>(text, values);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.pool) {
      return;
    }

    try {
      await this.pool.end();
    } catch (error) {
      this.logger.warn(`Database pool shutdown failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
