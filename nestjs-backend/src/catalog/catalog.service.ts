import { Injectable } from '@nestjs/common';
import type { ParsedQs } from 'qs';

import { DatabaseService } from '../database/database.service';

type Query = ParsedQs;

interface CategoryRow {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  icon: string | null;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  parent_name: string | null;
  products_count: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface BrandRow {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  country: string | null;
  website: string | null;
  status: string;
  is_active: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  products_count: number | string;
  full_count: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ProductRow {
  id: number;
  name: string;
  brand_id: number | null;
  seller_id: number | null;
  brand: string | null;
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
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  category_parent_id: number | null;
  category_parent_name: string | null;
  brand_record_id: number | null;
  brand_record_name: string | null;
  brand_record_slug: string | null;
  brand_record_logo_url: string | null;
  quantity_on_hand: number | string | null;
  quantity_reserved: number | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  full_count: number | string;
}

@Injectable()
export class CatalogService {
  constructor(private readonly database: DatabaseService) {}

  async listCategories(query: Query): Promise<Record<string, unknown>> {
    const values: unknown[] = [];
    const filters: string[] = [];
    this.addSearchFilter(filters, values, query.search, ['c.name', 'c.slug', 'c.description']);

    if (query.is_active !== undefined) {
      values.push(this.booleanValue(query.is_active));
      filters.push(`c.is_active = $${values.length}`);
    } else {
      values.push(true);
      filters.push(`c.is_active = $${values.length}`);
    }

    if (query.parent_id !== undefined) {
      if (this.stringValue(query.parent_id) === 'null' || this.stringValue(query.parent_id) === 'root' || this.stringValue(query.parent_id) === '') {
        filters.push('c.parent_id IS NULL');
      } else if (this.numberValue(query.parent_id) !== null) {
        values.push(this.numberValue(query.parent_id));
        filters.push(`c.parent_id = $${values.length}`);
      }
    }

    const orderBy = this.orderBy(query, ['id', 'name', 'created_at', 'sort_order'], 'sort_order');
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await this.database.query<CategoryRow>(`
      SELECT c.id, c.parent_id, c.name, c.slug, c.icon, c.image_url,
             c.description, c.sort_order, c.is_active, c.seo_title,
             c.seo_description, c.seo_keywords,
             p.name AS parent_name,
             COUNT(DISTINCT products.id)::int AS products_count,
             c.created_at, c.updated_at
      FROM categories c
      LEFT JOIN categories p ON p.id = c.parent_id
      LEFT JOIN products ON products.category_id = c.id
      ${where}
      GROUP BY c.id, p.name
      ORDER BY ${orderBy}
    `, values);

    const rows = result.rows.map((row) => this.categoryResource(row));
    if (this.booleanValue(query.tree)) {
      return { data: this.categoryTree(rows) };
    }

    const perPage = this.numberValue(query.per_page);
    return perPage ? this.paginate(rows, perPage, 1) : { data: rows };
  }

  async listBrands(query: Query): Promise<Record<string, unknown>> {
    const values: unknown[] = [];
    const filters: string[] = [];
    this.addSearchFilter(filters, values, query.search, ['b.name', 'b.slug', 'b.country']);

    if (query.is_active !== undefined) {
      values.push(this.booleanValue(query.is_active));
      filters.push(`b.is_active = $${values.length}`);
    } else {
      values.push(true);
      filters.push(`b.is_active = $${values.length}`);
    }
    if (query.status !== undefined) {
      values.push(this.stringValue(query.status));
      filters.push(`b.status = $${values.length}`);
    } else {
      values.push('active');
      filters.push(`b.status = $${values.length}`);
    }

    const perPage = this.clampPageSize(this.numberValue(query.per_page) ?? 20);
    const page = Math.max(1, this.numberValue(query.page) ?? 1);
    const offset = (page - 1) * perPage;
    values.push(perPage, offset);
    const orderBy = this.orderBy(query, ['name', 'sort_order', 'created_at', 'id'], 'created_at');
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await this.database.query<BrandRow>(`
      SELECT b.id, b.name, b.slug, b.logo_url, b.description, b.country,
             b.website, b.status, b.is_active, b.sort_order, b.seo_title,
             b.seo_description, b.seo_keywords,
             COUNT(p.id)::int AS products_count,
             b.created_at, b.updated_at,
             COUNT(*) OVER()::int AS full_count
      FROM brands b
      LEFT JOIN products p ON p.brand_id = b.id
      ${where}
      GROUP BY b.id
      ORDER BY ${orderBy}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `, values);

    const total = Number(result.rows[0]?.full_count ?? 0);
    return this.paginate(result.rows.map((row) => this.brandResource(row)), perPage, page, total);
  }

  async listProducts(query: Query): Promise<Record<string, unknown>> {
    const values: unknown[] = [];
    const filters: string[] = [];
    const cardView = this.stringValue(query.view) === 'card';
    const publicCatalog = this.stringValue(query.status) !== 'all';

    if (publicCatalog) {
      values.push('active');
      filters.push(`p.status = $${values.length}`);
      values.push(true);
      filters.push(`p.is_active = $${values.length}`);
    }
    this.addSearchFilter(filters, values, query.search, ['p.name', 'p.sku', 'p.brand', 'p.description']);
    this.addExactFilter(filters, values, query.status, 'p.status', ['all']);
    this.addBooleanFilter(filters, values, query.is_active, 'p.is_active');
    this.addExactFilter(filters, values, query.product_type, 'p.product_type', ['all']);
    this.addBooleanFilter(filters, values, query.is_featured, 'p.is_featured');
    this.addBooleanFilter(filters, values, query.is_new_arrival, 'p.is_new_arrival');
    this.addBooleanFilter(filters, values, query.is_best_seller, 'p.is_best_seller');
    this.addBooleanFilter(filters, values, query.is_flash_sale, 'p.is_flash_sale');
    this.addNumericFilter(filters, values, query.min_price, 'p.selling_price', '>=');
    this.addNumericFilter(filters, values, query.max_price, 'p.selling_price', '<=');

    const categoryId = this.numberValue(query.category_id);
    if (categoryId !== null) {
      values.push(categoryId);
      filters.push(`(p.category_id = $${values.length} OR EXISTS (SELECT 1 FROM product_categories pc_filter WHERE pc_filter.product_id = p.id AND pc_filter.category_id = $${values.length}))`);
    } else if (query.category !== undefined) {
      values.push(this.stringValue(query.category));
      filters.push(`(c.slug = $${values.length} OR c.name = $${values.length} OR EXISTS (
        SELECT 1
        FROM product_categories pc_filter
        JOIN categories c_filter ON c_filter.id = pc_filter.category_id
        WHERE pc_filter.product_id = p.id
          AND (c_filter.slug = $${values.length} OR c_filter.name = $${values.length})
      ))`);
    }

    if (this.numberValue(query.brand_id) !== null) {
      values.push(this.numberValue(query.brand_id));
      filters.push(`p.brand_id = $${values.length}`);
    } else if (query.brand !== undefined) {
      values.push(this.stringValue(query.brand));
      filters.push('(p.brand = $'+values.length+' OR b.slug = $'+values.length+' OR b.name = $'+values.length+')');
    }

    const perPage = this.clampPageSize(this.numberValue(query.per_page) ?? 15);
    const page = Math.max(1, this.numberValue(query.page) ?? 1);
    const offset = (page - 1) * perPage;
    values.push(perPage, offset);
    const orderBy = this.orderBy(query, ['id', 'name', 'selling_price', 'price', 'stock_quantity', 'created_at', 'rating', 'reviews_count'], 'id');
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const detailColumns = cardView ? 'NULL::text AS description, NULL::json AS dimensions, NULL::json AS specifications, NULL::json AS gallery_urls' : 'p.description, p.dimensions, p.specifications, p.gallery_urls';
    const result = await this.database.query<ProductRow>(`
      SELECT p.id, p.name, p.brand_id, p.seller_id, p.brand, p.sku, p.slug,
             p.product_type, ${detailColumns}, p.selling_price, p.cost_price,
             p.currency, p.price, p.discount_price, p.status, p.is_active,
             p.is_featured, p.is_new_arrival, p.is_best_seller, p.is_flash_sale,
             p.rating, p.reviews_count, p.stock_quantity, p.low_stock_threshold,
             p.weight, p.image_url,
             p.category_id, c.name AS category_name, c.slug AS category_slug,
             c.parent_id AS category_parent_id, cp.name AS category_parent_name,
             b.id AS brand_record_id, b.name AS brand_record_name,
             b.slug AS brand_record_slug, b.logo_url AS brand_record_logo_url,
             i.quantity_on_hand, i.quantity_reserved,
             p.created_at, p.updated_at,
             COUNT(*) OVER()::int AS full_count
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories cp ON cp.id = c.parent_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN inventories i ON i.product_id = p.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `, values);

    const total = Number(result.rows[0]?.full_count ?? 0);
    return this.paginate(result.rows.map((row) => this.productResource(row)), perPage, page, total);
  }

  private categoryResource(row: CategoryRow): Record<string, unknown> {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parent_id: row.parent_id,
      parent_name: row.parent_name,
      icon: row.icon,
      image_url: row.image_url,
      description: row.description,
      sort_order: Number(row.sort_order),
      is_active: Boolean(row.is_active),
      seo_title: row.seo_title,
      seo_description: row.seo_description,
      seo_keywords: row.seo_keywords,
      products_count: Number(row.products_count),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private brandResource(row: BrandRow): Record<string, unknown> {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logo_url: row.logo_url,
      description: row.description,
      country: row.country,
      website: row.website,
      status: row.status,
      is_active: Boolean(row.is_active),
      sort_order: Number(row.sort_order),
      seo_title: row.seo_title,
      seo_description: row.seo_description,
      seo_keywords: row.seo_keywords,
      products_count: Number(row.products_count),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private productResource(row: ProductRow): Record<string, unknown> {
    const availableStock = Math.max(0, Number(row.quantity_on_hand ?? row.stock_quantity ?? 0) - Number(row.quantity_reserved ?? 0));
    return {
      id: row.id,
      name: row.name,
      brand_id: row.brand_id,
      seller_id: row.seller_id,
      brand: row.brand ?? row.brand_record_name,
      brand_record: row.brand_record_id ? {
        id: row.brand_record_id,
        name: row.brand_record_name,
        slug: row.brand_record_slug,
        logo_url: row.brand_record_logo_url,
      } : null,
      sku: row.sku,
      slug: row.slug,
      product_type: row.product_type ?? 'simple',
      description: row.description,
      selling_price: Number(row.selling_price ?? row.price ?? 0),
      cost_price: null,
      currency: row.currency ?? 'USD',
      price: Number(row.price ?? row.selling_price ?? 0),
      discount_price: row.discount_price === null ? null : Number(row.discount_price),
      status: row.status ?? (row.is_active ? 'active' : 'draft'),
      is_active: Boolean(row.is_active),
      is_featured: Boolean(row.is_featured),
      is_new_arrival: Boolean(row.is_new_arrival),
      is_best_seller: Boolean(row.is_best_seller),
      is_flash_sale: Boolean(row.is_flash_sale),
      rating: Number(row.rating ?? 0),
      reviews_count: Number(row.reviews_count ?? 0),
      stock_quantity: Number(row.stock_quantity ?? 0),
      available_stock: availableStock,
      quantity_on_hand: Number(row.quantity_on_hand ?? row.stock_quantity ?? 0),
      quantity_reserved: Number(row.quantity_reserved ?? 0),
      low_stock_threshold: Number(row.low_stock_threshold ?? 5),
      weight: row.weight === null ? null : Number(row.weight),
      dimensions: row.dimensions,
      specifications: row.specifications,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
        parent_id: row.category_parent_id,
        parent_name: row.category_parent_name,
      } : null,
      categories: [],
      attributes: [],
      variants: [],
      image_url: row.image_url,
      gallery_urls: row.gallery_urls ?? [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private categoryTree(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    const byId = new Map<number, Record<string, unknown>>();
    rows.forEach((row) => byId.set(Number(row.id), { ...row, children: [] }));
    const roots: Array<Record<string, unknown>> = [];
    byId.forEach((row) => {
      const parentId = row.parent_id === null ? null : Number(row.parent_id);
      if (parentId !== null && byId.has(parentId)) {
        (byId.get(parentId)?.children as Array<Record<string, unknown>>).push(row);
      } else {
        roots.push(row);
      }
    });
    return roots;
  }

  private paginate<T>(data: T[], perPage: number, page: number, total = data.length): Record<string, unknown> {
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    return {
      data,
      links: {
        first: `?page=1&per_page=${perPage}`,
        last: `?page=${lastPage}&per_page=${perPage}`,
        prev: page > 1 ? `?page=${page - 1}&per_page=${perPage}` : null,
        next: page < lastPage ? `?page=${page + 1}&per_page=${perPage}` : null,
      },
      meta: {
        current_page: page,
        from: data.length ? ((page - 1) * perPage) + 1 : null,
        last_page: lastPage,
        per_page: perPage,
        to: data.length ? ((page - 1) * perPage) + data.length : null,
        total,
      },
    };
  }

  private addSearchFilter(filters: string[], values: unknown[], raw: unknown, columns: string[]): void {
    const value = this.stringValue(raw).trim();
    if (!value) return;
    values.push(`%${value.toLowerCase()}%`);
    const parameter = `$${values.length}`;
    filters.push(`(${columns.map((column) => `LOWER(${column}) LIKE ${parameter}`).join(' OR ')})`);
  }

  private addExactFilter(filters: string[], values: unknown[], raw: unknown, column: string, ignored: string[] = []): void {
    const value = this.stringValue(raw);
    if (!value || ignored.includes(value)) return;
    values.push(value);
    filters.push(`${column} = $${values.length}`);
  }

  private addBooleanFilter(filters: string[], values: unknown[], raw: unknown, column: string): void {
    if (raw === undefined) return;
    values.push(this.booleanValue(raw));
    filters.push(`${column} = $${values.length}`);
  }

  private addNumericFilter(filters: string[], values: unknown[], raw: unknown, column: string, operator: '>=' | '<='): void {
    const value = this.numberValue(raw);
    if (value === null) return;
    values.push(value);
    filters.push(`${column} ${operator} $${values.length}`);
  }

  private orderBy(query: Query, allowed: string[], fallback: string): string {
    const requested = this.stringValue(query.sort_by);
    const column = allowed.includes(requested) ? requested : fallback;
    const direction = this.stringValue(query.sort_dir ?? query.sort_direction).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    return `${column} ${direction}`;
  }

  private stringValue(value: unknown): string {
    if (Array.isArray(value)) return String(value[0] ?? '');
    if (typeof value === 'object' && value !== null) return '';
    return value === undefined || value === null ? '' : String(value);
  }

  private numberValue(value: unknown): number | null {
    const numeric = Number(this.stringValue(value));
    return Number.isFinite(numeric) && this.stringValue(value) !== '' ? numeric : null;
  }

  private booleanValue(value: unknown): boolean {
    return ['true', '1', 'yes', 'on'].includes(this.stringValue(value).toLowerCase());
  }

  private clampPageSize(value: number): number {
    return Math.min(100, Math.max(1, value));
  }
}
