import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class TelegramWebhookService {
  constructor(private readonly database: DatabaseService, private readonly config: ConfigService) {}

  async verify(secret: string | undefined): Promise<void> {
    const configured = await this.setting('telegram_webhook_secret', this.config.get<string>('TELEGRAM_WEBHOOK_SECRET', ''));
    if (!configured) return;
    const received = String(secret ?? '');
    const expected = Buffer.from(configured);
    const actual = Buffer.from(received);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new ForbiddenException({ status: 'error', message: 'Unauthorized webhook signature.' });
  }

  async handle(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updateId = Number(payload.update_id ?? 0);
    if (updateId > 0) {
      const inserted = await this.database.query<{ id: number }>('INSERT INTO telegram_bot_updates (update_id, processed_at, status, created_at, updated_at) VALUES ($1,NOW(),$2,NOW(),NOW()) ON CONFLICT (update_id) DO NOTHING RETURNING id', [updateId, 'processed']);
      if (!inserted.rows[0]) return { status: 'ignored_duplicate', update_id: updateId };
    }
    const message = (payload.message ?? payload.edited_message) as Record<string, unknown> | undefined;
    const from = message?.from as Record<string, unknown> | undefined;
    const telegramId = Number(from?.id ?? 0);
    if (telegramId > 0) {
      const username = this.text(from?.username) || null;
      const firstName = this.text(from?.first_name) || 'Telegram';
      const lastName = this.text(from?.last_name) || 'User';
      const language = this.text(from?.language_code).slice(0, 10) || 'en';
      const adminChatId = Number(await this.setting('telegram_admin_chat_id', this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID', '0')));
      await this.database.query(`INSERT INTO telegram_accounts (telegram_user_id, telegram_username, first_name, last_name, language_code, is_bot_admin, linked_at, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW(),NOW())
        ON CONFLICT (telegram_user_id) DO UPDATE SET telegram_username=EXCLUDED.telegram_username, first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, language_code=EXCLUDED.language_code, is_bot_admin=EXCLUDED.is_bot_admin, updated_at=NOW()`, [telegramId, username, firstName, lastName, language, adminChatId > 0 && adminChatId === telegramId]);
    }
    return { status: 'processed', update_id: updateId || null, update_type: message ? 'message' : Object.keys(payload)[0] ?? 'unknown' };
  }

  private async setting(key: string, fallback: string): Promise<string> {
    const result = await this.database.query<{ setting_value: string | null }>('SELECT setting_value FROM store_settings WHERE setting_key=$1 LIMIT 1', [key]);
    return result.rows[0]?.setting_value || fallback;
  }

  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
}
