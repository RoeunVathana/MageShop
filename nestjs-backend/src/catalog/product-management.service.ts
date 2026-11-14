import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { PoolClient } from 'pg';

import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

interface ProductRow {
  id: number;
  category_id: number | null;
  brand_id: number | null;
  seller_id: number | null;
  name: string;
  brand: string | null;
  brand_record_name: string | null;
  brand_record_slug: string | null;
  brand_record_logo_url: string | null;
  sku: string;
  slug: string;
  product_type: string | null;
  description: string | null;
  selling_price: number | string | null;
  cost_price: number | string | null;
  currency: string | null;
  price: number | string | null;
  discount_price: number | string | null;
  status: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_flash_sale: boolean;
  rating: number | string | null;
  reviews_count: number | string | null;
  stock_quantity: number | string | null;
  low_stock_threshold: number | string | null;
  weight: number | string | null;
  dimensions: unknown;
  specifications: unknown;
  image_url: string | null;
  gallery_urls: unknown;
  category_name: string | null;
  category_slug: string | null;
  category_parent_id: number | null;
  category_parent_name: string | null;
  quantity_on_hand: number | string | null;
  quantity_reserved: number | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface VariantRow {
  id: number;
  product_id: number;
  sku: string;
  name: string;
  selling_price: number | string;
  cost_price: number | string | null;
  stock_quantity: number | string;
  low_stock_threshold: number | string;
  image_url: string | null;
  is_active: boolean;
  quantity_on_hand: number | string | null;
  quantity_reserved: number | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class ProductManagementService {
  private readonly productRoles = ['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'STAFF', 'SELLER', 'SELLER_STAFF'];

  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async detail(idOrSlug: string): Promise<Record<string, unknown>> {
    const product = await this.findProduct(idOrSlug);
    if (!product.is_active || product.status !== 'active') throw new NotFoundException({ status: 'error', message: 'Product not found.' });
    return { data: await this.resource(product, null) };
  }

  async store(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireProductRole(user);
    const input = this.validate(body, false);
    const created = await this.database.transaction(async (client) => {
      const sellerId = this.isSeller(user) && !this.isAdmin(user) ? user.id : null;
      const brandId = await this.resolveBrand(client, input.brand_id, input.brand);
      await this.ensureCategory(client, input.category_id);
      const categoryIds = await this.categoryIds(client, input.category_id, input.category_ids);
      await this.ensureRequiredAttributes(client, input.category_id, input.attributes);
      const slug = await this.uniqueSlug(client, input.name);
      const sku = input.sku.toUpperCase();
      const duplicate = await client.query<{ id: number }>('SELECT id FROM products WHERE UPPER(sku)=UPPER($1) OR slug=$2 LIMIT 1', [sku, slug]);
      if (duplicate.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: 'The product SKU or slug has already been taken.' });
      const initialStock = input.initial_stock;
      const status = input.status;
      const inserted = await client.query<{ id: number }>(`
        INSERT INTO products
          (category_id, brand_id, seller_id, name, brand, slug, sku, product_type,
           description, selling_price, cost_price, currency, price, discount_price,
           status, stock_quantity, low_stock_threshold, weight, dimensions,
           is_active, is_featured, is_new_arrival, is_best_seller, is_flash_sale,
           image_url, gallery_urls, specifications, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$10,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,NOW(),NOW())
        RETURNING id
      `, [input.category_id, brandId, sellerId, input.name, input.brand, slug, sku, input.product_type, input.description, input.selling_price, input.cost_price, input.currency, input.discount_price, status, initialStock, input.low_stock_threshold, input.weight, input.dimensions, status === 'active', input.is_featured, input.is_new_arrival, input.is_best_seller, input.is_flash_sale, input.image_url, input.gallery_urls, input.specifications]);
      const productId = inserted.rows[0]?.id;
      if (!productId) throw new Error('Product was not created.');
      await this.syncCategories(client, productId, categoryIds, input.category_id);
      await this.syncAttributes(client, productId, input.attributes);
      await this.createInventory(client, productId, initialStock, user.id);
      if (input.product_type === 'variable') await this.syncVariants(client, productId, input.variants, input.selling_price ?? 0, true);
      return productId;
    });
    return { status: 'success', data: await this.resource(await this.findProduct(String(created)), user) };
  }

  async update(productId: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireProductRole(user);
    const existing = await this.findProduct(String(productId));
    this.requireOwnership(user, existing);
    const input = this.validate(body, true);
    await this.database.transaction(async (client) => {
      const brandId = input.brand_id !== undefined || input.brand !== undefined ? await this.resolveBrand(client, input.brand_id, input.brand) : existing.brand_id;
      const categoryId = input.category_id === undefined ? existing.category_id : input.category_id;
        if (input.sku !== undefined && input.sku !== null) {
          const duplicate = await client.query<{ id: number }>('SELECT id FROM products WHERE UPPER(sku)=UPPER($1) AND id<>$2 LIMIT 1', [input.sku.toUpperCase(), productId]);
          if (duplicate.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: 'The product SKU has already been taken.' });
        }
      await this.ensureCategory(client, categoryId);
      const categoryIds = input.category_ids === undefined && input.category_id === undefined ? undefined : await this.categoryIds(client, categoryId, input.category_ids);
      if (input.attributes !== undefined) await this.ensureRequiredAttributes(client, categoryId, input.attributes);
      const values: string[] = [];
      const params: unknown[] = [];
      const set = (column: string, value: unknown): void => { params.push(value); values.push(`${column} = $${params.length}`); };
      if (input.name !== undefined) set('name', input.name);
      if (input.sku !== undefined) set('sku', input.sku.toUpperCase());
      if (input.brand !== undefined) set('brand', input.brand);
      if (input.brand_id !== undefined || input.brand !== undefined) set('brand_id', brandId);
      if (input.product_type !== undefined) set('product_type', input.product_type);
      if (input.description !== undefined) set('description', input.description);
      if (input.selling_price !== undefined) { set('selling_price', input.selling_price); set('price', input.selling_price); }
      if (input.cost_price !== undefined) set('cost_price', input.cost_price);
      if (input.discount_price !== undefined) set('discount_price', input.discount_price);
      if (input.currency !== undefined) set('currency', input.currency);
      if (input.status !== undefined) { set('status', input.status); set('is_active', input.status === 'active'); }
      if (input.is_active !== undefined) set('is_active', input.is_active);
      if (input.is_featured !== undefined) set('is_featured', input.is_featured);
      if (input.is_new_arrival !== undefined) set('is_new_arrival', input.is_new_arrival);
      if (input.is_best_seller !== undefined) set('is_best_seller', input.is_best_seller);
      if (input.is_flash_sale !== undefined) set('is_flash_sale', input.is_flash_sale);
      if (input.category_id !== undefined) set('category_id', input.category_id);
      if (input.low_stock_threshold !== undefined) set('low_stock_threshold', input.low_stock_threshold);
      if (input.weight !== undefined) set('weight', input.weight);
      if (input.dimensions !== undefined) set('dimensions', input.dimensions);
      if (input.image_url !== undefined) set('image_url', input.image_url);
      if (input.gallery_urls !== undefined) set('gallery_urls', input.gallery_urls);
      if (input.specifications !== undefined) set('specifications', input.specifications);
      if (values.length) {
        params.push(productId);
        await client.query(`UPDATE products SET ${values.join(', ')}, updated_at=NOW() WHERE id=$${params.length}`, params);
      }
      if (categoryIds !== undefined) await this.syncCategories(client, productId, categoryIds, categoryId);
      if (input.attributes !== undefined) await this.syncAttributes(client, productId, input.attributes);
      if (input.variants !== undefined) await this.syncVariants(client, productId, input.variants, input.selling_price ?? Number(existing.selling_price ?? existing.price ?? 0), false);
    });
    return { status: 'success', data: await this.resource(await this.findProduct(String(productId)), user) };
  }

  async destroy(productId: number, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireProductRole(user);
    const existing = await this.findProduct(String(productId));
    this.requireOwnership(user, existing);
    await this.database.query('UPDATE products SET status=\'archived\', is_active=FALSE, updated_at=NOW() WHERE id=$1', [productId]);
    const archived = await this.findProduct(String(productId));
    return { status: 'success', message: `Product '${existing.name}' (${existing.sku}) has been safely archived.`, data: await this.resource(archived, user) };
  }

  private async currentUser(userId: number): Promise<AuthUser> { return this.auth.me(userId); }

  private requireProductRole(user: AuthUser): void {
    if (!this.auth.hasAnyRole(user, this.productRoles)) throw new ForbiddenException({ status: 'error', message: 'You are not authorized to manage products.' });
  }

  private requireOwnership(user: AuthUser, product: ProductRow): void {
    if (this.isSeller(user) && !this.isAdmin(user) && product.seller_id !== user.id) throw new ForbiddenException({ status: 'error', message: 'You can only manage your own products.' });
  }

  private isAdmin(user: AuthUser): boolean { return this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'STAFF']); }
  private isSeller(user: AuthUser): boolean { return this.auth.hasAnyRole(user, ['SELLER', 'SELLER_STAFF']); }

  private productColumns(): string {
    return `p.id, p.category_id, p.brand_id, p.seller_id, p.name, p.brand,
            b.name AS brand_record_name, b.slug AS brand_record_slug,
            b.logo_url AS brand_record_logo_url, p.sku, p.slug, p.product_type,
            p.description, p.selling_price, p.cost_price, p.currency, p.price,
            p.discount_price, p.status, p.is_active, p.is_featured,
            p.is_new_arrival, p.is_best_seller, p.is_flash_sale, p.rating,
            p.reviews_count, p.stock_quantity, p.low_stock_threshold, p.weight,
            p.dimensions, p.specifications, p.image_url, p.gallery_urls,
            c.name AS category_name, c.slug AS category_slug,
            c.parent_id AS category_parent_id, cp.name AS category_parent_name,
            i.quantity_on_hand, i.quantity_reserved, p.created_at, p.updated_at`;
  }

  private async findProduct(idOrSlug: string): Promise<ProductRow> {
    const numeric = /^\d+$/.test(idOrSlug);
    const result = await this.database.query<ProductRow>(`SELECT ${this.productColumns()} FROM products p LEFT JOIN brands b ON b.id=p.brand_id LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN categories cp ON cp.id=c.parent_id LEFT JOIN inventories i ON i.product_id=p.id AND i.variant_id IS NULL WHERE ${numeric ? 'p.id=$1' : '(p.slug=$1 OR UPPER(p.sku)=UPPER($1))'} LIMIT 1`, [numeric ? Number(idOrSlug) : idOrSlug]);
    const product = result.rows[0];
    if (!product) throw new NotFoundException({ status: 'error', message: 'Product not found.' });
    return product;
  }

  private async resource(product: ProductRow, user: AuthUser | null): Promise<Record<string, unknown>> {
    const categories = await this.database.query<{ id: number; name: string; slug: string; is_primary: boolean }>('SELECT c.id, c.name, c.slug, pc.is_primary FROM product_categories pc JOIN categories c ON c.id=pc.category_id WHERE pc.product_id=$1 ORDER BY pc.is_primary DESC, c.id', [product.id]);
    const attrs = await this.database.query<{ id: number; category_attribute_id: number; name: string | null; code: string | null; type: string | null; value: string | null; selected_option_id: number | null; display_value: string | null }>(`SELECT pav.id, pav.category_attribute_id, ca.name, ca.code, ca.type, pav.value, pav.selected_option_id, COALESCE(cao.label, pav.value) AS display_value FROM product_attribute_values pav LEFT JOIN category_attributes ca ON ca.id=pav.category_attribute_id LEFT JOIN category_attribute_options cao ON cao.id=pav.selected_option_id WHERE pav.product_id=$1 ORDER BY pav.id`, [product.id]);
    const variants = await this.database.query<VariantRow>('SELECT pv.id, pv.product_id, pv.sku, pv.name, pv.selling_price, pv.cost_price, pv.stock_quantity, pv.low_stock_threshold, pv.image_url, pv.is_active, i.quantity_on_hand, i.quantity_reserved, pv.created_at, pv.updated_at FROM product_variants pv LEFT JOIN inventories i ON i.variant_id=pv.id WHERE pv.product_id=$1 ORDER BY pv.id', [product.id]);
    const variantIds = variants.rows.map((variant) => variant.id);
    const variantAttrs = variantIds.length ? await this.database.query<{ product_variant_id: number; category_attribute_id: number; attribute_name: string | null; attribute_code: string | null; attribute_option_id: number | null; custom_value: string | null; display_value: string | null }>('SELECT vav.product_variant_id, vav.category_attribute_id, ca.name AS attribute_name, ca.code AS attribute_code, vav.attribute_option_id, vav.custom_value, COALESCE(cao.label, vav.custom_value) AS display_value FROM variant_attribute_values vav LEFT JOIN category_attributes ca ON ca.id=vav.category_attribute_id LEFT JOIN category_attribute_options cao ON cao.id=vav.attribute_option_id WHERE vav.product_variant_id = ANY($1::bigint[]) ORDER BY vav.id', [variantIds]) : { rows: [] };
    const canViewCost = Boolean(user && this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT', 'INVENTORY_MANAGER']));
    return {
      id: product.id, name: product.name, brand_id: product.brand_id, seller_id: product.seller_id,
      brand: product.brand ?? product.brand_record_name, brand_record: product.brand_id ? { id: product.brand_id, name: product.brand_record_name, slug: product.brand_record_slug, logo_url: product.brand_record_logo_url } : null,
      sku: product.sku, slug: product.slug, product_type: product.product_type ?? 'simple', description: product.description,
      selling_price: Number(product.selling_price ?? product.price ?? 0), cost_price: canViewCost ? Number(product.cost_price ?? 0) : null, currency: product.currency ?? 'USD', price: Number(product.price ?? product.selling_price ?? 0), discount_price: product.discount_price === null ? null : Number(product.discount_price), status: product.status ?? (product.is_active ? 'active' : 'draft'), is_active: Boolean(product.is_active), is_featured: Boolean(product.is_featured), is_new_arrival: Boolean(product.is_new_arrival), is_best_seller: Boolean(product.is_best_seller), is_flash_sale: Boolean(product.is_flash_sale), rating: Number(product.rating ?? 0), reviews_count: Number(product.reviews_count ?? 0), stock_quantity: Number(product.stock_quantity ?? 0), available_stock: Math.max(0, Number(product.quantity_on_hand ?? product.stock_quantity ?? 0) - Number(product.quantity_reserved ?? 0)), quantity_on_hand: Number(product.quantity_on_hand ?? product.stock_quantity ?? 0), quantity_reserved: Number(product.quantity_reserved ?? 0), low_stock_threshold: Number(product.low_stock_threshold ?? 5), weight: product.weight === null ? null : Number(product.weight), dimensions: product.dimensions, specifications: product.specifications,
      category: product.category_id ? { id: product.category_id, name: product.category_name, slug: product.category_slug, parent_id: product.category_parent_id, parent_name: product.category_parent_name } : null,
      categories: categories.rows, attributes: attrs.rows.map((attr) => ({ id: attr.id, attribute_id: attr.category_attribute_id, name: attr.name, code: attr.code, type: attr.type, value: attr.value, selected_option_id: attr.selected_option_id, display_value: attr.display_value })),
      variants: variants.rows.map((variant) => ({ id: variant.id, product_id: variant.product_id, sku: variant.sku, name: variant.name, selling_price: Number(variant.selling_price), cost_price: canViewCost ? Number(variant.cost_price ?? 0) : null, stock_quantity: Number(variant.stock_quantity), available_stock: Math.max(0, Number(variant.quantity_on_hand ?? variant.stock_quantity) - Number(variant.quantity_reserved ?? 0)), low_stock_threshold: Number(variant.low_stock_threshold), image_url: variant.image_url, is_active: Boolean(variant.is_active), attribute_values: variantAttrs.rows.filter((attr) => attr.product_variant_id === variant.id).map((attr) => ({ attribute_id: attr.category_attribute_id, attribute_name: attr.attribute_name, attribute_code: attr.attribute_code, option_id: attr.attribute_option_id, value: attr.custom_value, display_value: attr.display_value })), created_at: variant.created_at, updated_at: variant.updated_at })),
      image_url: product.image_url, gallery_urls: product.gallery_urls ?? [], created_at: product.created_at, updated_at: product.updated_at,
    };
  }

  private async resolveBrand(client: PoolClient, brandId: number | null | undefined, brand: string | null | undefined): Promise<number | null> {
    if (brandId !== undefined && brandId !== null) {
      const result = await client.query<{ id: number }>('SELECT id FROM brands WHERE id=$1 LIMIT 1', [brandId]);
      if (!result.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: 'The selected brand is invalid.' });
      return brandId;
    }
    if (!brand) return null;
    const result = await client.query<{ id: number }>('SELECT id FROM brands WHERE LOWER(name)=LOWER($1) OR slug=$2 LIMIT 1', [brand.trim(), this.slug(brand, '-')]);
    return result.rows[0]?.id ?? null;
  }

  private async ensureCategory(client: PoolClient, categoryId: number | null | undefined): Promise<void> {
    if (categoryId === null || categoryId === undefined) return;
    const result = await client.query<{ id: number }>('SELECT id FROM categories WHERE id=$1', [categoryId]);
    if (!result.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: 'The selected category is invalid.' });
  }

  private async categoryIds(client: PoolClient, primary: number | null | undefined, extra: number[] | undefined): Promise<number[]> {
    const ids = Array.from(new Set([...(primary ? [primary] : []), ...(extra ?? [])]));
    if (!ids.length) return [];
    const result = await client.query<{ id: number }>('SELECT id FROM categories WHERE id = ANY($1::bigint[])', [ids]);
    if (result.rows.length !== ids.length) throw new UnprocessableEntityException({ status: 'error', message: 'One or more selected categories are invalid.' });
    return ids;
  }

  private async syncCategories(client: PoolClient, productId: number, ids: number[], primary: number | null | undefined): Promise<void> {
    await client.query('DELETE FROM product_categories WHERE product_id=$1', [productId]);
    for (const id of ids) await client.query('INSERT INTO product_categories (product_id, category_id, is_primary, created_at, updated_at) VALUES ($1,$2,$3,NOW(),NOW()) ON CONFLICT (product_id, category_id) DO UPDATE SET is_primary=EXCLUDED.is_primary, updated_at=NOW()', [productId, id, id === primary]);
  }

  private async syncAttributes(client: PoolClient, productId: number, attributes: Array<Record<string, unknown>> | undefined): Promise<void> {
    if (attributes === undefined) return;
    await client.query('DELETE FROM product_attribute_values WHERE product_id=$1', [productId]);
    for (const attribute of attributes) {
      const id = this.integer(attribute.attribute_id ?? attribute.id);
      const code = attribute.code === undefined ? null : String(attribute.code).trim();
      const resolved = id ?? (code ? (await client.query<{ id: number }>('SELECT id FROM category_attributes WHERE code=$1 LIMIT 1', [code])).rows[0]?.id ?? null : null);
      if (!resolved) continue;
      await client.query('INSERT INTO product_attribute_values (product_id, category_attribute_id, selected_option_id, value, created_at, updated_at) VALUES ($1,$2,$3,$4,NOW(),NOW())', [productId, resolved, this.integer(attribute.selected_option_id), attribute.value === undefined || attribute.value === null ? null : String(attribute.value)]);
    }
  }

  private async ensureRequiredAttributes(client: PoolClient, categoryId: number | null | undefined, attributes: Array<Record<string, unknown>> | undefined): Promise<void> {
    if (!categoryId) return;
    const required = await client.query<{ id: number; code: string; name: string }>('SELECT id, code, name FROM category_attributes WHERE category_id=$1 AND is_required=TRUE', [categoryId]);
    if (!required.rows.length) return;
    const supplied = new Set<string>();
    for (const attr of attributes ?? []) {
      const hasValue = (attr.value !== undefined && attr.value !== null && String(attr.value).trim() !== '') || this.integer(attr.selected_option_id) !== null;
      if (!hasValue) continue;
      if (attr.attribute_id !== undefined || attr.id !== undefined) supplied.add(String(attr.attribute_id ?? attr.id));
      if (attr.code !== undefined) supplied.add(String(attr.code));
    }
    const missing = required.rows.find((attr) => !supplied.has(String(attr.id)) && !supplied.has(attr.code));
    if (missing) throw new UnprocessableEntityException({ status: 'error', message: `Category requires attribute '${missing.name}' (${missing.code}) to be specified.` });
  }

  private async createInventory(client: PoolClient, productId: number, quantity: number, userId: number): Promise<void> {
    await client.query('INSERT INTO inventories (product_id, variant_id, quantity_on_hand, quantity_reserved, created_at, updated_at) VALUES ($1,NULL,$2,0,NOW(),NOW())', [productId, quantity]);
    if (quantity > 0) await client.query(`INSERT INTO inventory_movements (product_id, variant_id, user_id, created_by, quantity_change, type, movement_type, before_quantity, after_quantity, reason, created_at, updated_at) VALUES ($1,NULL,$2,$2,$3,'stock_in','STOCK_IN',0,$3,'Initial stock on product creation',NOW(),NOW())`, [productId, userId, quantity]);
  }

  private async syncVariants(client: PoolClient, productId: number, variants: Array<Record<string, unknown>> | undefined, parentPrice: number, creating: boolean): Promise<void> {
    if (!variants) return;
    const keep: number[] = [];
    let total = 0;
    for (const item of variants) {
      const sku = String(item.sku ?? '').trim().toUpperCase();
      const name = String(item.name ?? '').trim();
      if (!sku || !name) throw new UnprocessableEntityException({ status: 'error', message: 'Each product variant requires a SKU and name.' });
      const variantId = this.integer(item.id);
      const duplicate = await client.query<{ id: number }>('SELECT id FROM product_variants WHERE sku=$1 AND ($2::bigint IS NULL OR id<>$2) UNION ALL SELECT id FROM products WHERE sku=$1 AND id<>$3 LIMIT 1', [sku, variantId, productId]);
      if (duplicate.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: `Variant SKU '${sku}' already exists in catalog.` });
      const stock = Math.max(0, this.numberOr(item.stock_quantity ?? item.initial_stock, 0));
      const price = this.numberOr(item.selling_price, parentPrice);
      const cost = this.numberOr(item.cost_price, 0);
      let id = variantId;
      if (id && !creating) {
        const result = await client.query<{ id: number }>('UPDATE product_variants SET sku=$1, name=$2, selling_price=$3, cost_price=$4, low_stock_threshold=$5, image_url=$6, is_active=$7, stock_quantity=$8, updated_at=NOW() WHERE id=$9 AND product_id=$10 RETURNING id', [sku, name, price, cost, this.numberOr(item.low_stock_threshold, 5), item.image_url ?? null, item.is_active === undefined ? true : Boolean(item.is_active), stock, id, productId]);
        id = result.rows[0]?.id ?? null;
      }
      if (!id) {
        const result = await client.query<{ id: number }>('INSERT INTO product_variants (product_id, sku, name, selling_price, cost_price, stock_quantity, low_stock_threshold, image_url, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING id', [productId, sku, name, price, cost, stock, this.numberOr(item.low_stock_threshold, 5), item.image_url ?? null, item.is_active === undefined ? true : Boolean(item.is_active)]);
        id = result.rows[0]?.id ?? null;
      }
      if (!id) throw new Error('Product variant was not saved.');
      keep.push(id);
      total += stock;
      const inventoryUpdate = await client.query('UPDATE inventories SET quantity_on_hand=$1, updated_at=NOW() WHERE product_id=$2 AND variant_id=$3', [stock, productId, id]);
      if (!inventoryUpdate.rowCount) await client.query('INSERT INTO inventories (product_id, variant_id, quantity_on_hand, quantity_reserved, created_at, updated_at) VALUES ($1,$2,$3,0,NOW(),NOW())', [productId, id, stock]);
      if (Array.isArray(item.attribute_values)) {
        await client.query('DELETE FROM variant_attribute_values WHERE product_variant_id=$1', [id]);
        for (const value of item.attribute_values as Array<Record<string, unknown>>) {
          const attributeId = this.integer(value.attribute_id) ?? (value.code ? (await client.query<{ id: number }>('SELECT id FROM category_attributes WHERE code=$1 LIMIT 1', [String(value.code)])).rows[0]?.id ?? null : null);
          if (!attributeId) continue;
          await client.query('INSERT INTO variant_attribute_values (product_variant_id, category_attribute_id, attribute_option_id, custom_value, created_at, updated_at) VALUES ($1,$2,$3,$4,NOW(),NOW())', [id, attributeId, this.integer(value.option_id), value.custom_value === undefined ? null : String(value.custom_value)]);
        }
      }
    }
    if (!creating && keep.length) await client.query('DELETE FROM product_variants WHERE product_id=$1 AND id <> ALL($2::bigint[])', [productId, keep]);
    if (!creating && !keep.length) await client.query('DELETE FROM product_variants WHERE product_id=$1', [productId]);
    await client.query('UPDATE products SET stock_quantity=$1, updated_at=NOW() WHERE id=$2', [total, productId]);
  }

  private validate(body: Record<string, unknown>, partial: boolean): Record<string, any> {
    const text = (key: string, max: number): string | null | undefined => {
      if (body[key] === undefined && partial) return undefined;
      if (body[key] === null) return null;
      const value = String(body[key] ?? '').trim();
      if (value.length > max || (!partial && !value)) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      return value || null;
    };
    const numeric = (key: string, fallback: number | null, min = 0): number | null | undefined => {
      if (body[key] === undefined && partial) return undefined;
      if (body[key] === null || body[key] === '') return fallback;
      const value = Number(body[key]);
      if (!Number.isFinite(value) || value < min) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      return value;
    };
    const status = body.status === undefined && partial ? undefined : String(body.status ?? 'active');
    if (status !== undefined && !['active', 'draft', 'archived'].includes(status)) throw new UnprocessableEntityException({ status: 'error', message: 'The status field is invalid.' });
    const productType = body.product_type === undefined && partial ? undefined : String(body.product_type ?? 'simple');
    if (productType !== undefined && !['simple', 'variable', 'digital', 'bundle'].includes(productType)) throw new UnprocessableEntityException({ status: 'error', message: 'The product_type field is invalid.' });
    const categories = body.category_ids === undefined && partial ? undefined : Array.isArray(body.category_ids) ? body.category_ids.map((value) => this.integer(value)).filter((value): value is number => value !== null) : [];
    return {
      name: text('name', 255), sku: text('sku', 100), brand: text('brand', 100), brand_id: body.brand_id === undefined && partial ? undefined : this.integer(body.brand_id), product_type: productType, description: text('description', 100000), selling_price: numeric('selling_price', null), cost_price: numeric('cost_price', 0), discount_price: numeric('discount_price', null), currency: text('currency', 10) ?? (partial ? undefined : 'USD'), category_id: body.category_id === undefined && partial ? undefined : this.integer(body.category_id), category_ids: categories, initial_stock: body.initial_stock === undefined && partial ? undefined : this.nonNegativeInteger(body.initial_stock ?? body.stock_quantity ?? 0), low_stock_threshold: numeric('low_stock_threshold', 5), weight: numeric('weight', null), dimensions: body.dimensions === undefined && partial ? undefined : body.dimensions ?? null, status, is_active: body.is_active === undefined && partial ? undefined : this.boolean(body.is_active, status === 'active'), is_featured: body.is_featured === undefined && partial ? undefined : this.boolean(body.is_featured, false), is_new_arrival: body.is_new_arrival === undefined && partial ? undefined : this.boolean(body.is_new_arrival, false), is_best_seller: body.is_best_seller === undefined && partial ? undefined : this.boolean(body.is_best_seller, false), is_flash_sale: body.is_flash_sale === undefined && partial ? undefined : this.boolean(body.is_flash_sale, false), image_url: text('image_url', 500), gallery_urls: body.gallery_urls === undefined && partial ? undefined : Array.isArray(body.gallery_urls) ? body.gallery_urls.map(String) : [], specifications: body.specifications === undefined && partial ? undefined : body.specifications ?? null, attributes: body.attributes === undefined && partial ? undefined : Array.isArray(body.attributes) ? body.attributes as Array<Record<string, unknown>> : [], variants: body.variants === undefined && partial ? undefined : Array.isArray(body.variants) ? body.variants as Array<Record<string, unknown>> : [],
    };
  }

  private async uniqueSlug(client: PoolClient, name: string): Promise<string> {
    const base = this.slug(name, '-') || `product-${Date.now()}`;
    let candidate = base;
    let suffix = 1;
    while ((await client.query<{ id: number }>('SELECT id FROM products WHERE slug=$1 LIMIT 1', [candidate])).rows[0]) candidate = `${base}-${suffix++}`;
    return candidate;
  }

  private slug(value: string, separator: '-' | '_'): string { return String(value ?? '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, separator).replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), ''); }
  private integer(value: unknown): number | null { if (value === undefined || value === null || String(value).trim() === '') return null; const result = Number(value); if (!Number.isInteger(result) || result < 1) throw new UnprocessableEntityException({ status: 'error', message: 'The numeric identifier is invalid.' }); return result; }
  private nonNegativeInteger(value: unknown): number { if (value === undefined || value === null || String(value).trim() === '') return 0; const result = Number(value); if (!Number.isInteger(result) || result < 0) throw new UnprocessableEntityException({ status: 'error', message: 'The stock quantity is invalid.' }); return result; }
  private numberOr(value: unknown, fallback: number): number { const result = Number(value); return Number.isFinite(result) && result >= 0 ? result : fallback; }
  private boolean(value: unknown, fallback: boolean): boolean { if (value === undefined || value === null || value === '') return fallback; if (typeof value === 'boolean') return value; if (['true', '1', 'yes', 'on'].includes(String(value).toLowerCase())) return true; if (['false', '0', 'no', 'off'].includes(String(value).toLowerCase())) return false; throw new UnprocessableEntityException({ status: 'error', message: 'The boolean field is invalid.' }); }
}
