import { ConflictException, Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';

import { DatabaseService } from '../database/database.service';
import type { AuthUser } from './auth.types';

interface UserRow {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  address: string | null;
  password: string;
  loyalty_points: number | string | null;
  status: string;
  email_verified_at: Date | string | null;
}

interface RoleRow {
  id: number;
  name: string;
  slug: string;
}

interface PermissionRow {
  id: number;
  name: string;
  slug: string;
}

interface TokenRow {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date | string | null;
}

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  async register(payload: Record<string, unknown>): Promise<{ token: string; user: AuthUser }> {
    const name = this.requiredString(payload.name, 'name', 100);
    const email = this.email(payload.email);
    const password = this.password(payload.password);
    const phone = this.optionalString(payload.phone_number, 30);

    const duplicate = await this.database.query<{ id: number }>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR ($2::text IS NOT NULL AND phone_number = $2) LIMIT 1',
      [email, phone],
    );
    if (duplicate.rows.length) {
      throw new ConflictException({
        status: 'error',
        message: 'The email or phone number has already been taken.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await this.database.query<{ id: number }>(`
      INSERT INTO users (name, email, phone_number, password, status, loyalty_points, email_verified_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'active', 0, NOW(), NOW(), NOW())
      RETURNING id
    `, [name.trim(), email, phone, passwordHash]);

    const userId = inserted.rows[0]?.id;
    if (!userId) throw new Error('User registration did not return an ID.');
    await this.attachCustomerRole(userId);

    const user = await this.findUser(userId);
    const token = await this.createToken(userId);
    return { token, user };
  }

  async login(payload: Record<string, unknown>): Promise<{ token: string; user: AuthUser }> {
    const email = this.email(payload.email);
    const password = this.requiredString(payload.password, 'password', 255);
    const result = await this.database.query<UserRow>(
      'SELECT id, name, email, phone_number, avatar_url, address, password, loyalty_points, status, email_verified_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email],
    );
    const user = result.rows[0];
    const compatibleHash = user?.password?.startsWith('$2y$')
      ? `$2a$${user.password.slice(4)}`
      : user?.password;
    if (!user || user.status !== 'active' || !compatibleHash || !(await bcrypt.compare(password, compatibleHash))) {
      throw new UnauthorizedException({ status: 'error', message: 'These credentials do not match our records.' });
    }

    return { token: await this.createToken(user.id), user: await this.findUser(user.id) };
  }

  async me(userId: number): Promise<AuthUser> {
    return this.findUser(userId);
  }

  hasAnyRole(user: AuthUser, roles: readonly string[]): boolean {
    const expected = new Set(roles.map((role) => role.toUpperCase()));
    return user.roles.some((role) => expected.has(role.name.toUpperCase()) || expected.has(role.slug.toUpperCase()));
  }

  async authenticate(authorization: string | undefined): Promise<{ userId: number; tokenId: number } | null> {
    const value = authorization?.trim() ?? '';
    if (!/^Bearer\s+[^|]+\|.+$/i.test(value)) return null;
    const [, plainToken] = value.split(/\s+/, 2);
    const [tokenId, secret] = plainToken.split('|', 2);
    if (!/^\d+$/.test(tokenId) || !secret) return null;

    const tokenHash = createHash('sha256').update(secret).digest('hex');
    const result = await this.database.query<TokenRow>(`
      SELECT id, user_id, token, expires_at
      FROM personal_access_tokens
      WHERE id = $1 AND token = $2
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `, [Number(tokenId), tokenHash]);
    const token = result.rows[0];
    if (!token) return null;

    await this.database.query('UPDATE personal_access_tokens SET last_used_at = NOW(), updated_at = NOW() WHERE id = $1', [token.id]);
    return { userId: token.user_id, tokenId: token.id };
  }

  async revokeToken(tokenId: number | undefined): Promise<void> {
    if (tokenId) await this.database.query('DELETE FROM personal_access_tokens WHERE id = $1', [tokenId]);
  }

  async revokeOtherTokens(userId: number, currentTokenId: number | undefined): Promise<void> {
    if (currentTokenId) {
      await this.database.query('DELETE FROM personal_access_tokens WHERE user_id = $1 AND id <> $2', [userId, currentTokenId]);
    } else {
      await this.database.query('DELETE FROM personal_access_tokens WHERE user_id = $1', [userId]);
    }
  }

  private async findUser(userId: number): Promise<AuthUser> {
    const result = await this.database.query<UserRow>(`
      SELECT id, name, email, phone_number, avatar_url, address, password,
             loyalty_points, status, email_verified_at
      FROM users WHERE id = $1 LIMIT 1
    `, [userId]);
    const user = result.rows[0];
    if (!user) throw new UnauthorizedException({ status: 'error', message: 'Unauthenticated.' });

    const roles = await this.database.query<RoleRow>(`
      SELECT r.id, r.name, r.slug
      FROM roles r
      INNER JOIN role_user ru ON ru.role_id = r.id
      WHERE ru.user_id = $1
      ORDER BY r.id
    `, [userId]);

    const permissions = await this.database.query<PermissionRow>(`
      SELECT DISTINCT p.id, p.name, p.slug
      FROM permissions p
      INNER JOIN role_permissions rp ON rp.permission_id = p.id
      INNER JOIN role_user ru ON ru.role_id = rp.role_id
      WHERE ru.user_id = $1
      ORDER BY p.id
    `, [userId]);
    const permissionList = permissions.rows;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      avatar_url: user.avatar_url,
      address: user.address,
      loyalty_points: Number(user.loyalty_points ?? 0),
      status: user.status,
      email_verified_at: user.email_verified_at,
      roles: roles.rows.map((role) => ({ ...role, permissions: permissionList })),
    };
  }

  private async createToken(userId: number): Promise<string> {
    const secret = randomBytes(30).toString('hex');
    const tokenHash = createHash('sha256').update(secret).digest('hex');
    const inserted = await this.database.query<{ id: number }>(`
      INSERT INTO personal_access_tokens (tokenable_type, tokenable_id, name, token, abilities, created_at, updated_at)
      VALUES ('App\\Models\\User', $1, 'auth-token', $2, '["*"]', NOW(), NOW())
      RETURNING id
    `, [userId, tokenHash]);
    return `${inserted.rows[0]?.id}|${secret}`;
  }

  private async attachCustomerRole(userId: number): Promise<void> {
    const role = await this.database.query<{ id: number }>(
      "SELECT id FROM roles WHERE LOWER(slug) = 'customer' OR UPPER(name) = 'CUSTOMER' ORDER BY id LIMIT 1",
    );
    if (role.rows[0]) {
      await this.database.query(
        'INSERT INTO role_user (user_id, role_id, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT DO NOTHING',
        [userId, role.rows[0].id],
      );
    }
  }

  private requiredString(value: unknown, field: string, maxLength: number): string {
    const text = value === null || value === undefined ? '' : String(value).trim();
    if (!text || text.length > maxLength) {
      throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` });
    }
    return text;
  }

  private optionalString(value: unknown, maxLength: number): string | null {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    return this.requiredString(value, 'phone_number', maxLength);
  }

  private email(value: unknown): string {
    const email = this.requiredString(value, 'email', 255).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new UnprocessableEntityException({ status: 'error', message: 'The email must be a valid email address.' });
    }
    return email;
  }

  private password(value: unknown): string {
    const password = this.requiredString(value, 'password', 255);
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      throw new UnprocessableEntityException({ status: 'error', message: 'The password must be at least 8 characters and include uppercase, lowercase, and a number.' });
    }
    return password;
  }
}
