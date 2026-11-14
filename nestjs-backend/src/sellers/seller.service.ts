import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

interface SellerApplicationRow {
  id: number;
  user_id: number;
  store_name: string;
  slug: string;
  category: string | null;
  description: string | null;
  phone: string;
  telegram_username: string | null;
  city: string;
  address: string | null;
  bank_name: string;
  bakong_account_id: string | null;
  logo_url: string | null;
  banner_url: string | null;
  status: string;
  rejection_reason: string | null;
  approved_at: Date | string | null;
  rejected_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  user_name?: string | null;
  user_email?: string | null;
  user_created_at?: Date | string | null;
}

@Injectable()
export class SellerService {
  private readonly adminRoles = ['SUPER_ADMIN', 'ADMIN'];
  private readonly statuses = ['pending', 'approved', 'rejected', 'suspended'];

  constructor(private readonly database: DatabaseService, private readonly auth: AuthService) {}

  async publicStores(query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const perPage = 20;
    const page = Math.max(1, this.number(query.page) ?? 1);
    const count = await this.database.query<{ total: number | string }>("SELECT COUNT(*)::int AS total FROM seller_applications WHERE status='approved'");
    const rows = await this.database.query<SellerApplicationRow>(`
      SELECT id, store_name, slug, category, description, city, logo_url, banner_url, created_at
      FROM seller_applications WHERE status='approved' ORDER BY id DESC LIMIT $1 OFFSET $2
    `, [perPage, (page - 1) * perPage]);
    const total = Number(count.rows[0]?.total ?? 0);
    return { status: 'ok', data: rows.rows, meta: { total, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)) } };
  }

  async adminList(query: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const values: unknown[] = [];
    const filters: string[] = [];
    const status = this.text(query.status);
    if (status && status !== 'all') { if (!this.statuses.includes(status)) throw new UnprocessableEntityException({ status: 'error', message: 'The status filter is invalid.' }); values.push(status); filters.push(`sa.status=$${values.length}`); }
    const search = this.text(query.search);
    if (search) { values.push(`%${search.toLowerCase()}%`); filters.push(`(LOWER(sa.store_name) LIKE $${values.length} OR LOWER(sa.phone) LIKE $${values.length} OR LOWER(sa.city) LIKE $${values.length} OR LOWER(u.name) LIKE $${values.length} OR LOWER(u.email) LIKE $${values.length})`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const perPage = 25;
    const page = Math.max(1, this.number(query.page) ?? 1);
    const count = await this.database.query<{ total: number | string }>(`SELECT COUNT(*)::int AS total FROM seller_applications sa JOIN users u ON u.id=sa.user_id ${where}`, values);
    values.push(perPage, (page - 1) * perPage);
    const rows = await this.database.query<SellerApplicationRow>(`SELECT sa.*, u.name AS user_name, u.email AS user_email, u.created_at AS user_created_at FROM seller_applications sa JOIN users u ON u.id=sa.user_id ${where} ORDER BY sa.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const total = Number(count.rows[0]?.total ?? 0);
    const stats = await this.database.query<{ status: string; count: number | string }>('SELECT status, COUNT(*)::int AS count FROM seller_applications GROUP BY status');
    const statMap = new Map(stats.rows.map((row) => [row.status, Number(row.count)]));
    return { status: 'ok', data: rows.rows.map((row) => this.application(row)), stats: { total, pending: statMap.get('pending') ?? 0, approved: statMap.get('approved') ?? 0, rejected: statMap.get('rejected') ?? 0 }, meta: { total, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)) } };
  }

  async approve(id: number, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const application = await this.find(id);
    await this.database.transaction(async (client) => {
      await client.query("UPDATE seller_applications SET status='approved', rejection_reason=NULL, approved_at=NOW(), rejected_at=NULL, updated_at=NOW() WHERE id=$1", [id]);
      await this.assignSellerRole(client, application.user_id);
    });
    const updated = await this.find(id);
    return { status: 'success', message: `Seller application for '${updated.store_name}' approved successfully! User role upgraded to SELLER.`, data: this.application(updated) };
  }

  async reject(id: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const reason = this.limitRequired(body.reason, 'reason', 1000);
    const current = await this.find(id);
    await this.database.query("UPDATE seller_applications SET status='rejected', rejection_reason=$1, rejected_at=NOW(), updated_at=NOW() WHERE id=$2", [reason, id]);
    const updated = await this.find(id);
    return { status: 'success', message: `Seller application for '${current.store_name}' marked as rejected.`, data: this.application(updated) };
  }

  async updateStatus(id: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const status = this.text(body.status);
    if (!this.statuses.includes(status)) throw new UnprocessableEntityException({ status: 'error', message: 'The status field is invalid.' });
    const current = await this.find(id);
    await this.database.transaction(async (client) => {
      await client.query('UPDATE seller_applications SET status=$1, updated_at=NOW() WHERE id=$2', [status, id]);
      if (status === 'approved') await this.assignSellerRole(client, current.user_id);
    });
    const updated = await this.find(id);
    return { status: 'success', message: `Seller status updated to '${status}'.`, data: this.application(updated) };
  }

  async update(id: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const current = await this.find(id);
    const values: Record<string, unknown> = {
      store_name: this.limitRequired(body.store_name, 'store_name', 255),
      phone: this.limitRequired(body.phone, 'phone', 50),
    };
    for (const field of ['category', 'description', 'telegram_username', 'city', 'address', 'bank_name', 'bakong_account_id', 'logo_url', 'banner_url']) {
      if (body[field] !== undefined) values[field] = this.limitNullable(body[field], field === 'description' ? 2000 : field === 'address' ? 500 : field === 'logo_url' || field === 'banner_url' ? 1000 : field === 'bank_name' ? 100 : field === 'telegram_username' ? 100 : field === 'category' ? 100 : 100, field);
    }
    const baseSlug = this.slug(String(values.store_name)) || `store-${current.user_id}`;
    let slug = baseSlug;
    for (let counter = 1; ; counter += 1) {
      const conflict = await this.database.query<{ id: number }>('SELECT id FROM seller_applications WHERE slug=$1 AND id<>$2 LIMIT 1', [slug, id]);
      if (!conflict.rows[0]) break;
      slug = `${baseSlug}-${counter}`;
    }
    values.slug = slug;
    const params = Object.values(values);
    params.push(id);
    const set = Object.keys(values).map((field, index) => `${field}=$${index + 1}`).join(', ');
    await this.database.query(`UPDATE seller_applications SET ${set}, updated_at=NOW() WHERE id=$${params.length}`, params);
    const updated = await this.find(id);
    return { status: 'success', message: `Seller store '${updated.store_name}' updated successfully.`, data: this.application(updated) };
  }

  async remove(id: number, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const application = await this.find(id);
    await this.database.transaction(async (client) => {
      await client.query('DELETE FROM seller_applications WHERE id=$1', [id]);
      const role = await client.query<{ id: number }>("SELECT id FROM roles WHERE LOWER(slug)='seller' OR UPPER(name)='SELLER' ORDER BY id LIMIT 1");
      if (role.rows[0]) await client.query('DELETE FROM role_user WHERE user_id=$1 AND role_id=$2', [application.user_id, role.rows[0].id]);
    });
    return { status: 'success', message: `Seller store '${application.store_name}' deleted successfully.` };
  }

  private async authorizeAdmin(userId: number): Promise<void> { const user = await this.auth.me(userId); if (!this.auth.hasAnyRole(user, this.adminRoles)) throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Super administrator privileges required.' }); }

  private async find(id: number): Promise<SellerApplicationRow> {
    const result = await this.database.query<SellerApplicationRow>('SELECT sa.*, u.name AS user_name, u.email AS user_email, u.created_at AS user_created_at FROM seller_applications sa JOIN users u ON u.id=sa.user_id WHERE sa.id=$1 LIMIT 1', [id]);
    if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: 'Seller application not found.' });
    return result.rows[0];
  }

  private async assignSellerRole(client: { query: <T extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]) => Promise<{ rows: T[] }> }, userId: number): Promise<void> {
    const role = await client.query<{ id: number }>("SELECT id FROM roles WHERE LOWER(slug)='seller' OR UPPER(name)='SELLER' ORDER BY id LIMIT 1");
    if (role.rows[0]) await client.query('INSERT INTO role_user (user_id, role_id, created_at, updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT DO NOTHING', [userId, role.rows[0].id]);
  }

  private application(row: SellerApplicationRow): Record<string, unknown> {
    const { user_name, user_email, user_created_at, ...application } = row;
    return { ...application, user: row.user_name ? { id: row.user_id, name: user_name, email: user_email, created_at: user_created_at } : null };
  }

  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
  private number(value: unknown): number | null { const text = this.text(value); if (!text) return null; const number = Number(text); return Number.isFinite(number) ? number : null; }
  private limitRequired(value: unknown, field: string, max: number): string { const text = this.text(value); if (!text || text.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return text; }
  private limitNullable(value: unknown, max: number, field: string): string | null { const text = this.text(value); if (text.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return text || null; }
  private slug(value: string): string { return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 230); }
}
