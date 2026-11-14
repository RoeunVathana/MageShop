import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class EngagementService {
  constructor(private readonly database: DatabaseService, private readonly auth: AuthService) {}

  async loyalty(request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    const userId = await this.optionalUserId(request);
    const settings = await this.readSettings(['loyalty_free_item_max_price', 'loyalty_points_for_free_item', 'loyalty_points_per_purchase']);
    const points = userId ? Number((await this.database.query<{ loyalty_points: number | string }>('SELECT loyalty_points FROM users WHERE id=$1 LIMIT 1', [userId])).rows[0]?.loyalty_points ?? 0) : 0;
    const required = Number(settings.get('loyalty_points_for_free_item') ?? 100);
    return { status: 'ok', data: { loyalty_points: points, can_redeem_free_item: points >= required } };
  }

  async wishlist(request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    const userId = await this.optionalUserId(request);
    if (!userId) return { status: 'ok', data: [] };
    const ids = await this.database.query<{ product_id: number }>('SELECT product_id FROM wishlists WHERE user_id=$1 ORDER BY id DESC', [userId]);
    if (!ids.rows.length) return { status: 'ok', data: [] };
    const products = await this.database.query<Record<string, unknown>>('SELECT * FROM products WHERE id = ANY($1::int[])', [ids.rows.map((row) => row.product_id)]);
    return { status: 'ok', data: products.rows };
  }

  async toggleWishlist(body: Record<string, unknown>, request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    const productId = this.integer(body.product_id, 'product_id');
    const product = await this.database.query<{ id: number }>('SELECT id FROM products WHERE id=$1 LIMIT 1', [productId]);
    if (!product.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: 'The selected product is invalid.' });
    const userId = await this.optionalUserId(request);
    if (!userId) return { status: 'ok', action: 'guest_local', message: 'Saved to your favorites!' };
    const exists = await this.database.query<{ id: number }>('SELECT id FROM wishlists WHERE user_id=$1 AND product_id=$2 LIMIT 1', [userId, productId]);
    if (exists.rows[0]) { await this.database.query('DELETE FROM wishlists WHERE user_id=$1 AND product_id=$2', [userId, productId]); return { status: 'ok', action: 'removed', message: 'Removed from your favorites.' }; }
    await this.database.query('INSERT INTO wishlists (user_id, product_id, created_at, updated_at) VALUES ($1,$2,NOW(),NOW()) ON CONFLICT (user_id,product_id) DO NOTHING', [userId, productId]);
    return { status: 'ok', action: 'added', message: 'Added to your favorites!' };
  }

  async ticket(body: Record<string, unknown>, request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    const name = this.required(body.name, 'name', 120); const email = this.email(body.email); const subject = this.required(body.subject, 'subject', 200); const message = this.required(body.message, 'message', 3000);
    const category = this.optional(body.category, 50) ?? 'general'; const orderNumber = this.optional(body.order_number, 60); const ticketNumber = `SUP-${this.datePart()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const userId = await this.optionalUserId(request);
    await this.database.query(`INSERT INTO support_tickets (ticket_number,user_id,name,email,subject,category,order_number,message,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',NOW(),NOW())`, [ticketNumber, userId, name, email, subject, category, orderNumber, message]);
    return { status: 'ok', message: `Support Ticket #${ticketNumber} received! Our 24/7 Cambodia Support Specialist will respond shortly.`, data: { ticket_number: ticketNumber, status: 'open' } };
  }

  async chat(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const message = this.required(body.message, 'message', 1000).toLowerCase();
    let reply = '👋 Welcome to **TYUSHOP 24/7 Supporter**! I can help you with:\n• **Loyalty Points**: Earn +5 pts per order, redeem 100 pts for a FREE item under $20–$30\n• **Discount Coupons**: Try `WELCOME10`, `MEGA20`, or `KHQR5` at checkout\n• **Live GPS Tracking**: Watch your courier in real time on `/track-order`\n• **Direct Hotline**: 016 555 637 or submit a ticket on `/contact`.';
    if (/(point|free|100|ពិន្ទុ)/.test(message)) reply = '🎁 **TYUSHOP Loyalty Rewards**: Every order earns **+5 Points**. Once you reach **100 Points**, exchange them for an eligible product priced up to **$30.00** free!';
    else if (/(discount|coupon|code|promo)/.test(message)) reply = '🏷️ **Active Discount Codes**: Use **`WELCOME10`**, **`MEGA20`**, **`KHQR5`**, or **`VIP30`** at checkout.';
    else if (/(track|delivery|location|where)/.test(message)) reply = '🚚 **Real-Time GPS Delivery Tracking**: Open **Track Live Delivery** or visit `/track-order` to view the courier location and ETA.';
    return { status: 'ok', data: { reply, timestamp: new Date().toISOString() } };
  }

  private async optionalUserId(request: AuthenticatedRequest): Promise<number | null> { const identity = await this.auth.authenticate(request.headers.authorization); return identity?.userId ?? null; }
  private async readSettings(keys: string[]): Promise<Map<string, string>> { const result = await this.database.query<{ setting_key: string; setting_value: string }>('SELECT setting_key,setting_value FROM store_settings WHERE setting_key=ANY($1::text[])', [keys]); return new Map(result.rows.map((row) => [row.setting_key, row.setting_value])); }
  private required(value: unknown, field: string, max: number): string { const text = String(value ?? '').trim(); if (!text || text.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return text; }
  private optional(value: unknown, max: number): string | null { const text = String(value ?? '').trim(); if (!text) return null; if (text.length > max) throw new UnprocessableEntityException({ status: 'error', message: 'The given data was invalid.' }); return text; }
  private email(value: unknown): string { const email = this.required(value, 'email', 150).toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) throw new UnprocessableEntityException({ status: 'error', message: 'The email must be a valid email address.' }); return email; }
  private integer(value: unknown, field: string): number { const number = Number(value); if (!Number.isInteger(number) || number < 1) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return number; }
  private datePart(): string { const now = new Date(); return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`; }
}
