import * as bcrypt from 'bcryptjs';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { ParsedQs } from 'qs';

import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

interface UserRow {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  password: string;
  status: string;
  email_verified_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  full_count?: number | string;
}

interface RoleRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

interface PermissionRow {
  id: number;
  name: string;
  slug: string;
  group: string | null;
  description: string | null;
}

@Injectable()
export class AdminSecurityService {
  private readonly roleAdminRoles = ['SUPER_ADMIN', 'ADMIN'];
  private readonly userAdminRoles = ['SUPER_ADMIN', 'ADMIN'];

  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async roles(userId: number): Promise<Record<string, unknown>> {
    await this.authorizeRoleAdmin(userId);
    const roles = await this.database.query<RoleRow>('SELECT id, name, slug, description FROM roles ORDER BY id');
    const permissions = await this.database.query<PermissionRow & { role_id: number }>(`
      SELECT rp.role_id, p.id, p.name, p.slug, p.group, p.description
      FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id
      WHERE rp.role_id = ANY($1::bigint[]) ORDER BY p.group NULLS LAST, p.id
    `, [roles.rows.map((role) => role.id)]);
    const permissionMap = new Map<number, PermissionRow[]>();
    for (const permission of permissions.rows) permissionMap.set(permission.role_id, [...(permissionMap.get(permission.role_id) ?? []), permission]);
    return { status: 'success', data: roles.rows.map((role) => ({ ...role, permissions: permissionMap.get(role.id) ?? [] })) };
  }

  async permissions(userId: number): Promise<Record<string, unknown>> {
    await this.authorizeRoleAdmin(userId);
    const result = await this.database.query<PermissionRow>('SELECT id, name, slug, "group", description FROM permissions ORDER BY "group" NULLS LAST, id');
    const grouped: Record<string, PermissionRow[]> = {};
    for (const permission of result.rows) {
      const group = permission.group ?? 'general';
      grouped[group] = [...(grouped[group] ?? []), permission];
    }
    return { status: 'success', data: grouped };
  }

  async staff(query: ParsedQs, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeRoleAdmin(userId);
    return this.listUsers(query, userId, true);
  }

  async listUsers(query: ParsedQs, userId: number, staffOnly = false): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(userId);
    const values: unknown[] = [];
    const filters: string[] = [];
    const search = this.text(query.search);
    if (search) {
      values.push(`%${search}%`);
      filters.push(`(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR u.phone_number ILIKE $${values.length})`);
    }
    const role = this.text(query.role);
    if (role) {
      values.push(role.toLowerCase());
      filters.push(`EXISTS (SELECT 1 FROM role_user ruf JOIN roles rrf ON rrf.id=ruf.role_id WHERE ruf.user_id=u.id AND rrf.slug=$${values.length})`);
    } else if (staffOnly) {
      filters.push("EXISTS (SELECT 1 FROM role_user rus JOIN roles rs ON rs.id=rus.role_id WHERE rus.user_id=u.id AND rs.slug <> 'customer')");
    }
    const perPage = Math.min(100, Math.max(5, this.number(query.per_page) ?? 20));
    const page = Math.max(1, this.number(query.page) ?? 1);
    const offset = (page - 1) * perPage;
    values.push(perPage, offset);
    const users = await this.database.query<UserRow>(`
      SELECT u.id, u.name, u.email, u.phone_number, u.password, u.status,
             u.email_verified_at, u.created_at, u.updated_at,
             COUNT(*) OVER()::int AS full_count
      FROM users u ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY u.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `, values);
    const data = await this.userResources(users.rows);
    const total = Number(users.rows[0]?.full_count ?? 0);
    return { status: 'success', data, meta: { total, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage } };
  }

  async createUser(body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const name = this.required(body.name, 255);
    const email = this.email(body.email);
    const phone = this.optional(body.phone_number, 50);
    const status = this.status(body.status, 'active');
    const duplicate = await this.database.query<{ id: number }>('SELECT id FROM users WHERE LOWER(email)=LOWER($1) OR ($2::text IS NOT NULL AND phone_number=$2) LIMIT 1', [email, phone]);
    if (duplicate.rows[0]) throw new ConflictException({ status: 'error', message: 'The email or phone number has already been taken.' });
    const passwordText = this.text(body.password) || 'Tyushop@2026!';
    if (passwordText.length < 8) throw new UnprocessableEntityException({ status: 'error', message: 'The password must be at least 8 characters.' });
    const password = await bcrypt.hash(passwordText, 12);
    const created = await this.database.transaction(async (client) => {
      const result = await client.query<UserRow>(`INSERT INTO users (name, email, phone_number, password, status, email_verified_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW(),NOW()) RETURNING id, name, email, phone_number, password, status, email_verified_at, created_at, updated_at`, [name, email, phone, password, status]);
      const user = result.rows[0];
      if (!user) throw new Error('User was not created.');
      const role = this.text(body.role);
      if (role) await this.assignRoleBySlug(client, user.id, role);
      return user;
    });
    return { status: 'success', message: `Member ${created.name} created successfully.`, data: (await this.userResources([created]))[0] };
  }

  async updateUser(id: number, body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const current = await this.findUser(id);
    const name = this.required(body.name, 255);
    const email = this.email(body.email);
    const phone = this.optional(body.phone_number, 50);
    const status = this.status(body.status, current.status);
    const duplicate = await this.database.query<{ id: number }>('SELECT id FROM users WHERE id<>$1 AND (LOWER(email)=LOWER($2) OR ($3::text IS NOT NULL AND phone_number=$3)) LIMIT 1', [id, email, phone]);
    if (duplicate.rows[0]) throw new ConflictException({ status: 'error', message: 'The email or phone number has already been taken.' });
    const result = await this.database.query<UserRow>('UPDATE users SET name=$1, email=$2, phone_number=$3, status=$4, email_verified_at=CASE WHEN LOWER(email)<>LOWER($2) THEN NOW() ELSE email_verified_at END, updated_at=NOW() WHERE id=$5 RETURNING id, name, email, phone_number, password, status, email_verified_at, created_at, updated_at', [name, email, phone, status, id]);
    return { status: 'success', message: `User ${name} updated successfully.`, data: (await this.userResources([result.rows[0]]))[0] };
  }

  async deleteUser(id: number, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    if (id === actorId) throw new UnprocessableEntityException({ status: 'error', message: 'You cannot delete your own account.' });
    const current = await this.findUser(id);
    await this.database.query('DELETE FROM users WHERE id=$1', [id]);
    return { status: 'success', message: `User ${current.name} has been removed.` };
  }

  async updateEmail(id: number, body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const email = this.email(body.email);
    const current = await this.findUser(id);
    const duplicate = await this.database.query<{ id: number }>('SELECT id FROM users WHERE id<>$1 AND LOWER(email)=LOWER($2) LIMIT 1', [id, email]);
    if (duplicate.rows[0]) throw new ConflictException({ status: 'error', message: 'The email has already been taken.' });
    const result = await this.database.query<UserRow>('UPDATE users SET email=$1, email_verified_at=NOW(), updated_at=NOW() WHERE id=$2 RETURNING id, name, email, phone_number, password, status, email_verified_at, created_at, updated_at', [email, id]);
    return { status: 'success', message: `User email successfully updated to ${email}.`, data: { id: result.rows[0].id, name: current.name, email: result.rows[0].email, email_verified_at: result.rows[0].email_verified_at } };
  }

  async updatePassword(id: number, body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const password = this.text(body.password);
    if (password.length < 8) throw new UnprocessableEntityException({ status: 'error', message: 'The password must be at least 8 characters.' });
    await this.findUser(id);
    await this.database.transaction(async (client) => {
      await client.query('UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2', [await bcrypt.hash(password, 12), id]);
      if (body.revoke_tokens === undefined || this.boolean(body.revoke_tokens, true)) await client.query('DELETE FROM personal_access_tokens WHERE tokenable_id=$1', [id]);
    });
    return { status: 'success', message: 'User password has been securely updated.' };
  }

  async assignRoles(id: number, body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    const actor = await this.authorizeRoleAdmin(actorId);
    const target = await this.findUser(id);
    if (actor.id === target.id) throw new ForbiddenException({ status: 'error', message: 'Administrators cannot modify their own roles.' });
    const roleIds = await this.resolveRoleIds(body);
    if (!roleIds.length) throw new UnprocessableEntityException({ status: 'error', message: 'Please provide at least one valid role.' });
    const isSuperAdmin = this.auth.hasAnyRole(actor, ['SUPER_ADMIN']);
    const protectedRoles = await this.database.query<{ id: number }>("SELECT id FROM roles WHERE slug IN ('super_admin','admin')");
    if (!isSuperAdmin && roleIds.some((idValue) => protectedRoles.rows.some((role) => role.id === idValue))) throw new ForbiddenException({ status: 'error', message: 'Only SUPER_ADMIN may grant ADMIN or SUPER_ADMIN roles.' });
    await this.database.transaction(async (client) => {
      await client.query('DELETE FROM role_user WHERE user_id=$1', [id]);
      for (const roleId of roleIds) await client.query('INSERT INTO role_user (user_id, role_id, created_at, updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT (user_id,role_id) DO NOTHING', [id, roleId]);
      const permissionIds = await this.resolvePermissionIds(body);
      if (permissionIds.length) for (const permissionId of permissionIds) await client.query('INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT (role_id,permission_id) DO NOTHING', [roleIds[0], permissionId]);
    });
    const roles = await this.rolesFor([id]);
    return { status: 'success', message: `Roles successfully assigned to ${target.name}.`, data: { user_id: id, name: target.name, email: target.email, roles: roles.get(id) ?? [] } };
  }

  async assignRolesByEmail(body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeRoleAdmin(actorId);
    const email = this.email(body.email);
    const result = await this.database.query<{ id: number }>('SELECT id FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
    if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: 'No user account was found for that email address.' });
    return this.assignRoles(result.rows[0].id, body, actorId);
  }

  private async resolveRoleIds(body: Record<string, unknown>): Promise<number[]> {
    const ids = this.array(body.role_ids).map((value) => this.id(value)).filter((value): value is number => value !== null);
    const names = [...this.array(body.roles), ...this.array(body.role_slugs), ...([body.role].filter((value) => value !== undefined))].map((value) => this.text(value).toLowerCase().replace(/ /g, '_')).filter(Boolean);
    if (names.length) {
      const found = await this.database.query<{ id: number }>('SELECT id FROM roles WHERE LOWER(slug)=ANY($1::text[]) OR LOWER(name)=ANY($1::text[])', [names]);
      ids.push(...found.rows.map((role) => role.id));
    }
    return Array.from(new Set(ids));
  }

  private async resolvePermissionIds(body: Record<string, unknown>): Promise<number[]> {
    const ids = this.array(body.permission_ids).map((value) => this.id(value)).filter((value): value is number => value !== null);
    const names = this.array(body.permissions).map((value) => this.text(value).toLowerCase()).filter(Boolean);
    if (names.length) {
      const found = await this.database.query<{ id: number }>('SELECT id FROM permissions WHERE LOWER(slug)=ANY($1::text[]) OR LOWER(name)=ANY($1::text[])', [names]);
      ids.push(...found.rows.map((permission) => permission.id));
    }
    return Array.from(new Set(ids));
  }

  private async authorizeRoleAdmin(userId: number): Promise<AuthUser> { const user = await this.auth.me(userId); if (!this.auth.hasAnyRole(user, this.roleAdminRoles)) throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Administrator role management privileges required.' }); return user; }
  private async authorizeUserAdmin(userId: number): Promise<AuthUser> { const user = await this.auth.me(userId); if (!this.auth.hasAnyRole(user, this.userAdminRoles)) throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Administrator credentials and security privileges required.' }); return user; }
  private async findUser(id: number): Promise<UserRow> { const result = await this.database.query<UserRow>('SELECT id, name, email, phone_number, password, status, email_verified_at, created_at, updated_at FROM users WHERE id=$1 LIMIT 1', [id]); if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: 'User not found.' }); return result.rows[0]; }
  private async userResources(rows: UserRow[]): Promise<Array<Record<string, unknown>>> { const roles = await this.rolesFor(rows.map((row) => row.id)); return rows.map((row) => ({ id: row.id, name: row.name, email: row.email, phone_number: row.phone_number, status: row.status, is_email_verified: row.email_verified_at !== null, email_verified_at: row.email_verified_at, created_at: row.created_at, roles: roles.get(row.id) ?? [] })); }
  private async rolesFor(userIds: number[]): Promise<Map<number, RoleRow[]>> { const map = new Map<number, RoleRow[]>(); if (!userIds.length) return map; const result = await this.database.query<RoleRow & { user_id: number }>('SELECT ru.user_id, r.id, r.name, r.slug, r.description FROM role_user ru JOIN roles r ON r.id=ru.role_id WHERE ru.user_id=ANY($1::bigint[]) ORDER BY r.id', [userIds]); for (const role of result.rows) map.set(role.user_id, [...(map.get(role.user_id) ?? []), { id: role.id, name: role.name, slug: role.slug, description: role.description }]); return map; }
  private async assignRoleBySlug(client: { query: <T extends Record<string, unknown>>(text: string, values?: unknown[]) => Promise<{ rows: T[] }> }, userId: number, role: string): Promise<void> { const result = await client.query<{ id: number }>('SELECT id FROM roles WHERE LOWER(slug)=LOWER($1) OR LOWER(name)=LOWER($1) LIMIT 1', [role.replace(/ /g, '_')]); if (result.rows[0]) await client.query('INSERT INTO role_user (user_id, role_id, created_at, updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT (user_id,role_id) DO NOTHING', [userId, result.rows[0].id]); }
  private required(value: unknown, max: number): string { const text = this.text(value); if (!text || text.length > max) throw new UnprocessableEntityException({ status: 'error', message: 'The given data was invalid.' }); return text; }
  private email(value: unknown): string { const text = this.required(value, 255).toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(text)) throw new UnprocessableEntityException({ status: 'error', message: 'The email field is invalid.' }); return text; }
  private optional(value: unknown, max: number): string | null { const text = this.text(value); if (text.length > max) throw new UnprocessableEntityException({ status: 'error', message: 'The given data was invalid.' }); return text || null; }
  private status(value: unknown, fallback: string): string { const status = value === undefined ? fallback : this.text(value); if (!['active', 'inactive', 'pending', 'suspended', 'on_leave'].includes(status)) throw new UnprocessableEntityException({ status: 'error', message: 'The status field is invalid.' }); return status; }
  private text(value: unknown): string { return value === undefined || value === null ? '' : String(Array.isArray(value) ? value[0] : value).trim(); }
  private number(value: unknown): number | null { const text = this.text(value); const result = Number(text); return text && Number.isFinite(result) ? result : null; }
  private id(value: unknown): number | null { const result = this.number(value); return result !== null && Number.isInteger(result) && result > 0 ? result : null; }
  private array(value: unknown): unknown[] { return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]; }
  private boolean(value: unknown, fallback: boolean): boolean { if (value === undefined || value === null || value === '') return fallback; return ['true', '1', 'yes', 'on'].includes(this.text(value).toLowerCase()); }
}
