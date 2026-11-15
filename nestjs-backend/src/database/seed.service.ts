import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';

import { DatabaseService } from './database.service';
import {
  BASE_CATEGORIES,
  DEFAULT_STORE_SETTINGS,
  ENV_STORE_SETTINGS,
  ROLE_PERMISSION_SLUGS,
  SEED_ATTRIBUTES,
  SEED_BANNERS,
  SEED_BRANDS,
  SEED_PERMISSIONS,
  SEED_PRODUCTS,
  SEED_ROLES,
  SEEDER_NAMES,
  UNIVERSAL_CATEGORIES,
  UNIVERSAL_SUBCATEGORIES,
} from './seed-data';

interface SeedOptions {
  resetHistory?: boolean;
}

interface SeedCounts {
  roles: number;
  permissions: number;
  categories: number;
  brands: number;
  products: number;
  banners: number;
  store_settings: number;
  seeder_runs: number;
}

@Injectable()
export class SeedService {
  constructor(private readonly database: DatabaseService, private readonly config: ConfigService) {}

  async run(options: SeedOptions = {}): Promise<Record<string, unknown>> {
    const started = Date.now();
    const force = options.resetHistory === true || this.config.get<string>('FORCE_RESEED', 'false') === 'true';
    const counts = await this.database.transaction(async (client) => {
      if (force) await client.query('TRUNCATE TABLE seeder_runs');

      const roleIds = await this.seedRolesAndPermissions(client);
      await this.seedEnvironmentSettings(client);
      await this.seedBrands(client);

      const commerceRan = force || !(await this.hasSeederRun(client, SEEDER_NAMES.commerce));
      if (commerceRan) {
        await this.seedCommerce(client);
        await this.recordSeederRun(client, SEEDER_NAMES.commerce);
      }

      const universalRan = force || !(await this.hasSeederRun(client, SEEDER_NAMES.universal));
      if (universalRan) {
        await this.seedUniversalCategories(client);
        await this.recordSeederRun(client, SEEDER_NAMES.universal);
      }

      const bannerRan = force || !(await this.hasSeederRun(client, SEEDER_NAMES.banner));
      if (bannerRan) {
        await this.seedBanners(client);
        await this.recordSeederRun(client, SEEDER_NAMES.banner);
      }

      await this.seedProductGalleries(client);
      await this.seedMasterAdmin(client, roleIds);

      return this.tableCounts(client);
    });

    return {
      status: 'success',
      message: 'NestJS seed completed from the Laravel seed definitions. Existing application data was preserved.',
      forced: force,
      duration_seconds: Math.round((Date.now() - started) / 10) / 100,
      summary_counts: counts,
      demo_data: this.config.get<string>('SEED_DEMO_DATA', 'false') === 'true',
    };
  }

  private async seedRolesAndPermissions(client: PoolClient): Promise<Map<string, number>> {
    const roleIds = new Map<string, number>();
    for (const role of SEED_ROLES) {
      const result = await client.query<{ id: number }>(`
        INSERT INTO roles (name, slug, description, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, updated_at=NOW()
        RETURNING id
      `, [role.name, role.slug, role.description]);
      const id = result.rows[0]?.id;
      if (!id) throw new Error(`Unable to seed role ${role.slug}.`);
      roleIds.set(role.slug, id);
    }

    const permissionIds = new Map<string, number>();
    for (const permission of SEED_PERMISSIONS) {
      const existing = await client.query<{ id: number }>('SELECT id FROM permissions WHERE slug=$1 OR name=$2 LIMIT 1', [permission.slug, permission.name]);
      const id = existing.rows[0]?.id;
      if (id) {
        await client.query('UPDATE permissions SET name=$1, slug=$2, "group"=$3, description=$4, updated_at=NOW() WHERE id=$5', [permission.name, permission.slug, permission.group, permission.description, id]);
        permissionIds.set(permission.slug, id);
      } else {
        const inserted = await client.query<{ id: number }>(`
          INSERT INTO permissions (name, slug, "group", description, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id
        `, [permission.name, permission.slug, permission.group, permission.description]);
        const insertedId = inserted.rows[0]?.id;
        if (!insertedId) throw new Error(`Unable to seed permission ${permission.slug}.`);
        permissionIds.set(permission.slug, insertedId);
      }
    }

    const allPermissionIds = [...permissionIds.values()];
    await this.syncRolePermissions(client, roleIds.get('super_admin'), allPermissionIds);
    await this.syncRolePermissions(client, roleIds.get('admin'), allPermissionIds.filter((id) => permissionIds.get('permissions.grant') !== id));

    for (const [roleSlug, permissionSlugs] of Object.entries(ROLE_PERMISSION_SLUGS)) {
      const roleId = roleIds.get(roleSlug);
      const ids = permissionSlugs.map((slug) => permissionIds.get(slug)).filter((id): id is number => Boolean(id));
      if (roleId) {
        await this.syncRolePermissions(client, roleId, ids, roleSlug.startsWith('delivery') || roleSlug === 'courier' || roleSlug === 'order_manager' || roleSlug === 'logistics_manager' || roleSlug === 'dispatcher');
      }
    }
    return roleIds;
  }

  private async syncRolePermissions(client: PoolClient, roleId: number | undefined, permissionIds: number[], additive = false): Promise<void> {
    if (!roleId) return;
    if (!additive) await client.query('DELETE FROM role_permissions WHERE role_id=$1', [roleId]);
    for (const permissionId of permissionIds) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (role_id, permission_id) DO NOTHING
      `, [roleId, permissionId]);
    }
  }

  private async seedEnvironmentSettings(client: PoolClient): Promise<void> {
    const values: Record<string, string> = { ...ENV_STORE_SETTINGS };
    const envKeys: Record<string, string> = {
      store_name: 'APP_NAME',
      support_email: 'SUPPORT_EMAIL',
      mail_mailer: 'MAIL_MAILER',
      mail_host: 'MAIL_HOST',
      mail_port: 'MAIL_PORT',
      mail_username: 'MAIL_USERNAME',
      mail_password: 'MAIL_PASSWORD',
      mail_encryption: 'MAIL_ENCRYPTION',
      mail_from_address: 'MAIL_FROM_ADDRESS',
      mail_from_name: 'MAIL_FROM_NAME',
      telegram_bot_token: 'TELEGRAM_BOT_TOKEN',
      telegram_bot_username: 'TELEGRAM_BOT_USERNAME',
      telegram_webhook_secret: 'TELEGRAM_WEBHOOK_SECRET',
      telegram_admin_chat_id: 'TELEGRAM_ADMIN_CHAT_ID',
      bakong_account_id: 'BAKONG_ACCOUNT_ID',
      bakong_merchant_name: 'BAKONG_MERCHANT_NAME',
      bakong_merchant_city: 'BAKONG_MERCHANT_CITY',
      bakong_api_url: 'BAKONG_API_URL',
    };
    for (const [settingKey, envKey] of Object.entries(envKeys)) {
      const configured = this.config.get<string>(envKey, '').trim();
      if (configured) values[settingKey] = configured;
    }
    for (const [key, value] of Object.entries(values)) {
      if (!value) continue;
      await client.query(`
        INSERT INTO store_settings (store_id, setting_key, setting_value, created_at, updated_at)
        VALUES ('primary', $1, $2, NOW(), NOW())
        ON CONFLICT (setting_key) DO NOTHING
      `, [key, value]);
    }
  }

  private async seedCommerce(client: PoolClient): Promise<void> {
    for (const setting of Object.entries(DEFAULT_STORE_SETTINGS)) await this.insertSetting(client, setting[0], setting[1]);
    const categoryIds = await this.seedCategories(client, BASE_CATEGORIES);
    await this.seedProducts(client, categoryIds);
    await this.seedDemoData(client);
  }

  private async seedUniversalCategories(client: PoolClient): Promise<void> {
    const ids = await this.seedCategories(client, UNIVERSAL_CATEGORIES);
    await this.seedCategories(client, UNIVERSAL_SUBCATEGORIES, ids);
    await this.seedAttributes(client);

    const productCategoryMap: Record<string, string> = {
      'LAP-MBP-016': 'laptops-ultrabooks',
      'AUD-SNY-XM5': 'audio-headphones',
      'PHN-SMS-S24': 'smartphones',
      'WAT-APL-ULT2': 'smartwatches-bands',
      'FSH-NKE-ALP2': 'shoes-bags',
    };
    for (const [sku, categorySlug] of Object.entries(productCategoryMap)) {
      const product = await client.query<{ id: number }>('SELECT id FROM products WHERE sku=$1 LIMIT 1', [sku]);
      const category = await client.query<{ id: number }>('SELECT id FROM categories WHERE slug=$1 LIMIT 1', [categorySlug]);
      if (!product.rows[0]?.id || !category.rows[0]?.id) continue;
      await client.query('UPDATE products SET category_id=$1, brand=COALESCE(brand, $2), product_type=COALESCE(product_type, \'simple\'), updated_at=NOW() WHERE id=$3', [category.rows[0].id, this.brandForSku(sku), product.rows[0].id]);
      await client.query('INSERT INTO product_categories (product_id, category_id, is_primary, created_at, updated_at) VALUES ($1,$2,true,NOW(),NOW()) ON CONFLICT (product_id,category_id) DO UPDATE SET is_primary=true, updated_at=NOW()', [product.rows[0].id, category.rows[0].id]);
    }
  }

  private async seedCategories(client: PoolClient, categories: Array<{ name: string; slug: string; icon: string; description: string; sortOrder: number; parentSlug?: string }>, existingParents = new Map<string, number>()): Promise<Map<string, number>> {
    const ids = new Map(existingParents);
    for (const category of categories) {
      const parentId = category.parentSlug ? ids.get(category.parentSlug) ?? (await this.lookupId(client, 'categories', category.parentSlug)) : null;
      const result = await client.query<{ id: number }>(`
        INSERT INTO categories (name, slug, parent_id, icon, description, sort_order, is_active, seo_title, seo_description, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,NOW(),NOW())
        ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, parent_id=EXCLUDED.parent_id, icon=EXCLUDED.icon, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order, is_active=true, seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description, updated_at=NOW()
        RETURNING id
      `, [category.name, category.slug, parentId, category.icon, category.description, category.sortOrder, `Buy ${category.name} Online | MegaCommerce`, `Explore the widest selection of ${category.name} at MegaCommerce Flagship Store.`]);
      const id = result.rows[0]?.id;
      if (id) ids.set(category.slug, id);
    }
    return ids;
  }

  private async seedAttributes(client: PoolClient): Promise<void> {
    for (const attribute of SEED_ATTRIBUTES) {
      const categoryId = await this.lookupId(client, 'categories', attribute.categorySlug);
      if (!categoryId) continue;
      const result = await client.query<{ id: number }>(`
        INSERT INTO category_attributes (category_id, name, code, type, is_required, is_filterable, is_variant_option, sort_order, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
        ON CONFLICT (category_id, code) DO UPDATE SET name=EXCLUDED.name, type=EXCLUDED.type, is_required=EXCLUDED.is_required, is_filterable=EXCLUDED.is_filterable, is_variant_option=EXCLUDED.is_variant_option, sort_order=EXCLUDED.sort_order, updated_at=NOW()
        RETURNING id
      `, [categoryId, attribute.name, attribute.code, attribute.type, attribute.required ?? false, attribute.filterable ?? true, attribute.variantOption ?? false, attribute.sortOrder]);
      const attributeId = result.rows[0]?.id;
      if (!attributeId || !attribute.options) continue;
      for (let index = 0; index < attribute.options.length; index += 1) {
        const label = attribute.options[index];
        const value = attribute.code === 'color' ? this.slug(label) : label;
        const existing = await client.query<{ id: number }>('SELECT id FROM category_attribute_options WHERE category_attribute_id=$1 AND value=$2 LIMIT 1', [attributeId, value]);
        if (existing.rows[0]?.id) await client.query('UPDATE category_attribute_options SET label=$1, sort_order=$2, updated_at=NOW() WHERE id=$3', [label, index + 1, existing.rows[0].id]);
        else await client.query('INSERT INTO category_attribute_options (category_attribute_id, value, label, sort_order, created_at, updated_at) VALUES ($1,$2,$3,$4,NOW(),NOW())', [attributeId, value, label, index + 1]);
      }
    }
  }

  private async seedBrands(client: PoolClient): Promise<void> {
    for (const brand of SEED_BRANDS) {
      const result = await client.query<{ id: number }>(`
        INSERT INTO brands (name, slug, logo_url, description, country, website, status, is_active, sort_order, seo_title, seo_description, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,'active',true,$7,$8,$9,NOW(),NOW())
        ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, logo_url=EXCLUDED.logo_url, description=EXCLUDED.description, country=EXCLUDED.country, website=EXCLUDED.website, status='active', is_active=true, sort_order=EXCLUDED.sort_order, seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description, updated_at=NOW()
        RETURNING id
      `, [brand.name, brand.slug, brand.logoUrl, brand.description, brand.country, brand.website, brand.sortOrder, brand.seoTitle, brand.seoDescription]);
      const brandId = result.rows[0]?.id;
      if (!brandId) continue;
      for (const translation of brand.translations) {
        await client.query(`
          INSERT INTO brand_translations (brand_id, locale, name, description, created_at, updated_at)
          VALUES ($1,$2,$3,$4,NOW(),NOW()) ON CONFLICT (brand_id,locale) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, updated_at=NOW()
        `, [brandId, translation.locale, translation.name, translation.description]);
      }
      await client.query('UPDATE products SET brand_id=$1 WHERE LOWER(brand)=LOWER($2)', [brandId, brand.name]);
    }
  }

  private async seedProducts(client: PoolClient, categoryIds: Map<string, number>): Promise<void> {
    const brandIds = new Map<string, number>();
    for (const brand of SEED_BRANDS) {
      const id = await this.lookupId(client, 'brands', brand.slug);
      if (id) brandIds.set(brand.name.toLowerCase(), id);
    }
    for (const product of SEED_PRODUCTS) {
      const categoryId = categoryIds.get(product.legacyCategorySlug) ?? await this.lookupId(client, 'categories', product.legacyCategorySlug);
      if (!categoryId) continue;
      const brandId = brandIds.get(product.brand.toLowerCase()) ?? null;
      const result = await client.query<{ id: number }>(`
        INSERT INTO products (category_id, brand_id, name, brand, slug, sku, description, selling_price, cost_price, status, price, discount_price, stock_quantity, low_stock_threshold, rating, reviews_count, image_url, gallery_urls, is_active, is_featured, is_new_arrival, is_best_seller, is_flash_sale, product_type, currency, specifications, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,'active',$8,$9,$10,$11,$12,$13,$14,$15,true,$16,$17,$18,$19,'simple','USD',$20,NOW(),NOW())
        ON CONFLICT (sku) DO UPDATE SET category_id=EXCLUDED.category_id, brand_id=EXCLUDED.brand_id, name=EXCLUDED.name, brand=EXCLUDED.brand, slug=EXCLUDED.slug, description=EXCLUDED.description, selling_price=EXCLUDED.selling_price, status='active', price=EXCLUDED.price, discount_price=EXCLUDED.discount_price, stock_quantity=EXCLUDED.stock_quantity, low_stock_threshold=EXCLUDED.low_stock_threshold, rating=EXCLUDED.rating, reviews_count=EXCLUDED.reviews_count, image_url=EXCLUDED.image_url, gallery_urls=EXCLUDED.gallery_urls, is_active=true, is_featured=EXCLUDED.is_featured, is_new_arrival=EXCLUDED.is_new_arrival, is_best_seller=EXCLUDED.is_best_seller, is_flash_sale=EXCLUDED.is_flash_sale, product_type='simple', currency='USD', specifications=EXCLUDED.specifications, updated_at=NOW()
        RETURNING id
      `, [categoryId, brandId, product.name, product.brand, product.slug, product.sku, product.description, product.price, product.discountPrice ?? null, product.stockQuantity, product.lowStockThreshold, product.rating, product.reviewsCount, product.imageUrl, JSON.stringify(product.galleryUrls), product.isFeatured, product.isNewArrival, product.isBestSeller, product.isFlashSale, JSON.stringify(product.specifications)]);
      const productId = result.rows[0]?.id;
      if (!productId) continue;
      await client.query('INSERT INTO product_categories (product_id, category_id, is_primary, created_at, updated_at) VALUES ($1,$2,true,NOW(),NOW()) ON CONFLICT (product_id,category_id) DO UPDATE SET is_primary=true, updated_at=NOW()', [productId, categoryId]);
      const inventory = await client.query<{ id: number }>('SELECT id FROM inventories WHERE product_id=$1 AND variant_id IS NULL LIMIT 1', [productId]);
      if (inventory.rows[0]?.id) await client.query('UPDATE inventories SET quantity_on_hand=$1, updated_at=NOW() WHERE id=$2', [product.stockQuantity, inventory.rows[0].id]);
      else await client.query('INSERT INTO inventories (product_id, quantity_on_hand, quantity_reserved, created_at, updated_at) VALUES ($1,$2,0,NOW(),NOW())', [productId, product.stockQuantity]);
    }
  }

  private async seedProductGalleries(client: PoolClient): Promise<void> {
    for (const product of SEED_PRODUCTS) {
      await client.query('UPDATE products SET gallery_urls=$1, image_url=$2, status=\'active\', is_active=true, updated_at=NOW() WHERE slug=$3', [JSON.stringify(product.galleryUrls), product.galleryUrls[0], product.slug]);
    }
    await client.query(`UPDATE products SET gallery_urls=CASE WHEN gallery_urls IS NULL OR json_array_length(gallery_urls)=0 THEN json_build_array(image_url) ELSE gallery_urls END, status='active', is_active=true, updated_at=NOW() WHERE image_url IS NOT NULL AND (gallery_urls IS NULL OR json_array_length(gallery_urls)=0)`);
  }

  private async seedBanners(client: PoolClient): Promise<void> {
    for (const banner of SEED_BANNERS) {
      const existing = await client.query<{ id: number }>('SELECT id FROM banners WHERE title=$1 AND placement=$2 LIMIT 1', [banner.title, banner.placement]);
      if (existing.rows[0]?.id) continue;
      await client.query(`
        INSERT INTO banners (title, subtitle, badge_text, image_url, video_url, link_url, button_text, background_style, placement, sort_order, is_active, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,NOW(),NOW())
      `, [banner.title, banner.subtitle, banner.badgeText, banner.imageUrl, banner.videoUrl ?? null, banner.linkUrl, banner.buttonText, banner.backgroundStyle, banner.placement, banner.sortOrder]);
    }
  }

  private async seedMasterAdmin(client: PoolClient, roleIds: Map<string, number>): Promise<void> {
    const email = this.config.get<string>('MASTER_ADMIN_EMAIL', '').trim().toLowerCase();
    const password = this.config.get<string>('MASTER_ADMIN_PASSWORD', '');
    if (!email || !password) return;
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await client.query<{ id: number }>(`
      INSERT INTO users (name, email, password, status, email_verified_at, created_at, updated_at)
      VALUES ($1,$2,$3,'active',NOW(),NOW(),NOW())
      ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, password=EXCLUDED.password, status='active', email_verified_at=NOW(), updated_at=NOW()
      RETURNING id
    `, [this.config.get<string>('MASTER_ADMIN_NAME', 'Platform Administrator'), email, passwordHash]);
    const userId = result.rows[0]?.id;
    if (!userId) return;
    for (const slug of ['super_admin', 'admin']) {
      const roleId = roleIds.get(slug);
      if (roleId) await client.query('INSERT INTO role_user (user_id, role_id, created_at, updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT (user_id,role_id) DO NOTHING', [userId, roleId]);
    }
  }

  private async seedDemoData(client: PoolClient): Promise<void> {
    if (this.config.get<string>('SEED_DEMO_DATA', 'false') !== 'true') return;
    const adminEmail = this.config.get<string>('DEMO_ADMIN_EMAIL', '').trim().toLowerCase();
    const adminPassword = this.config.get<string>('DEMO_ADMIN_PASSWORD', '');
    const customerEmail = this.config.get<string>('DEMO_CUSTOMER_EMAIL', '').trim().toLowerCase();
    const customerPassword = this.config.get<string>('DEMO_CUSTOMER_PASSWORD', '');
    if (!adminEmail || !adminPassword || !customerEmail || !customerPassword) throw new Error('SEED_DEMO_DATA=true requires DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_CUSTOMER_EMAIL, and DEMO_CUSTOMER_PASSWORD.');
    await this.seedDemoUser(client, adminEmail, adminPassword, 'MegaCommerce Store Manager', '+85512999001', 'admin');
    const customerId = await this.seedDemoUser(client, customerEmail, customerPassword, 'Sopheap Seng', '+85512888002', 'customer');
    if (customerId) await this.seedDemoOrders(client, customerId);
  }

  private async seedDemoUser(client: PoolClient, email: string, password: string, name: string, phone: string, roleSlug: string): Promise<number | null> {
    const result = await client.query<{ id: number }>(`
      INSERT INTO users (name,email,password,status,phone_number,email_verified_at,loyalty_points,created_at,updated_at)
      VALUES ($1,$2,$3,'active',$4,NOW(),0,NOW(),NOW()) ON CONFLICT (email) DO NOTHING RETURNING id
    `, [name, email, await bcrypt.hash(password, 12), phone]);
    const userId = result.rows[0]?.id ?? (await client.query<{ id: number }>('SELECT id FROM users WHERE email=$1 LIMIT 1', [email])).rows[0]?.id;
    const roleId = (await client.query<{ id: number }>('SELECT id FROM roles WHERE slug=$1 LIMIT 1', [roleSlug])).rows[0]?.id;
    if (userId && roleId) await client.query('INSERT INTO role_user (user_id,role_id,created_at,updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT (user_id,role_id) DO NOTHING', [userId, roleId]);
    return userId ?? null;
  }

  private async seedDemoOrders(client: PoolClient, customerId: number): Promise<void> {
    const orderValues = [customerId, 'shipped', 349, 34.9, 0, 0, 314.1, 'Dara Sok', 'dara.sok@tyushop.blog', '+855 12 888 999', 'BKK1, Street 310, Chamkarmon, Phnom Penh, Cambodia', 11.5564, 104.9282, 11.551, 104.9315, 'Sokha Chan (TYUSHOP Express GPS Courier)', '+855 12 889 900', 'Honda PCX Electric • PP 1AB-9988', '12 mins', 'Call recipient upon arrival at ground lobby.'];
    const order = await client.query<{ id: number }>(`
      INSERT INTO orders (order_number,user_id,status,subtotal,discount,shipping_fee,tax,total_amount,currency,payment_status,payment_method,customer_name,customer_email,customer_phone,delivery_address,dest_lat,dest_lng,current_lat,current_lng,driver_name,driver_phone,driver_vehicle,estimated_arrival,notes,created_at,updated_at)
      VALUES ('ORD-20261108-8948',$1,$2,$3,$4,$5,$6,$7,'USD','paid','bakong_khqr',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),NOW())
      ON CONFLICT (order_number) DO UPDATE SET user_id=EXCLUDED.user_id,status=EXCLUDED.status,subtotal=EXCLUDED.subtotal,discount=EXCLUDED.discount,total_amount=EXCLUDED.total_amount,payment_status='paid',payment_method=EXCLUDED.payment_method,customer_name=EXCLUDED.customer_name,customer_email=EXCLUDED.customer_email,customer_phone=EXCLUDED.customer_phone,delivery_address=EXCLUDED.delivery_address,dest_lat=EXCLUDED.dest_lat,dest_lng=EXCLUDED.dest_lng,current_lat=EXCLUDED.current_lat,current_lng=EXCLUDED.current_lng,driver_name=EXCLUDED.driver_name,driver_phone=EXCLUDED.driver_phone,driver_vehicle=EXCLUDED.driver_vehicle,estimated_arrival=EXCLUDED.estimated_arrival,notes=EXCLUDED.notes,updated_at=NOW()
      RETURNING id
    `, orderValues);
    const orderId = order.rows[0]?.id;
    if (!orderId) return;
    const product = await client.query<{ id: number; name: string; sku: string }>('SELECT id,name,sku FROM products WHERE sku=$1 LIMIT 1', ['LAP-MBP-016']);
    if (product.rows[0]) {
      await client.query(`
        INSERT INTO order_items (order_id,product_id,product_name,product_sku,quantity,unit_price,total_price,created_at,updated_at)
        SELECT $1,$2,$3,$4,1,3299,3299,NOW(),NOW()
        WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE order_id=$1 AND product_id=$2)
      `, [orderId, product.rows[0].id, product.rows[0].name, product.rows[0].sku]);
    }
    await client.query(`
      INSERT INTO payments (order_id,transaction_reference,payment_method,amount,currency,status,khqr_string,khqr_md5,verified_at,created_at,updated_at)
      VALUES ($1,'TXN-BKG-904128','bakong_khqr',3299,'USD','completed',$2,'e8a2b5c7d8e9f0123456789abcdef012',NOW()-INTERVAL '1 day',NOW(),NOW())
      ON CONFLICT (transaction_reference) DO UPDATE SET order_id=EXCLUDED.order_id,status='completed',amount=EXCLUDED.amount,verified_at=EXCLUDED.verified_at,updated_at=NOW()
    `, [orderId, '00020101021229380016A0000007270228010108551299900052045999530384054073299.005802KH5911MEGACOMMERCE6010PHNOM PENH62210117ORD-2026-9041286304E8A2']);

    await client.query(`
      INSERT INTO orders (order_number,user_id,status,subtotal,discount,shipping_fee,tax,total_amount,currency,payment_status,payment_method,customer_name,customer_email,customer_phone,delivery_address,dest_lat,dest_lng,current_lat,current_lng,driver_name,driver_phone,driver_vehicle,estimated_arrival,notes,created_at,updated_at)
      VALUES ('ORD-2026-9041',$1,$2,$3,$4,$5,$6,$7,'USD','paid','bakong_khqr',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),NOW())
      ON CONFLICT (order_number) DO NOTHING
    `, orderValues);
  }

  private async insertSetting(client: PoolClient, key: string, value: string): Promise<void> {
    await client.query(`INSERT INTO store_settings (store_id, setting_key, setting_value, created_at, updated_at) VALUES ('primary',$1,$2,NOW(),NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value, updated_at=NOW()`, [key, value]);
  }

  private async hasSeederRun(client: PoolClient, seeder: string): Promise<boolean> {
    const result = await client.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM seeder_runs WHERE seeder=$1) AS exists', [seeder]);
    return result.rows[0]?.exists === true;
  }

  private async recordSeederRun(client: PoolClient, seeder: string): Promise<void> {
    await client.query('INSERT INTO seeder_runs (seeder, ran_at) VALUES ($1,NOW()) ON CONFLICT (seeder) DO UPDATE SET ran_at=EXCLUDED.ran_at', [seeder]);
  }

  private async lookupId(client: PoolClient, table: 'categories' | 'brands', slug: string): Promise<number | null> {
    const result = await client.query<{ id: number }>(`SELECT id FROM ${table} WHERE slug=$1 LIMIT 1`, [slug]);
    return result.rows[0]?.id ?? null;
  }

  private async tableCounts(client: PoolClient): Promise<SeedCounts> {
    const names: Array<keyof SeedCounts> = ['roles', 'permissions', 'categories', 'brands', 'products', 'banners', 'store_settings', 'seeder_runs'];
    const counts = {} as SeedCounts;
    for (const name of names) {
      const result = await client.query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM ${name}`);
      counts[name] = Number(result.rows[0]?.count ?? 0);
    }
    return counts;
  }

  private brandForSku(sku: string): string {
    return SEED_PRODUCTS.find((product) => product.sku === sku)?.brand ?? '';
  }

  private slug(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
}
