import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

interface CouponRow {
  id: number;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number | string;
  min_order_amount: number | string;
  max_discount_amount: number | string | null;
  is_active: boolean;
  expires_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class CouponService {
  constructor(private readonly database: DatabaseService, private readonly auth: AuthService) {}

  async active(): Promise<Record<string, unknown>> {
    const rows = await this.database.query<CouponRow>(`SELECT * FROM coupons WHERE is_active=TRUE AND (expires_at IS NULL OR expires_at >= NOW()) ORDER BY discount_value DESC`);
    const settings = await this.settings(['loyalty_points_per_purchase', 'loyalty_points_for_free_item', 'loyalty_free_item_max_price']);
    const pointsPerPurchase = Number(settings.get('loyalty_points_per_purchase') ?? 5);
    const pointsForFreeItem = Number(settings.get('loyalty_points_for_free_item') ?? 100);
    const freeItemMaxPrice = Number(settings.get('loyalty_free_item_max_price') ?? 30);
    return { status: 'ok', data: rows.rows.map((row) => this.resource(row)), loyalty_rules: { points_per_purchase: pointsPerPurchase, points_for_free_item: pointsForFreeItem, free_item_max_price: freeItemMaxPrice, description: `Earn ${pointsPerPurchase} points on every purchase! Collect ${pointsForFreeItem} points to redeem any item priced up to $${freeItemMaxPrice} for FREE.` } };
  }

  async validate(codeValue: unknown, subtotalValue: unknown): Promise<Record<string, unknown>> {
    const code = this.text(codeValue).toUpperCase();
    const subtotal = this.number(subtotalValue);
    if (!code || code.length > 40 || subtotal === null || subtotal < 0) throw new UnprocessableEntityException({ status: 'error', message: 'The coupon code and subtotal are required.' });
    const result = await this.database.query<CouponRow>('SELECT * FROM coupons WHERE UPPER(code)=$1 AND is_active=TRUE LIMIT 1', [code]);
    const coupon = result.rows[0] ?? this.fallback(code);
    if (!coupon || (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now())) throw new UnprocessableEntityException({ status: 'error', message: `Coupon code '${code}' is invalid or expired.` });
    const minimum = Number(coupon.min_order_amount ?? 0);
    if (subtotal < minimum) throw new UnprocessableEntityException({ status: 'error', message: `Coupon '${coupon.code}' requires a minimum order of $${minimum.toFixed(2)}. (Current cart: $${subtotal.toFixed(2)})` });
    let discount = coupon.discount_type === 'percentage' ? Number((subtotal * (Number(coupon.discount_value) / 100)).toFixed(2)) : Math.min(subtotal, Number(coupon.discount_value));
    if (coupon.max_discount_amount !== null) discount = Math.min(discount, Number(coupon.max_discount_amount));
    discount = Number(Math.max(0, discount).toFixed(2));
    return { status: 'ok', message: `Coupon '${coupon.code}' applied! You saved $${discount.toFixed(2)}`, data: { code: coupon.code, description: coupon.description, discount_type: coupon.discount_type, discount_value: Number(coupon.discount_value), discount_amount: discount, new_subtotal: Math.max(0, Number((subtotal - discount).toFixed(2))) } };
  }

  async list(query: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeManager(userId);
    const values: unknown[] = [];
    const filters: string[] = [];
    const search = this.text(query.search);
    if (search) { values.push(`%${search.toLowerCase()}%`); filters.push(`(LOWER(code) LIKE $${values.length} OR LOWER(description) LIKE $${values.length})`); }
    const type = this.text(query.discount_type);
    if (type === 'percentage' || type === 'fixed') { values.push(type); filters.push(`discount_type=$${values.length}`); }
    if (query.is_active !== undefined && this.text(query.is_active) !== 'all') { values.push(this.boolean(query.is_active)); filters.push(`is_active=$${values.length}`); }
    const allowed = ['id', 'created_at', 'code', 'discount_value', 'expires_at', 'is_active'];
    const requestedSort = this.text(query.sort_by);
    const sort = allowed.includes(requestedSort) ? requestedSort : 'id';
    const direction = (this.text(query.sort_direction) || this.text(query.sort_dir)).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const perPage = Math.min(100, Math.max(5, this.number(query.per_page) ?? 10));
    const page = Math.max(1, this.number(query.page) ?? 1);
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const count = await this.database.query<{ total: number | string }>(`SELECT COUNT(*)::int AS total FROM coupons ${where}`, values);
    values.push(perPage, (page - 1) * perPage);
    const rows = await this.database.query<CouponRow>(`SELECT * FROM coupons ${where} ORDER BY ${sort} ${direction} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const total = Number(count.rows[0]?.total ?? 0);
    const counts = await this.database.query<{ is_active: boolean; count: number | string }>('SELECT is_active, COUNT(*)::int AS count FROM coupons GROUP BY is_active');
    const activeCount = Number(counts.rows.find((row) => row.is_active)?.count ?? 0);
    const inactiveCount = Number(counts.rows.find((row) => !row.is_active)?.count ?? 0);
    return { status: 'ok', data: rows.rows.map((row) => this.resource(row)), meta: { total, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage, active_count: activeCount, inactive_count: inactiveCount } };
  }

  async show(id: number, userId: number): Promise<Record<string, unknown>> { await this.authorizeManager(userId); return { status: 'ok', data: this.resource(await this.find(id)) }; }

  async create(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeManager(userId);
    const values = this.input(body, true);
    const duplicate = await this.database.query<{ id: number }>('SELECT id FROM coupons WHERE UPPER(code)=UPPER($1) LIMIT 1', [values.code]);
    if (duplicate.rows[0]) throw new ConflictException({ status: 'error', message: 'The coupon code has already been taken.' });
    const columns = Object.keys(values);
    const params = Object.values(values);
    const result = await this.database.query<CouponRow>(`INSERT INTO coupons (${columns.join(', ')}) VALUES (${params.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`, params);
    return { status: 'ok', message: `Coupon '${result.rows[0].code}' created successfully.`, data: this.resource(result.rows[0]) };
  }

  async update(id: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeManager(userId);
    const current = await this.find(id);
    const values = this.input(body, false, current);
    if (!Object.keys(values).length) throw new UnprocessableEntityException({ status: 'error', message: 'At least one coupon field is required.' });
    if (values.code) {
      const duplicate = await this.database.query<{ id: number }>('SELECT id FROM coupons WHERE UPPER(code)=UPPER($1) AND id<>$2 LIMIT 1', [values.code, id]);
      if (duplicate.rows[0]) throw new ConflictException({ status: 'error', message: 'The coupon code has already been taken.' });
    }
    const params = Object.values(values); params.push(id);
    const set = Object.keys(values).map((field, index) => `${field}=$${index + 1}`).join(', ');
    const result = await this.database.query<CouponRow>(`UPDATE coupons SET ${set}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
    return { status: 'ok', message: `Coupon '${result.rows[0].code}' updated successfully.`, data: this.resource(result.rows[0]) };
  }

  async remove(id: number, userId: number): Promise<Record<string, unknown>> { await this.authorizeManager(userId); const coupon = await this.find(id); await this.database.query('DELETE FROM coupons WHERE id=$1', [id]); return { status: 'ok', message: `Coupon '${coupon.code}' has been permanently deleted.` }; }

  async toggle(id: number, userId: number): Promise<Record<string, unknown>> { await this.authorizeManager(userId); const result = await this.database.query<CouponRow>('UPDATE coupons SET is_active=NOT is_active, updated_at=NOW() WHERE id=$1 RETURNING *', [id]); if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: `Coupon #${id} not found.` }); const state = result.rows[0].is_active ? 'Active' : 'Inactive'; return { status: 'ok', message: `Coupon '${result.rows[0].code}' is now ${state}.`, data: this.resource(result.rows[0]) }; }

  private async authorizeManager(userId: number): Promise<AuthUser> { const user = await this.auth.me(userId); const role = this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'SELLER', 'SELLER_STAFF']); const permission = user.roles.some((item) => item.permissions?.some((entry) => ['coupons.manage', 'COUPONS_MANAGE'].includes(entry.slug) || entry.name.toLowerCase() === 'coupons.manage')); if (!role && !permission) throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Only Administrators and Sellers can manage discount coupons.' }); return user; }

  private async find(id: number): Promise<CouponRow> { const result = await this.database.query<CouponRow>('SELECT * FROM coupons WHERE id=$1 LIMIT 1', [id]); if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: `Coupon #${id} not found.` }); return result.rows[0]; }
  private input(body: Record<string, unknown>, required: boolean, current?: CouponRow): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    if (required || body.code !== undefined) { const code = this.text(body.code).toUpperCase(); if (!/^[A-Z0-9_-]{1,50}$/.test(code)) throw new UnprocessableEntityException({ status: 'error', message: 'The code field is invalid.' }); values.code = code; }
    if (body.description !== undefined) values.description = this.nullable(body.description, 255, 'description');
    if (required || body.discount_type !== undefined) { const type = this.text(body.discount_type); if (!['percentage', 'fixed'].includes(type)) throw new UnprocessableEntityException({ status: 'error', message: 'The discount_type field is invalid.' }); values.discount_type = type; }
    if (required || body.discount_value !== undefined) { const value = this.number(body.discount_value); if (value === null || value < 0.01) throw new UnprocessableEntityException({ status: 'error', message: 'The discount_value field is invalid.' }); const type = String(values.discount_type ?? current?.discount_type); if (type === 'percentage' && value > 100) throw new UnprocessableEntityException({ status: 'error', message: 'Percentage discount cannot exceed 100%.' }); values.discount_value = value; }
    if (body.min_order_amount !== undefined) values.min_order_amount = this.nonnegative(body.min_order_amount, 'min_order_amount');
    if (body.max_discount_amount !== undefined) values.max_discount_amount = body.max_discount_amount === null || this.text(body.max_discount_amount) === '' ? null : this.nonnegative(body.max_discount_amount, 'max_discount_amount');
    if (body.is_active !== undefined) values.is_active = this.boolean(body.is_active);
    if (body.expires_at !== undefined) values.expires_at = this.dateOrNull(body.expires_at);
    if (values.discount_type === 'percentage' && values.discount_value !== undefined && Number(values.discount_value) > 100) throw new UnprocessableEntityException({ status: 'error', message: 'Percentage discount cannot exceed 100%.' });
    return values;
  }

  private fallback(code: string): CouponRow | null { const defaults: Record<string, Partial<CouponRow>> = { WELCOME10: { code: 'WELCOME10', description: '10% OFF Welcome Coupon for new and returning shoppers', discount_type: 'percentage', discount_value: 10, min_order_amount: 10, max_discount_amount: 50, is_active: true }, MEGA20: { code: 'MEGA20', description: '20% OFF Mega Flash Promotion (orders $50+)', discount_type: 'percentage', discount_value: 20, min_order_amount: 50, max_discount_amount: 150, is_active: true }, KHQR5: { code: 'KHQR5', description: '$5.00 Instant Cash Discount for Bakong KHQR users', discount_type: 'fixed', discount_value: 5, min_order_amount: 15, max_discount_amount: null, is_active: true }, VIP30: { code: 'VIP30', description: '30% OFF VIP Exclusive Voucher (orders $100+)', discount_type: 'percentage', discount_value: 30, min_order_amount: 100, max_discount_amount: 200, is_active: true } }; const row = defaults[code]; return row ? row as CouponRow : null; }
  private resource(row: CouponRow): Record<string, unknown> { const value = Number(row.discount_value); const min = Number(row.min_order_amount); const formatted = row.discount_type === 'percentage' ? `${Number.isInteger(value) ? value : value}% OFF` : `$${value.toFixed(2)} OFF`; return { ...row, discount_value: value, min_order_amount: min, max_discount_amount: row.max_discount_amount === null ? null : Number(row.max_discount_amount), is_active: Boolean(row.is_active), formatted_discount: formatted, cart_label: min > 0 ? `${formatted} (≥$${Number.isInteger(min) ? min : min.toFixed(2)})` : formatted }; }
  private async settings(keys: string[]): Promise<Map<string, string>> { const result = await this.database.query<{ setting_key: string; setting_value: string }>('SELECT setting_key, setting_value FROM store_settings WHERE setting_key=ANY($1::text[])', [keys]); return new Map(result.rows.map((row) => [row.setting_key, row.setting_value])); }
  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
  private number(value: unknown): number | null { const text = this.text(value); if (!text) return null; const number = Number(text); return Number.isFinite(number) ? number : null; }
  private nonnegative(value: unknown, field: string): number { const number = this.number(value); if (number === null || number < 0) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return number; }
  private nullable(value: unknown, max: number, field: string): string | null { const text = this.text(value); if (text.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return text || null; }
  private boolean(value: unknown): boolean { return value === true || ['true', '1', 'yes', 'on'].includes(this.text(value).toLowerCase()); }
  private dateOrNull(value: unknown): Date | null { const text = this.text(value); if (!text) return null; const date = new Date(text); if (Number.isNaN(date.valueOf())) throw new UnprocessableEntityException({ status: 'error', message: 'The expires_at field is invalid.' }); return date; }
}
