import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { ParsedQs } from 'qs';
import type { QueryResult, QueryResultRow } from 'pg';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

interface InventoryRow {
  inventory_id: number;
  product_id: number;
  product_name: string;
  brand_id: number | null;
  seller_id: number | null;
  brand: string | null;
  sku: string | null;
  slug: string | null;
  product_type: string | null;
  selling_price: number | string | null;
  cost_price: number | string | null;
  currency: string | null;
  price: number | string | null;
  discount_price: number | string | null;
  status: string | null;
  is_active: boolean;
  stock_quantity: number | string | null;
  low_stock_threshold: number | string | null;
  image_url: string | null;
  quantity_on_hand: number | string;
  quantity_reserved: number | string;
  created_at: Date | string;
  updated_at: Date | string;
  full_count?: number | string;
}

interface MovementRow {
  id: number;
  product_id: number;
  variant_id: number | null;
  movement_type: string | null;
  type: string | null;
  quantity_change: number;
  before_quantity: number;
  after_quantity: number;
  reason: string | null;
  reference: string | null;
  reference_id: string | null;
  created_by: number | null;
  creator_name: string | null;
  idempotency_key: string | null;
  created_at: Date | string;
  full_count?: number | string;
}

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
};

@Injectable()
export class InventoryService {
  private readonly readRoles = ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_MANAGER', 'STAFF'];
  private readonly adjustRoles = ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'];

  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async list(query: ParsedQs, userId?: number): Promise<Record<string, unknown>> {
    if (userId !== undefined) await this.authorize(userId, this.readRoles);

    const values: unknown[] = [];
    const filters: string[] = [];
    const search = this.stringValue(query.search);
    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      filters.push(`(LOWER(p.name) LIKE $${values.length} OR LOWER(p.sku) LIKE $${values.length})`);
    }
    if (this.booleanValue(query.low_stock)) filters.push('i.quantity_on_hand <= COALESCE(p.low_stock_threshold, 5)');

    const pageSize = Math.min(100, Math.max(1, this.numberValue(query.per_page) ?? 15));
    const page = Math.max(1, this.numberValue(query.page) ?? 1);
    const offset = (page - 1) * pageSize;
    const sort = this.orderBy(query);
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    values.push(pageSize, offset);
    const result = await this.database.query<InventoryRow>(`
      SELECT i.id AS inventory_id, p.id AS product_id, p.name AS product_name,
             p.brand_id, p.seller_id, p.brand, p.sku, p.slug, p.product_type,
             p.selling_price, p.cost_price, p.currency, p.price, p.discount_price,
             p.status, p.is_active, p.stock_quantity, p.low_stock_threshold,
             p.image_url, i.quantity_on_hand, i.quantity_reserved,
             i.created_at, i.updated_at, COUNT(*) OVER()::int AS full_count
      FROM inventories i
      JOIN products p ON p.id = i.product_id
      ${where}
      ORDER BY ${sort}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `, values);

    const total = Number(result.rows[0]?.full_count ?? 0);
    return {
      data: result.rows.map((row) => this.productResource(row)),
      meta: this.meta(page, pageSize, total),
    };
  }

  async show(productId: number, userId?: number): Promise<Record<string, unknown>> {
    if (userId !== undefined) await this.authorize(userId, this.readRoles);
    const row = await this.inventoryRow(productId);
    return { status: 'success', data: this.inventoryResource(row) };
  }

  async movements(productId: number, query: ParsedQs, userId?: number): Promise<Record<string, unknown>> {
    if (userId !== undefined) await this.authorize(userId, ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_MANAGER']);
    await this.inventoryRow(productId);
    const pageSize = Math.min(100, Math.max(1, this.numberValue(query.per_page) ?? 20));
    const page = Math.max(1, this.numberValue(query.page) ?? 1);
    const offset = (page - 1) * pageSize;
    const result = await this.database.query<MovementRow>(`
      SELECT m.id, m.product_id, m.variant_id,
             COALESCE(m.movement_type, UPPER(m.type)) AS movement_type,
             m.type, m.quantity_change, m.before_quantity, m.after_quantity,
             m.reason, COALESCE(m.reference, m.reference_id) AS reference,
             m.reference_id, COALESCE(m.created_by, m.user_id) AS created_by,
             COALESCE(creator.name, actor.name, 'System') AS creator_name,
             m.idempotency_key, m.created_at,
             COUNT(*) OVER()::int AS full_count
      FROM inventory_movements m
      LEFT JOIN users creator ON creator.id = m.created_by
      LEFT JOIN users actor ON actor.id = m.user_id
      WHERE m.product_id = $1
      ORDER BY m.id DESC
      LIMIT $2 OFFSET $3
    `, [productId, pageSize, offset]);
    const total = Number(result.rows[0]?.full_count ?? 0);
    return { data: result.rows.map((movement) => this.movementResource(movement)), meta: this.meta(page, pageSize, total) };
  }

  async adjust(productId: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.authorize(userId, this.adjustRoles);
    const quantityChange = this.integer(body.quantity_change);
    const reason = this.stringValue(body.reason);
    const movementType = this.stringValue(body.movement_type).toUpperCase();
    const reference = this.optionalString(body.reference, 255);
    const idempotencyKey = this.optionalString(body.idempotency_key, 64);
    const allowed = ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'DAMAGE', 'RETURN'];
    if (quantityChange === null || quantityChange === 0) throw new UnprocessableEntityException({ status: 'error', message: 'Adjustment quantity cannot be zero.' });
    if (!allowed.includes(movementType)) throw new UnprocessableEntityException({ status: 'error', message: `Invalid movement type. Allowed: ${allowed.join(', ')}.` });
    if (!reason || reason.length > 500) throw new UnprocessableEntityException({ status: 'error', message: 'The reason field is invalid.' });

    const result = await this.database.transaction(async (client) => {
      if (idempotencyKey) {
        const replay = await client.query<MovementRow>(`
          SELECT m.id, m.product_id, m.variant_id, COALESCE(m.movement_type, UPPER(m.type)) AS movement_type,
                 m.type, m.quantity_change, m.before_quantity, m.after_quantity, m.reason,
                 COALESCE(m.reference, m.reference_id) AS reference, m.reference_id,
                 COALESCE(m.created_by, m.user_id) AS created_by, creator.name AS creator_name,
                 m.idempotency_key, m.created_at
          FROM inventory_movements m LEFT JOIN users creator ON creator.id = m.created_by
          WHERE m.idempotency_key = $1 LIMIT 1
        `, [idempotencyKey]);
        if (replay.rows[0]) {
          const current = await this.inventoryRowWithClient(client as unknown as Queryable, productId);
          return { inventory: current, movement: replay.rows[0] };
        }
      }

      const inventory = await client.query<{ id: number; product_id: number; quantity_on_hand: number; quantity_reserved: number }>(`
        SELECT id, product_id, quantity_on_hand, quantity_reserved
        FROM inventories WHERE product_id = $1 AND variant_id IS NULL FOR UPDATE
      `, [productId]);
      let current = inventory.rows[0];
      if (!current) {
        const product = await client.query<{ stock_quantity: number | string | null }>('SELECT stock_quantity FROM products WHERE id = $1 LIMIT 1', [productId]);
        if (!product.rows[0]) throw new NotFoundException({ status: 'error', message: 'Product not found.' });
        const created = await client.query<{ id: number; product_id: number; quantity_on_hand: number; quantity_reserved: number }>(`
          INSERT INTO inventories (product_id, quantity_on_hand, quantity_reserved, created_at, updated_at)
          VALUES ($1, $2, 0, NOW(), NOW()) RETURNING id, product_id, quantity_on_hand, quantity_reserved
        `, [productId, Math.max(0, Number(product.rows[0].stock_quantity ?? 0))]);
        current = created.rows[0];
      }

      const after = current.quantity_on_hand + quantityChange;
      if (after < 0) throw new UnprocessableEntityException({ status: 'error', message: `Insufficient inventory. Current on-hand quantity is ${current.quantity_on_hand}, requested adjustment is ${quantityChange}.` });
      if (after < current.quantity_reserved) throw new UnprocessableEntityException({ status: 'error', message: `Cannot reduce on-hand stock below currently reserved stock (${current.quantity_reserved} units reserved).` });
      await client.query('UPDATE inventories SET quantity_on_hand = $1, updated_at = NOW() WHERE id = $2', [after, current.id]);
      await client.query('UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2', [after, productId]);
      const movement = await client.query<MovementRow>(`
        INSERT INTO inventory_movements
          (product_id, movement_type, type, quantity_change, before_quantity, after_quantity,
           reason, reference, reference_id, created_by, user_id, idempotency_key, created_at, updated_at)
        VALUES ($1, $2, LOWER($2), $3, $4, $5, $6, $7, $7, $8, $8, $9, NOW(), NOW())
        RETURNING id, product_id, variant_id, movement_type, type, quantity_change,
                  before_quantity, after_quantity, reason, reference, reference_id,
                  created_by, NULL::text AS creator_name, idempotency_key, created_at
      `, [productId, movementType, quantityChange, current.quantity_on_hand, after, reason, reference, user.id, idempotencyKey]);
      return { inventory: await this.inventoryRowWithClient(client as unknown as Queryable, productId), movement: movement.rows[0] };
    });

    return {
      status: 'success',
      message: 'Stock adjusted successfully.',
      data: { inventory: this.inventoryResource(result.inventory), movement: this.movementResource(result.movement) },
    };
  }

  private async authorize(userId: number, allowedRoles: readonly string[]) {
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, allowedRoles)) throw new ForbiddenException({ status: 'error', message: 'Inventory privileges are required for this operation.' });
    return user;
  }

  private async inventoryRow(productId: number): Promise<InventoryRow> {
    return this.inventoryRowWithClient(this.database, productId);
  }

  private async inventoryRowWithClient(client: Queryable, productId: number): Promise<InventoryRow> {
    const result = await client.query<InventoryRow>(`
      SELECT i.id AS inventory_id, p.id AS product_id, p.name AS product_name,
             p.brand_id, p.seller_id, p.brand, p.sku, p.slug, p.product_type,
             p.selling_price, p.cost_price, p.currency, p.price, p.discount_price,
             p.status, p.is_active, p.stock_quantity, p.low_stock_threshold,
             p.image_url, i.quantity_on_hand, i.quantity_reserved,
             i.created_at, i.updated_at
      FROM products p LEFT JOIN inventories i ON i.product_id = p.id AND i.variant_id IS NULL
      WHERE p.id = $1 LIMIT 1
    `, [productId]);
    const row = result.rows[0];
    if (!row) throw new NotFoundException({ status: 'error', message: 'Product not found.' });
    if (row.inventory_id === null || row.inventory_id === undefined) {
      row.inventory_id = 0;
      row.quantity_on_hand = Number(row.stock_quantity ?? 0);
      row.quantity_reserved = 0;
    }
    return row;
  }

  private productResource(row: InventoryRow): Record<string, unknown> {
    const onHand = Number(row.quantity_on_hand ?? 0);
    const reserved = Number(row.quantity_reserved ?? 0);
    return {
      id: row.product_id,
      name: row.product_name,
      brand_id: row.brand_id,
      seller_id: row.seller_id,
      brand: row.brand,
      sku: row.sku,
      slug: row.slug,
      product_type: row.product_type ?? 'simple',
      selling_price: Number(row.selling_price ?? row.price ?? 0),
      cost_price: Number(row.cost_price ?? 0),
      currency: row.currency ?? 'USD',
      price: Number(row.price ?? row.selling_price ?? 0),
      discount_price: row.discount_price === null ? null : Number(row.discount_price),
      status: row.status ?? (row.is_active ? 'active' : 'draft'),
      is_active: row.is_active,
      stock_quantity: Number(row.stock_quantity ?? onHand),
      available_stock: Math.max(0, onHand - reserved),
      quantity_on_hand: onHand,
      quantity_reserved: reserved,
      low_stock_threshold: Number(row.low_stock_threshold ?? 5),
      image_url: row.image_url,
      inventory: this.inventoryResource(row),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  private inventoryResource(row: InventoryRow): Record<string, unknown> {
    const onHand = Number(row.quantity_on_hand ?? 0);
    const reserved = Number(row.quantity_reserved ?? 0);
    const threshold = Number(row.low_stock_threshold ?? 5);
    return {
      id: row.inventory_id,
      product_id: row.product_id,
      product_name: row.product_name,
      sku: row.sku,
      status: row.status ?? (row.is_active ? 'active' : 'draft'),
      quantity_on_hand: onHand,
      quantity_reserved: reserved,
      available_stock: Math.max(0, onHand - reserved),
      low_stock_threshold: threshold,
      is_low_stock: onHand <= threshold,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  private movementResource(row: MovementRow): Record<string, unknown> {
    return {
      id: row.id,
      product_id: row.product_id,
      variant_id: row.variant_id,
      movement_type: row.movement_type ?? (row.type ?? 'ADJUSTMENT').toUpperCase(),
      quantity_change: Number(row.quantity_change),
      before_quantity: Number(row.before_quantity),
      after_quantity: Number(row.after_quantity),
      reason: row.reason,
      reference: row.reference ?? row.reference_id,
      created_by: row.created_by,
      creator_name: row.creator_name ?? 'System',
      idempotency_key: row.idempotency_key,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  private meta(page: number, perPage: number, total: number): Record<string, unknown> {
    return { current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage, total, has_more_pages: page * perPage < total };
  }

  private orderBy(query: ParsedQs): string {
    const allowed: Record<string, string> = { id: 'p.id', name: 'p.name', created_at: 'p.created_at', sku: 'p.sku', stock_quantity: 'i.quantity_on_hand' };
    const sort = this.stringValue(query.sort_by);
    const direction = this.stringValue(query.sort_dir ?? query.sort_direction).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    return `${allowed[sort] ?? 'p.id'} ${direction}`;
  }

  private stringValue(value: unknown): string { return value === undefined || value === null ? '' : String(Array.isArray(value) ? value[0] : value).trim(); }
  private numberValue(value: unknown): number | null { const text = this.stringValue(value); const number = Number(text); return text && Number.isFinite(number) ? number : null; }
  private integer(value: unknown): number | null { const number = this.numberValue(value); return number !== null && Number.isInteger(number) ? number : null; }
  private booleanValue(value: unknown): boolean { return ['true', '1', 'yes', 'on'].includes(this.stringValue(value).toLowerCase()); }
  private optionalString(value: unknown, max: number): string | null { const text = this.stringValue(value); return text ? (text.length <= max ? text : null) : null; }
}
