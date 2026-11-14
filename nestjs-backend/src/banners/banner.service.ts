import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

interface BannerRow {
  id: number;
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  button_text: string | null;
  background_style: string | null;
  placement: string;
  sort_order: number;
  is_active: boolean;
  start_at: Date | string | null;
  end_at: Date | string | null;
  clicks_count: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class BannerService {
  private readonly placements = ['hero', 'promo', 'category', 'sidebar'];

  constructor(private readonly database: DatabaseService, private readonly auth: AuthService) {}

  async publicList(placement: unknown): Promise<Record<string, unknown>> {
    const selectedPlacement = this.text(placement) || 'hero';
    const result = await this.database.query<BannerRow>(`
      SELECT * FROM banners
      WHERE is_active=TRUE AND placement=$1
        AND (start_at IS NULL OR start_at <= NOW())
        AND (end_at IS NULL OR end_at >= NOW())
      ORDER BY sort_order ASC, id ASC
    `, [selectedPlacement]);
    return { status: 'success', data: result.rows };
  }

  async publicShow(id: number): Promise<Record<string, unknown>> { return { status: 'success', data: await this.find(id) }; }

  async click(id: number): Promise<Record<string, unknown>> {
    const result = await this.database.query<BannerRow>('UPDATE banners SET clicks_count=clicks_count+1, updated_at=NOW() WHERE id=$1 RETURNING clicks_count', [id]);
    if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: 'Banner not found.' });
    return { status: 'success', message: 'Click tracked.', clicks_count: Number(result.rows[0].clicks_count) };
  }

  async adminList(query: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const values: unknown[] = [];
    const filters: string[] = [];
    const search = this.text(query.search);
    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      filters.push(`(LOWER(title) LIKE $${values.length} OR LOWER(subtitle) LIKE $${values.length} OR LOWER(badge_text) LIKE $${values.length})`);
    }
    const placement = this.text(query.placement);
    if (placement) { values.push(placement); filters.push(`placement=$${values.length}`); }
    const status = this.text(query.status);
    if (status === 'active' || status === 'inactive') { values.push(status === 'active'); filters.push(`is_active=$${values.length}`); }
    const allowedSort = ['id', 'sort_order', 'created_at', 'title', 'clicks_count', 'updated_at'];
    const requestedSort = this.text(query.sort_by);
    const sortBy = allowedSort.includes(requestedSort) ? requestedSort : 'id';
    const requestedDirection = (this.text(query.sort_direction) || this.text(query.sort_dir)).toLowerCase();
    const direction = requestedDirection === 'asc' ? 'ASC' : 'DESC';
    const perPage = Math.min(100, Math.max(5, this.number(query.per_page) ?? 20));
    const page = Math.max(1, this.number(query.page) ?? 1);
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const count = await this.database.query<{ total: number | string }>(`SELECT COUNT(*)::int AS total FROM banners ${where}`, values);
    values.push(perPage, (page - 1) * perPage);
    const rows = await this.database.query<BannerRow>(`SELECT * FROM banners ${where} ORDER BY ${sortBy} ${direction}${sortBy === 'sort_order' ? ', id DESC' : ''} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const total = Number(count.rows[0]?.total ?? 0);
    return { status: 'success', data: rows.rows, meta: { total, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage } };
  }

  async adminShow(id: number, userId: number): Promise<Record<string, unknown>> { await this.authorizeAdmin(userId); return { status: 'success', data: await this.find(id) }; }

  async create(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const values = this.validate(body, true);
    values.placement ??= 'hero';
    if (values.sort_order === undefined) {
      const max = await this.database.query<{ max_order: number | string | null }>('SELECT MAX(sort_order) AS max_order FROM banners WHERE placement=$1', [values.placement]);
      values.sort_order = Number(max.rows[0]?.max_order ?? 0) + 1;
    }
    const columns = Object.keys(values);
    const params = Object.values(values);
    const result = await this.database.query<BannerRow>(`INSERT INTO banners (${columns.join(', ')}) VALUES (${params.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`, params);
    return { status: 'success', message: 'Slide banner created successfully.', data: result.rows[0] };
  }

  async update(id: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    await this.find(id);
    const values = this.validate(body, false);
    if (!Object.keys(values).length) throw new UnprocessableEntityException({ status: 'error', message: 'At least one banner field is required.' });
    const params = Object.values(values);
    params.push(id);
    const set = Object.keys(values).map((column, index) => `${column}=$${index + 1}`).join(', ');
    const result = await this.database.query<BannerRow>(`UPDATE banners SET ${set}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params);
    return { status: 'success', message: 'Slide banner updated successfully.', data: result.rows[0] };
  }

  async remove(id: number, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const banner = await this.find(id);
    await this.database.query('DELETE FROM banners WHERE id=$1', [id]);
    return { status: 'success', message: `Slide banner '${banner.title}' deleted successfully.` };
  }

  async toggle(id: number, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const result = await this.database.query<BannerRow>('UPDATE banners SET is_active=NOT is_active, updated_at=NOW() WHERE id=$1 RETURNING *', [id]);
    if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: 'Banner not found.' });
    return { status: 'success', message: `Slide banner is now ${result.rows[0].is_active ? 'active' : 'inactive'}.`, data: result.rows[0] };
  }

  async reorder(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    await this.authorizeAdmin(userId);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) throw new UnprocessableEntityException({ status: 'error', message: 'The items field is required.' });
    await this.database.transaction(async (client) => {
      for (const item of items) {
        const row = item as Record<string, unknown>;
        const id = this.number(row.id);
        const sortOrder = this.number(row.sort_order);
        if (!id || sortOrder === null || sortOrder < 0 || !Number.isInteger(sortOrder)) throw new UnprocessableEntityException({ status: 'error', message: 'Each reorder item needs a valid id and sort_order.' });
        const result = await client.query('UPDATE banners SET sort_order=$1, updated_at=NOW() WHERE id=$2', [sortOrder, id]);
        if (!result.rowCount) throw new NotFoundException({ status: 'error', message: `Banner ${id} not found.` });
      }
    });
    const ordered = await this.database.query<BannerRow>('SELECT * FROM banners ORDER BY sort_order ASC, id ASC');
    return { status: 'success', message: 'Banner display order updated successfully.', data: ordered.rows };
  }

  private async authorizeAdmin(userId: number): Promise<void> {
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN'])) throw new ForbiddenException({ status: 'error', message: 'Unauthorized. Administrator banner management privileges required.' });
  }

  private async find(id: number): Promise<BannerRow> {
    const result = await this.database.query<BannerRow>('SELECT * FROM banners WHERE id=$1 LIMIT 1', [id]);
    if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: 'Banner not found.' });
    return result.rows[0];
  }

  private validate(body: Record<string, unknown>, required: boolean): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    const title = this.text(body.title);
    if (required && !title) throw new UnprocessableEntityException({ status: 'error', message: 'The title field is required.' });
    if (title) values.title = this.limit(title, 255, 'title');
    else if (!required && body.title !== undefined) throw new UnprocessableEntityException({ status: 'error', message: 'The title field is required.' });
    for (const field of ['subtitle', 'badge_text', 'image_url', 'video_url', 'link_url', 'button_text', 'background_style']) {
      if (body[field] !== undefined) values[field] = this.limitNullable(body[field], field === 'subtitle' ? 1000 : field === 'background_style' ? 50 : field === 'button_text' || field === 'badge_text' ? 100 : 2000, field);
    }
    if (body.placement !== undefined) { const placement = this.text(body.placement); if (!this.placements.includes(placement)) throw new UnprocessableEntityException({ status: 'error', message: 'The placement field is invalid.' }); values.placement = placement; }
    if (body.sort_order !== undefined) { const sort = this.number(body.sort_order); if (sort === null || sort < 0 || !Number.isInteger(sort)) throw new UnprocessableEntityException({ status: 'error', message: 'The sort_order field is invalid.' }); values.sort_order = sort; }
    if (body.is_active !== undefined) values.is_active = this.boolean(body.is_active);
    for (const field of ['start_at', 'end_at']) if (body[field] !== undefined) values[field] = this.dateOrNull(body[field], field);
    return values;
  }

  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
  private limit(value: string, max: number, field: string): string { if (value.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is too long.` }); return value; }
  private limitNullable(value: unknown, max: number, field: string): string | null { const text = this.text(value); return text ? this.limit(text, max, field) : null; }
  private number(value: unknown): number | null { const text = this.text(value); if (!text) return null; const number = Number(text); return Number.isFinite(number) ? number : null; }
  private boolean(value: unknown): boolean { return value === true || ['true', '1', 'yes', 'on'].includes(this.text(value).toLowerCase()); }
  private dateOrNull(value: unknown, field: string): Date | null { const text = this.text(value); if (!text) return null; const date = new Date(text); if (Number.isNaN(date.valueOf())) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return date; }
}
