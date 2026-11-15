import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

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
      min: this.numberConfig(config, 'DB_POOL_MIN', 1, 0, 20),
      max: this.numberConfig(config, 'DB_POOL_MAX', 20, 1, 100),
      idleTimeoutMillis: this.numberConfig(config, 'DB_IDLE_TIMEOUT_MS', 30_000, 1_000, 300_000),
      connectionTimeoutMillis: this.numberConfig(config, 'DB_CONNECTION_TIMEOUT_MS', 10_000, 1_000, 60_000),
      maxUses: this.numberConfig(config, 'DB_POOL_MAX_USES', 0, 0, 1_000_000),
      keepAlive: true,
      statement_timeout: this.numberConfig(config, 'DB_STATEMENT_TIMEOUT_MS', 30_000, 0, 300_000) || undefined,
      ssl: config.get<string>('DB_SSL', 'true') === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
    });
    this.pool.on('error', (error) => {
      this.logger.error(`PostgreSQL pool error: ${error.message}`);
    });
  }

  get enabled(): boolean {
    return this.pool !== null;
  }

  get poolStats(): Record<string, number> {
    return this.pool
      ? {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount,
        }
      : { total: 0, idle: 0, waiting: 0 };
  }

  async query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('NestJS database access is not configured. Set DATABASE_URL before enabling direct modules.');
    }

    return this.pool.query<T>(text, values);
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('NestJS database access is not configured. Set DATABASE_URL before enabling direct modules.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

  private numberConfig(config: ConfigService, key: string, fallback: number, min: number, max: number): number {
    const value = Number(config.get<string>(key, String(fallback)));
    return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
  }
}
