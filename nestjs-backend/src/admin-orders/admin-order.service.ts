import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { ParsedQs } from 'qs';

import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

interface OrderRow {
  id: number;
  order_number: string;
  user_id: number | null;
  driver_id: number | null;
  status: string;
  subtotal: number | string;
  discount: number | string | null;
  shipping_fee: number | string | null;
  tax: number | string | null;
  total_amount: number | string;
  currency: string;
  payment_status: string | null;
  payment_method: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  notes: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  estimated_arrival: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  full_count?: number | string;
}

interface OrderItemRow {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface PaymentRow {
  id: number;
  order_id: number;
  transaction_reference: string;
  payment_method: string;
  amount: number | string;
  currency: string;
  status: string;
  khqr_string: string | null;
  khqr_md5: string | null;
  verified_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class AdminOrderService {
  private readonly adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];

  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async list(query: ParsedQs, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const values: unknown[] = [];
    const filters: string[] = [];
    const search = this.text(query.search);
    if (search) {
      values.push(`%${search}%`);
      filters.push(`(o.order_number ILIKE $${values.length} OR o.customer_name ILIKE $${values.length} OR o.customer_email ILIKE $${values.length} OR o.customer_phone ILIKE $${values.length})`);
    }
    this.filter(filters, values, 'o.status', query.status, 'all');
    this.filter(filters, values, 'o.payment_status', query.payment_status, 'all');
    this.filter(filters, values, 'o.payment_method', query.payment_method, 'all');
    const perPage = Math.min(100, Math.max(5, this.number(query.per_page) ?? 15));
    const page = Math.max(1, this.number(query.page) ?? 1);
    const offset = (page - 1) * perPage;
    const orderBy = this.orderBy(query);
    values.push(perPage, offset);
    const result = await this.database.query<OrderRow>(`
      SELECT o.*, COUNT(*) OVER()::int AS full_count
      FROM orders o
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY ${orderBy}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `, values);
    const total = Number(result.rows[0]?.full_count ?? 0);
    return { status: 'success', data: await this.hydrate(result.rows), meta: this.meta(page, perPage, total) };
  }

  async show(id: number, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const result = await this.database.query<OrderRow>('SELECT * FROM orders WHERE id = $1 LIMIT 1', [id]);
    if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: `Order #${id} not found.` });
    return { status: 'success', data: (await this.hydrate(result.rows))[0] };
  }

  async update(id: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const current = await this.find(id);
    const name = this.required(body.customer_name, current.customer_name, 120);
    const email = this.optional(body.customer_email, current.customer_email, 255);
    if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new UnprocessableEntityException({ status: 'error', message: 'The customer_email field is invalid.' });
    const phone = this.required(body.customer_phone, current.customer_phone, 50);
    const address = this.required(body.delivery_address, current.delivery_address, 500);
    const notes = body.notes === undefined ? current.notes : this.optional(body.notes, null, 1000);
    const result = await this.database.query<OrderRow>(`
      UPDATE orders
      SET customer_name=$1, customer_email=$2, customer_phone=$3,
          delivery_address=$4, notes=$5, updated_at=NOW()
      WHERE id=$6 RETURNING *
    `, [name, email, phone, address, notes, id]);
    return { status: 'success', message: `Order #${current.order_number} details updated successfully.`, data: (await this.hydrate(result.rows))[0] };
  }

  async updateStatus(id: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const current = await this.find(id);
    const status = this.text(body.status).toLowerCase();
    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) throw new UnprocessableEntityException({ status: 'error', message: 'The status field is invalid.' });
    const driverName = body.driver_name === undefined ? current.driver_name : this.optional(body.driver_name, null, 120);
    const driverPhone = body.driver_phone === undefined ? current.driver_phone : this.optional(body.driver_phone, null, 50);
    const eta = body.estimated_arrival === undefined ? current.estimated_arrival : this.optional(body.estimated_arrival, null, 50);
    const notes = body.notes === undefined ? current.notes : this.optional(body.notes, null, 500);
    const result = await this.database.query<OrderRow>(`
      UPDATE orders SET status=$1, driver_name=$2, driver_phone=$3,
        estimated_arrival=$4, notes=$5, updated_at=NOW()
      WHERE id=$6 RETURNING *
    `, [status, driverName, driverPhone, eta, notes, id]);
    return { status: 'success', message: `Order #${current.order_number} status updated to ${status}.`, data: (await this.hydrate(result.rows))[0] };
  }

  async updatePaymentStatus(id: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const current = await this.find(id);
    const paymentStatus = this.text(body.payment_status).toLowerCase();
    if (!['pending', 'completed', 'paid', 'failed'].includes(paymentStatus)) throw new UnprocessableEntityException({ status: 'error', message: 'The payment_status field is invalid.' });
    const result = await this.database.transaction(async (client) => {
      const order = await client.query<OrderRow>('UPDATE orders SET payment_status=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [paymentStatus, id]);
      await client.query('UPDATE payments SET status=$1, verified_at=$2, updated_at=NOW() WHERE order_id=$3', [paymentStatus === 'paid' || paymentStatus === 'completed' ? 'completed' : paymentStatus, paymentStatus === 'paid' || paymentStatus === 'completed' ? new Date() : null, id]);
      return order.rows[0];
    });
    return { status: 'success', message: `Order #${current.order_number} payment status updated to ${paymentStatus}.`, data: (await this.hydrate([result]))[0] };
  }

  async destroy(id: number, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const current = await this.find(id);
    await this.database.transaction(async (client) => {
      await client.query('DELETE FROM receipts WHERE order_id=$1', [id]);
      await client.query('DELETE FROM payments WHERE order_id=$1', [id]);
      await client.query('DELETE FROM order_items WHERE order_id=$1', [id]);
      await client.query('DELETE FROM orders WHERE id=$1', [id]);
    });
    return { status: 'success', message: `Order #${current.order_number} deleted successfully.` };
  }

  async stats(userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId);
    const [counts, products, users, taxonomy, campaigns, recent] = await Promise.all([
      this.database.query<{ total_orders: number; total_revenue: number | string; pending_orders: number; processing_orders: number; shipped_orders: number; delivered_orders: number; cancelled_orders: number }>(`
        SELECT COUNT(*)::int AS total_orders,
          COALESCE(SUM(total_amount) FILTER (WHERE payment_status IN ('completed','paid')),0) AS total_revenue,
          COUNT(*) FILTER (WHERE status='pending')::int AS pending_orders,
          COUNT(*) FILTER (WHERE status='processing')::int AS processing_orders,
          COUNT(*) FILTER (WHERE status='shipped')::int AS shipped_orders,
          COUNT(*) FILTER (WHERE status='delivered')::int AS delivered_orders,
          COUNT(*) FILTER (WHERE status='cancelled')::int AS cancelled_orders
        FROM orders`),
      this.database.query<{ total_products: number; low_stock_products: number; active_products: number }>(`SELECT COUNT(*)::int AS total_products, COUNT(*) FILTER (WHERE stock_quantity <= low_stock_threshold)::int AS low_stock_products, COUNT(*) FILTER (WHERE is_active=TRUE)::int AS active_products FROM products`),
      this.database.query<{ total_users: number }>('SELECT COUNT(*)::int AS total_users FROM users'),
      this.database.query<{ total_categories: number; total_brands: number }>('SELECT (SELECT COUNT(*)::int FROM categories) AS total_categories, (SELECT COUNT(*)::int FROM brands) AS total_brands'),
      this.database.query<{ active_coupons: number; active_banners: number }>("SELECT (SELECT COUNT(*)::int FROM coupons WHERE is_active=TRUE) AS active_coupons, (SELECT COUNT(*)::int FROM banners WHERE is_active=TRUE) AS active_banners"),
      this.database.query<OrderRow>('SELECT id, order_number, status, payment_status, total_amount, currency, customer_name, customer_phone, created_at, updated_at FROM orders ORDER BY id DESC LIMIT 6'),
    ]);
    const count = counts.rows[0] ?? { total_orders: 0, total_revenue: 0, pending_orders: 0, processing_orders: 0, shipped_orders: 0, delivered_orders: 0, cancelled_orders: 0 };
    return {
      status: 'success',
      data: {
        overview: { ...count, total_revenue: Number(count.total_revenue ?? 0), ...(products.rows[0] ?? {}), ...(users.rows[0] ?? {}), ...(taxonomy.rows[0] ?? {}), ...(campaigns.rows[0] ?? {}) },
        recent_orders: await this.hydrate(recent.rows),
      },
    };
  }

  private async authorize(userId: number): Promise<AuthUser> {
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, this.adminRoles)) throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Administrative orders management privileges required.' });
    return user;
  }

  private async find(id: number): Promise<OrderRow> {
    const result = await this.database.query<OrderRow>('SELECT * FROM orders WHERE id=$1 LIMIT 1', [id]);
    if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: `Order #${id} not found.` });
    return result.rows[0];
  }

  private async hydrate(rows: OrderRow[]): Promise<Array<Record<string, unknown>>> {
    const ids = rows.map((row) => row.id);
    if (!ids.length) return [];
    const [items, payments] = await Promise.all([
      this.database.query<OrderItemRow>('SELECT id, order_id, product_id, product_name, product_sku, quantity, unit_price, total_price, created_at, updated_at FROM order_items WHERE order_id=ANY($1::int[]) ORDER BY id', [ids]),
      this.database.query<PaymentRow>('SELECT id, order_id, transaction_reference, payment_method, amount, currency, status, khqr_string, khqr_md5, verified_at, created_at, updated_at FROM payments WHERE order_id=ANY($1::int[]) ORDER BY id', [ids]),
    ]);
    const itemMap = new Map<number, OrderItemRow[]>();
    const paymentMap = new Map<number, PaymentRow[]>();
    for (const item of items.rows) itemMap.set(item.order_id, [...(itemMap.get(item.order_id) ?? []), item]);
    for (const payment of payments.rows) paymentMap.set(payment.order_id, [...(paymentMap.get(payment.order_id) ?? []), payment]);
    return rows.map((row) => ({ ...row, full_count: undefined, items: itemMap.get(row.id) ?? [], payments: paymentMap.get(row.id) ?? [] }));
  }

  private filter(filters: string[], values: unknown[], column: string, value: unknown, ignored: string): void {
    const text = this.text(value).toLowerCase();
    if (text && text !== ignored) { values.push(text); filters.push(`${column} = $${values.length}`); }
  }

  private orderBy(query: ParsedQs): string {
    const columns: Record<string, string> = { id: 'o.id', created_at: 'o.created_at', total_amount: 'o.total_amount', status: 'o.status', order_number: 'o.order_number' };
    const column = columns[this.text(query.sort_by)] ?? 'o.id';
    const direction = this.text(query.sort_direction ?? query.sort_dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    return `${column} ${direction}`;
  }

  private meta(page: number, perPage: number, total: number): Record<string, unknown> { return { current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage, total, has_more_pages: page * perPage < total }; }
  private text(value: unknown): string { return value === undefined || value === null ? '' : String(Array.isArray(value) ? value[0] : value).trim(); }
  private number(value: unknown): number | null { const text = this.text(value); const result = Number(text); return text && Number.isFinite(result) ? result : null; }
  private required(value: unknown, fallback: string | null, max: number): string { const text = value === undefined ? (fallback ?? '') : this.text(value); if (!text || text.length > max) throw new UnprocessableEntityException({ status: 'error', message: 'The given data was invalid.' }); return text; }
  private optional(value: unknown, fallback: string | null, max: number): string | null { const text = value === undefined ? fallback : this.text(value); if (text && text.length > max) throw new UnprocessableEntityException({ status: 'error', message: 'The given data was invalid.' }); return text || null; }
}
