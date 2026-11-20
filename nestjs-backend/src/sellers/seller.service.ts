import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit, UnprocessableEntityException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

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
  latitude?: number | string | null;
  longitude?: number | string | null;
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
export class SellerService implements OnModuleInit {
  private readonly logger = new Logger(SellerService.name);
  private readonly adminRoles = ['SUPER_ADMIN', 'ADMIN'];
  private readonly statuses = ['pending', 'approved', 'rejected', 'suspended'];
  private readonly sellerStaffPermissions = [
    'products.view', 'products.create', 'products.update', 'products.delete',
    'orders.view', 'orders.update', 'delivery.assign', 'delivery.update', 'delivery.location.manage', 'delivery.tracking.view',
  ];

  constructor(private readonly database: DatabaseService, private readonly auth: AuthService) {}

  async onModuleInit(): Promise<void> {
    // The NestJS deployment is the production runtime and does not execute the
    // legacy Laravel migration pipeline. Keep this additive and idempotent so
    // seller staff can be enabled on an existing database without a manual SQL step.
    try {
      await this.database.query(`
        CREATE TABLE IF NOT EXISTS seller_staff_memberships (
          id BIGSERIAL PRIMARY KEY,
          seller_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          staff_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMP NULL,
          updated_at TIMESTAMP NULL,
          CONSTRAINT seller_staff_memberships_unique_pair UNIQUE (seller_user_id, staff_user_id)
        )
      `);
      await this.database.query('ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7)');
      await this.database.query('ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7)');
      await this.database.query('CREATE INDEX IF NOT EXISTS seller_staff_memberships_seller_idx ON seller_staff_memberships (seller_user_id, status)');
      await this.database.query('CREATE INDEX IF NOT EXISTS seller_staff_memberships_staff_idx ON seller_staff_memberships (staff_user_id, status)');
    } catch (error) {
      this.logger.warn(`Seller staff schema bootstrap skipped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async sellerScopeId(userId: number): Promise<number | null> {
    const user = await this.auth.me(userId);
    if (this.auth.hasAnyRole(user, ['SELLER'])) return user.id;
    if (!this.auth.hasAnyRole(user, ['SELLER_STAFF'])) return null;

    const membership = await this.database.query<{ seller_user_id: number }>(`
      SELECT seller_user_id
      FROM seller_staff_memberships
      WHERE staff_user_id=$1 AND status='active'
      ORDER BY id
      LIMIT 1
    `, [userId]);
    if (!membership.rows[0]) throw new ForbiddenException({ status: 'error', message: 'Your seller staff membership is not active.' });
    return membership.rows[0].seller_user_id;
  }

  async staff(userId: number): Promise<Record<string, unknown>> {
    const sellerId = await this.sellerScopeId(userId);
    if (sellerId === null) throw new ForbiddenException({ status: 'error', message: 'Seller access is required.' });
    const result = await this.database.query<Record<string, unknown>>(`
      SELECT ssm.id, ssm.staff_user_id, ssm.status, ssm.permissions, ssm.created_at, ssm.updated_at,
             u.name, u.email, u.phone_number, u.status AS user_status,
             COALESCE(ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::varchar[]) AS roles
      FROM seller_staff_memberships ssm
      JOIN users u ON u.id=ssm.staff_user_id
      LEFT JOIN role_user ru ON ru.user_id=u.id
      LEFT JOIN roles r ON r.id=ru.role_id
      WHERE ssm.seller_user_id=$1
      GROUP BY ssm.id, u.id
      ORDER BY ssm.id DESC
    `, [sellerId]);
    return { status: 'ok', data: result.rows, seller_user_id: sellerId };
  }

  async createStaff(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const seller = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(seller, ['SELLER'])) throw new ForbiddenException({ status: 'error', message: 'Only the seller owner can add seller staff.' });
    const name = this.limitRequired(body.name, 'name', 255);
    const email = this.email(body.email);
    const password = this.limitRequired(body.password, 'password', 255);
    if (password.length < 8) throw new UnprocessableEntityException({ status: 'error', message: 'The password must be at least 8 characters.' });
    const phone = this.limitNullable(body.phone_number, 50, 'phone_number');
    const permissions = this.normalizeStaffPermissions(body.permissions);

    const created = await this.database.transaction(async (client) => {
      const existing = await client.query<{ id: number; password: string; status: string }>('SELECT id, password, status FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
      let staffId = existing.rows[0]?.id;
      if (staffId) {
        const existingMembership = await client.query<{ id: number }>('SELECT id FROM seller_staff_memberships WHERE seller_user_id=$1 AND staff_user_id=$2 LIMIT 1', [userId, staffId]);
        if (!existingMembership.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: 'This email already belongs to an account. Ask the user to use a new staff email or have an administrator assign the role.' });
        const existingRoles = await client.query<{ name: string; slug: string }>(`
          SELECT r.name, r.slug FROM roles r JOIN role_user ru ON ru.role_id=r.id WHERE ru.user_id=$1
        `, [staffId]);
        if (existingRoles.rows.some((role) => ['SUPER_ADMIN', 'ADMIN', 'SELLER'].includes(role.name.toUpperCase()) || ['super_admin', 'admin', 'seller'].includes(role.slug.toLowerCase()))) {
          throw new UnprocessableEntityException({ status: 'error', message: 'This account already has an owner or administrator role and cannot be added as seller staff.' });
        }
        await client.query(`UPDATE users SET name=$1, phone_number=COALESCE($2, phone_number), status='active', updated_at=NOW() WHERE id=$3`, [name, phone, staffId]);
      } else {
        const inserted = await client.query<{ id: number }>(`
          INSERT INTO users (name, email, phone_number, password, status, loyalty_points, email_verified_at, created_at, updated_at)
          VALUES ($1, LOWER($2), $3, $4, 'active', 0, NOW(), NOW(), NOW()) RETURNING id
        `, [name, email, phone, await bcrypt.hash(password, 12)]);
        staffId = inserted.rows[0]?.id;
      }
      if (!staffId) throw new Error('Seller staff account was not created.');
      await client.query("INSERT INTO roles (name, slug, description, created_at, updated_at) VALUES ('SELLER_STAFF','seller_staff','Staff member assisting an authorized marketplace vendor.',NOW(),NOW()) ON CONFLICT (slug) DO NOTHING");
      const role = await client.query<{ id: number }>("SELECT id FROM roles WHERE LOWER(slug)='seller_staff' OR UPPER(name)='SELLER_STAFF' ORDER BY id LIMIT 1");
      if (!role.rows[0]) throw new Error('SELLER_STAFF role is missing. Run the role seeder before adding staff.');
      await client.query('INSERT INTO role_user (user_id, role_id, created_at, updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT DO NOTHING', [staffId, role.rows[0].id]);
      const permissionRows = await client.query<{ id: number }>('SELECT id FROM permissions WHERE slug = ANY($1::text[])', [this.sellerStaffPermissions]);
      for (const permission of permissionRows.rows) await client.query('INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT DO NOTHING', [role.rows[0].id, permission.id]);
      const membership = await client.query<{ id: number }>(`
        INSERT INTO seller_staff_memberships (seller_user_id, staff_user_id, status, permissions, created_at, updated_at)
        VALUES ($1,$2,'active',$3::jsonb,NOW(),NOW())
        ON CONFLICT (seller_user_id, staff_user_id)
        DO UPDATE SET status='active', permissions=EXCLUDED.permissions, updated_at=NOW()
        RETURNING id
      `, [userId, staffId, JSON.stringify(permissions)]);
      return { staffId, membershipId: membership.rows[0]?.id };
    });
    const list = await this.staff(userId);
    const staffRows = Array.isArray(list.data) ? list.data as Array<Record<string, unknown>> : [];
    return { status: 'success', message: 'Seller staff account created and SELLER_STAFF role assigned automatically.', data: staffRows.find((item) => Number(item.staff_user_id) === created.staffId) ?? null };
  }

  async updateStaff(staffId: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const seller = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(seller, ['SELLER'])) throw new ForbiddenException({ status: 'error', message: 'Only the seller owner can update seller staff.' });
    const permissions = body.permissions === undefined ? undefined : this.normalizeStaffPermissions(body.permissions);
    const status = body.status === undefined ? undefined : this.text(body.status);
    if (status !== undefined && !['active', 'suspended'].includes(status)) throw new UnprocessableEntityException({ status: 'error', message: 'The staff status is invalid.' });
    const name = body.name === undefined ? undefined : this.limitRequired(body.name, 'name', 255);
    const phone = body.phone_number === undefined ? undefined : this.limitNullable(body.phone_number, 50, 'phone_number');
    const membership = await this.database.query<{ staff_user_id: number }>('SELECT staff_user_id FROM seller_staff_memberships WHERE seller_user_id=$1 AND staff_user_id=$2 LIMIT 1', [userId, staffId]);
    if (!membership.rows[0]) throw new NotFoundException({ status: 'error', message: 'Seller staff member not found.' });
    await this.database.transaction(async (client) => {
      if (status !== undefined || permissions !== undefined) await client.query('UPDATE seller_staff_memberships SET status=COALESCE($1,status), permissions=COALESCE($2::jsonb,permissions), updated_at=NOW() WHERE seller_user_id=$3 AND staff_user_id=$4', [status ?? null, permissions === undefined ? null : JSON.stringify(permissions), userId, staffId]);
      if (name !== undefined || phone !== undefined || status !== undefined) await client.query('UPDATE users SET name=COALESCE($1,name), phone_number=COALESCE($2,phone_number), status=CASE WHEN $3::text=\'suspended\' THEN \'inactive\' WHEN $3::text=\'active\' THEN \'active\' ELSE status END, updated_at=NOW() WHERE id=$4', [name ?? null, phone ?? null, status ?? null, staffId]);
    });
    const staffList = await this.staff(userId);
    const staffRows = Array.isArray(staffList.data) ? staffList.data as Array<Record<string, unknown>> : [];
    return { status: 'success', message: 'Seller staff member updated.', data: staffRows.find((item) => Number(item.staff_user_id) === staffId) ?? null };
  }

  async removeStaff(staffId: number, userId: number): Promise<Record<string, unknown>> {
    const seller = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(seller, ['SELLER'])) throw new ForbiddenException({ status: 'error', message: 'Only the seller owner can remove seller staff.' });
    const result = await this.database.query<{ staff_user_id: number }>('UPDATE seller_staff_memberships SET status=\'suspended\', updated_at=NOW() WHERE seller_user_id=$1 AND staff_user_id=$2 RETURNING staff_user_id', [userId, staffId]);
    if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: 'Seller staff member not found.' });
    await this.database.query('UPDATE users SET status=\'inactive\', updated_at=NOW() WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM seller_staff_memberships WHERE staff_user_id=$1 AND status=\'active\')', [staffId]);
    return { status: 'success', message: 'Seller staff member removed from this store.' };
  }

  async location(userId: number): Promise<Record<string, unknown>> {
    await this.authorizeSellerOwner(userId, 'manage store location');
    const result = await this.database.query<SellerApplicationRow>(`
      SELECT id, user_id, store_name, city, address, latitude, longitude
      FROM seller_applications
      WHERE user_id=$1
      LIMIT 1
    `, [userId]);
    if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: 'Seller store application not found.' });
    return { status: 'ok', data: this.locationData(result.rows[0]) };
  }

  async updateLocation(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeSellerOwner(userId, 'update store location');
    const city = this.limitRequired(body.city, 'city', 100);
    const address = this.limitRequired(body.address, 'address', 500);
    const latitude = this.coordinate(body.latitude, 'latitude', -90, 90);
    const longitude = this.coordinate(body.longitude, 'longitude', -180, 180);
    const result = await this.database.query<SellerApplicationRow>(`
      UPDATE seller_applications
      SET city=$1, address=$2, latitude=$3, longitude=$4, updated_at=NOW()
      WHERE user_id=$5
      RETURNING id, user_id, store_name, city, address, latitude, longitude
    `, [city, address, latitude, longitude, userId]);
    if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: 'Seller store application not found.' });
    return { status: 'success', message: 'Store location updated successfully.', data: this.locationData(result.rows[0]) };
  }

  async apply(body: Record<string, unknown>, authorization?: string): Promise<Record<string, unknown>> {
    const authenticated = await this.auth.authenticate(authorization);
    let userId = authenticated?.userId;

    if (!userId) {
      const email = this.email(body.email);
      const name = this.limitRequired(body.name, 'name', 255);
      const password = this.limitRequired(body.password, 'password', 255);
      if (password.length < 6) throw new UnprocessableEntityException({ status: 'error', message: 'The password field is invalid.' });

      const existing = await this.database.query<{ id: number; password: string }>('SELECT id, password FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
      if (existing.rows[0]) {
        const compatibleHash = existing.rows[0].password?.startsWith('$2y$') ? `$2a$${existing.rows[0].password.slice(4)}` : existing.rows[0].password;
        if (!compatibleHash || !(await bcrypt.compare(password, compatibleHash))) {
          throw new UnprocessableEntityException({ status: 'error', message: 'An account with this email already exists. Please log in first or verify your credentials.' });
        }
        userId = existing.rows[0].id;
      } else {
        const inserted = await this.database.query<{ id: number }>(`
          INSERT INTO users (name, email, password, status, loyalty_points, email_verified_at, created_at, updated_at)
          VALUES ($1, LOWER($2), $3, 'active', 0, NOW(), NOW(), NOW()) RETURNING id
        `, [name, email, await bcrypt.hash(password, 12)]);
        userId = inserted.rows[0]?.id;
        if (userId) await this.auth.attachCustomerRole(userId);
      }
    }

    if (!userId) throw new UnprocessableEntityException({ status: 'error', message: 'Unable to identify the applicant.' });
    const input = this.applicationInput(body);
    const baseSlug = this.slug(input.store_name ?? '') || `store-${userId}`;
    const slug = await this.uniqueSlug(baseSlug, userId);
    const existing = await this.database.query<{ id: number }>('SELECT id FROM seller_applications WHERE user_id=$1 LIMIT 1', [userId]);
    let applicationId: number;
    if (existing.rows[0]) {
      applicationId = existing.rows[0].id;
      await this.database.query(`
        UPDATE seller_applications SET store_name=$1, slug=$2, category=$3, description=$4, phone=$5,
          telegram_username=$6, city=$7, address=$8, bank_name=$9, bakong_account_id=$10,
          logo_url=$11, banner_url=$12, status='pending', rejection_reason=NULL, updated_at=NOW()
        WHERE id=$13
      `, [input.store_name, slug, input.category ?? 'General Merchandise', input.description, input.phone, input.telegram_username, input.city ?? 'Phnom Penh', input.address, input.bank_name ?? 'ABA Bank', input.bakong_account_id, input.logo_url, input.banner_url, applicationId]);
    } else {
      const inserted = await this.database.query<{ id: number }>(`
        INSERT INTO seller_applications (user_id, store_name, slug, category, description, phone, telegram_username, city, address, bank_name, bakong_account_id, logo_url, banner_url, status, rejection_reason, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending',NULL,NOW(),NOW()) RETURNING id
      `, [userId, input.store_name, slug, input.category ?? 'General Merchandise', input.description, input.phone, input.telegram_username, input.city ?? 'Phnom Penh', input.address, input.bank_name ?? 'ABA Bank', input.bakong_account_id, input.logo_url, input.banner_url]);
      applicationId = inserted.rows[0]?.id ?? 0;
    }
    if (!applicationId) throw new Error('Seller application was not saved.');
    const application = await this.find(applicationId);
    return { status: 'success', message: 'Seller member application submitted successfully! Our administrative team will review your application within 2-4 hours.', data: this.application(application) };
  }

  async myApplication(authorization?: string): Promise<Record<string, unknown>> {
    const authenticated = await this.auth.authenticate(authorization);
    if (!authenticated) return { status: 'unauthenticated', data: null };
    const application = await this.database.query<SellerApplicationRow>('SELECT * FROM seller_applications WHERE user_id=$1 LIMIT 1', [authenticated.userId]);
    const user = await this.auth.me(authenticated.userId);
    return { status: 'ok', data: application.rows[0] ?? null, is_seller: this.auth.hasAnyRole(user, ['SELLER', 'SUPER_ADMIN', 'ADMIN']) };
  }

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

  private async authorizeSellerOwner(userId: number, action: string): Promise<void> {
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, ['SELLER'])) throw new ForbiddenException({ status: 'error', message: `Only the seller owner can ${action}.` });
  }

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

  private locationData(row: SellerApplicationRow): Record<string, unknown> {
    const latitude = row.latitude ?? null;
    const longitude = row.longitude ?? null;
    return {
      id: row.id,
      store_name: row.store_name,
      city: row.city,
      address: row.address,
      latitude,
      longitude,
      google_maps_url: latitude !== null && longitude !== null ? `https://maps.google.com/?q=${latitude},${longitude}` : null,
    };
  }

  private async uniqueSlug(baseSlug: string, userId: number): Promise<string> {
    let slug = baseSlug;
    for (let counter = 1; ; counter += 1) {
      const conflict = await this.database.query<{ id: number }>('SELECT id FROM seller_applications WHERE slug=$1 AND user_id<>$2 LIMIT 1', [slug, userId]);
      if (!conflict.rows[0]) return slug;
      slug = `${baseSlug}-${counter}`;
    }
  }

  private applicationInput(body: Record<string, unknown>): Record<string, string | null> {
    return {
      store_name: this.limitRequired(body.store_name, 'store_name', 255),
      phone: this.limitRequired(body.phone, 'phone', 50),
      category: this.limitNullable(body.category, 100, 'category'),
      description: this.limitNullable(body.description, 2000, 'description'),
      telegram_username: this.limitNullable(body.telegram_username, 100, 'telegram_username'),
      city: this.limitNullable(body.city, 100, 'city'),
      address: this.limitNullable(body.address, 500, 'address'),
      bank_name: this.limitNullable(body.bank_name, 100, 'bank_name'),
      bakong_account_id: this.limitNullable(body.bakong_account_id, 100, 'bakong_account_id'),
      logo_url: this.limitNullable(body.logo_url, 1000, 'logo_url'),
      banner_url: this.limitNullable(body.banner_url, 1000, 'banner_url'),
    };
  }

  private email(value: unknown): string {
    const email = this.text(value).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) throw new UnprocessableEntityException({ status: 'error', message: 'The email field is invalid.' });
    return email;
  }

  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
  private number(value: unknown): number | null { const text = this.text(value); if (!text) return null; const number = Number(text); return Number.isFinite(number) ? number : null; }
  private coordinate(value: unknown, field: string, minimum: number, maximum: number): number | null {
    if (value === undefined || value === null || this.text(value) === '') return null;
    const number = this.number(value);
    if (number === null || number < minimum || number > maximum) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` });
    return number;
  }
  private limitRequired(value: unknown, field: string, max: number): string { const text = this.text(value); if (!text || text.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return text; }
  private limitNullable(value: unknown, max: number, field: string): string | null { const text = this.text(value); if (text.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return text || null; }
  private slug(value: string): string { return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 230); }

  private normalizeStaffPermissions(value: unknown): string[] {
    if (value === undefined || value === null) return [...this.sellerStaffPermissions];
    if (!Array.isArray(value)) throw new UnprocessableEntityException({ status: 'error', message: 'The permissions field must be an array.' });
    const permissions = value.map((item) => String(item).trim()).filter(Boolean);
    if (permissions.some((permission) => !this.sellerStaffPermissions.includes(permission))) throw new UnprocessableEntityException({ status: 'error', message: 'One or more seller staff permissions are not allowed.' });
    return Array.from(new Set(permissions));
  }
}
