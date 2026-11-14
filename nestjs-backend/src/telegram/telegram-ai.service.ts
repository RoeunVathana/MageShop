import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

interface TelegramAccountRow { id: number; user_id: number | null; telegram_user_id: number; first_name: string | null; last_name: string | null; language_code: string | null; is_bot_admin: boolean; }

@Injectable()
export class TelegramAiService {
  constructor(private readonly database: DatabaseService, private readonly auth: AuthService) {}

  async chat(body: Record<string, unknown>, authorization?: string): Promise<Record<string, unknown>> {
    const message = this.text(body.message);
    if (!message || message.length > 1000) throw new UnprocessableEntityException({ status: 'error', message: 'The message field is required and must be no longer than 1000 characters.' });
    const language = ['en', 'km'].includes(this.text(body.language)) ? this.text(body.language) : 'en';
    const current = authorization ? await this.auth.authenticate(authorization) : null;
    const account = await this.account(current?.userId, language);
    const requestedSession = this.integer(body.session_id);
    let sessionId: number | null = null;
    if (requestedSession !== null) {
      const existing = await this.database.query<{ id: number }>('SELECT id FROM telegram_chat_sessions WHERE id=$1 AND telegram_account_id=$2 LIMIT 1', [requestedSession, account.id]);
      sessionId = existing.rows[0]?.id ?? null;
    }
    if (!sessionId) {
      const created = await this.database.query<{ id: number }>('INSERT INTO telegram_chat_sessions (telegram_account_id, session_type, context_data, created_at, updated_at) VALUES ($1,$2,$3::jsonb,NOW(),NOW()) RETURNING id', [account.id, account.is_bot_admin ? 'admin' : 'customer', JSON.stringify({ language, customer_id: account.user_id })]);
      sessionId = created.rows[0]?.id ?? null;
    }
    if (!sessionId) throw new Error('Telegram chat session could not be created.');
    await this.database.query('INSERT INTO telegram_ai_messages (session_id, sender, message, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())', [sessionId, 'user', message]);
    const resolved = await this.resolve(message, language);
    await this.database.query('INSERT INTO telegram_ai_messages (session_id, sender, message, tool_calls, created_at, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())', [sessionId, 'assistant', resolved.message, JSON.stringify(resolved.tool_calls)]);
    return { status: 'success', data: { session_id: sessionId, message: resolved.message, tool_calls: resolved.tool_calls } };
  }

  async history(sessionIdValue: string): Promise<Record<string, unknown>> {
    const sessionId = this.integer(sessionIdValue);
    if (sessionId === null) throw new NotFoundException({ status: 'error', message: 'Chat session not found.' });
    const session = await this.database.query<{ id: number; session_type: string; context_data: unknown }>('SELECT id, session_type, context_data FROM telegram_chat_sessions WHERE id=$1 LIMIT 1', [sessionId]);
    if (!session.rows[0]) throw new NotFoundException({ status: 'error', message: 'Chat session not found.' });
    const messages = await this.database.query<Record<string, unknown>>('SELECT id, session_id, sender, message, tool_calls, created_at, updated_at FROM telegram_ai_messages WHERE session_id=$1 ORDER BY id', [sessionId]);
    return { status: 'success', data: { session_id: session.rows[0].id, session_type: session.rows[0].session_type, messages: messages.rows } };
  }

  private async account(userId: number | undefined, language: string): Promise<TelegramAccountRow> {
    if (userId) {
      const linked = await this.database.query<TelegramAccountRow>('SELECT id, user_id, telegram_user_id, first_name, last_name, language_code, is_bot_admin FROM telegram_accounts WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]);
      if (linked.rows[0]) return linked.rows[0];
    }
    const guest = await this.database.query<TelegramAccountRow>('SELECT id, user_id, telegram_user_id, first_name, last_name, language_code, is_bot_admin FROM telegram_accounts WHERE telegram_user_id=100000000 LIMIT 1', []);
    if (guest.rows[0]) return guest.rows[0];
    const created = await this.database.query<TelegramAccountRow>('INSERT INTO telegram_accounts (user_id, telegram_user_id, telegram_username, first_name, last_name, language_code, is_bot_admin, linked_at, created_at, updated_at) VALUES ($1,100000000,$2,$3,$4,$5,FALSE,NOW(),NOW(),NOW()) RETURNING id, user_id, telegram_user_id, first_name, last_name, language_code, is_bot_admin', [userId ?? null, 'guest_shopper', userId ? 'Customer' : 'Guest', 'Shopper', language]);
    if (!created.rows[0]) throw new Error('Telegram guest account could not be created.');
    return created.rows[0];
  }

  private async resolve(text: string, language: string): Promise<{ message: string; tool_calls: Array<Record<string, unknown>> }> {
    const lower = text.toLowerCase();
    const isKhmer = language === 'km' || /[\u1780-\u17ff]/u.test(text);
    const toolCalls: Array<Record<string, unknown>> = [];
    const orderMatch = text.match(/ORD-[A-Z0-9-]+/i);
    if (orderMatch) {
      const order = await this.database.query<{ order_number: string; status: string; payment_status: string; total_amount: number | string; tracking_number: string | null }>('SELECT order_number, status, payment_status, total_amount, tracking_number FROM orders WHERE UPPER(order_number)=UPPER($1) LIMIT 1', [orderMatch[0]]);
      toolCalls.push({ tool: 'getDeliveryStatus', params: { order_number: orderMatch[0] }, result: order.rows[0] ?? { error: `Order #${orderMatch[0]} was not found.` } });
      if (!order.rows[0]) return { message: isKhmer ? `សូមអភ័យទោស ការបញ្ជាទិញ #${orderMatch[0]} មិនត្រូវបានរកឃើញទេ។` : `I couldn't find order #${orderMatch[0]} in our system.`, tool_calls: toolCalls };
      const row = order.rows[0];
      return { message: isKhmer ? `📦 ការបញ្ជាទិញ #${row.order_number}\nស្ថានភាព: ${row.status}\nការទូទាត់: ${row.payment_status}\nសរុប: $${Number(row.total_amount).toFixed(2)}\nតាមដាន: ${row.tracking_number ?? 'មិនទាន់មាន'}` : `📦 Order #${row.order_number}\nFulfillment: ${row.status}\nPayment: ${row.payment_status}\nTotal: $${Number(row.total_amount).toFixed(2)}\nTracking: ${row.tracking_number ?? 'Not yet dispatched'}`, tool_calls: toolCalls };
    }
    if (lower.includes('categor') || lower.includes('ប្រភេទ')) {
      const categories = await this.database.query<{ name: string; product_count: number | string }>('SELECT c.name, COUNT(p.id)::int AS product_count FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.is_active=TRUE WHERE c.is_active=TRUE GROUP BY c.id, c.name ORDER BY c.sort_order, c.id');
      toolCalls.push({ tool: 'getCategories', params: {}, result: categories.rows });
      const list = categories.rows.slice(0, 15).map((row) => `• ${row.name} (${Number(row.product_count)} items)`).join('\n');
      return { message: isKhmer ? `📂 ប្រភេទផលិតផល៖\n${list}` : `📂 Available categories:\n${list || 'No categories are available right now.'}`, tool_calls: toolCalls };
    }
    const search = lower.replace(/^(search|find|show me|do you have|stock of|is there|buy|តម្លៃ|ទិញ)\s+/i, '').trim();
    const term = search.length >= 2 ? search : '%';
    const products = await this.database.query<{ id: number; sku: string | null; name: string; price: number | string | null; discount_price: number | string | null; stock_quantity: number | string | null }>('SELECT id, sku, name, COALESCE(selling_price, price) AS price, discount_price, stock_quantity FROM products WHERE is_active=TRUE AND ($1 = \'%\' OR name ILIKE $2 OR sku ILIKE $2 OR brand ILIKE $2 OR description ILIKE $2) ORDER BY is_featured DESC, id DESC LIMIT 4', [term, `%${term}%`]);
    const result = products.rows.map((row) => ({ ...row, price: Number(row.price ?? 0), discount_price: row.discount_price === null ? null : Number(row.discount_price), stock_quantity: Number(row.stock_quantity ?? 0), in_stock: Number(row.stock_quantity ?? 0) > 0 }));
    toolCalls.push({ tool: 'searchProducts', params: { query: search }, result: { count: result.length, products: result } });
    if (!result.length) return { message: isKhmer ? `ខ្ញុំមិនបានរកឃើញផលិតផលសម្រាប់ “${text}” ទេ។` : `I couldn't find any products matching “${text}”.`, tool_calls: toolCalls };
    const list = result.map((row) => `• ${row.name} (${row.sku ?? 'SKU'}) — $${row.discount_price ?? row.price} — ${row.in_stock ? `In stock (${row.stock_quantity})` : 'Out of stock'}`).join('\n');
    return { message: isKhmer ? `✨ ផលិតផលដែលសមស្រប៖\n${list}` : `✨ Relevant catalog items:\n${list}\n\nOpen the Mini App to view details and checkout.`, tool_calls: toolCalls };
  }

  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
  private integer(value: unknown): number | null { const text = this.text(value); const number = Number(text); return text && Number.isInteger(number) ? number : null; }
}
