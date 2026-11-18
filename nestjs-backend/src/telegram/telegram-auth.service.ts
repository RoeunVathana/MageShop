import { Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

interface TelegramUser { id?: number | string; username?: string; first_name?: string; last_name?: string; photo_url?: string; language_code?: string; }

@Injectable()
export class TelegramAuthService {
  constructor(private readonly database: DatabaseService, private readonly auth: AuthService, private readonly config: ConfigService) {}

  async authenticate(body: Record<string, unknown>, authorization?: string): Promise<Record<string, unknown>> {
    const initData = String(body.init_data ?? '').trim();
    const demo = this.config.get<string>('NODE_ENV', 'development') !== 'production' && this.boolean(body.demo_mode);
    const demoRole = this.text(body.demo_role).toLowerCase();
    const params = initData
      ? this.validateInitData(initData, await this.setting('telegram_bot_token', this.config.get<string>('TELEGRAM_BOT_TOKEN', '')))
      : (demo ? this.demoData(body.demo_role) : null);
    if (!params) throw new UnprocessableEntityException({ status: 'error', message: 'The init_data parameter is required.' });
    const rawUser = params.user;
    const telegramUser = typeof rawUser === 'string' ? this.parseUser(rawUser) : rawUser as TelegramUser;
    const telegramId = Number(telegramUser?.id);
    if (!Number.isSafeInteger(telegramId) || telegramId <= 0) throw new UnprocessableEntityException({ status: 'error', message: 'Telegram user ID is missing.' });
    const current = await this.auth.authenticate(authorization);
    const firstName = this.text(telegramUser.first_name) || 'Telegram';
    const lastName = this.text(telegramUser.last_name) || 'User';
    const username = this.text(telegramUser.username) || null;
    const photoUrl = this.text(telegramUser.photo_url) || null;
    const language = (this.text(telegramUser.language_code) || 'en').slice(0, 10);
    const adminChatId = Number(await this.setting('telegram_admin_chat_id', this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID', '0')));
    const result = await this.database.transaction(async (client) => {
      const account = await client.query<{ id: number; user_id: number | null }>('SELECT id, user_id FROM telegram_accounts WHERE telegram_user_id=$1 LIMIT 1 FOR UPDATE', [telegramId]);
      let userId = current?.userId ?? account.rows[0]?.user_id ?? null;
      if (!userId && username) {
        const seller = await client.query<{ user_id: number }>(`
          SELECT sa.user_id
          FROM seller_applications sa
          WHERE sa.status = 'approved'
            AND LOWER(REPLACE(COALESCE(sa.telegram_username, ''), '@', '')) = LOWER(REPLACE($1, '@', ''))
          ORDER BY sa.id DESC
          LIMIT 1
        `, [username]);
        userId = seller.rows[0]?.user_id ?? null;
      }
      if (!userId) {
        const email = `tg_${telegramId}@megacommerce.internal`;
        const existing = await client.query<{ id: number }>('SELECT id FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
        userId = existing.rows[0]?.id ?? null;
        if (!userId) {
          const inserted = await client.query<{ id: number }>('INSERT INTO users (name,email,password,status,email_verified_at,loyalty_points,created_at,updated_at) VALUES ($1,$2,$3,\'active\',NOW(),0,NOW(),NOW()) RETURNING id', [`${firstName} ${lastName}`.trim().slice(0, 255), email, await bcrypt.hash(randomBytes(32).toString('hex'), 12)]);
          userId = inserted.rows[0]?.id ?? null;
          if (userId) {
            const role = await client.query<{ id: number }>("SELECT id FROM roles WHERE LOWER(slug)='customer' OR UPPER(name)='CUSTOMER' ORDER BY id LIMIT 1");
            if (role.rows[0]) await client.query('INSERT INTO role_user (user_id,role_id,created_at,updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT DO NOTHING', [userId, role.rows[0].id]);
          }
        }
      }
      if (!userId) throw new Error('Telegram user could not be linked.');
      if (demo && demoRole === 'seller') {
        const sellerRole = await client.query<{ id: number }>("SELECT id FROM roles WHERE LOWER(slug) IN ('seller','seller_staff') OR UPPER(name) IN ('SELLER','SELLER_STAFF') ORDER BY CASE WHEN LOWER(slug)='seller' THEN 0 ELSE 1 END, id LIMIT 1");
        if (sellerRole.rows[0]) await client.query('INSERT INTO role_user (user_id,role_id,created_at,updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT DO NOTHING', [userId, sellerRole.rows[0].id]);
      }
      const roles = await client.query<{ name: string; slug: string }>('SELECT r.name, r.slug FROM roles r JOIN role_user ru ON ru.role_id=r.id WHERE ru.user_id=$1', [userId]);
      const isAdmin = (adminChatId > 0 && adminChatId === telegramId) || roles.rows.some((role) => ['super_admin', 'admin', 'staff'].includes(role.slug.toLowerCase()) || ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role.name.toUpperCase()));
      await client.query(`INSERT INTO telegram_accounts (user_id,telegram_user_id,telegram_username,first_name,last_name,photo_url,language_code,is_bot_admin,linked_at,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW(),NOW())
        ON CONFLICT (telegram_user_id) DO UPDATE SET user_id=EXCLUDED.user_id,telegram_username=EXCLUDED.telegram_username,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,photo_url=COALESCE(EXCLUDED.photo_url,telegram_accounts.photo_url),language_code=EXCLUDED.language_code,is_bot_admin=EXCLUDED.is_bot_admin,updated_at=NOW()`, [userId, telegramId, username, firstName, lastName, photoUrl, language, isAdmin]);
      return { userId };
    });
    const user = await this.auth.findUser(result.userId);
    const account = await this.database.query<Record<string, unknown>>('SELECT id, telegram_user_id, telegram_username, first_name, last_name, photo_url, language_code, is_bot_admin FROM telegram_accounts WHERE telegram_user_id=$1 LIMIT 1', [telegramId]);
    return { status: 'success', data: { token: await this.auth.createToken(result.userId, 'telegram-mini-app'), user: { id: user.id, name: user.name, email: user.email, roles: user.roles.map((role) => role.slug) }, telegram: account.rows[0] ?? null }, ...(demo ? { mode: 'development_demo' } : {}) };
  }

  async profile(userId: number): Promise<Record<string, unknown>> {
    const user = await this.auth.me(userId);
    const account = await this.database.query<Record<string, unknown>>('SELECT id, telegram_user_id, telegram_username, first_name, last_name, photo_url, language_code, is_bot_admin FROM telegram_accounts WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]);
    const count = await this.database.query<{ total: number | string }>('SELECT COUNT(*)::int AS total FROM orders WHERE user_id=$1', [userId]);
    const recent = await this.database.query<Record<string, unknown>>('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5', [userId]);
    return { status: 'success', data: { user: { id: user.id, name: user.name, email: user.email, phone_number: user.phone_number, roles: user.roles.map((role) => role.name) }, telegram: account.rows[0] ?? null, stats: { orders_count: Number(count.rows[0]?.total ?? 0), wallet_balance: 0 }, recent_orders: recent.rows } };
  }

  private validateInitData(initData: string, botToken: string): Record<string, unknown> {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');
    if (!receivedHash) throw new UnauthorizedException({ status: 'error', message: 'Missing hash in Telegram initData.' });
    params.delete('hash');
    const authDate = Number(params.get('auth_date'));
    if (!Number.isFinite(authDate) || Math.abs(Math.floor(Date.now() / 1000) - authDate) > 86_400) throw new UnauthorizedException({ status: 'error', message: 'Telegram initData timestamp has expired or is outside valid window.' });
    const pairs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
    if (!botToken.trim()) throw new UnprocessableEntityException({ status: 'error', message: 'Telegram bot authentication is not configured.' });
    const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expected = createHmac('sha256', secret).update(pairs).digest('hex');
    if (expected.length !== receivedHash.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(receivedHash))) throw new UnauthorizedException({ status: 'error', message: 'Invalid Telegram signature. Verification failed.' });
    const output: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) output[key] = key === 'user' ? this.parseUser(value) : value;
    return output;
  }

  private demoData(roleValue: unknown): Record<string, unknown> { const role = this.text(roleValue).toLowerCase(); const id = role === 'admin' || role === 'staff' ? Number(this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID', '987654321')) : role === 'seller' ? 88001123 : 88001122; return { auth_date: String(Math.floor(Date.now() / 1000)), user: { id, first_name: role === 'admin' ? 'Admin' : role === 'seller' ? 'Seller' : 'Telegram', last_name: 'User', username: role === 'admin' ? 'tyushop_admin' : role === 'seller' ? 'tyushop_seller' : 'telegram_user', language_code: 'en' } }; }
  private parseUser(value: string): TelegramUser { try { return JSON.parse(value) as TelegramUser; } catch { throw new UnauthorizedException({ status: 'error', message: 'Telegram user payload is invalid.' }); } }
  private async setting(key: string, fallback: string): Promise<string> { const result = await this.database.query<{ setting_value: string | null }>('SELECT setting_value FROM store_settings WHERE setting_key=$1 LIMIT 1', [key]); return result.rows[0]?.setting_value || fallback; }
  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
  private boolean(value: unknown): boolean { return ['true', '1', 'yes', 'on'].includes(this.text(value).toLowerCase()); }
}
