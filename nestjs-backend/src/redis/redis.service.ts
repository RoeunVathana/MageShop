import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

type RedisClient = RedisClientType;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClient | null;
  private connectPromise: Promise<boolean> | null = null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) {
      this.client = null;
      return;
    }

    this.client = createClient({
      url,
      socket: {
        connectTimeout: this.numberConfig('REDIS_CONNECT_TIMEOUT_MS', 5_000, 1_000, 60_000),
        reconnectStrategy: (retries) => Math.min(retries * 250, 5_000),
      },
    });
    this.client.on('error', (error) => this.logger.warn(`Redis connection error: ${error.message}`));
  }

  get configured(): boolean {
    return this.client !== null;
  }

  get connected(): boolean {
    return this.client?.isReady === true;
  }

  async onModuleInit(): Promise<void> {
    if (this.client) await this.ensureConnected();
  }

  async ping(): Promise<{ status: string; latency_ms: number; error: string | null }> {
    if (!this.client) return { status: 'unconfigured', latency_ms: 0, error: 'REDIS_URL is not configured.' };
    const started = Date.now();
    try {
      if (!(await this.ensureConnected())) throw new Error('Redis connection is unavailable.');
      await this.client.ping();
      return { status: 'healthy', latency_ms: Date.now() - started, error: null };
    } catch (error) {
      return { status: 'unhealthy', latency_ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async get(key: string): Promise<string | null> {
    if (!(await this.ensureConnected())) return null;
    try {
      return await this.client!.get(key);
    } catch (error) {
      this.logger.warn(`Redis GET failed for ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!(await this.ensureConnected())) return false;
    try {
      if (ttlSeconds && ttlSeconds > 0) await this.client!.set(key, value, { EX: Math.floor(ttlSeconds) });
      else await this.client!.set(key, value);
      return true;
    } catch (error) {
      this.logger.warn(`Redis SET failed for ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!(await this.ensureConnected())) return false;
    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      this.logger.warn(`Redis DEL failed for ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async publish(channel: string, message: string): Promise<boolean> {
    if (!(await this.ensureConnected())) return false;
    try {
      await this.client!.publish(channel, message);
      return true;
    } catch (error) {
      this.logger.warn(`Redis publish failed for ${channel}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client || !this.client.isOpen) return;
    try {
      await this.client.quit();
    } catch (error) {
      this.logger.warn(`Redis shutdown failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.client) return false;
    if (this.client.isReady) return true;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this.client.connect()
      .then(() => true)
      .catch((error) => {
        this.logger.warn(`Redis connection unavailable: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      })
      .finally(() => {
        this.connectPromise = null;
      });
    return this.connectPromise;
  }

  private numberConfig(key: string, fallback: number, min: number, max: number): number {
    const value = Number(this.config.get<string>(key, String(fallback)));
    return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
  }
}
