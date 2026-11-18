import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

import { DatabaseService } from '../database/database.service';

interface TelegramUser {
  id?: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

interface TelegramAccount {
  id?: number;
  user_id: number | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
}

interface TelegramProduct {
  id: number;
  name: string;
  sku: string | null;
  price: number | string | null;
  selling_price: number | string | null;
  discount_price: number | string | null;
  stock_quantity: number | string | null;
  image_url: string | null;
}

@Injectable()
export class TelegramWebhookService {
  private readonly logger = new Logger(TelegramWebhookService.name);

  constructor(private readonly database: DatabaseService, private readonly config: ConfigService) {}

  async verify(secret: string | undefined): Promise<void> {
    const configured = await this.setting('telegram_webhook_secret', this.config.get<string>('TELEGRAM_WEBHOOK_SECRET', ''));
    if (!configured) return;
    const received = String(secret ?? '');
    const expected = Buffer.from(configured);
    const actual = Buffer.from(received);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new ForbiddenException({ status: 'error', message: 'Unauthorized webhook signature.' });
    }
  }

  async handle(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updateId = Number(payload.update_id ?? 0);
    if (updateId > 0) {
      const inserted = await this.database.query<{ id: number }>(
        'INSERT INTO telegram_bot_updates (update_id, processed_at, status, created_at, updated_at) VALUES ($1,NOW(),$2,NOW(),NOW()) ON CONFLICT (update_id) DO NOTHING RETURNING id',
        [updateId, 'processed'],
      );
      if (!inserted.rows[0]) return { status: 'ignored_duplicate', update_id: updateId };
    }

    const callback = payload.callback_query as Record<string, unknown> | undefined;
    if (callback) return this.handleCallback(callback);

    const message = (payload.message ?? payload.edited_message) as Record<string, unknown> | undefined;
    const from = message?.from as TelegramUser | undefined;
    const chat = message?.chat as Record<string, unknown> | undefined;
    const chatId = Number(chat?.id ?? 0);
    const telegramId = Number(from?.id ?? 0);
    if (!message || !from || !Number.isSafeInteger(chatId) || chatId === 0 || !Number.isSafeInteger(telegramId) || telegramId <= 0) {
      return { status: 'processed', update_id: updateId || null, update_type: message ? 'message' : Object.keys(payload)[0] ?? 'unknown' };
    }

    const account = await this.syncTelegramAccount(from);
    const location = message.location as Record<string, unknown> | undefined;
    if (location) {
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      const accuracy = Number(location.horizontal_accuracy ?? 0);
      if (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        await this.saveDeliveryLocation(account.id, latitude, longitude, Number.isFinite(accuracy) && accuracy > 0 ? accuracy : null);
        await this.sendMessage(chatId, `📍 <b>Delivery location saved</b>\n\nYour courier can use <b>${latitude.toFixed(5)}, ${longitude.toFixed(5)}</b> for delivery. Open Shop to continue ordering.`, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[{ text: '🛍️ Open TYUSHOP Shop', web_app: { url: await this.setting('telegram_mini_app_url', this.config.get<string>('TELEGRAM_MINI_APP_URL', 'https://tyushop.blog/telegram-app')) } }]] },
        });
        await this.sendMenuPrompt(chatId);
        return { status: 'location_saved', latitude, longitude };
      }
    }
    const text = this.text(message.text);
    const [rawCommand, ...paramParts] = text.split(/\s+/);
    const normalizedCommand = rawCommand.toLowerCase().split('@')[0];
    const quickCommand: Record<string, string> = {
      '🛍️ shop': '/shop',
      '📦 my orders': '/orders',
      '📦 ប្រវត្តិបញ្ជាទិញ': '/orders',
      '💬 support': '/support',
      '💬 ជំនួយ support': '/support',
      '🌐 language': '/language',
      '🌐 ភាសា / language': '/language',
    };
    const command = normalizedCommand.startsWith('/') ? normalizedCommand : quickCommand[text.toLowerCase()] ?? '';
    const parameter = normalizedCommand.startsWith('/') ? paramParts.join(' ').trim() : '';

    if (command) {
      await this.executeCommand(command, parameter, chatId, account);
      return { status: 'command_executed', command };
    }

    const storeName = await this.setting('store_name', 'TYUSHOP');
    await this.sendMessage(chatId, `👋 <b>Hello ${this.escapeHtml(from.first_name || 'Shopper')}!</b>\n\nWelcome to <b>${this.escapeHtml(storeName)}</b>. Choose an option below to shop, view orders, or contact support.`, {
      parse_mode: 'HTML',
      reply_markup: this.mainMenu(),
    });
    return { status: 'message_replied', command: null };
  }

  private async handleCallback(callback: Record<string, unknown>): Promise<Record<string, unknown>> {
    const id = this.text(callback.id);
    const message = callback.message as Record<string, unknown> | undefined;
    const chat = message?.chat as Record<string, unknown> | undefined;
    const from = callback.from as TelegramUser | undefined;
    const chatId = Number(chat?.id ?? 0);
    if (id) await this.telegramRequest('answerCallbackQuery', { callback_query_id: id });
    if (!chatId || !from) return { status: 'callback_acknowledged' };

    const data = this.text(callback.data);
    if (data === 'lang:en' || data === 'lang:km') {
      await this.sendMessage(chatId, data === 'lang:km' ? 'ភាសាត្រូវបានជ្រើសរើសជា ខ្មែរ។' : 'Language selected: English.', { reply_markup: this.mainMenu() });
      return { status: 'language_selected', language: data.slice(5) };
    }
    if (data === 'cmd:products' || data === 'cmd:shop') {
      const account = await this.syncTelegramAccount(from);
      await this.executeCommand(data === 'cmd:products' ? '/products' : '/shop', '', chatId, account);
      return { status: 'command_executed', command: data };
    }
    return { status: 'callback_acknowledged' };
  }

  private async executeCommand(command: string, param: string, chatId: number, account: TelegramAccount): Promise<void> {
    const storeName = await this.setting('store_name', 'TYUSHOP');
    const miniAppUrl = await this.setting('telegram_mini_app_url', this.config.get<string>('TELEGRAM_MINI_APP_URL', 'https://tyushop.blog/telegram-app'));

    switch (command) {
      case '/start':
        await this.sendMessage(chatId, `🌟 <b>Welcome to ${this.escapeHtml(storeName)}!</b> 🌟\n\nShop authentic products in Cambodia with Bakong KHQR, cash on delivery, and live GPS delivery tracking.`, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[{ text: '🛒 Shop Now / ចូលទិញទំនិញ', web_app: { url: miniAppUrl } }]] },
        });
        await this.sendMenuPrompt(chatId);
        return;

      case '/shop':
        await this.sendMessage(chatId, '🛒 <b>Shop Now</b>\n\nOpen the TYUSHOP Mini App to browse products, enter your email and GPS address, and pay with Bakong KHQR.', {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[{ text: '🛍️ Open TYUSHOP Shop', web_app: { url: miniAppUrl } }]] },
        });
        await this.sendMenuPrompt(chatId);
        return;

      case '/products': {
        const products = await this.database.query<TelegramProduct>(`
          SELECT id, name, sku, price, selling_price, discount_price, stock_quantity, image_url
          FROM products
          WHERE status = 'active' AND is_active = TRUE
          ORDER BY is_featured DESC, updated_at DESC, id DESC
          LIMIT 5
        `, []);
        if (!products.rows.length) {
          await this.sendMessage(chatId, '📦 No active products are available right now. Please check again soon.', { reply_markup: this.mainMenu() });
          return;
        }
        await this.sendMessage(chatId, `🔥 <b>Featured products at ${this.escapeHtml(storeName)}</b>\n\nChoose a product to open the shop.`, { parse_mode: 'HTML', reply_markup: this.mainMenu() });
        for (const product of products.rows) await this.sendProductCard(chatId, product, miniAppUrl);
        return;
      }

      case '/orders': {
        if (!account.user_id) {
          await this.sendMessage(chatId, '⚠️ Open the Mini App once to link your customer account, then try My Orders again.', { reply_markup: this.mainMenu() });
          return;
        }
        const orders = await this.database.query<{ order_number: string; total_amount: number | string; status: string; payment_status: string }>(
          'SELECT order_number, total_amount, status, payment_status FROM orders WHERE user_id=$1 ORDER BY id DESC LIMIT 5',
          [account.user_id],
        );
        if (!orders.rows.length) {
          await this.sendMessage(chatId, '📦 You have no orders yet. Tap Shop to start shopping.', { reply_markup: this.mainMenu() });
          return;
        }
        const lines = orders.rows.map((order) => `• <b>#${this.escapeHtml(order.order_number)}</b> — $${Number(order.total_amount ?? 0).toFixed(2)}\n  ${this.escapeHtml(String(order.status))} · ${this.escapeHtml(String(order.payment_status))}`).join('\n');
        await this.sendMessage(chatId, `📦 <b>My Orders</b>\n\n${lines}`, { parse_mode: 'HTML', reply_markup: this.mainMenu() });
        return;
      }

      case '/support': {
        const phone = await this.setting('contact_phone', '016 555 637');
        const support = await this.setting('telegram_support_contact', '@MegaCommerceSupport');
        await this.sendMessage(chatId, `💬 <b>TYUSHOP Support</b>\n\n☎️ ${this.escapeHtml(phone)}\n✈️ ${this.escapeHtml(support)}\n\nWe are available Mon–Sun, 8:00 AM–10:00 PM (GMT+7).`, { parse_mode: 'HTML', reply_markup: this.mainMenu() });
        return;
      }

      case '/language':
        await this.sendMessage(chatId, '🌐 <b>Language / ភាសា</b>\n\nChoose your language:', {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: '🇬🇧 English', callback_data: 'lang:en' }, { text: '🇰🇭 ខ្មែរ', callback_data: 'lang:km' }]],
          },
        });
        return;

      case '/track': {
        if (!param) {
          await this.sendMessage(chatId, '📍 Send an order number after Track, for example: /track ORD-20261118-ABCDE', { reply_markup: this.mainMenu() });
          return;
        }
        const order = await this.database.query<{ order_number: string; status: string; payment_status: string; total_amount: number | string }>(
          'SELECT order_number, status, payment_status, total_amount FROM orders WHERE UPPER(order_number)=UPPER($1) LIMIT 1',
          [param],
        );
        const record = order.rows[0];
        if (!record) {
          await this.sendMessage(chatId, `❌ Order <code>${this.escapeHtml(param)}</code> was not found.`, { parse_mode: 'HTML', reply_markup: this.mainMenu() });
          return;
        }
        const trackingUrl = `${(await this.setting('app_url', 'https://tyushop.blog')).replace(/\/$/, '')}/track-order/${encodeURIComponent(record.order_number)}`;
        await this.sendMessage(chatId, `📍 <b>Order #${this.escapeHtml(record.order_number)}</b>\n\nStatus: <b>${this.escapeHtml(record.status)}</b>\nPayment: <b>${this.escapeHtml(record.payment_status)}</b>\nTotal: <b>$${Number(record.total_amount ?? 0).toFixed(2)}</b>`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🚚 Open GPS Tracking', url: trackingUrl }]] } });
        await this.sendMenuPrompt(chatId);
        return;
      }

      case '/help':
        await this.sendMessage(chatId, 'ℹ️ <b>TYUSHOP Help</b>\n\nUse the menu below to shop, view orders, contact support, or change language.\n\nCommands: /shop, /products, /orders, /track, /support, /language', { parse_mode: 'HTML', reply_markup: this.mainMenu() });
        return;

      default:
        await this.sendMessage(chatId, 'Please choose an option from the menu below.', { reply_markup: this.mainMenu() });
    }
  }

  private async sendProductCard(chatId: number, product: TelegramProduct, miniAppUrl: string): Promise<void> {
    const basePrice = Number(product.selling_price ?? product.price ?? 0);
    const discountPrice = Number(product.discount_price ?? 0);
    const price = discountPrice > 0 && discountPrice < basePrice ? discountPrice : basePrice;
    const stock = Math.max(0, Number(product.stock_quantity ?? 0));
    const caption = `🔥 <b>Restocked! (ទំនិញចូលស្តុកវិញ)</b>\n\n🛍️ <b>${this.escapeHtml(product.name)}</b>\n\n💵 Price: <b>$${price.toFixed(2)} USD</b>\n⚡ Instant delivery after payment\n✅ ${stock > 0 ? 'Limited stock available' : 'Currently out of stock'}`;
    const replyMarkup = { inline_keyboard: [[{ text: '🛒 Buy Now / ទិញឥឡូវនេះ', web_app: { url: miniAppUrl } }]] };
    if (product.image_url) {
      const mediaUrl = product.image_url.startsWith('http')
        ? product.image_url
        : `${(await this.setting('app_url', 'https://tyushop.blog')).replace(/\/$/, '')}/${product.image_url.replace(/^\//, '')}`;
      await this.sendPhoto(chatId, mediaUrl, caption, replyMarkup);
    } else {
      await this.sendMessage(chatId, caption, { parse_mode: 'HTML', reply_markup: replyMarkup });
    }
  }

  private async sendMenuPrompt(chatId: number): Promise<void> {
    await this.sendMessage(chatId, 'Choose an option below / សូមជ្រើសរើសមុខងារ៖', { reply_markup: this.mainMenu() });
  }

  private mainMenu(): Record<string, unknown> {
    return {
      keyboard: [
        [{ text: '🛍️ Shop' }, { text: '📦 ប្រវត្តិបញ្ជាទិញ' }],
        [{ text: '💬 ជំនួយ Support' }, { text: '🌐 ភាសា / Language' }],
        [{ text: '📍 Send Delivery Location', request_location: true }],
      ],
      resize_keyboard: true,
      is_persistent: true,
      input_field_placeholder: 'Choose an option / ជ្រើសរើសមុខងារ',
    };
  }

  private async sendMessage(chatId: number, text: string, extra: Record<string, unknown> = {}): Promise<boolean> {
    return this.telegramRequest('sendMessage', { chat_id: chatId, text, ...extra });
  }

  private async sendPhoto(chatId: number, photo: string, caption: string, replyMarkup: Record<string, unknown>): Promise<boolean> {
    const sent = await this.telegramRequest('sendPhoto', { chat_id: chatId, photo, caption, parse_mode: 'HTML', reply_markup: replyMarkup });
    if (sent) return true;
    return this.sendMessage(chatId, caption, { parse_mode: 'HTML', reply_markup: replyMarkup });
  }

  private async telegramRequest(method: string, payload: Record<string, unknown>): Promise<boolean> {
    const token = await this.setting('telegram_bot_token', this.config.get<string>('TELEGRAM_BOT_TOKEN', ''));
    if (!token) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({})) as { ok?: boolean };
      if (!response.ok || body.ok === false) {
        this.logger.warn(`Telegram ${method} returned HTTP ${response.status}.`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.warn(`Telegram ${method} failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async syncTelegramAccount(from: TelegramUser): Promise<TelegramAccount> {
    const telegramId = Number(from.id ?? 0);
    const username = this.text(from.username) || null;
    const firstName = this.text(from.first_name) || 'Telegram';
    const lastName = this.text(from.last_name) || 'User';
    const language = this.text(from.language_code).slice(0, 10) || 'en';
    const adminChatId = Number(await this.setting('telegram_admin_chat_id', this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID', '0')));
    const isAdmin = adminChatId > 0 && adminChatId === telegramId;
    const result = await this.database.query<TelegramAccount>(`INSERT INTO telegram_accounts (telegram_user_id, telegram_username, first_name, last_name, language_code, is_bot_admin, linked_at, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW(),NOW())
      ON CONFLICT (telegram_user_id) DO UPDATE SET telegram_username=EXCLUDED.telegram_username, first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name, language_code=EXCLUDED.language_code, is_bot_admin=telegram_accounts.is_bot_admin OR EXCLUDED.is_bot_admin, updated_at=NOW()
      RETURNING id, user_id, first_name, last_name, language_code`, [telegramId, username, firstName, lastName, language, isAdmin]);
    return result.rows[0] ?? { id: undefined, user_id: null, first_name: firstName, last_name: lastName, language_code: language };
  }

  private async saveDeliveryLocation(accountId: number | undefined, latitude: number, longitude: number, accuracy: number | null): Promise<void> {
    if (!accountId) return;
    const location = JSON.stringify({ delivery_location: { latitude, longitude, accuracy, updated_at: new Date().toISOString() } });
    const session = await this.database.query<{ id: number }>('SELECT id FROM telegram_chat_sessions WHERE telegram_account_id=$1 ORDER BY updated_at DESC, id DESC LIMIT 1', [accountId]);
    if (session.rows[0]) {
      await this.database.query("UPDATE telegram_chat_sessions SET context_data=(COALESCE(context_data::jsonb, '{}'::jsonb) || $1::jsonb)::json, updated_at=NOW() WHERE id=$2", [location, session.rows[0].id]);
      return;
    }
    await this.database.query("INSERT INTO telegram_chat_sessions (telegram_account_id, session_type, context_data, created_at, updated_at) VALUES ($1,'customer',$2::jsonb,NOW(),NOW())", [accountId, location]);
  }

  private async setting(key: string, fallback: string): Promise<string> {
    const result = await this.database.query<{ setting_value: string | null }>('SELECT setting_value FROM store_settings WHERE setting_key=$1 LIMIT 1', [key]);
    return result.rows[0]?.setting_value || fallback;
  }

  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }

  private escapeHtml(value: unknown): string {
    return this.text(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  }
}
