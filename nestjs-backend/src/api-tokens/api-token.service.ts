import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

interface TokenRow { id: number; name: string; abilities: string | string[] | null; last_used_at: Date | string | null; expires_at: Date | string | null; created_at: Date | string | null; user_id: number; user_name: string | null; user_email: string | null; user_status: string | null; }

@Injectable()
export class ApiTokenService {
  constructor(private readonly database: DatabaseService, private readonly auth: AuthService) {}

  async list(query: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorize(userId); const values: unknown[] = []; const filters: string[] = [];
    const search = this.text(query.search); if (search) { values.push(`%${search.toLowerCase()}%`); filters.push(`(LOWER(pat.name) LIKE $${values.length} OR LOWER(u.name) LIKE $${values.length} OR LOWER(u.email) LIKE $${values.length})`); }
    const page = Math.max(1, this.number(query.page) ?? 1); const perPage = Math.min(100, Math.max(5, this.number(query.per_page) ?? 20)); const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const count = await this.database.query<{ total: number | string }>(`SELECT COUNT(*)::int AS total FROM personal_access_tokens pat JOIN users u ON u.id=pat.tokenable_id AND pat.tokenable_type='App\\Models\\User' ${where}`, values);
    values.push(perPage, (page - 1) * perPage);
    const rows = await this.database.query<TokenRow>(`SELECT pat.id,pat.name,pat.abilities,pat.last_used_at,pat.expires_at,pat.created_at, u.id AS user_id,u.name AS user_name,u.email AS user_email,u.status AS user_status FROM personal_access_tokens pat JOIN users u ON u.id=pat.tokenable_id AND pat.tokenable_type='App\\Models\\User' ${where} ORDER BY pat.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const total = Number(count.rows[0]?.total ?? 0);
    return { status: 'success', data: rows.rows.map((row) => this.resource(row)), meta: { total, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage } };
  }

  async create(body: Record<string, unknown>, actorId: number): Promise<Record<string, unknown>> {
    await this.authorize(actorId); const name = this.required(body.name, 'name', 100); const targetId = this.number(body.user_id) ?? actorId; const user = await this.database.query<{ id: number; name: string; email: string }>('SELECT id,name,email FROM users WHERE id=$1 LIMIT 1', [targetId]); if (!user.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: 'The selected user is invalid.' });
    const abilities = this.abilities(body.abilities); const expiresDays = this.number(body.expires_in_days); const secret = randomBytes(30).toString('hex'); const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 86400000) : null;
    const inserted = await this.database.query<{ id: number; name: string; abilities: string; expires_at: Date | null; created_at: Date }>(`INSERT INTO personal_access_tokens (tokenable_type,tokenable_id,name,token,abilities,expires_at,created_at,updated_at) VALUES ('App\\Models\\User',$1,$2,$3,$4,$5,NOW(),NOW()) RETURNING id,name,abilities,expires_at,created_at`, [targetId, name, createHash('sha256').update(secret).digest('hex'), JSON.stringify(abilities), expiresAt]);
    const token = inserted.rows[0]; return { status: 'success', message: 'API token key generated successfully. Copy this key now as it will not be displayed again.', data: { id: token.id, name: token.name, plain_text_token: `${token.id}|${secret}`, abilities, expires_at: token.expires_at?.toISOString() ?? null, created_at: token.created_at?.toISOString() ?? null, user: user.rows[0] } };
  }

  async remove(id: number, actorId: number): Promise<Record<string, unknown>> { await this.authorize(actorId); const result = await this.database.query<{ name: string }>('DELETE FROM personal_access_tokens WHERE id=$1 RETURNING name', [id]); if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: 'API token not found.' }); return { status: 'success', message: `API token '${result.rows[0].name}' has been permanently revoked.` }; }

  async regenerate(id: number, actorId: number): Promise<Record<string, unknown>> {
    await this.authorize(actorId); const old = await this.database.query<{ id: number; name: string; abilities: string | null; expires_at: Date | null; user_id: number; user_name: string; user_email: string }>(`SELECT pat.id,pat.name,pat.abilities,pat.expires_at,u.id AS user_id,u.name AS user_name,u.email AS user_email FROM personal_access_tokens pat JOIN users u ON u.id=pat.tokenable_id AND pat.tokenable_type='App\\Models\\User' WHERE pat.id=$1 LIMIT 1`, [id]); const current = old.rows[0]; if (!current) throw new NotFoundException({ status: 'error', message: 'API token not found.' });
    const secret = randomBytes(30).toString('hex'); const inserted = await this.database.transaction(async (client) => { await client.query('DELETE FROM personal_access_tokens WHERE id=$1', [id]); return client.query<{ id: number; created_at: Date }>(`INSERT INTO personal_access_tokens (tokenable_type,tokenable_id,name,token,abilities,expires_at,created_at,updated_at) VALUES ('App\\Models\\User',$1,$2,$3,$4,$5,NOW(),NOW()) RETURNING id,created_at`, [current.user_id, current.name, createHash('sha256').update(secret).digest('hex'), current.abilities ?? '["*"]', current.expires_at]); });
    return { status: 'success', message: 'API token key regenerated successfully. Store the new key securely.', data: { id: inserted.rows[0].id, name: current.name, plain_text_token: `${inserted.rows[0].id}|${secret}`, abilities: this.parseAbilities(current.abilities), expires_at: current.expires_at?.toISOString() ?? null, created_at: inserted.rows[0].created_at?.toISOString() ?? null, user: { id: current.user_id, name: current.user_name, email: current.user_email } } };
  }

  private async authorize(userId: number): Promise<void> { const user = await this.auth.me(userId); if (!this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN'])) throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Administrator API key management privileges required.' }); }
  private resource(row: TokenRow): Record<string, unknown> { const expired = row.expires_at ? new Date(row.expires_at).getTime() <= Date.now() : false; return { id: row.id, name: row.name, abilities: this.parseAbilities(row.abilities), last_used_at: row.last_used_at ? new Date(row.last_used_at).toISOString() : null, expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null, is_expired: expired, created_at: row.created_at ? new Date(row.created_at).toISOString() : null, user: row.user_id ? { id: row.user_id, name: row.user_name, email: row.user_email, status: row.user_status } : null }; }
  private abilities(value: unknown): string[] { if (value === undefined || value === null) return ['*']; if (!Array.isArray(value)) throw new UnprocessableEntityException({ status: 'error', message: 'The abilities field is invalid.' }); const result = value.map((item) => String(item).trim()).filter(Boolean); if (!result.length || result.some((item) => item.length > 50)) throw new UnprocessableEntityException({ status: 'error', message: 'The abilities field is invalid.' }); return result; }
  private parseAbilities(value: string | string[] | null): string[] { if (Array.isArray(value)) return value; try { const parsed = JSON.parse(value ?? '["*"]'); return Array.isArray(parsed) ? parsed.map(String) : ['*']; } catch { return ['*']; } }
  private required(value: unknown, field: string, max: number): string { const text = this.text(value); if (!text || text.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return text; }
  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
  private number(value: unknown, fallback?: number): number | null { if (value === undefined || value === null || value === '') return fallback ?? null; const result = Number(value); return Number.isInteger(result) && result > 0 ? result : null; }
}
