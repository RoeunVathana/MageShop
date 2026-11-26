import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';
import { ReceiptService } from '../receipts/receipt.service';

@Injectable()
export class EngagementService {
  private readonly lastSupportRequestByKey = new Map<string, number>();
  private readonly supportSettingsCache = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly database: DatabaseService, private readonly auth: AuthService, private readonly receipts: ReceiptService, private readonly config: ConfigService) {}

  async loyalty(request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    const userId = await this.optionalUserId(request);
    const settings = await this.readSettings(['loyalty_free_item_max_price', 'loyalty_points_for_free_item', 'loyalty_points_per_purchase']);
    const points = userId ? Number((await this.database.query<{ loyalty_points: number | string }>('SELECT loyalty_points FROM users WHERE id=$1 LIMIT 1', [userId])).rows[0]?.loyalty_points ?? 0) : 0;
    const required = Number(settings.get('loyalty_points_for_free_item') ?? 100);
    return { status: 'ok', data: { loyalty_points: points, can_redeem_free_item: points >= required } };
  }

  async redeemFreeItem(body: Record<string, unknown>, request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    const productId = this.integer(body.product_id, 'product_id');
    const userId = request.authUserId ?? (await this.optionalUserId(request));
    if (!userId) throw new UnprocessableEntityException({ status: 'error', message: 'Authentication is required to redeem loyalty points.' });
    const customerName = this.optional(body.customer_name, 120);
    const customerPhone = this.optional(body.customer_phone, 40);
    const address = this.optional(body.delivery_address, 500);
    const settings = await this.readSettings(['loyalty_free_item_max_price', 'loyalty_points_for_free_item']);
    const maxPrice = Number(settings.get('loyalty_free_item_max_price') ?? 30);
    const pointsRequired = Number(settings.get('loyalty_points_for_free_item') ?? 100);
    const result = await this.database.transaction(async (client) => {
      const user = (await client.query<{ id: number; name: string; email: string; phone_number: string | null; address: string | null; loyalty_points: number | string }>('SELECT id,name,email,phone_number,address,loyalty_points FROM users WHERE id=$1 LIMIT 1 FOR UPDATE', [userId])).rows[0];
      if (!user) throw new UnprocessableEntityException({ status: 'error', message: 'Authenticated user was not found.' });
      const product = (await client.query<{ id: number; name: string; sku: string | null; price: number | string | null; selling_price: number | string | null; discount_price: number | string | null; is_active: boolean }>('SELECT id,name,sku,price,selling_price,discount_price,is_active FROM products WHERE id=$1 LIMIT 1 FOR UPDATE', [productId])).rows[0];
      if (!product || !product.is_active) throw new UnprocessableEntityException({ status: 'error', message: 'Selected free reward product was not found.' });
      const base = Number(product.selling_price ?? product.price ?? 0);
      const effective = product.discount_price !== null && Number(product.discount_price) > 0 ? Number(product.discount_price) : base;
      if (effective > maxPrice) throw new UnprocessableEntityException({ status: 'error', message: `Product '${product.name}' ($${effective}) exceeds the $${maxPrice.toFixed(2)} max price for 100-point free exchange.` });
      if (Number(user.loyalty_points ?? 0) < pointsRequired) throw new UnprocessableEntityException({ status: 'error', message: `Insufficient points. You have ${Number(user.loyalty_points ?? 0)} points, but ${pointsRequired} points are required to exchange for a free item.` });
      const inventory = (await client.query<{ quantity_on_hand: number | string; quantity_reserved: number | string }>('SELECT quantity_on_hand,quantity_reserved FROM inventories WHERE product_id=$1 LIMIT 1 FOR UPDATE', [productId])).rows[0];
      if (inventory && Number(inventory.quantity_on_hand) - Number(inventory.quantity_reserved) < 1) throw new UnprocessableEntityException({ status: 'error', message: `Insufficient stock for ${product.name}.` });
      const orderNumber = `RWD-${this.datePart()}-${randomBytes(3).toString('hex').toUpperCase().slice(0, 5)}`;
      const order = (await client.query<{ id: number }>(`
        INSERT INTO orders (order_number,user_id,status,subtotal,discount,coupon_code,points_earned,points_redeemed,free_reward_product_id,shipping_fee,tax,total_amount,currency,payment_status,payment_method,customer_name,customer_email,customer_phone,delivery_address,created_at,updated_at)
        VALUES ($1,$2,'pending',$3,$3,'100PT-FREE-REWARD',0,$4,$5,0,0,0,'USD','paid','loyalty_points',$6,$7,$8,$9,NOW(),NOW()) RETURNING id
      `, [orderNumber, user.id, effective, pointsRequired, product.id, customerName ?? user.name, user.email, customerPhone ?? user.phone_number, address ?? user.address])).rows[0];
      if (!order) throw new Error('Loyalty redemption did not return an order ID.');
      await client.query('INSERT INTO order_items (order_id,product_id,product_name,product_sku,quantity,unit_price,total_price,created_at,updated_at) VALUES ($1,$2,$3,$4,1,0,0,NOW(),NOW())', [order.id, product.id, `[FREE 100-PT EXCHANGE] ${product.name}`, product.sku]);
      const newPoints = Number(user.loyalty_points) - pointsRequired;
      await client.query('UPDATE users SET loyalty_points=$1,updated_at=NOW() WHERE id=$2', [newPoints, user.id]);
      await client.query("INSERT INTO loyalty_transactions (user_id,order_id,type,points,description,created_at,updated_at) VALUES ($1,$2,'redeemed',$3,$4,NOW(),NOW())", [user.id, order.id, -pointsRequired, `Exchanged ${pointsRequired} points for FREE product: ${product.name}`]);
      return { orderId: order.id, orderNumber, productName: product.name, newPoints };
    });
    void this.receipts.sendOrderConfirmation(result.orderId).catch(() => undefined);
    const order = await this.database.query<Record<string, unknown>>('SELECT * FROM orders WHERE id=$1 LIMIT 1', [result.orderId]);
    const items = await this.database.query<Record<string, unknown>>('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id', [result.orderId]);
    return { status: 'ok', message: `Congratulations! You exchanged ${pointsRequired} points for '${result.productName}' ($0.00 FREE)!`, data: { order: { ...(order.rows[0] ?? {}), items: items.rows }, points_redeemed: pointsRequired, new_loyalty_points: result.newPoints, tracking_url: `/track-order/${result.orderNumber}` } };
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

  async chat(body: Record<string, unknown>, authorization?: string): Promise<Record<string, unknown>> {
    const question = this.required(body.message, 'message', 1000);
    const language = this.text(body.language) === 'km' || /[\u1780-\u17ff]/u.test(question) ? 'Khmer' : 'English';
    const history = this.normalizeSupportHistory(body.history);
    const identity = authorization ? await this.auth.authenticate(authorization) : null;
    const userId = identity?.userId ?? null;
    const supportKey = userId ? `user:${userId}` : 'guest';
    const now = Date.now();
    const lastRequest = this.lastSupportRequestByKey.get(supportKey) ?? 0;
    if (now - lastRequest < 900) throw new UnprocessableEntityException({ status: 'error', message: 'Please wait a moment before asking TYUSHOP AI again.' });
    this.lastSupportRequestByKey.set(supportKey, now);

    const context = await this.supportContext(question, userId);
    const prompt = this.supportPrompt(question, history, language, context);
    const provider = this.text(this.config.get<string>('AI_PROVIDER') || 'gemini').toLowerCase();
    const compatibilityKey = this.config.get<string>('AI_API_KEY')?.trim() || '';
    const openAiKey = this.config.get<string>('OPENAI_API_KEY')?.trim() || (provider === 'openai' ? compatibilityKey : '');
    const geminiKey = this.config.get<string>('GEMINI_API_KEY')?.trim() || (provider === 'gemini' ? compatibilityKey : '');

    if (openAiKey) {
      try {
        const answer = await this.openAiSupport(openAiKey, prompt);
        return { status: 'ok', data: { answer, reply: answer, source: 'ai', configured: true, timestamp: new Date().toISOString() } };
      } catch (error) {
        console.warn(`TYUSHOP OpenAI support failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    if (geminiKey) {
      try {
        const answer = await this.geminiSupport(geminiKey, prompt, language);
        return { status: 'ok', data: { answer, reply: answer, source: 'ai', configured: true, timestamp: new Date().toISOString() } };
      } catch (error) {
        console.warn(`TYUSHOP Gemini support failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    const reply = this.supportFallback(question, language, context);
    return { status: 'ok', data: { answer: reply, reply, source: 'fallback', configured: Boolean(openAiKey || geminiKey), timestamp: new Date().toISOString() } };
  }

  async speech(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const text = this.required(body.text, 'text', 1000);
    const language = this.text(body.language).toLowerCase() === 'en' ? 'en' : 'km';
    const provider = this.text(this.config.get<string>('AI_PROVIDER') || 'gemini').toLowerCase();
    const compatibilityKey = this.config.get<string>('AI_API_KEY')?.trim() || '';
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim() || (provider === 'gemini' ? compatibilityKey : '');
    if (!apiKey) throw new Error('Gemini speech generation is not configured.');

    const configuredModel = (this.config.get<string>('GEMINI_TTS_MODEL', 'gemini-3.8-flash-lite-tts').trim() || 'gemini-3.8-flash-lite-tts').replace(/^models\//u, '');
    const models = Array.from(new Set([
      configuredModel,
      'gemini-3.8-flash-lite-tts',
      'gemini-3.8-flash-tts',
      'gemini-3.1-flash-tts-preview',
    ]));
    let lastError: Error | null = null;
    for (const model of models) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            input: [{
              type: 'user_input',
              content: [{
                type: 'text',
                text,
                annotations: [{
                  type: 'speech_metadata',
                  style: language === 'km' ? 'speak naturally and clearly in Khmer' : 'speak naturally and clearly in English',
                }],
              }],
            }],
            response_format: { type: 'audio' },
            generation_config: {
              speech_config: [{ voice: this.config.get<string>('GEMINI_TTS_VOICE', 'Kore') }],
            },
          }),
          signal: controller.signal,
        });
        const data = await response.json() as {
          output_audio?: { data?: string; mime_type?: string };
          steps?: Array<{ type?: string; content?: Array<{ type?: string; data?: string; mime_type?: string }> }>;
          error?: { message?: string };
        };
        if (!response.ok) throw new Error(data.error?.message || `Gemini speech returned HTTP ${response.status}`);
        const stepAudioPart = data.steps?.flatMap((step) => step.type === 'model_output' ? step.content || [] : [])
          .find((part) => part.type === 'audio' && part.data);
        const audioBase64 = data.output_audio?.data || stepAudioPart?.data;
        if (!audioBase64) throw new Error(`Gemini returned no audio for model ${model}.`);
        return {
          status: 'ok',
          data: {
            audioBase64,
            mimeType: data.output_audio?.mime_type || stepAudioPart?.mime_type || 'audio/wav',
            language,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Gemini speech generation failed.');
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError || new Error('Gemini speech generation failed.');
  }

  private async openAiSupport(apiKey: string, prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini'), instructions: this.supportInstructions(), input: prompt, max_output_tokens: 320 }),
        signal: controller.signal,
      });
      const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message || `OpenAI returned HTTP ${response.status}`);
      const answer = data.output_text || data.output?.flatMap((item) => item.content || []).map((content) => content.text || '').join('').trim();
      if (!answer) throw new Error('OpenAI returned an empty support answer.');
      return answer;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async geminiSupport(apiKey: string, prompt: string, language: string): Promise<string> {
    const configuredModel = this.config.get<string>('GEMINI_TEXT_MODEL', this.config.get<string>('AI_MODEL', 'gemini-3.5-flash-lite'));
    const model = configuredModel.replace(/^models\//u, '').trim() || 'gemini-3.5-flash-lite';
    // Put the low-latency support model first. The configured model remains a
    // fallback so a slower or temporarily unavailable model cannot delay every
    // customer question before a usable answer is attempted.
    const models = Array.from(new Set(['gemini-3.5-flash-lite', model, 'gemini-3.6-flash', 'gemini-2.5-flash-lite']));
    let lastError: Error | null = null;
    for (let index = 0; index < models.length; index += 1) {
      const candidateModel = models[index];
      const attemptController = new AbortController();
      const attemptTimeout = setTimeout(() => attemptController.abort(), 6500);
      try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: candidateModel,
            input: prompt,
            system_instruction: this.supportInstructions(),
            generation_config: {
              max_output_tokens: 220,
              temperature: 0.25,
              ...(candidateModel === 'gemini-2.5-flash-lite' ? {} : { thinking_level: 'minimal' }),
            },
            store: false,
          }),
          signal: attemptController.signal,
        });
        const data = await response.json() as {
          output_text?: string;
          steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
          status?: string;
          error?: { message?: string };
        };
        if (!response.ok) throw new Error(data.error?.message || `Gemini returned HTTP ${response.status}`);
        const answer = data.output_text?.trim() || data.steps
          ?.filter((step) => step.type === 'model_output')
          .flatMap((step) => step.content || [])
          .filter((part) => part.type === 'text')
          .map((part) => part.text || '')
          .join('')
          .trim();
        if (!answer) throw new Error(`Gemini returned an empty ${language} support answer.`);
        return answer;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Gemini error';
        const canRetry = index < models.length - 1 && /high demand|temporarily|try again|overloaded|operation was aborted|429|503/iu.test(message);
        if (!canRetry) throw error;
        lastError = error instanceof Error ? error : new Error(message);
      } finally {
        clearTimeout(attemptTimeout);
      }
    }
    throw lastError || new Error(`Gemini could not generate a ${language} support answer.`);
  }

  private supportInstructions(): string {
    return 'You are TYUSHOP AI Support, a warm bilingual customer-support assistant for the TYUSHOP multi-vendor e-commerce website in Cambodia. Help with the catalog, product search, categories, brands, cart, checkout, KHQR/Bakong and cash-on-delivery payments, discount coupons, loyalty points, order status, delivery and GPS tracking, returns, customer accounts, seller applications, seller products and seller orders, contact support, and FAQ. Use only the website capabilities described here and the verified context provided in the prompt. Never invent a product price, stock count, order status, refund approval, delivery ETA, policy, password, payment credential, or private account data. If the question needs private order/account data and no verified context is provided, tell the user to sign in and contact support. Answer entirely in the requested language, keep it under 120 words, use short helpful steps, and mention the exact page or button name when useful.';
  }

  private supportPrompt(question: string, history: Array<{ role: 'user' | 'assistant'; text: string }>, language: string, context: string): string {
    const transcript = history.length ? history.map((message) => `${message.role === 'user' ? 'Customer' : 'TYUSHOP AI'}: ${message.text}`).join('\n') : '(No previous conversation.)';
    return `Answer entirely in ${language}.\n\nConversation history:\n${transcript}\n\nVerified TYUSHOP context:\n${context}\n\nCurrent customer question:\n${question}`;
  }

  private async supportContext(question: string, userId: number | null): Promise<string> {
    const facts: string[] = [
      'Storefront pages: /products, /categories, /brands, /cart, /track-order, /contact, /faq, /sell.',
      'Support hotline: 016 555 637. Customers can open a support ticket from Contact & Support.',
      'Payments include Bakong KHQR and Cash on Delivery when available. Delivery can be tracked from Track Live Delivery.',
      'Loyalty rewards and coupon availability are shown by the storefront and must not be invented when not verified.',
    ];
    try {
      const settings = await this.readSupportSettings(['support_phone', 'support_email', 'shipping_policy', 'return_policy_days', 'business_hours']);
      for (const [key, value] of settings.entries()) facts.push(`${key}: ${value}`);

      const orderNumber = question.match(/(?:ORD|RWD)-[A-Z0-9-]+/i)?.[0];
      if (orderNumber && userId) {
        const order = await this.database.query<{ order_number: string; status: string; payment_status: string; total_amount: number | string; tracking_number: string | null }>('SELECT order_number,status,payment_status,total_amount,tracking_number FROM orders WHERE user_id=$1 AND UPPER(order_number)=UPPER($2) LIMIT 1', [userId, orderNumber]);
        if (order.rows[0]) facts.push(`Verified customer order: ${JSON.stringify(order.rows[0])}`);
        else facts.push(`No verified order matching ${orderNumber} was found for the signed-in customer.`);
      } else if (orderNumber) {
        facts.push('An order number was mentioned, but order details are not disclosed until the customer signs in.');
      }

      if (/(product|item|catalog|price|stock|find|search|ផលិតផល|តម្លៃ|ស្តុក)/iu.test(question)) {
        const term = question.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim().slice(0, 80);
        const products = await this.database.query<{ name: string; sku: string | null; selling_price: number | string | null; discount_price: number | string | null }>('SELECT name,sku,selling_price,discount_price FROM products WHERE is_active=TRUE AND (name ILIKE $1 OR sku ILIKE $1 OR description ILIKE $1) ORDER BY is_featured DESC,id DESC LIMIT 5', [`%${term}%`]);
        if (products.rows.length) facts.push(`Verified matching products: ${JSON.stringify(products.rows)}`);
      }
    } catch (error) {
      console.warn(`TYUSHOP support context lookup failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
    return facts.join('\n');
  }

  private normalizeSupportHistory(value: unknown): Array<{ role: 'user' | 'assistant'; text: string }> {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is { role: 'user' | 'assistant'; text: string } => Boolean(item) && typeof item === 'object' && ['user', 'assistant'].includes(String((item as { role?: unknown }).role)) && typeof (item as { text?: unknown }).text === 'string')
      .map((item) => ({ role: item.role, text: item.text.trim().slice(0, 800) }))
      .filter((item) => item.text.length > 0)
      .slice(-8);
  }

  private supportFallback(question: string, language: string, context: string): string {
    const text = question.toLowerCase();
    if (language === 'Khmer') {
      if (/(track|delivery|gps|ដឹក|តាមដាន)/u.test(text)) return 'បើក «Track Live Delivery» ឬ «Track Order» ដើម្បីមើលស្ថានភាព និងព័ត៌មាន GPS។ ប្រសិនបើអ្នកមានលេខបញ្ជាទិញ សូមចូលគណនីដើម្បីទទួលបានព័ត៌មានលម្អិត។';
      if (/(seller|sell|vendor|អ្នកលក់|ហាង)/u.test(text)) return 'អ្នកអាចចូលទៅ «Sell on TYUSHOP» ដើម្បីដាក់ពាក្យបើកហាង។ អ្នកលក់ដែលបានអនុម័តអាចគ្រប់គ្រងផលិតផល ការបញ្ជាទិញ និងការទូទាត់ពី Seller Dashboard។';
      if (/(coupon|discount|promo|កូដ|បញ្ចុះ)/u.test(text)) return 'បញ្ចូល coupon code នៅក្នុង Cart ឬ Checkout។ ប្រសិនបើកូដមិនដំណើរការ សូមពិនិត្យថ្ងៃផុតកំណត់ និងលក្ខខណ្ឌរបស់ប្រូម៉ូសិន។';
      if (/(payment|khqr|bakong|ទូទាត់|បង់)/u.test(text)) return 'នៅ Checkout អ្នកអាចប្រើ Bakong KHQR ឬ Cash on Delivery ប្រសិនបើជម្រើសនេះមានសម្រាប់ការបញ្ជាទិញរបស់អ្នក។';
      return 'ខ្ញុំអាចជួយអំពីផលិតផល ការបញ្ជាទិញ ការដឹកជញ្ជូន KHQR គូប៉ុង ហាងអ្នកលក់ និងគណនី។ សូមសួរខ្ញុំអំពីបញ្ហាដែលអ្នកចង់ដោះស្រាយ។';
    }
    if (/(track|delivery|gps|shipping)/.test(text)) return 'Open Track Live Delivery or Track Order to view delivery status and GPS information. If you have an order number, sign in for private order details.';
    if (/(seller|sell|vendor|store|merchant)/.test(text)) return 'Open Sell on TYUSHOP to apply for a store. Approved sellers manage products, orders, payouts, staff, and store settings from the Seller Dashboard.';
    if (/(coupon|discount|promo|code)/.test(text)) return 'Enter a coupon code in the Cart or Checkout. If it fails, check the code spelling, expiry date, and promotion conditions.';
    if (/(payment|khqr|bakong|pay)/.test(text)) return 'At Checkout, choose Bakong KHQR or Cash on Delivery when the option is available for your order.';
    return `I can help with products, orders, delivery, KHQR payments, coupons, seller stores, accounts, and support. ${context.includes('Verified matching products') ? 'I also found matching catalog information for your question.' : 'Ask me what you need and I’ll guide you to the right page.'}`;
  }

  private async optionalUserId(request: AuthenticatedRequest): Promise<number | null> { const identity = await this.auth.authenticate(request.headers.authorization); return identity?.userId ?? null; }
  private async readSettings(keys: string[]): Promise<Map<string, string>> { const result = await this.database.query<{ setting_key: string; setting_value: string }>('SELECT setting_key,setting_value FROM store_settings WHERE setting_key=ANY($1::text[])', [keys]); return new Map(result.rows.map((row) => [row.setting_key, row.setting_value])); }
  private async readSupportSettings(keys: string[]): Promise<Map<string, string>> {
    const now = Date.now();
    const missingKeys = keys.filter((key) => {
      const cached = this.supportSettingsCache.get(key);
      return !cached || cached.expiresAt <= now;
    });

    if (missingKeys.length) {
      const result = await this.database.query<{ setting_key: string; setting_value: string }>('SELECT setting_key,setting_value FROM store_settings WHERE setting_key=ANY($1::text[])', [missingKeys]);
      for (const row of result.rows) this.supportSettingsCache.set(row.setting_key, { value: row.setting_value, expiresAt: now + 30000 });
    }

    return new Map(keys.flatMap((key) => {
      const cached = this.supportSettingsCache.get(key);
      return cached && cached.expiresAt > now ? [[key, cached.value] as [string, string]] : [];
    }));
  }
  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
  private required(value: unknown, field: string, max: number): string { const text = String(value ?? '').trim(); if (!text || text.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return text; }
  private optional(value: unknown, max: number): string | null { const text = String(value ?? '').trim(); if (!text) return null; if (text.length > max) throw new UnprocessableEntityException({ status: 'error', message: 'The given data was invalid.' }); return text; }
  private email(value: unknown): string { const email = this.required(value, 'email', 150).toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) throw new UnprocessableEntityException({ status: 'error', message: 'The email must be a valid email address.' }); return email; }
  private integer(value: unknown, field: string): number { const number = Number(value); if (!Number.isInteger(number) || number < 1) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` }); return number; }
  private datePart(): string { const now = new Date(); return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`; }
}
