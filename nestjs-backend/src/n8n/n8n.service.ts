import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);

  constructor(private readonly config: ConfigService) {}

  get configured(): boolean {
    return this.enabled && Boolean(this.webhookUrl);
  }

  async dispatch(event: string, payload: Record<string, unknown>): Promise<boolean> {
    if (!this.configured) return false;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-tyushop-event': event,
      };
      const secret = this.config.get<string>('N8N_WEBHOOK_SECRET')?.trim();
      if (secret) headers['x-n8n-secret'] = secret;

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event,
          event_id: randomUUID(),
          source: 'nestjs-api',
          occurred_at: new Date().toISOString(),
          payload,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        this.logger.warn(`n8n webhook returned HTTP ${response.status} for ${event}.`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.warn(`n8n webhook failed for ${event}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private get enabled(): boolean {
    return ['true', '1', 'yes', 'on'].includes((this.config.get<string>('N8N_ENABLED', 'false') ?? '').toLowerCase());
  }

  private get webhookUrl(): string {
    return (this.config.get<string>('N8N_WEBHOOK_URL', '') ?? '').trim();
  }

  private get timeoutMs(): number {
    const value = Number(this.config.get<string>('N8N_TIMEOUT_MS', '5000'));
    return Number.isFinite(value) ? Math.min(30_000, Math.max(1_000, Math.floor(value))) : 5_000;
  }
}
