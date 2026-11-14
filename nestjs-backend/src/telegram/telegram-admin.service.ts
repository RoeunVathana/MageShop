import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { ParsedQs } from 'qs';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';
import { InventoryService } from '../inventory/inventory.service';

interface StockRow {
  id: number;
  sku: string | null;
  name: string;
  price: number | string | null;
  discount_price: number | string | null;
  stock_quantity: number | string | null;
  low_stock_threshold: number | string | null;
  image_url: string | null;
  category_id: number | null;
  category_name: string | null;
  full_count?: number | string;
}

@Injectable()
export class TelegramAdminService {
  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
    private readonly inventory: InventoryService,
  ) {}

  async stock(query: ParsedQs, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const values: unknown[] = [];
    const filters: string[] = [];
    const sku = this.text(query.sku);
    if (sku) {
      values.push(sku.toUpperCase());
      filters.push(`UPPER(p.sku) = $${values.length}`);
    }
    if (this.boolean(query.low_stock)) filters.push('p.stock_quantity <= COALESCE(p.low_stock_threshold, 5)');
    const perPage = Math.min(100, Math.max(1, this.number(query.per_page) ?? 25));
    const page = Math.max(1, this.number(query.page) ?? 1);
    const offset = (page - 1) * perPage;
    values.push(perPage, offset);
    const rows = await this.database.query<StockRow>(`
      SELECT p.id, p.sku, p.name, COALESCE(p.selling_price, p.price) AS price,
             p.discount_price, p.stock_quantity, p.low_stock_threshold, p.image_url,
             c.id AS category_id, c.name AS category_name, COUNT(*) OVER()::int AS full_count
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY p.stock_quantity ASC, p.id ASC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `, values);
    const lowStock = await this.database.query<{ count: number | string }>('SELECT COUNT(*)::int AS count FROM products WHERE stock_quantity <= COALESCE(low_stock_threshold, 5)');
    const total = Number(rows.rows[0]?.full_count ?? 0);
    return {
      status: 'success',
      data: rows.rows.map((row) => ({
        id: row.id,
        sku: row.sku,
        name: row.name,
        price: Number(row.price ?? 0),
        discount_price: row.discount_price === null ? null : Number(row.discount_price),
        stock_quantity: Number(row.stock_quantity ?? 0),
        low_stock_threshold: Number(row.low_stock_threshold ?? 5),
        image_url: row.image_url,
        category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
      })),
      meta: { total, low_stock_count: Number(lowStock.rows[0]?.count ?? 0), current_page: page, per_page: perPage, last_page: Math.max(1, Math.ceil(total / perPage)) },
    };
  }

  async adjustStock(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const productId = this.integer(body.product_id);
    const delta = this.integer(body.delta);
    if (productId === null || delta === null || delta === 0) throw new UnprocessableEntityException({ status: 'error', message: 'The product_id and non-zero delta fields are required.' });
    const type = this.text(body.type).toLowerCase() || 'adjustment';
    const movementType: Record<string, string> = { adjustment: 'ADJUSTMENT', restock: 'STOCK_IN', damage: 'DAMAGE', correction: 'ADJUSTMENT' };
    if (!movementType[type]) throw new UnprocessableEntityException({ status: 'error', message: 'The stock adjustment type is invalid.' });
    const reason = this.text(body.reason) || 'Manual stock adjustment via Telegram Admin';
    const result = await this.inventory.adjust(productId, { quantity_change: delta, movement_type: movementType[type], reason }, userId);
    const product = await this.database.query<{ id: number; sku: string | null; stock_quantity: number | string }>('SELECT id, sku, stock_quantity FROM products WHERE id=$1 LIMIT 1', [productId]);
    const row = product.rows[0];
    await this.database.query('INSERT INTO telegram_admin_actions (staff_id, action, target_type, target_id, payload, confirmation_status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW(), NOW())', [userId, 'stock_adjust', 'Product', String(productId), JSON.stringify({ sku: row?.sku, delta, new_stock: row?.stock_quantity, reason }), 'confirmed']);
    return { status: 'success', message: `Stock adjusted by ${delta}. New stock: ${Number(row?.stock_quantity ?? 0)}`, data: { product_id: productId, sku: row?.sku, new_stock: Number(row?.stock_quantity ?? 0), inventory: result.data } };
  }

  async salesSummary(userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const result = await this.database.query<{
      sales_today: number | string;
      orders_today: number | string;
      sales_week: number | string;
      orders_week: number | string;
      sales_month: number | string;
      orders_month: number | string;
      pending_orders: number | string;
      low_stock_items: number | string;
      catalog_products: number | string;
      warehouse_units: number | string;
    }>(`
      SELECT
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status='paid' AND created_at >= CURRENT_DATE), 0) AS sales_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS orders_today,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status='paid' AND created_at >= date_trunc('week', NOW())), 0) AS sales_week,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('week', NOW())) AS orders_week,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status='paid' AND created_at >= date_trunc('month', NOW())), 0) AS sales_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS orders_month,
        COUNT(*) FILTER (WHERE status='pending') AS pending_orders
      FROM orders
    `);
    const catalog = await this.database.query<{ low_stock_items: number | string; catalog_products: number | string; warehouse_units: number | string }>('SELECT COUNT(*) FILTER (WHERE stock_quantity <= COALESCE(low_stock_threshold, 5)) AS low_stock_items, COUNT(*) AS catalog_products, COALESCE(SUM(stock_quantity), 0) AS warehouse_units FROM products');
    const sales = result.rows[0] ?? {} as typeof result.rows[number];
    const stock = catalog.rows[0] ?? {} as typeof catalog.rows[number];
    return {
      status: 'success',
      data: {
        today: { sales: Number(sales.sales_today ?? 0), orders: Number(sales.orders_today ?? 0) },
        this_week: { sales: Number(sales.sales_week ?? 0), orders: Number(sales.orders_week ?? 0) },
        this_month: { sales: Number(sales.sales_month ?? 0), orders: Number(sales.orders_month ?? 0) },
        operations: { pending_orders: Number(sales.pending_orders ?? 0), low_stock_items: Number(stock.low_stock_items ?? 0), catalog_products: Number(stock.catalog_products ?? 0), warehouse_units: Number(stock.warehouse_units ?? 0) },
      },
    };
  }

  private async authorizeAdmin(userId: number): Promise<void> {
    const user = await this.auth.me(userId);
    if (this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN', 'STAFF'])) return;
    const account = await this.database.query<{ is_bot_admin: boolean }>('SELECT is_bot_admin FROM telegram_accounts WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]);
    if (!account.rows[0]?.is_bot_admin) throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Staff privileges required.' });
  }

  private text(value: unknown): string { return value === undefined || value === null ? '' : String(Array.isArray(value) ? value[0] : value).trim(); }
  private number(value: unknown): number | null { const text = this.text(value); const number = Number(text); return text && Number.isFinite(number) ? number : null; }
  private integer(value: unknown): number | null { const number = this.number(value); return number !== null && Number.isInteger(number) ? number : null; }
  private boolean(value: unknown): boolean { return ['true', '1', 'yes', 'on'].includes(this.text(value).toLowerCase()); }
}
