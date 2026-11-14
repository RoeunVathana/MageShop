import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { PoolClient } from 'pg';

import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

interface CategoryRow {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  icon: string | null;
  image_url: string | null;
  description: string | null;
  sort_order: number | string;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  parent_name?: string | null;
  products_count?: number | string;
  attributes_count?: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface AttributeRow {
  id: number;
  category_id: number;
  name: string;
  code: string;
  type: string;
  is_required: boolean;
  is_filterable: boolean;
  is_variant_option: boolean;
  sort_order: number | string;
  validation_rules: unknown;
  created_at: Date | string;
  updated_at: Date | string;
}

interface OptionRow {
  id: number;
  category_attribute_id: number;
  value: string;
  label: string;
  sort_order: number | string;
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
  sort_order: number | string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  products_count?: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface TranslationRow {
  id: number;
  brand_id: number;
  locale: string;
  name: string;
  description: string | null;
}

@Injectable()
export class CatalogManagementService {
  private readonly categoryRoles = ['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER'];
  private readonly brandRoles = ['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'STAFF', 'SELLER'];

  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async categoryDetail(idOrSlug: string): Promise<Record<string, unknown>> {
    const condition = /^\d+$/.test(idOrSlug) ? 'c.id = $1' : 'c.slug = $1';
    const result = await this.database.query<CategoryRow>(this.categorySelect(condition), [/^\d+$/.test(idOrSlug) ? Number(idOrSlug) : idOrSlug]);
    const category = result.rows[0];
    if (!category || !category.is_active) throw new NotFoundException({ status: 'error', message: 'Category not found.' });
    return { data: await this.categoryResource(category, false) };
  }

  async categoryAttributes(idOrSlug: string): Promise<Record<string, unknown>> {
    const category = await this.findCategory(idOrSlug);
    if (!category.is_active) throw new NotFoundException({ status: 'error', message: 'Category not found.' });
    const attributes = await this.attributes(category.id);
    return { data: attributes };
  }

  async brandDetail(idOrSlug: string): Promise<Record<string, unknown>> {
    const condition = /^\d+$/.test(idOrSlug) ? 'b.id = $1' : 'b.slug = $1';
    const result = await this.database.query<BrandRow>(this.brandSelect(condition), [/^\d+$/.test(idOrSlug) ? Number(idOrSlug) : idOrSlug]);
    const brand = result.rows[0];
    if (!brand || !brand.is_active || brand.status !== 'active') throw new NotFoundException({ status: 'error', message: 'Brand not found.' });
    return { status: 'success', data: await this.brandResource(brand) };
  }

  async storeCategory(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireRole(user, this.categoryRoles);
    const input = this.validateCategory(body, false);
    const category = await this.database.transaction(async (client) => {
      await this.ensureParent(client, input.parent_id, null);
      const slug = await this.uniqueSlug(client, 'categories', input.slug || input.name);
      const inserted = await client.query<CategoryRow>(`
        INSERT INTO categories
          (parent_id, name, slug, icon, image_url, description, sort_order,
           is_active, seo_title, seo_description, seo_keywords, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
        RETURNING id, parent_id, name, slug, icon, image_url, description,
                  sort_order, is_active, seo_title, seo_description, seo_keywords,
                  created_at, updated_at
      `, [input.parent_id, input.name, slug, input.icon ?? 'Package', input.image_url, input.description, input.sort_order, input.is_active, input.seo_title, input.seo_description, input.seo_keywords]);
      const row = inserted.rows[0];
      if (!row) throw new Error('Category was not created.');
      return row;
    });
    return { status: 'success', data: await this.categoryResource(category, true) };
  }

  async updateCategory(categoryId: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireRole(user, this.categoryRoles);
    const existing = await this.findCategory(String(categoryId));
    const input = this.validateCategory(body, true);
    const updated = await this.database.transaction(async (client) => {
      const parentId = input.parent_id === undefined ? existing.parent_id : input.parent_id;
      await this.ensureParent(client, parentId, categoryId);
      const slug = input.slug === undefined ? existing.slug : await this.uniqueSlug(client, 'categories', input.slug, categoryId);
      const values = [
        input.name ?? existing.name,
        slug,
        input.parent_id === undefined ? existing.parent_id : input.parent_id,
        input.icon === undefined ? existing.icon : input.icon,
        input.image_url === undefined ? existing.image_url : input.image_url,
        input.description === undefined ? existing.description : input.description,
        input.sort_order === undefined ? existing.sort_order : input.sort_order,
        input.is_active === undefined ? existing.is_active : input.is_active,
        input.seo_title === undefined ? existing.seo_title : input.seo_title,
        input.seo_description === undefined ? existing.seo_description : input.seo_description,
        input.seo_keywords === undefined ? existing.seo_keywords : input.seo_keywords,
        categoryId,
      ];
      const result = await client.query<CategoryRow>(`
        UPDATE categories
        SET name=$1, slug=$2, parent_id=$3, icon=$4, image_url=$5,
            description=$6, sort_order=$7, is_active=$8, seo_title=$9,
            seo_description=$10, seo_keywords=$11, updated_at=NOW()
        WHERE id=$12
        RETURNING id, parent_id, name, slug, icon, image_url, description,
                  sort_order, is_active, seo_title, seo_description, seo_keywords,
                  created_at, updated_at
      `, values);
      const row = result.rows[0];
      if (!row) throw new NotFoundException({ status: 'error', message: 'Category not found.' });
      return row;
    });
    return { status: 'success', data: await this.categoryResource(updated, true) };
  }

  async destroyCategory(categoryId: number, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    if (!this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN'])) throw new ForbiddenException({ status: 'error', message: 'Unauthorized to delete platform categories.' });
    const existing = await this.findCategory(String(categoryId));
    await this.database.transaction(async (client) => {
      await client.query('UPDATE categories SET parent_id = $1, updated_at = NOW() WHERE parent_id = $2', [existing.parent_id, categoryId]);
      await client.query('UPDATE products SET category_id = $1, updated_at = NOW() WHERE category_id = $2', [existing.parent_id, categoryId]);
      if (existing.parent_id !== null) {
        await client.query(`
          INSERT INTO product_categories (product_id, category_id, is_primary, created_at, updated_at)
          SELECT product_id, $1, is_primary, NOW(), NOW()
          FROM product_categories WHERE category_id = $2
          ON CONFLICT (product_id, category_id) DO NOTHING
        `, [existing.parent_id, categoryId]);
      }
      await client.query('DELETE FROM product_categories WHERE category_id = $1', [categoryId]);
      await client.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    });
    return { status: 'success', message: `Category '${existing.name}' has been deleted successfully.` };
  }

  async storeAttribute(categoryId: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireRole(user, this.categoryRoles);
    await this.findCategory(String(categoryId));
    const input = this.validateAttribute(body, false);
    const attribute = await this.database.transaction(async (client) => {
      const code = this.slug(input.code ?? input.name, '_');
      const inserted = await client.query<AttributeRow>(`
        INSERT INTO category_attributes
          (category_id, name, code, type, is_required, is_filterable,
           is_variant_option, sort_order, validation_rules, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
        RETURNING id, category_id, name, code, type, is_required,
                  is_filterable, is_variant_option, sort_order,
                  validation_rules, created_at, updated_at
      `, [categoryId, input.name, code, input.type, input.is_required, input.is_filterable, input.is_variant_option, input.sort_order, input.validation_rules]);
      const row = inserted.rows[0];
      if (!row) throw new Error('Category attribute was not created.');
      await this.insertOptions(client, row.id, input.options);
      return row;
    });
    return { status: 'success', data: await this.attributeResource(attribute) };
  }

  async updateAttribute(attributeId: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireRole(user, this.categoryRoles);
    const existing = await this.findAttribute(attributeId);
    const input = this.validateAttribute(body, true);
    const attribute = await this.database.transaction(async (client) => {
      const result = await client.query<AttributeRow>(`
        UPDATE category_attributes
        SET name=$1, code=$2, type=$3, is_required=$4, is_filterable=$5,
            is_variant_option=$6, sort_order=$7, validation_rules=$8, updated_at=NOW()
        WHERE id=$9
        RETURNING id, category_id, name, code, type, is_required,
                  is_filterable, is_variant_option, sort_order,
                  validation_rules, created_at, updated_at
      `, [input.name ?? existing.name, input.code === undefined ? existing.code : this.slug(input.code, '_'), input.type ?? existing.type, input.is_required ?? existing.is_required, input.is_filterable ?? existing.is_filterable, input.is_variant_option ?? existing.is_variant_option, input.sort_order ?? existing.sort_order, input.validation_rules === undefined ? existing.validation_rules : input.validation_rules, attributeId]);
      const row = result.rows[0];
      if (!row) throw new NotFoundException({ status: 'error', message: 'Category attribute not found.' });
      if (input.options !== undefined) {
        const kept = await this.upsertOptions(client, attributeId, input.options);
        if (kept.length) await client.query('DELETE FROM category_attribute_options WHERE category_attribute_id=$1 AND id <> ALL($2::bigint[])', [attributeId, kept]);
        else await client.query('DELETE FROM category_attribute_options WHERE category_attribute_id=$1', [attributeId]);
      }
      return row;
    });
    return { status: 'success', data: await this.attributeResource(attribute) };
  }

  async destroyAttribute(attributeId: number, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireRole(user, this.categoryRoles);
    const existing = await this.findAttribute(attributeId);
    await this.database.query('DELETE FROM category_attributes WHERE id=$1', [attributeId]);
    return { status: 'success', message: `Attribute '${existing.name}' removed successfully.` };
  }

  async storeBrand(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireRole(user, this.brandRoles);
    const input = this.validateBrand(body, false);
    const brand = await this.database.transaction(async (client) => {
      const slug = await this.uniqueSlug(client, 'brands', input.slug ?? input.name);
      const result = await client.query<BrandRow>(`
        INSERT INTO brands
          (name, slug, logo_url, description, country, website, status,
           is_active, sort_order, seo_title, seo_description, seo_keywords,
           created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
        RETURNING id, name, slug, logo_url, description, country, website,
                  status, is_active, sort_order, seo_title, seo_description,
                  seo_keywords, created_at, updated_at
      `, [input.name, slug, input.logo_url, input.description, input.country, input.website, input.status ?? 'active', input.is_active ?? true, input.sort_order ?? 0, input.seo_title, input.seo_description, input.seo_keywords]);
      const row = result.rows[0];
      if (!row) throw new Error('Brand was not created.');
      await this.syncTranslations(client, row.id, input.translations);
      return row;
    });
    return { status: 'success', data: await this.brandResource(brand) };
  }

  async updateBrand(brandId: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireRole(user, this.brandRoles);
    const existing = await this.findBrand(brandId);
    const input = this.validateBrand(body, true);
    const brand = await this.database.transaction(async (client) => {
      const slug = input.slug === undefined ? existing.slug : await this.uniqueSlug(client, 'brands', input.slug, brandId);
      const result = await client.query<BrandRow>(`
        UPDATE brands
        SET name=$1, slug=$2, logo_url=$3, description=$4, country=$5,
            website=$6, status=$7, is_active=$8, sort_order=$9,
            seo_title=$10, seo_description=$11, seo_keywords=$12, updated_at=NOW()
        WHERE id=$13
        RETURNING id, name, slug, logo_url, description, country, website,
                  status, is_active, sort_order, seo_title, seo_description,
                  seo_keywords, created_at, updated_at
      `, [input.name ?? existing.name, slug, input.logo_url === undefined ? existing.logo_url : input.logo_url, input.description === undefined ? existing.description : input.description, input.country === undefined ? existing.country : input.country, input.website === undefined ? existing.website : input.website, input.status ?? existing.status, input.is_active ?? existing.is_active, input.sort_order ?? existing.sort_order, input.seo_title === undefined ? existing.seo_title : input.seo_title, input.seo_description === undefined ? existing.seo_description : input.seo_description, input.seo_keywords === undefined ? existing.seo_keywords : input.seo_keywords, brandId]);
      const row = result.rows[0];
      if (!row) throw new NotFoundException({ status: 'error', message: 'Brand not found.' });
      if (input.translations !== undefined) await this.syncTranslations(client, brandId, input.translations);
      return row;
    });
    return { status: 'success', data: await this.brandResource(brand) };
  }

  async destroyBrand(brandId: number, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireRole(user, ['SUPER_ADMIN', 'ADMIN']);
    const existing = await this.findBrand(brandId);
    const result = await this.database.query<BrandRow>(`UPDATE brands SET is_active=FALSE, status='archived', updated_at=NOW() WHERE id=$1 RETURNING id, name, slug, logo_url, description, country, website, status, is_active, sort_order, seo_title, seo_description, seo_keywords, created_at, updated_at`, [brandId]);
    return { status: 'success', message: `Brand '${existing.name}' has been safely archived.`, data: await this.brandResource(result.rows[0] ?? existing) };
  }

  private async currentUser(userId: number): Promise<AuthUser> { return this.auth.me(userId); }

  private requireRole(user: AuthUser, roles: readonly string[]): void {
    if (!this.auth.hasAnyRole(user, roles)) throw new ForbiddenException({ status: 'error', message: 'You are not authorized to manage this catalog resource.' });
  }

  private async findCategory(idOrSlug: string): Promise<CategoryRow> {
    const numeric = /^\d+$/.test(idOrSlug);
    const result = await this.database.query<CategoryRow>(this.categorySelect(numeric ? 'c.id = $1' : 'c.slug = $1'), [numeric ? Number(idOrSlug) : idOrSlug]);
    const category = result.rows[0];
    if (!category) throw new NotFoundException({ status: 'error', message: 'Category not found.' });
    return category;
  }

  private async findBrand(id: number): Promise<BrandRow> {
    const result = await this.database.query<BrandRow>(this.brandSelect('b.id = $1'), [id]);
    const brand = result.rows[0];
    if (!brand) throw new NotFoundException({ status: 'error', message: 'Brand not found.' });
    return brand;
  }

  private async findAttribute(id: number): Promise<AttributeRow> {
    const result = await this.database.query<AttributeRow>('SELECT id, category_id, name, code, type, is_required, is_filterable, is_variant_option, sort_order, validation_rules, created_at, updated_at FROM category_attributes WHERE id=$1', [id]);
    const attribute = result.rows[0];
    if (!attribute) throw new NotFoundException({ status: 'error', message: 'Category attribute not found.' });
    return attribute;
  }

  private categorySelect(condition: string): string {
    return `SELECT c.id, c.parent_id, c.name, c.slug, c.icon, c.image_url,
                   c.description, c.sort_order, c.is_active, c.seo_title,
                   c.seo_description, c.seo_keywords, p.name AS parent_name,
                   (SELECT COUNT(*)::int FROM products pr WHERE pr.category_id=c.id) AS products_count,
                   (SELECT COUNT(*)::int FROM category_attributes ca WHERE ca.category_id=c.id) AS attributes_count,
                   c.created_at, c.updated_at
            FROM categories c LEFT JOIN categories p ON p.id=c.parent_id
            WHERE ${condition}`;
  }

  private brandSelect(condition: string): string {
    return `SELECT b.id, b.name, b.slug, b.logo_url, b.description, b.country,
                   b.website, b.status, b.is_active, b.sort_order, b.seo_title,
                   b.seo_description, b.seo_keywords,
                   (SELECT COUNT(*)::int FROM products p WHERE p.brand_id=b.id) AS products_count,
                   b.created_at, b.updated_at
            FROM brands b WHERE ${condition}`;
  }

  private async categoryResource(row: CategoryRow, includeInactiveChildren: boolean): Promise<Record<string, unknown>> {
    const children = await this.database.query<CategoryRow>(this.categorySelect('c.parent_id = $1' + (includeInactiveChildren ? '' : ' AND c.is_active = TRUE')) + ' ORDER BY c.sort_order, c.name', [row.id]);
    const attrs = await this.attributes(row.id);
    return {
      id: row.id, name: row.name, slug: row.slug, parent_id: row.parent_id,
      parent_name: row.parent_name ?? null, icon: row.icon, image_url: row.image_url,
      description: row.description, sort_order: Number(row.sort_order), is_active: Boolean(row.is_active),
      seo_title: row.seo_title, seo_description: row.seo_description, seo_keywords: row.seo_keywords,
      products_count: Number(row.products_count ?? 0), attributes_count: Number(row.attributes_count ?? 0),
      children: children.rows.map((child) => ({ id: child.id, name: child.name, slug: child.slug, parent_id: child.parent_id, parent_name: child.parent_name ?? null, icon: child.icon, image_url: child.image_url, description: child.description, sort_order: Number(child.sort_order), is_active: Boolean(child.is_active), seo_title: child.seo_title, seo_description: child.seo_description, seo_keywords: child.seo_keywords, products_count: Number(child.products_count ?? 0), attributes_count: Number(child.attributes_count ?? 0), children: [], attributes: [], created_at: child.created_at, updated_at: child.updated_at })),
      attributes: attrs,
      created_at: row.created_at, updated_at: row.updated_at,
    };
  }

  private async attributes(categoryId: number): Promise<Array<Record<string, unknown>>> {
    const result = await this.database.query<AttributeRow>('SELECT id, category_id, name, code, type, is_required, is_filterable, is_variant_option, sort_order, validation_rules, created_at, updated_at FROM category_attributes WHERE category_id=$1 ORDER BY sort_order, id', [categoryId]);
    const options = await this.database.query<OptionRow>('SELECT id, category_attribute_id, value, label, sort_order FROM category_attribute_options WHERE category_attribute_id = ANY($1::bigint[]) ORDER BY sort_order, id', [result.rows.map((row) => row.id)]);
    const byAttribute = new Map<number, OptionRow[]>();
    for (const option of options.rows) byAttribute.set(option.category_attribute_id, [...(byAttribute.get(option.category_attribute_id) ?? []), option]);
    return result.rows.map((row) => this.attributeObject(row, byAttribute.get(row.id) ?? []));
  }

  private async attributeResource(attribute: AttributeRow): Promise<Record<string, unknown>> {
    const options = await this.database.query<OptionRow>('SELECT id, category_attribute_id, value, label, sort_order FROM category_attribute_options WHERE category_attribute_id=$1 ORDER BY sort_order, id', [attribute.id]);
    return this.attributeObject(attribute, options.rows);
  }

  private attributeObject(row: AttributeRow, options: OptionRow[]): Record<string, unknown> {
    return { id: row.id, category_id: row.category_id, name: row.name, code: row.code, type: row.type, is_required: Boolean(row.is_required), is_filterable: Boolean(row.is_filterable), is_variant_option: Boolean(row.is_variant_option), sort_order: Number(row.sort_order), validation_rules: row.validation_rules, options: options.map((option) => ({ id: option.id, value: option.value, label: option.label, sort_order: Number(option.sort_order) })), created_at: row.created_at, updated_at: row.updated_at };
  }

  private async brandResource(row: BrandRow): Promise<Record<string, unknown>> {
    const translations = await this.database.query<TranslationRow>('SELECT id, brand_id, locale, name, description FROM brand_translations WHERE brand_id=$1 ORDER BY locale', [row.id]);
    return { id: row.id, name: row.name, slug: row.slug, logo_url: row.logo_url, description: row.description, country: row.country, website: row.website, status: row.status, is_active: Boolean(row.is_active), sort_order: Number(row.sort_order), seo_title: row.seo_title, seo_description: row.seo_description, seo_keywords: row.seo_keywords, products_count: Number(row.products_count ?? 0), translations: translations.rows.map((translation) => ({ id: translation.id, locale: translation.locale, name: translation.name, description: translation.description })), created_at: row.created_at, updated_at: row.updated_at };
  }

  private async ensureParent(client: PoolClient, parentId: number | null | undefined, categoryId: number | null): Promise<void> {
    if (parentId === null || parentId === undefined) return;
    if (categoryId !== null && parentId === categoryId) throw new UnprocessableEntityException({ status: 'error', message: 'A category cannot be its own parent.' });
    const exists = await client.query<{ id: number }>('SELECT id FROM categories WHERE id=$1', [parentId]);
    if (!exists.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: `Proposed parent category #${parentId} does not exist.` });
    if (categoryId !== null) {
      const cycle = await client.query<{ id: number }>(`
        WITH RECURSIVE descendants AS (
          SELECT id FROM categories WHERE id=$1
          UNION ALL
          SELECT c.id FROM categories c JOIN descendants d ON c.parent_id=d.id
        ) SELECT id FROM descendants WHERE id=$2 LIMIT 1
      `, [categoryId, parentId]);
      if (cycle.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: 'The proposed parent would create a category cycle.' });
    }
  }

  private async uniqueSlug(client: PoolClient, table: 'categories' | 'brands', raw: string, exceptId?: number): Promise<string> {
    const base = this.slug(raw, '-');
    let candidate = base || `${table === 'categories' ? 'category' : 'brand'}-${Date.now()}`;
    let suffix = 1;
    while (true) {
      const params: Array<string | number> = [candidate];
      const exclude = exceptId === undefined ? '' : ' AND id <> $2';
      if (exceptId !== undefined) params.push(exceptId);
      const result = await client.query<{ id: number }>(`SELECT id FROM ${table} WHERE slug=$1${exclude} LIMIT 1`, params);
      if (!result.rows[0]) return candidate;
      candidate = `${base}-${suffix++}`;
    }
  }

  private async insertOptions(client: PoolClient, attributeId: number, options: unknown[] | undefined): Promise<void> {
    if (!options) return;
    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      const value = typeof option === 'object' && option !== null ? String((option as Record<string, unknown>).value ?? (option as Record<string, unknown>).label ?? '').trim() : String(option).trim();
      const label = typeof option === 'object' && option !== null ? String((option as Record<string, unknown>).label ?? value).trim() : value;
      if (!value || !label) throw new UnprocessableEntityException({ status: 'error', message: 'Category attribute options require value and label.' });
      const sortOrder = typeof option === 'object' && option !== null ? this.integer((option as Record<string, unknown>).sort_order, index) : index;
      await client.query('INSERT INTO category_attribute_options (category_attribute_id, value, label, sort_order, created_at, updated_at) VALUES ($1,$2,$3,$4,NOW(),NOW())', [attributeId, value, label, sortOrder]);
    }
  }

  private async upsertOptions(client: PoolClient, attributeId: number, options: unknown[]): Promise<number[]> {
    const kept: number[] = [];
    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      const data = typeof option === 'object' && option !== null ? option as Record<string, unknown> : { value: option, label: option };
      const value = String(data.value ?? data.label ?? '').trim();
      const label = String(data.label ?? value).trim();
      const sortOrder = this.integer(data.sort_order, index);
      if (!value || !label) throw new UnprocessableEntityException({ status: 'error', message: 'Category attribute options require value and label.' });
      const optionId = this.number(data.id);
      if (optionId !== null) {
        const result = await client.query<{ id: number }>('UPDATE category_attribute_options SET value=$1, label=$2, sort_order=$3, updated_at=NOW() WHERE id=$4 AND category_attribute_id=$5 RETURNING id', [value, label, sortOrder, optionId, attributeId]);
        if (result.rows[0]) { kept.push(result.rows[0].id); continue; }
      }
      const result = await client.query<{ id: number }>('INSERT INTO category_attribute_options (category_attribute_id, value, label, sort_order, created_at, updated_at) VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING id', [attributeId, value, label, sortOrder]);
      if (result.rows[0]) kept.push(result.rows[0].id);
    }
    return kept;
  }

  private async syncTranslations(client: PoolClient, brandId: number, translations: Array<Record<string, unknown>> | undefined): Promise<void> {
    if (!translations) return;
    for (const translation of translations) {
      const locale = String(translation.locale ?? '').trim();
      const name = String(translation.name ?? '').trim();
      if (!['en', 'km'].includes(locale) || !name) throw new UnprocessableEntityException({ status: 'error', message: 'Brand translations require a valid locale and name.' });
      await client.query(`
        INSERT INTO brand_translations (brand_id, locale, name, description, created_at, updated_at)
        VALUES ($1,$2,$3,$4,NOW(),NOW())
        ON CONFLICT (brand_id, locale) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, updated_at=NOW()
      `, [brandId, locale, name, translation.description === undefined || translation.description === null ? null : String(translation.description).trim()]);
    }
  }

  private validateCategory(body: Record<string, unknown>, partial: boolean): Record<string, any> {
    const text = (key: string, max: number): string | null | undefined => {
      if (body[key] === undefined && partial) return undefined;
      if (body[key] === null) return null;
      const value = String(body[key] ?? '').trim();
      if (!value || value.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      return value;
    };
    const result: Record<string, any> = { name: text('name', 255), slug: text('slug', 255), icon: text('icon', 100), image_url: text('image_url', 500), description: body.description === undefined && partial ? undefined : body.description === null ? null : String(body.description ?? ''), seo_title: text('seo_title', 255), seo_description: body.seo_description === undefined && partial ? undefined : body.seo_description === null ? null : String(body.seo_description ?? ''), seo_keywords: text('seo_keywords', 255) };
    if (!partial && !result.name) throw new UnprocessableEntityException({ status: 'error', message: 'The name field is invalid.' });
    result.parent_id = body.parent_id === undefined && partial ? undefined : this.number(body.parent_id);
    result.sort_order = body.sort_order === undefined && partial ? undefined : this.integer(body.sort_order, 0);
    result.is_active = body.is_active === undefined && partial ? undefined : this.boolean(body.is_active, true);
    return result;
  }

  private validateAttribute(body: Record<string, unknown>, partial: boolean): Record<string, any> {
    const name = body.name === undefined && partial ? undefined : String(body.name ?? '').trim();
    if (name !== undefined && (!name || name.length > 255)) throw new UnprocessableEntityException({ status: 'error', message: 'The name field is invalid.' });
    const allowed = ['text', 'number', 'select', 'multiselect', 'boolean', 'date'];
    const type = body.type === undefined && partial ? undefined : String(body.type ?? '');
    if (type !== undefined && !allowed.includes(type)) throw new UnprocessableEntityException({ status: 'error', message: 'The type field is invalid.' });
    return { name, code: body.code === undefined && partial ? undefined : String(body.code ?? '').trim() || null, type, is_required: body.is_required === undefined && partial ? undefined : this.boolean(body.is_required, false), is_filterable: body.is_filterable === undefined && partial ? undefined : this.boolean(body.is_filterable, true), is_variant_option: body.is_variant_option === undefined && partial ? undefined : this.boolean(body.is_variant_option, false), sort_order: body.sort_order === undefined && partial ? undefined : this.integer(body.sort_order, 0), validation_rules: body.validation_rules === undefined && partial ? undefined : body.validation_rules ?? null, options: body.options === undefined && partial ? undefined : Array.isArray(body.options) ? body.options : [] };
  }

  private validateBrand(body: Record<string, unknown>, partial: boolean): Record<string, any> {
    const text = (key: string, max: number): string | null | undefined => {
      if (body[key] === undefined && partial) return undefined;
      if (body[key] === null) return null;
      const value = String(body[key] ?? '').trim();
      if (!value || value.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      return value;
    };
    const status = body.status === undefined && partial ? undefined : String(body.status ?? 'active');
    if (status !== undefined && !['active', 'inactive', 'archived'].includes(status)) throw new UnprocessableEntityException({ status: 'error', message: 'The status field is invalid.' });
    const translations = body.translations === undefined && partial ? undefined : Array.isArray(body.translations) ? body.translations as Array<Record<string, unknown>> : [];
    const name = text('name', 100);
    if (!partial && !name) throw new UnprocessableEntityException({ status: 'error', message: 'The name field is invalid.' });
    return { name, slug: text('slug', 120), logo_url: text('logo_url', 255), description: text('description', 1000), country: text('country', 100), website: text('website', 255), status, is_active: body.is_active === undefined && partial ? undefined : this.boolean(body.is_active, true), sort_order: body.sort_order === undefined && partial ? undefined : this.integer(body.sort_order, 0), seo_title: text('seo_title', 255), seo_description: text('seo_description', 500), seo_keywords: text('seo_keywords', 255), translations };
  }

  private slug(value: string, separator: '-' | '_'): string {
    return String(value ?? '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, separator).replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
  }

  private number(value: unknown): number | null {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) throw new UnprocessableEntityException({ status: 'error', message: 'The numeric identifier is invalid.' });
    return number;
  }

  private integer(value: unknown, fallback: number): number {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) throw new UnprocessableEntityException({ status: 'error', message: 'The numeric field is invalid.' });
    return number;
  }

  private boolean(value: unknown, fallback: boolean): boolean {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    if (['true', '1', 'yes', 'on'].includes(String(value).toLowerCase())) return true;
    if (['false', '0', 'no', 'off'].includes(String(value).toLowerCase())) return false;
    throw new UnprocessableEntityException({ status: 'error', message: 'The boolean field is invalid.' });
  }
}
