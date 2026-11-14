import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

interface SettingRow { setting_key: string; setting_value: string | null; }

@Injectable()
export class StoreSettingsService {
  private readonly publicKeys = [
    'store_name', 'store_description', 'store_address', 'company_city', 'company_country', 'company_postal_code',
    'company_latitude', 'company_longitude', 'company_map_embed_url', 'company_google_maps_url', 'business_hours',
    'contact_phone', 'support_email', 'business_email', 'website_url', 'default_currency', 'usd_to_khr_rate',
    'allowed_currencies', 'currency_auto_switch_lang', 'country', 'supported_languages', 'brand_color',
    'return_policy_days', 'shipping_policy', 'tax_id', 'telegram_bot_username', 'telegram_support_contact',
    'loyalty_free_item_max_price', 'loyalty_points_for_free_item', 'bakong_account_id', 'bakong_merchant_name',
    'google_client_id', 'google_auth_enabled', 'firebase_api_key', 'firebase_auth_domain', 'firebase_project_id',
    'firebase_storage_bucket', 'firebase_messaging_sender_id', 'firebase_app_id', 'firebase_measurement_id',
  ] as const;
  private readonly writableKeys = new Set([
    'store_name', 'store_description', 'store_address', 'company_city', 'company_country', 'company_postal_code',
    'company_latitude', 'company_longitude', 'company_map_embed_url', 'company_google_maps_url', 'business_hours',
    'contact_phone', 'support_email', 'business_email', 'telegram_support_contact', 'default_currency',
    'usd_to_khr_rate', 'allowed_currencies', 'currency_auto_switch_lang', 'brand_color', 'return_policy_days',
    'shipping_policy', 'tax_id', 'receipt_footer_message', 'google_client_id', 'google_client_secret',
    'google_auth_enabled', 'firebase_api_key', 'firebase_auth_domain', 'firebase_project_id', 'firebase_storage_bucket',
    'firebase_messaging_sender_id', 'firebase_app_id', 'firebase_measurement_id', 'loyalty_free_item_max_price',
    'loyalty_points_for_free_item', 'bakong_account_id', 'bakong_merchant_name', 'merchant_phone', 'bakong_api_url',
    'bakong_api_enabled',
  ]);
  private readonly adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];

  constructor(private readonly database: DatabaseService, private readonly auth: AuthService, private readonly config: ConfigService) {}

  async publicSettings(): Promise<Record<string, unknown>> {
    const all = await this.readAll();
    const data: Record<string, unknown> = {};
    for (const key of this.publicKeys) if (all[key] !== undefined) data[key] = all[key];
    this.applyPublicDefaults(data);
    return { status: 'success', data };
  }

  async adminSettings(userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const data = await this.readAll();
    this.applyAdminDefaults(data);
    return { status: 'success', data: this.maskSecrets(data) };
  }

  async update(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const values = this.validate(body);
    const token = this.text(body.bakong_api_token);
    const clearToken = this.boolean(body.bakong_api_token_clear);
    await this.database.transaction(async (client) => {
      for (const [key, value] of Object.entries(values)) {
        await client.query(`INSERT INTO store_settings (store_id, setting_key, setting_value, created_at, updated_at)
          VALUES ('primary', $1, $2, NOW(), NOW()) ON CONFLICT (setting_key) DO UPDATE
          SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`, [key, value]);
      }
      if (clearToken || token) {
        const value = clearToken ? '' : this.encryptLaravel(token);
        await client.query(`INSERT INTO store_settings (store_id, setting_key, setting_value, created_at, updated_at)
          VALUES ('primary', 'bakong_api_token_encrypted', $1, NOW(), NOW()) ON CONFLICT (setting_key) DO UPDATE
          SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`, [value]);
      }
    });
    const data = await this.readAll();
    this.applyAdminDefaults(data);
    return { status: 'success', message: 'Store currency and settings updated successfully.', data: this.maskSecrets(data) };
  }

  private async authorizeAdmin(userId: number): Promise<AuthUser> {
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, this.adminRoles)) throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Administrative permissions required.' });
    return user;
  }

  private async readAll(): Promise<Record<string, string>> {
    const result = await this.database.query<SettingRow>('SELECT setting_key, setting_value FROM store_settings');
    return Object.fromEntries(result.rows.map((row) => [row.setting_key, row.setting_value ?? '']));
  }

  private applyPublicDefaults(data: Record<string, unknown>): void {
    const env = (key: string, fallback: string): string => this.config.get<string>(key, fallback);
    data.firebase_api_key ||= env('FIREBASE_API_KEY', ''); data.firebase_auth_domain ||= env('FIREBASE_AUTH_DOMAIN', '');
    data.firebase_project_id ||= env('FIREBASE_PROJECT_ID', ''); data.firebase_app_id ||= env('FIREBASE_APP_ID', '');
    data.google_auth_enabled ??= 'false';
    data.google_is_ready = Boolean(data.google_client_id && data.google_client_id !== 'your-google-client-id' && data.google_client_id !== '1234567890-test.apps.googleusercontent.com');
    data.store_address ||= 'Preah Monivong Blvd, Sangkat Boeung Keng Kang 1, Khan Chamkarmon, Phnom Penh, Cambodia';
    data.company_city ||= 'Phnom Penh'; data.company_country ||= 'Cambodia'; data.company_latitude ||= '11.5564'; data.company_longitude ||= '104.9282';
    data.business_hours ||= 'Mon - Sun: 8:00 AM - 10:00 PM (24/7 Support Desk)';
    data.company_google_maps_url ||= `https://maps.google.com/?q=${data.company_latitude},${data.company_longitude}`;
    data.default_currency ||= 'USD'; data.usd_to_khr_rate ||= '4100'; data.allowed_currencies ||= 'BOTH'; data.currency_auto_switch_lang ??= 'false';
    data.bakong_account_id ||= env('BAKONG_ACCOUNT_ID', ''); data.bakong_merchant_name ||= env('BAKONG_MERCHANT_NAME', 'TYUSHOP');
  }

  private applyAdminDefaults(data: Record<string, unknown>): void {
    this.applyPublicDefaults(data);
    data.google_callback_url = this.config.get<string>('GOOGLE_REDIRECT_URI') || `${this.config.get<string>('APP_URL', 'https://api.tyushop.blog').replace(/\/$/, '')}/api/v1/auth/google/callback`;
    const configuredClient = this.config.get<string>('GOOGLE_CLIENT_ID', '');
    if (!data.google_client_id && configuredClient !== 'your-google-client-id') data.google_client_id = configuredClient;
    data.google_is_configured = Boolean(data.google_client_id && (data.google_client_secret || this.config.get<string>('GOOGLE_CLIENT_SECRET', '')));
    data.bakong_api_url ||= this.config.get<string>('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh'); data.bakong_api_enabled ||= this.config.get<string>('BAKONG_API_ENABLED', 'true');
    data.merchant_phone ||= this.config.get<string>('MERCHANT_PHONE', '');
    const token = this.resolveBakongToken(data);
    data.bakong_api_token_configured = token !== ''; data.bakong_api_token_masked = token ? `••••••••${token.slice(-4)}` : '';
  }

  private maskSecrets(data: Record<string, unknown>): Record<string, unknown> { const masked = { ...data }; delete masked.bakong_api_token_encrypted; delete masked.bakong_api_token; delete masked.google_client_secret; return masked; }
  private resolveBakongToken(data: Record<string, unknown>): string { const encrypted = this.text(data.bakong_api_token_encrypted); if (encrypted) { try { return this.decryptLaravel(encrypted); } catch { /* invalid/old APP_KEY */ } } return this.config.get<string>('BAKONG_API_TOKEN', '').trim(); }

  private validate(body: Record<string, unknown>): Record<string, string> {
    const data: Record<string, string> = {};
    for (const [key, raw] of Object.entries(body)) {
      if (!this.writableKeys.has(key) || raw === undefined || raw === null) continue;
      const value = this.text(raw); if (value.length > this.maxLength(key)) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      if (key === 'default_currency' && !['USD', 'KHR'].includes(value)) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      if (key === 'allowed_currencies' && !['BOTH', 'USD_ONLY', 'KHR_ONLY', 'USD', 'KHR'].includes(value)) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      if (['usd_to_khr_rate', 'return_policy_days', 'loyalty_free_item_max_price', 'loyalty_points_for_free_item'].includes(key) && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      if (['company_latitude', 'company_longitude'].includes(key) && !Number.isFinite(Number(value))) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      if (['support_email', 'business_email'].includes(key) && value && !/^\S+@\S+\.\S+$/.test(value)) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      if (['bakong_api_url', 'company_google_maps_url', 'website_url'].includes(key) && value && !/^https?:\/\//i.test(value)) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      data[key] = ['bakong_api_enabled', 'google_auth_enabled'].includes(key) ? String(this.boolean(raw)) : value;
    }
    return data;
  }

  private maxLength(key: string): number { if (key === 'bakong_api_token') return 2048; if (['store_description', 'shipping_policy', 'company_map_embed_url', 'company_google_maps_url', 'google_client_secret'].includes(key)) return 1500; return 500; }
  private encryptLaravel(value: string): string { const key = this.laravelKey(); const iv = randomBytes(16); const cipher = createCipheriv('aes-256-cbc', key, iv); const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]).toString('base64'); const ivBase64 = iv.toString('base64'); const mac = createHmac('sha256', key).update(ivBase64 + encrypted).digest('hex'); return Buffer.from(JSON.stringify({ iv: ivBase64, value: encrypted, mac, tag: '' })).toString('base64'); }
  private decryptLaravel(payload: string): string { const key = this.laravelKey(); const parsed = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as { iv: string; value: string; mac: string }; const expected = createHmac('sha256', key).update(parsed.iv + parsed.value).digest('hex'); if (!parsed.mac || parsed.mac.length !== expected.length || !timingSafeEqual(Buffer.from(parsed.mac), Buffer.from(expected))) throw new Error('Laravel token MAC verification failed.'); const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(parsed.iv, 'base64')); return Buffer.concat([decipher.update(Buffer.from(parsed.value, 'base64')), decipher.final()]).toString('utf8'); }
  private laravelKey(): Buffer { const raw = this.config.get<string>('APP_KEY', '').trim(); if (!raw) throw new UnprocessableEntityException({ status: 'error', message: 'APP_KEY is required for Bakong token encryption.' }); const key = raw.startsWith('base64:') ? Buffer.from(raw.slice(7), 'base64') : Buffer.from(raw); if (key.length !== 32) throw new UnprocessableEntityException({ status: 'error', message: 'APP_KEY must be a 32-byte Laravel encryption key.' }); return key; }
  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
  private boolean(value: unknown): boolean { return value === true || ['true', '1', 'yes', 'on'].includes(this.text(value).toLowerCase()); }
}
