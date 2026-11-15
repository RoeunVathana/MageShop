import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PoolClient } from 'pg';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdminMaintenanceService {
  private readonly preservedRoles = ['SUPER_ADMIN', 'ADMIN'];

  constructor(private readonly database: DatabaseService, private readonly auth: AuthService, private readonly config: ConfigService) {}

  async seedAll(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, this.preservedRoles)) {
      throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Super administrator privileges required.' });
    }
    if (this.config.get<string>('ALLOW_REMOTE_SEEDING', 'false') !== 'true') {
      throw new ForbiddenException({ status: 'error', message: 'Remote seeding is disabled. Enable ALLOW_REMOTE_SEEDING only for a controlled maintenance window.' });
    }

    const started = Date.now();
    const resetHistory = body.reset_history === true || String(body.reset_history ?? '').toLowerCase() === 'true';
    const summary = await this.database.transaction(async (client) => {
      if (resetHistory && await this.hasTable(client, 'seeder_runs')) await client.query('TRUNCATE TABLE "seeder_runs"');
      for (const table of ['products', 'categories', 'brands']) {
        if (!await this.hasTable(client, table)) continue;
        if (table === 'products') await client.query(`UPDATE "${table}" SET status='active', is_active=true`);
        else await client.query(`UPDATE "${table}" SET is_active=true`);
      }
      const counts: Record<string, number> = {};
      for (const table of ['users', 'products', 'categories', 'brands', 'banners', 'coupons', 'roles', 'permissions', 'store_settings']) {
        counts[table] = await this.countTable(client, table);
      }
      return counts;
    });

    return {
      status: 'success',
      message: 'NestJS database seed maintenance completed without Laravel.',
      duration_seconds: Math.round((Date.now() - started) / 10) / 100,
      summary_counts: summary,
    };
  }

  async clearApplicationData(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, this.preservedRoles)) {
      throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Super administrator privileges required.' });
    }
    if (body.confirmation !== 'CLEAR_ALL_APPLICATION_DATA') {
      throw new UnprocessableEntityException({ status: 'error', message: 'Explicit confirmation is required before application data can be cleared.' });
    }

    const adminIds = await this.adminUserIds(userId);
    const deleted = await this.database.transaction(async (client) => {
      const counts: Record<string, number> = {};
      const deleteTable = async (table: string): Promise<void> => {
        if (!await this.hasTable(client, table)) return;
        const result = await client.query(`DELETE FROM ${this.identifier(table)}`);
        if (result.rowCount && result.rowCount > 0) counts[table] = result.rowCount;
      };

      for (const table of [
        'variant_attribute_values', 'product_attribute_values', 'category_attribute_options',
        'product_categories', 'inventories', 'inventory_movements', 'product_variants',
        'receipts', 'payments', 'order_items', 'loyalty_transactions', 'wishlists',
        'support_tickets', 'telegram_ai_messages', 'telegram_chat_sessions',
        'telegram_admin_actions', 'telegram_notifications', 'telegram_accounts',
        'social_accounts', 'seller_applications', 'password_reset_otps',
        'password_reset_tokens', 'seeder_runs', 'banners', 'brand_translations',
        'brands', 'coupons', 'category_attributes',
      ]) await deleteTable(table);

      if (await this.hasTable(client, 'merchant_payment_accounts')) {
        const result = await client.query(`
          DELETE FROM merchant_payment_accounts
          WHERE seller_application_id IS NOT NULL
             OR (user_id IS NOT NULL AND NOT (user_id = ANY($1::int[])))
        `, [adminIds]);
        if (result.rowCount && result.rowCount > 0) counts.merchant_payment_accounts = result.rowCount;
      }

      for (const table of ['products', 'categories', 'orders']) await deleteTable(table);

      if (await this.hasTable(client, 'personal_access_tokens')) {
        const result = await client.query(`
          DELETE FROM personal_access_tokens
          WHERE tokenable_type = 'App\\Models\\User'
            AND tokenable_id <> ALL($1::int[])
        `, [adminIds]);
        if (result.rowCount && result.rowCount > 0) counts.personal_access_tokens = result.rowCount;
      }

      if (await this.hasTable(client, 'sessions')) {
        const result = await client.query(`
          DELETE FROM sessions
          WHERE user_id IS NULL OR user_id <> ALL($1::int[])
        `, [adminIds]);
        if (result.rowCount && result.rowCount > 0) counts.sessions = result.rowCount;
      }

      if (await this.hasTable(client, 'users')) {
        const result = await client.query('DELETE FROM users WHERE id <> ALL($1::int[])', [adminIds]);
        if (result.rowCount && result.rowCount > 0) counts.users = result.rowCount;
      }

      for (const table of ['cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs']) await deleteTable(table);
      return counts;
    });

    return {
      status: 'success',
      message: 'Application data cleared. Tables, admin accounts, roles, permissions, store settings, and global Bakong configuration were preserved.',
      deleted,
      preserved_admin_user_ids: adminIds,
    };
  }

  private async adminUserIds(currentUserId: number): Promise<number[]> {
    const result = await this.database.query<{ user_id: number | string }>(`
      SELECT DISTINCT ru.user_id
      FROM role_user ru
      INNER JOIN roles r ON r.id = ru.role_id
      WHERE UPPER(r.name) = ANY($1::text[])
    `, [this.preservedRoles]);
    return [...new Set([currentUserId, ...result.rows.map((row) => Number(row.user_id)).filter(Number.isInteger)])];
  }

  private async hasTable(client: PoolClient, table: string): Promise<boolean> {
    const result = await client.query<{ exists: boolean }>('SELECT to_regclass($1) IS NOT NULL AS exists', [`public.${table}`]);
    return result.rows[0]?.exists === true;
  }

  private async countTable(client: PoolClient, table: string): Promise<number> {
    if (!await this.hasTable(client, table)) return 0;
    const result = await client.query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM ${this.identifier(table)}`);
    return Number(result.rows[0]?.count ?? 0);
  }

  private identifier(table: string): string {
    if (!/^[a-z_][a-z0-9_]*$/.test(table)) throw new Error('Invalid maintenance table identifier.');
    return `"${table}"`;
  }
}
