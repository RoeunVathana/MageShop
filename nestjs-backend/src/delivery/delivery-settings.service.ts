import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

export interface DeliveryMethod { id: string; name: string; name_km: string; price: number; estimated_time: string; estimated_time_km: string; is_active: boolean; is_default: boolean; }

@Injectable()
export class DeliverySettingsService {
  static readonly defaults: DeliveryMethod[] = [
    { id: 'standard_express', name: 'Standard Express (Phnom Penh 1-2h)', name_km: 'សេវាដឹកជញ្ជូនរហ័ស (ភ្នំពេញ ១-២ ម៉ោង)', price: 1.5, estimated_time: '1 - 2 Hours', estimated_time_km: '១ - ២ ម៉ោង', is_active: true, is_default: true },
    { id: 'nationwide_provincial', name: 'Nationwide Provincial Delivery', name_km: 'សេវាដឹកជញ្ជូនតាមបណ្តាខេត្ត', price: 2.5, estimated_time: '24 - 48 Hours', estimated_time_km: '២៤ - ៤៨ ម៉ោង', is_active: true, is_default: false },
    { id: 'vip_instant', name: 'VIP Instant Same-Day Delivery', name_km: 'សេវាដឹកជញ្ជូន VIP ពិសេសភ្លាមៗ', price: 3.5, estimated_time: '30 - 45 Mins', estimated_time_km: '៣០ - ៤៥ នាទី', is_active: true, is_default: false },
  ];

  constructor(private readonly database: DatabaseService, private readonly auth: AuthService) {}

  async settings(): Promise<Record<string, unknown>> {
    const values = await this.read(['delivery_is_free', 'delivery_free_threshold', 'delivery_default_fee', 'delivery_methods']);
    const methods = this.parseMethods(values.get('delivery_methods'));
    return { status: 'success', data: { is_free_delivery: this.boolean(values.get('delivery_is_free') ?? 'true'), free_delivery_threshold: Number(values.get('delivery_free_threshold') ?? 0), default_delivery_fee: Number(values.get('delivery_default_fee') ?? 0), methods } };
  }

  async update(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const free = this.booleanRequired(body.is_free_delivery, 'is_free_delivery');
    const threshold = this.number(body.free_delivery_threshold, 'free_delivery_threshold', true);
    const fee = this.number(body.default_delivery_fee, 'default_delivery_fee', true);
    await this.write([['delivery_is_free', free ? '1' : '0'], ['delivery_free_threshold', String(threshold ?? 0)], ['delivery_default_fee', String(fee ?? 0)]]);
    return this.settings();
  }

  async toggle(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const values = await this.read(['delivery_is_free']);
    const next = body.is_free_delivery === undefined ? !this.boolean(values.get('delivery_is_free') ?? 'true') : this.booleanRequired(body.is_free_delivery, 'is_free_delivery');
    await this.write([['delivery_is_free', next ? '1' : '0']]);
    return { status: 'success', message: next ? 'Free delivery enabled globally.' : 'Paid delivery enabled.', data: { is_free_delivery: next } };
  }

  async add(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const current = await this.methods();
    const method = this.methodInput(body, false);
    const id = `del_${Math.random().toString(36).slice(2, 8)}`;
    if (method.is_default || current.length === 0) current.forEach((item) => { item.is_default = false; });
    const created = { ...method, id, is_default: method.is_default || current.length === 0 };
    current.push(created); await this.saveMethods(current);
    return { status: 'success', message: `Delivery method '${created.name}' added successfully.`, data: created, methods: current };
  }

  async updateMethod(id: string, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const methods = await this.methods(); const item = methods.find((entry) => entry.id === id);
    if (!item) throw new NotFoundException({ status: 'error', message: 'Delivery method not found.' });
    const input = this.methodInput(body, true);
    if (input.is_default) methods.forEach((entry) => { entry.is_default = false; });
    Object.assign(item, input); await this.saveMethods(methods);
    return { status: 'success', message: 'Delivery method updated successfully.', methods };
  }

  async remove(id: string, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const methods = await this.methods(); const filtered = methods.filter((entry) => entry.id !== id);
    if (filtered.length === methods.length) throw new NotFoundException({ status: 'error', message: 'Delivery method not found.' });
    if (filtered.length && !filtered.some((entry) => entry.is_default)) filtered[0].is_default = true;
    await this.saveMethods(filtered); return { status: 'success', message: 'Delivery method deleted successfully.', methods: filtered };
  }

  private async authorize(userId: number): Promise<void> { const user = await this.auth.me(userId); if (!this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'DELIVERY'])) throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Delivery pricing management requires admin or staff privileges.' }); }
  private async methods(): Promise<DeliveryMethod[]> { const values = await this.read(['delivery_methods']); return this.parseMethods(values.get('delivery_methods')); }
  private parseMethods(value: string | undefined): DeliveryMethod[] { if (!value) return DeliverySettingsService.defaults.map((item) => ({ ...item })); try { const parsed = JSON.parse(value) as DeliveryMethod[]; return Array.isArray(parsed) && parsed.length ? parsed.map((item) => ({ ...item, price: Number(item.price), is_active: item.is_active !== false, is_default: item.is_default === true })) : DeliverySettingsService.defaults.map((item) => ({ ...item })); } catch { return DeliverySettingsService.defaults.map((item) => ({ ...item })); } }
  private methodInput(body: Record<string, unknown>, partial: boolean): Omit<DeliveryMethod, 'id'> { const text = (key: string, fallback: string): string => { const value = body[key] === undefined && partial ? fallback : String(body[key] ?? '').trim(); if (!value || value.length > 150) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` }); return value; }; const price = this.number(body.price, 'price', !partial); if (partial && body.price === undefined) { return { name: text('name', ''), name_km: text('name_km', ''), price: 0, estimated_time: text('estimated_time', ''), estimated_time_km: text('estimated_time_km', ''), is_active: this.boolean(body.is_active), is_default: this.boolean(body.is_default) }; } return { name: text('name', ''), name_km: text('name_km', String(body.name ?? '')), price: price ?? 0, estimated_time: text('estimated_time', '1 - 2 Hours'), estimated_time_km: text('estimated_time_km', '១ - ២ ម៉ោង'), is_active: body.is_active === undefined ? true : this.boolean(body.is_active), is_default: body.is_default === true || this.boolean(body.is_default) }; }
  private async read(keys: string[]): Promise<Map<string, string>> { const result = await this.database.query<{ setting_key: string; setting_value: string }>('SELECT setting_key, setting_value FROM store_settings WHERE setting_key = ANY($1::text[])', [keys]); return new Map(result.rows.map((row) => [row.setting_key, row.setting_value])); }
  private async write(entries: Array<[string, string]>): Promise<void> { await this.database.transaction(async (client) => { for (const [key, value] of entries) await client.query(`INSERT INTO store_settings (store_id, setting_key, setting_value, created_at, updated_at) VALUES ('primary', $1, $2, NOW(), NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value, updated_at=NOW()`, [key, value]); }); }
  private async saveMethods(methods: DeliveryMethod[]): Promise<void> {
    const serialized = JSON.stringify(methods.map((item) => ({ ...item, price: Number(item.price.toFixed(2)) })));
    await this.write([['delivery_methods', serialized]]);
  }
  private boolean(value: unknown): boolean { return value === true || ['true', '1', 'yes', 'on'].includes(String(value ?? '').toLowerCase()); }
  private booleanRequired(value: unknown, field: string): boolean { if (value === undefined) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return this.boolean(value); }
  private number(value: unknown, field: string, nullable: boolean): number | null { if (value === undefined || value === null || value === '') { if (nullable) return null; throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); } const result = Number(value); if (!Number.isFinite(result) || result < 0) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return result; }
}
