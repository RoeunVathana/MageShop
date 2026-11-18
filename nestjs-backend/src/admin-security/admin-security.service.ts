import * as bcrypt from 'bcryptjs';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ParsedQs } from 'qs';

import { AuthService } from '../auth/auth.service';
import { AuthRecoveryService } from '../auth/auth-recovery.service';
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
  private readonly telegramSellerRoles = ['SUPER_ADMIN', 'ADMIN', 'SELLER', 'SELLER_STAFF'];

  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
    private readonly recovery: AuthRecoveryService,
    private readonly config: ConfigService,
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

  async sendUserOtp(id: number, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const user = await this.findUser(id);
    await this.recovery.requestPasswordOtp(user.email);
    return { status: 'success', message: `6-digit OTP code has been dispatched to ${user.email}.` };
  }

  async indexOtps(query: ParsedQs, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const values: unknown[] = [];
    const filters: string[] = [];
    const email = this.text(query.email);
    if (email) { values.push(`%${email}%`); filters.push(`email ILIKE $${values.length}`); }
    const status = this.text(query.status);
    if (status === 'active') filters.push('is_used = false AND expires_at > NOW()');
    if (status === 'used') filters.push('is_used = true');
    if (status === 'expired') filters.push('is_used = false AND expires_at <= NOW()');
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const count = await this.database.query<{ total: number | string }>(`SELECT COUNT(*)::int AS total FROM password_reset_otps ${where}`, values);
    const perPage = Math.min(100, Math.max(5, this.number(query.per_page) ?? 20));
    const page = Math.max(1, this.number(query.page) ?? 1);
    const pageValues = [...values, perPage, (page - 1) * perPage];
    const rows = await this.database.query<Record<string, unknown>>(`SELECT id, email, attempts, is_used, expires_at, cooldown_until, created_at FROM password_reset_otps ${where} ORDER BY id DESC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`, pageValues);
    const data = rows.rows.map((row) => {
      const expires = new Date(String(row.expires_at));
      const cooldown = row.cooldown_until ? new Date(String(row.cooldown_until)) : null;
      const expired = expires.getTime() <= Date.now();
      return { id: row.id, email: row.email, attempts: Number(row.attempts ?? 0), is_used: Boolean(row.is_used), is_expired: expired, status: row.is_used ? 'used' : (expired ? 'expired' : 'active'), expires_at: row.expires_at, cooldown_until: row.cooldown_until, is_cooling_down: Boolean(cooldown && cooldown.getTime() > Date.now()), created_at: row.created_at };
    });
    const total = Number(count.rows[0]?.total ?? 0);
    return { status: 'success', data, meta: { total, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage } };
  }

  async dispatchOtp(body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const email = this.email(body.email);
    await this.recovery.requestPasswordOtp(email);
    return { status: 'success', message: `OTP code dispatched successfully to ${email}.` };
  }

  async invalidateOtp(id: number, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const record = await this.database.query<{ email: string }>('SELECT email FROM password_reset_otps WHERE id=$1 LIMIT 1', [id]);
    if (!record.rows[0]) throw new NotFoundException({ status: 'error', message: 'OTP record not found.' });
    await this.database.query('UPDATE password_reset_otps SET is_used=true, updated_at=NOW() WHERE id=$1', [id]);
    return { status: 'success', message: `OTP for ${record.rows[0].email} has been invalidated.` };
  }

  async resendOtp(id: number, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const record = await this.database.query<{ email: string }>('SELECT email FROM password_reset_otps WHERE id=$1 LIMIT 1', [id]);
    if (!record.rows[0]) throw new NotFoundException({ status: 'error', message: 'OTP record not found.' });
    await this.recovery.requestPasswordOtp(record.rows[0].email);
    return { status: 'success', message: `New OTP verification code sent to ${record.rows[0].email}.` };
  }

  async emailSettings(actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const settings = await this.settings(['mail_mailer', 'mail_host', 'mail_port', 'mail_username', 'mail_password', 'mail_encryption', 'mail_from_address', 'mail_from_name']);
    return { status: 'success', data: this.emailSettingsData(settings) };
  }

  async updateEmailSettings(body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const allowed = ['mail_mailer', 'mail_host', 'mail_port', 'mail_username', 'mail_password', 'mail_encryption', 'mail_from_address', 'mail_from_name'];
    const values: Record<string, string> = {};
    for (const key of allowed) if (body[key] !== undefined && body[key] !== null) {
      const value = this.text(body[key]);
      if (key === 'mail_port' && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 65535)) throw new UnprocessableEntityException({ status: 'error', message: 'The mail_port field is invalid.' });
      if (key === 'mail_mailer' && !['smtp', 'sendmail', 'mailgun', 'ses', 'postmark', 'log'].includes(value)) throw new UnprocessableEntityException({ status: 'error', message: 'The mail_mailer field is invalid.' });
      if (key === 'mail_from_address' && value && !/^\S+@\S+\.\S+$/.test(value)) throw new UnprocessableEntityException({ status: 'error', message: 'The mail_from_address field is invalid.' });
      values[key] = key === 'mail_encryption' && ['none', 'null'].includes(value) ? '' : value;
    }
    await this.saveSettings(values);
    return { status: 'success', message: 'Email and SMTP configuration updated successfully.', data: this.emailSettingsData(await this.settings(Object.keys(values).length ? Object.keys(values) : allowed)) };
  }

  async testEmail(body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const email = this.email(body.test_email);
    await this.recovery.sendTestEmail(email);
    return { status: 'success', message: `Test OTP email successfully sent to ${email}.`, data: { recipient: email, timestamp: new Date().toISOString() } };
  }

  async telegramSettings(actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    return { status: 'success', data: this.telegramSettingsData(await this.settings(['telegram_bot_token', 'telegram_bot_username', 'telegram_admin_chat_id', 'telegram_webhook_secret', 'telegram_mini_app_url', 'telegram_webhook_url'])) };
  }

  async updateTelegramSettings(body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const values: Record<string, string> = {};
    for (const key of ['telegram_bot_token', 'telegram_bot_username', 'telegram_admin_chat_id', 'telegram_webhook_secret', 'telegram_mini_app_url', 'telegram_webhook_url']) {
      if (body[key] !== undefined && body[key] !== null && this.text(body[key])) values[key] = this.text(body[key]);
    }
    await this.saveSettings(values);
    const settings = await this.settings(['telegram_bot_token', 'telegram_bot_username', 'telegram_admin_chat_id', 'telegram_webhook_secret', 'telegram_mini_app_url', 'telegram_webhook_url']);
    let webhookStatus: string | null = null;
    if (this.boolean(body.register_webhook, false)) webhookStatus = await this.registerWebhook(this.setting(settings, 'telegram_bot_token', 'TELEGRAM_BOT_TOKEN', ''), this.setting(settings, 'telegram_webhook_url', '', `${this.config.get<string>('APP_URL', 'http://localhost:8080').replace(/\/$/, '')}/api/v1/telegram/webhook`), this.setting(settings, 'telegram_webhook_secret', 'TELEGRAM_WEBHOOK_SECRET', ''));
    const data = this.telegramSettingsData(settings);
    data.webhook_status = webhookStatus;
    return { status: 'success', message: webhookStatus ? `Telegram API Token saved (${webhookStatus}).` : 'Telegram API Token & Bot configuration saved successfully.', data };
  }

  async testTelegram(body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeUserAdmin(actorId);
    const settings = await this.settings(['telegram_bot_token', 'telegram_admin_chat_id']);
    const token = this.setting(settings, 'telegram_bot_token', 'TELEGRAM_BOT_TOKEN', '');
    if (!token) throw new UnprocessableEntityException({ status: 'error', message: 'Telegram Bot API Token Key is not configured yet.' });
    const me = await this.telegramRequest(token, 'getMe');
    if (!me.ok || !(me.body as { ok?: boolean }).ok) throw new UnprocessableEntityException({ status: 'error', message: `Telegram API rejected token: ${String((me.body as { description?: string }).description ?? 'Invalid Bot Token')}` });
    const result = (me.body as { result?: { username?: string; first_name?: string } }).result ?? {};
    const chatId = this.text(body.chat_id) || this.setting(settings, 'telegram_admin_chat_id', '', '');
    let messageSent = false;
    if (chatId) {
      const message = await this.telegramRequest(token, 'sendMessage', { chat_id: chatId, text: `TYUSHOP Telegram API Token Verified!\nBot: @${result.username ?? 'UnknownBot'} (${result.first_name ?? 'TYUSHOP Bot'})\nTime: ${new Date().toISOString()}` });
      messageSent = message.ok && Boolean((message.body as { ok?: boolean }).ok);
    }
    return { status: 'success', message: messageSent ? `Connected to @${result.username ?? 'UnknownBot'} and sent a test message to Chat ID ${chatId}.` : `Telegram API token verified! Connected to @${result.username ?? 'UnknownBot'}.`, data: { bot_username: result.username ?? 'UnknownBot', bot_name: result.first_name ?? 'TYUSHOP Bot', message_sent: messageSent, chat_id: chatId } };
  }

  async sellerTelegramSettings(actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeTelegramSeller(actorId);
    return { status: 'success', data: this.sellerTelegramSettingsData(await this.settings(['telegram_bot_token', 'telegram_bot_username'])) };
  }

  async updateSellerTelegramSettings(body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeTelegramSeller(actorId);
    const values: Record<string, string> = {};
    if (body.telegram_bot_token !== undefined) {
      const token = this.text(body.telegram_bot_token);
      if (!token || token.length > 255) throw new UnprocessableEntityException({ status: 'error', message: 'Please provide a valid Telegram Bot API token.' });
      values.telegram_bot_token = token;
    }
    if (body.telegram_bot_username !== undefined) {
      const username = this.text(body.telegram_bot_username);
      if (username.length > 100) throw new UnprocessableEntityException({ status: 'error', message: 'The Telegram bot username is invalid.' });
      if (username) values.telegram_bot_username = username.replace(/^@+/, '');
    }
    if (!Object.keys(values).length) throw new UnprocessableEntityException({ status: 'error', message: 'Enter a new Telegram Bot API token or bot username before saving.' });
    await this.saveSettings(values);
    return { status: 'success', message: 'Seller Telegram Bot API configuration saved successfully.', data: this.sellerTelegramSettingsData(await this.settings(['telegram_bot_token', 'telegram_bot_username'])) };
  }

  async testSellerTelegram(actorId: number): Promise<Record<string, unknown>> {
    await this.authorizeTelegramSeller(actorId);
    const settings = await this.settings(['telegram_bot_token', 'telegram_admin_chat_id']);
    const token = this.setting(settings, 'telegram_bot_token', 'TELEGRAM_BOT_TOKEN', '');
    if (!token) throw new UnprocessableEntityException({ status: 'error', message: 'Configure the Telegram Bot API token before testing the seller bot.' });
    const me = await this.telegramRequest(token, 'getMe');
    if (!me.ok || !(me.body as { ok?: boolean }).ok) throw new UnprocessableEntityException({ status: 'error', message: `Telegram API rejected token: ${String((me.body as { description?: string }).description ?? 'Invalid Bot Token')}` });
    const result = (me.body as { result?: { username?: string; first_name?: string } }).result ?? {};
    const chatId = this.setting(settings, 'telegram_admin_chat_id', '', '');
    let messageSent = false;
    if (chatId) {
      const message = await this.telegramRequest(token, 'sendMessage', { chat_id: chatId, text: `TYUSHOP seller Telegram bot verified!\nBot: @${result.username ?? 'UnknownBot'} (${result.first_name ?? 'TYUSHOP Bot'})\nTime: ${new Date().toISOString()}` });
      messageSent = message.ok && Boolean((message.body as { ok?: boolean }).ok);
    }
    return { status: 'success', message: messageSent ? `Connected to @${result.username ?? 'UnknownBot'} and sent a test message to the configured admin chat.` : `Telegram API token verified! Connected to @${result.username ?? 'UnknownBot'}.`, data: { bot_username: result.username ?? 'UnknownBot', bot_name: result.first_name ?? 'TYUSHOP Bot', message_sent: messageSent } };
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
  private async authorizeTelegramSeller(userId: number): Promise<AuthUser> { const user = await this.auth.me(userId); if (!this.auth.hasAnyRole(user, this.telegramSellerRoles)) throw new ForbiddenException({ status: 'error', message: 'Seller or administrator access is required to manage the Telegram bot.' }); return user; }
  private async settings(keys: string[]): Promise<Map<string, string>> { const result = await this.database.query<{ setting_key: string; setting_value: string | null }>('SELECT setting_key, setting_value FROM store_settings WHERE setting_key=ANY($1::text[])', [keys]); return new Map(result.rows.map((row) => [row.setting_key, row.setting_value ?? ''])); }
  private async saveSettings(values: Record<string, string>): Promise<void> { if (!Object.keys(values).length) return; await this.database.transaction(async (client) => { for (const [key, value] of Object.entries(values)) await client.query(`INSERT INTO store_settings (store_id, setting_key, setting_value, created_at, updated_at) VALUES ('primary',$1,$2,NOW(),NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value, updated_at=NOW()`, [key, value]); }); }
  private emailSettingsData(settings: Map<string, string>): Record<string, unknown> {
    const value = (key: string, env: string, fallback: string): string => this.setting(settings, key, env, fallback);
    const mailer = value('mail_mailer', 'MAIL_MAILER', 'smtp');
    return { mail_mailer: mailer === 'resend' ? 'smtp' : mailer, mail_host: value('mail_host', 'MAIL_HOST', 'smtp.resend.com'), mail_port: Number(value('mail_port', 'MAIL_PORT', '587')), mail_username: value('mail_username', 'MAIL_USERNAME', 'resend'), mail_password_set: Boolean(value('mail_password', 'MAIL_PASSWORD', '')), mail_encryption: value('mail_encryption', 'MAIL_ENCRYPTION', 'tls'), mail_from_address: value('mail_from_address', 'MAIL_FROM_ADDRESS', 'noreply@tyushop.blog'), mail_from_name: value('mail_from_name', 'MAIL_FROM_NAME', 'TYUSHOP') };
  }
  private telegramSettingsData(settings: Map<string, string>): Record<string, unknown> {
    const token = this.setting(settings, 'telegram_bot_token', 'TELEGRAM_BOT_TOKEN', '');
    const defaultUrl = `${this.config.get<string>('APP_URL', 'http://localhost:8080').replace(/\/$/, '')}/api/v1/telegram/webhook`;
    return { telegram_bot_token_set: Boolean(token), telegram_bot_token_masked: token.length > 12 ? `${token.slice(0, 9)}...${token.slice(-5)}` : (token ? '********' : ''), telegram_bot_username: this.telegramUsername(settings), telegram_admin_chat_id: this.setting(settings, 'telegram_admin_chat_id', 'TELEGRAM_ADMIN_CHAT_ID', ''), telegram_webhook_secret: this.setting(settings, 'telegram_webhook_secret', 'TELEGRAM_WEBHOOK_SECRET', 'tyushop_sec_token_99182a'), telegram_mini_app_url: this.setting(settings, 'telegram_mini_app_url', 'TELEGRAM_MINI_APP_URL', 'https://tyushop.blog/telegram-app'), telegram_webhook_url: this.setting(settings, 'telegram_webhook_url', '', defaultUrl) };
  }
  private sellerTelegramSettingsData(settings: Map<string, string>): Record<string, unknown> {
    const token = this.setting(settings, 'telegram_bot_token', 'TELEGRAM_BOT_TOKEN', '');
    return { telegram_bot_token_set: Boolean(token), telegram_bot_token_masked: token.length > 12 ? `${token.slice(0, 9)}...${token.slice(-5)}` : (token ? '********' : ''), telegram_bot_username: this.telegramUsername(settings) };
  }
  private telegramUsername(settings: Map<string, string>): string { const username = this.setting(settings, 'telegram_bot_username', 'TELEGRAM_BOT_USERNAME', 'TYUSHOP_Bot'); return username.toLowerCase() === 'megacommerceaibot' ? 'TYUSHOP_Bot' : username; }
  private setting(settings: Map<string, string>, key: string, env: string, fallback: string): string { return String(settings.get(key) || this.config.get<string>(env, fallback) || '').trim(); }
  private async registerWebhook(token: string, url: string, secret: string): Promise<string> {
    if (!token || !url) return 'Webhook registration skipped: token or URL is missing';
    try {
      const result = await this.telegramRequest(token, 'setWebhook', { url, secret_token: secret });
      return String((result.body as { description?: string }).description ?? (result.ok ? 'Webhook registered' : 'Webhook registration failed'));
    } catch (error) {
      return `Webhook request error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  private async telegramRequest(token: string, method: string, body?: Record<string, unknown>): Promise<{ ok: boolean; body: unknown }> {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8_000);
    try { const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: body ? 'POST' : 'GET', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: controller.signal }); return { ok: response.ok, body: await response.json().catch(() => ({})) }; } catch (error) { throw new UnprocessableEntityException({ status: 'error', message: `Telegram connection test failed: ${error instanceof Error ? error.message : String(error)}` }); } finally { clearTimeout(timeout); }
  }
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
