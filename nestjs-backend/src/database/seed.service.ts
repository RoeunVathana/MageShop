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
  users: number;
  roles: number;
  permissions: number;
  categories: number;
  brands: number;
  products: number;
  inventories: number;
  inventory_movements: number;
  orders: number;
  order_items: number;
  payments: number;
  coupons: number;
  seller_applications: number;
  merchant_payment_accounts: number;
  support_tickets: number;
  wishlists: number;
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
    let hadCommerceSeedHistory = false;
    const counts = await this.database.transaction(async (client) => {
      if (force) await client.query('TRUNCATE TABLE seeder_runs');
      hadCommerceSeedHistory = await this.hasSeederRun(client, SEEDER_NAMES.commerce);

      const roleIds = await this.seedRolesAndPermissions(client);
      await this.seedEnvironmentSettings(client);
      await this.seedBrands(client);

      // These seeders are idempotent. Run them on every maintenance/CLI seed
      // so a previous data cleanup or a partial deployment can repopulate the
      // catalog without requiring a destructive reset of protected tables.
      await this.seedCommerce(client);
      await this.recordSeederRun(client, SEEDER_NAMES.commerce);

      await this.seedUniversalCategories(client);
      await this.recordSeederRun(client, SEEDER_NAMES.universal);

      await this.seedBanners(client);
      await this.recordSeederRun(client, SEEDER_NAMES.banner);

      await this.seedProductGalleries(client);
      await this.seedMasterAdmin(client, roleIds);
      await this.seedDemoData(client);

      return this.tableCounts(client);
    });

    return {
      status: 'success',
      message: 'NestJS seed completed from the Laravel seed definitions. Existing application data was preserved.',
      forced: force,
      duration_seconds: Math.round((Date.now() - started) / 10) / 100,
      summary_counts: counts,
      demo_data: this.enabled('SEED_DEMO_DATA'),
      test_fixtures: this.enabled('SEED_TEST_DATA') || this.enabled('SEED_DEMO_DATA'),
      repaired_existing_catalog: hadCommerceSeedHistory,
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
    if (!this.enabled('SEED_DEMO_DATA') && !this.enabled('SEED_TEST_DATA')) return;

    let customerId: number | null = null;
    if (this.enabled('SEED_DEMO_DATA')) {
      const adminEmail = this.config.get<string>('DEMO_ADMIN_EMAIL', '').trim().toLowerCase();
      const adminPassword = this.config.get<string>('DEMO_ADMIN_PASSWORD', '');
      const customerEmail = this.config.get<string>('DEMO_CUSTOMER_EMAIL', '').trim().toLowerCase();
      const customerPassword = this.config.get<string>('DEMO_CUSTOMER_PASSWORD', '');
      if (!adminEmail || !adminPassword || !customerEmail || !customerPassword) {
        throw new Error('SEED_DEMO_DATA=true requires DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_CUSTOMER_EMAIL, and DEMO_CUSTOMER_PASSWORD.');
      }
      await this.seedDemoUser(client, adminEmail, adminPassword, 'MegaCommerce Store Manager', '+85512999001', 'admin');
      customerId = await this.seedDemoUser(client, customerEmail, customerPassword, 'Sopheap Seng', '+85512888002', 'customer');
    } else {
      const existing = await client.query<{ id: number }>(`
        SELECT u.id
        FROM users u
        LEFT JOIN role_user ru ON ru.user_id = u.id
        LEFT JOIN roles r ON r.id = ru.role_id
        WHERE u.status = 'active'
        ORDER BY CASE WHEN r.slug = 'customer' THEN 0 ELSE 1 END, u.id
        LIMIT 1
      `);
      customerId = existing.rows[0]?.id ?? null;
    }

    if (customerId) {
      await this.seedTestFixtures(client, customerId);
      if (this.enabled('SEED_DEMO_DATA')) await this.seedDemoOrders(client, customerId);
    }
  }

  /**
   * Populate the records used by storefront, seller, delivery, support,
   * inventory, payments, and dashboard screens. All records use stable seed
   * keys and are safe to refresh; normal application data is never truncated.
   */
  private async seedTestFixtures(client: PoolClient, userId: number): Promise<void> {
    const product = (await client.query<{ id: number; name: string; sku: string; price: number | string; discount_price: number | string | null }>(`
      SELECT id, name, sku, COALESCE(selling_price, price) AS price, discount_price
      FROM products WHERE is_active = TRUE ORDER BY id LIMIT 1
    `)).rows[0];
    if (!product) return;

    const user = (await client.query<{ email: string; name: string }>('SELECT email, name FROM users WHERE id=$1 LIMIT 1', [userId])).rows[0];
    if (!user) return;

    await this.seedFixtureSettings(client);
    await this.seedFixtureCoupons(client);
    await this.seedFixtureGlobalMerchantAccount(client);

    const fixtureRoles = await client.query<{ id: number }>(`SELECT id FROM roles WHERE slug = ANY($1::text[])`, [['seller', 'delivery_driver', 'customer']]);
    for (const role of fixtureRoles.rows) {
      await client.query('INSERT INTO role_user (user_id, role_id, created_at, updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT (user_id,role_id) DO NOTHING', [userId, role.id]);
    }

    const sellerApplication = await client.query<{ id: number }>(`
      INSERT INTO seller_applications (user_id, store_name, slug, category, description, phone, telegram_username, city, address, bank_name, bakong_account_id, status, approved_at, created_at, updated_at)
      VALUES ($1,'TYUSHOP Demo Store','tyushop-demo-store','Electronics','Seeded seller account for dashboard and checkout testing.','+855 12 888 002','@tyushop_demo','Phnom Penh','#182 Norodom Boulevard, Phnom Penh','Bakong',$2,'approved',NOW(),NOW(),NOW())
      ON CONFLICT (slug) DO UPDATE SET user_id=EXCLUDED.user_id, store_name=EXCLUDED.store_name, description=EXCLUDED.description, phone=EXCLUDED.phone, bakong_account_id=EXCLUDED.bakong_account_id, status='approved', approved_at=COALESCE(seller_applications.approved_at, NOW()), updated_at=NOW()
      RETURNING id
    `, [userId, this.config.get<string>('BAKONG_ACCOUNT_ID', 'roeun_vathana1@bkrt')]);
    const sellerApplicationId = sellerApplication.rows[0]?.id ?? null;

    // Give the fixture account one seller-owned product so seller dashboard,
    // payout account selection, and multi-vendor checkout can be tested.
    await client.query('UPDATE products SET seller_id=$1, updated_at=NOW() WHERE id=$2 AND (seller_id IS NULL OR seller_id=$1)', [userId, product.id]);
    if (sellerApplicationId) await this.seedFixtureMerchantAccount(client, userId, sellerApplicationId);

    await client.query(`
      INSERT INTO inventory_movements (product_id,user_id,quantity_change,type,before_quantity,after_quantity,reason,reference_id,movement_type,created_by,reference,idempotency_key,created_at,updated_at)
      VALUES ($1,$2,10,'restock',30,40,'Seeded receiving movement','SEED-PO-001','restock',$2,'SEED-PO-001','seed-inventory-movement-001',NOW(),NOW())
      ON CONFLICT (idempotency_key) DO NOTHING
    `, [product.id, userId]);

    const paidOrderId = await this.seedFixtureOrder(client, userId, product, 'ORD-SEED-PAID-001', 'shipped', 'paid', 'bakong_khqr', 19.00, '12 mins', 'Seeded paid order for admin, seller, receipt, and delivery testing.');
    await this.seedFixtureOrder(client, userId, product, 'ORD-SEED-PENDING-001', 'pending', 'pending_qr', 'bakong_khqr', 22.00, '30 mins', 'Seeded pending KHQR order for payment verification testing.');
    await this.seedFixtureOrder(client, userId, product, 'ORD-SEED-COD-001', 'confirmed', 'cash_on_delivery', 'cash_on_delivery', 24.99, '45 mins', 'Seeded cash-on-delivery order for courier handover testing.');

    await client.query('INSERT INTO wishlists (user_id, product_id, created_at, updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT (user_id,product_id) DO NOTHING', [userId, product.id]);
    if (paidOrderId) {
      await client.query(`
        INSERT INTO loyalty_transactions (user_id, order_id, type, points, description, created_at, updated_at)
        SELECT $1,$2,'earned',5,'Seeded loyalty reward transaction',NOW(),NOW()
        WHERE NOT EXISTS (SELECT 1 FROM loyalty_transactions WHERE order_id=$2 AND type='earned')
      `, [userId, paidOrderId]);
    }

    await client.query(`
      INSERT INTO support_tickets (ticket_number,user_id,name,email,subject,category,order_number,message,status,admin_reply,created_at,updated_at)
      VALUES ('TKT-SEED-001',$1,$2,$3,'Where is my seeded order?','order','ORD-SEED-PAID-001','Seeded support ticket for customer-support dashboard testing.','open',NULL,NOW(),NOW())
      ON CONFLICT (ticket_number) DO UPDATE SET user_id=EXCLUDED.user_id, name=EXCLUDED.name, email=EXCLUDED.email, order_number=EXCLUDED.order_number, status='open', updated_at=NOW()
    `, [userId, user.name, user.email]);

    await this.seedFixtureTelegram(client, userId);
    await client.query('UPDATE users SET loyalty_points=GREATEST(COALESCE(loyalty_points,0),105), updated_at=NOW() WHERE id=$1', [userId]);
  }

  private async seedFixtureSettings(client: PoolClient): Promise<void> {
    const accountId = this.config.get<string>('BAKONG_ACCOUNT_ID', 'roeun_vathana1@bkrt').trim();
    const merchantName = this.config.get<string>('BAKONG_MERCHANT_NAME', 'Tyushop').trim();
    const merchantCity = this.config.get<string>('BAKONG_MERCHANT_CITY', 'Phnom Penh').trim();
    const apiUrl = this.config.get<string>('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh').replace(/\\/g, '').trim();
    const values: Array<[string, string]> = [
      ['bakong_api_enabled', 'true'],
      ['bakong_account_id', accountId],
      ['bakong_merchant_name', merchantName],
      ['bakong_merchant_city', merchantCity],
      ['company_city', merchantCity],
      ['bakong_api_url', apiUrl],
      ['payment_qr_expires_minutes', this.config.get<string>('PAYMENT_QR_EXPIRES_MINUTES', '10')],
      ['usd_to_khr_rate', '4100'],
      ['delivery_is_free', 'true'],
      ['delivery_free_threshold', '0'],
      ['delivery_default_fee', '1.50'],
      ['delivery_methods', JSON.stringify([
        { id: 'standard-express', name: 'Standard Express (Phnom Penh 1–2h)', price: 1.5, eta: '1–2 Hours', is_active: true, is_default: true },
        { id: 'nationwide-provincial', name: 'Nationwide Provincial Delivery', price: 2.5, eta: '24–48 Hours', is_active: true, is_default: false },
        { id: 'vip-same-day', name: 'VIP Instant Same-Day Delivery', price: 3.5, eta: '30–45 Mins', is_active: true, is_default: false },
      ])],
    ];
    for (const [key, value] of values) await this.insertSetting(client, key, value);
  }

  private async seedFixtureCoupons(client: PoolClient): Promise<void> {
    const coupons = [
      ['WELCOME10', '10% OFF welcome coupon', 'percentage', 10, 10, 100],
      ['MEGA20', '20% OFF orders above $50', 'percentage', 20, 50, 150],
      ['KHQR5', '$5 OFF Bakong checkout', 'fixed', 5, 15, 5],
      ['VIP30', '30% VIP discount', 'percentage', 30, 100, 250],
    ] as const;
    for (const [code, description, type, value, minimum, maximum] of coupons) {
      await client.query(`
        INSERT INTO coupons (code,description,discount_type,discount_value,min_order_amount,max_discount_amount,is_active,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,true,NOW(),NOW())
        ON CONFLICT (code) DO UPDATE SET description=EXCLUDED.description, discount_type=EXCLUDED.discount_type, discount_value=EXCLUDED.discount_value, min_order_amount=EXCLUDED.min_order_amount, max_discount_amount=EXCLUDED.max_discount_amount, is_active=true, updated_at=NOW()
      `, [code, description, type, value, minimum, maximum]);
    }
  }

  private async seedFixtureMerchantAccount(client: PoolClient, userId: number, sellerApplicationId: number): Promise<void> {
    const accountId = this.config.get<string>('BAKONG_ACCOUNT_ID', 'roeun_vathana1@bkrt').trim();
    const existing = await client.query<{ id: number }>('SELECT id FROM merchant_payment_accounts WHERE user_id=$1 AND seller_application_id=$2 LIMIT 1', [userId, sellerApplicationId]);
    if (existing.rows[0]?.id) {
      await client.query('UPDATE merchant_payment_accounts SET account_id=$1, merchant_name=$2, merchant_city=$3, currency=\'USD\', is_active=true, is_default=true, updated_at=NOW() WHERE id=$4', [accountId, this.config.get<string>('BAKONG_MERCHANT_NAME', 'Tyushop'), this.config.get<string>('BAKONG_MERCHANT_CITY', 'Phnom Penh'), existing.rows[0].id]);
      return;
    }
    await client.query(`
      INSERT INTO merchant_payment_accounts (user_id,seller_application_id,account_type,bank_name,account_id,merchant_name,merchant_city,currency,is_default,is_active,verified_at,created_at,updated_at)
      VALUES ($1,$2,'bakong','Bakong',$3,$4,$5,'USD',true,true,NOW(),NOW(),NOW())
    `, [userId, sellerApplicationId, accountId, this.config.get<string>('BAKONG_MERCHANT_NAME', 'Tyushop'), this.config.get<string>('BAKONG_MERCHANT_CITY', 'Phnom Penh')]);
  }

  private async seedFixtureGlobalMerchantAccount(client: PoolClient): Promise<void> {
    const accountId = this.config.get<string>('BAKONG_ACCOUNT_ID', 'roeun_vathana1@bkrt').trim();
    const existing = await client.query<{ id: number }>('SELECT id FROM merchant_payment_accounts WHERE user_id IS NULL AND seller_application_id IS NULL ORDER BY is_default DESC, id DESC LIMIT 1');
    const values = [accountId, this.config.get<string>('BAKONG_MERCHANT_NAME', 'Tyushop'), this.config.get<string>('BAKONG_MERCHANT_CITY', 'Phnom Penh')];
    if (existing.rows[0]?.id) {
      await client.query('UPDATE merchant_payment_accounts SET account_id=$1, merchant_name=$2, merchant_city=$3, currency=\'USD\', is_active=true, is_default=true, updated_at=NOW() WHERE id=$4', [...values, existing.rows[0].id]);
      return;
    }
    await client.query(`
      INSERT INTO merchant_payment_accounts (user_id,seller_application_id,account_type,bank_name,account_id,merchant_name,merchant_city,currency,is_default,is_active,verified_at,created_at,updated_at)
      VALUES (NULL,NULL,'bakong','Bakong',$1,$2,$3,'USD',true,true,NOW(),NOW(),NOW())
    `, values);
  }

  private async seedFixtureOrder(client: PoolClient, userId: number, product: { id: number; name: string; sku: string; price: number | string; discount_price: number | string | null }, orderNumber: string, status: string, paymentStatus: string, paymentMethod: string, total: number, eta: string, notes: string): Promise<number | null> {
    const email = (await client.query<{ email: string }>('SELECT email FROM users WHERE id=$1 LIMIT 1', [userId])).rows[0]?.email ?? 'demo.customer@tyushop.blog';
    const order = await client.query<{ id: number }>(`
      INSERT INTO orders (order_number,user_id,driver_id,status,subtotal,discount,coupon_code,points_earned,points_redeemed,shipping_fee,tax,total_amount,currency,payment_status,payment_method,customer_name,customer_email,customer_phone,delivery_address,notes,dest_lat,dest_lng,current_lat,current_lng,driver_name,driver_phone,driver_vehicle,estimated_arrival,created_at,updated_at)
      VALUES ($1,$2,$2,$3,$4,0,NULL,5,0,0,0,$4,'USD',$5,$6,'Demo Customer',$7,'+855 12 888 002','BKK1, Street 310, Chamkarmon, Phnom Penh, Cambodia',$8,11.5564,104.9282,11.5510,104.9315,'Sokha Chan (TYUSHOP Express GPS Courier)','+855 12 889 900','Honda PCX Electric • PP 1AB-9988',$9,NOW(),NOW())
      ON CONFLICT (order_number) DO UPDATE SET user_id=EXCLUDED.user_id,driver_id=EXCLUDED.driver_id,status=EXCLUDED.status,subtotal=EXCLUDED.subtotal,total_amount=EXCLUDED.total_amount,payment_status=EXCLUDED.payment_status,payment_method=EXCLUDED.payment_method,customer_email=EXCLUDED.customer_email,notes=EXCLUDED.notes,estimated_arrival=EXCLUDED.estimated_arrival,updated_at=NOW()
      RETURNING id
    `, [orderNumber, userId, status, total, paymentStatus, paymentMethod, email, notes, eta]);
    const orderId = order.rows[0]?.id;
    if (!orderId) return null;

    await client.query('DELETE FROM receipts WHERE order_id=$1', [orderId]);
    await client.query('DELETE FROM payments WHERE order_id=$1', [orderId]);
    await client.query('DELETE FROM order_items WHERE order_id=$1', [orderId]);
    const unitPrice = Number(product.discount_price ?? product.price);
    await client.query('INSERT INTO order_items (order_id,product_id,product_name,product_sku,quantity,unit_price,total_price,created_at,updated_at) VALUES ($1,$2,$3,$4,1,$5,$5,NOW(),NOW())', [orderId, product.id, product.name, product.sku, unitPrice]);
    const transaction = `SEED-TXN-${orderNumber.replace(/[^A-Z0-9]/g, '')}`;
    const payment = await client.query<{ id: number }>(`
      INSERT INTO payments (order_id,transaction_reference,payment_method,amount,currency,status,khqr_string,khqr_md5,merchant_account,merchant_name,merchant_city,verified_at,created_at,updated_at)
      VALUES ($1,$2,$3,$4,'USD',$5,NULL,NULL,$6,$7,$8,$9,NOW(),NOW()) RETURNING id
    `, [orderId, transaction, paymentMethod, total, paymentStatus === 'paid' ? 'completed' : (paymentMethod === 'cash_on_delivery' ? 'pending_arrival' : 'pending_qr'), this.config.get<string>('BAKONG_ACCOUNT_ID', 'roeun_vathana1@bkrt'), this.config.get<string>('BAKONG_MERCHANT_NAME', 'Tyushop'), this.config.get<string>('BAKONG_MERCHANT_CITY', 'Phnom Penh'), paymentStatus === 'paid' ? new Date() : null]);
    const paymentId = payment.rows[0]?.id;
    if (paymentId) await client.query('INSERT INTO receipts (order_id,payment_id,receipt_number,email_status,issued_at,created_at,updated_at) VALUES ($1,$2,$3,\'sent\',NOW(),NOW(),NOW())', [orderId, paymentId, `REC-SEED-${orderNumber.replace(/[^A-Z0-9]/g, '')}`]);
    return orderId;
  }

  private async seedFixtureTelegram(client: PoolClient, userId: number): Promise<void> {
    const account = await client.query<{ id: number }>(`
      INSERT INTO telegram_accounts (user_id,telegram_user_id,telegram_username,first_name,last_name,language_code,is_bot_admin,linked_at,created_at,updated_at)
      VALUES ($1,990000001,'tyushop_demo','Demo','Customer','en',false,NOW(),NOW(),NOW())
      ON CONFLICT (telegram_user_id) DO UPDATE SET user_id=EXCLUDED.user_id,telegram_username=EXCLUDED.telegram_username,updated_at=NOW()
      RETURNING id
    `, [userId]);
    const accountId = account.rows[0]?.id;
    if (!accountId) return;
    const existingSession = await client.query<{ id: number }>(`SELECT id FROM telegram_chat_sessions WHERE telegram_account_id=$1 AND context_data->>'seeded'='true' LIMIT 1`, [accountId]);
    const sessionId = existingSession.rows[0]?.id ?? (await client.query<{ id: number }>(`INSERT INTO telegram_chat_sessions (telegram_account_id,session_type,context_data,created_at,updated_at) VALUES ($1,'customer',$2,NOW(),NOW()) RETURNING id`, [accountId, JSON.stringify({ seeded: true, route: '/products' })])).rows[0]?.id;
    if (sessionId) {
      await client.query('DELETE FROM telegram_ai_messages WHERE session_id=$1', [sessionId]);
      await client.query(`INSERT INTO telegram_ai_messages (session_id,sender,message,created_at,updated_at) VALUES ($1,'assistant','Welcome to the TYUSHOP demo support session.',NOW(),NOW())`, [sessionId]);
    }
    await client.query(`DELETE FROM telegram_notifications WHERE chat_id=990000001 AND notification_type='seed_demo'`);
    await client.query(`INSERT INTO telegram_notifications (user_id,chat_id,notification_type,delivery_status,payload,sent_at,created_at,updated_at) VALUES ($1,990000001,'seed_demo','sent',$2,NOW(),NOW(),NOW())`, [userId, JSON.stringify({ seeded: true })]);
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
    const names: Array<keyof SeedCounts> = ['users', 'roles', 'permissions', 'categories', 'brands', 'products', 'inventories', 'inventory_movements', 'orders', 'order_items', 'payments', 'coupons', 'seller_applications', 'merchant_payment_accounts', 'support_tickets', 'wishlists', 'banners', 'store_settings', 'seeder_runs'];
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

  private enabled(key: string): boolean {
    return ['true', '1', 'yes', 'on'].includes(this.config.get<string>(key, 'false').trim().toLowerCase());
  }
}
