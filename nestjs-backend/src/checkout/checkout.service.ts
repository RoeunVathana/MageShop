import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

interface ProductRow {
  id: number;
  name: string;
  sku: string | null;
  seller_id: number | null;
  selling_price: number | string | null;
  price: number | string | null;
  discount_price: number | string | null;
  is_active: boolean;
  product_type: string | null;
  quantity_on_hand: number | string | null;
  quantity_reserved: number | string | null;
}

interface CheckoutItem {
  product_id: number;
  quantity: number;
}

interface MerchantAccount {
  account_id: string;
  merchant_name: string;
  merchant_city: string;
}

@Injectable()
export class CheckoutService {
  private readonly pointsPerPurchase = 5;
  private readonly pointsForFreeItem = 100;

  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async create(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const items = this.items(body.items);
    const customerName = this.required(body.customer_name, 'customer_name', 120);
    const customerPhone = this.required(body.customer_phone, 'customer_phone', 40);
    const deliveryAddress = this.required(body.delivery_address, 'delivery_address', 500);
    const customerEmail = this.optional(body.customer_email, 150);
    const paymentMethod = this.string(body.payment_method) || 'bakong_khqr';
    if (!['bakong_khqr', 'cash_on_delivery'].includes(paymentMethod)) {
      throw new UnprocessableEntityException({ status: 'error', message: 'The payment method is invalid.' });
    }

    const idempotencyKey = this.string(body.idempotency_key);
    if (idempotencyKey && !/^[A-Za-z0-9._:-]{1,80}$/.test(idempotencyKey)) {
      throw new UnprocessableEntityException({ status: 'error', message: 'The idempotency key is invalid.' });
    }

    if (idempotencyKey) {
      const existing = await this.database.query<{ id: number }>(
        'SELECT id FROM orders WHERE user_id = $1 AND checkout_idempotency_key = $2 LIMIT 1',
        [userId, idempotencyKey],
      );
      if (existing.rows[0]) return this.existingResponse(existing.rows[0].id);
    }

    const user = await this.auth.me(userId);
    const productIds = [...new Set(items.map((item) => item.product_id))];
    const products = await this.database.query<ProductRow>(`
      SELECT p.id, p.name, p.sku, p.seller_id, p.selling_price, p.price,
             p.discount_price, p.is_active, p.product_type,
             i.quantity_on_hand, i.quantity_reserved
      FROM products p
      LEFT JOIN inventories i ON i.product_id = p.id
      WHERE p.id = ANY($1::int[]) AND p.is_active = TRUE
    `, [productIds]);
    const productMap = new Map(products.rows.map((product) => [product.id, product]));

    const orderItems: Array<Record<string, unknown>> = [];
    const requested = new Map<number, number>();
    let subtotal = 0;
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) throw new UnprocessableEntityException({ status: 'error', message: 'One or more selected products are no longer available.' });
      if (product.product_type !== 'digital') {
        const available = Math.max(0, Number(product.quantity_on_hand ?? 0) - Number(product.quantity_reserved ?? 0));
        const nextQuantity = (requested.get(product.id) ?? 0) + item.quantity;
        requested.set(product.id, nextQuantity);
        if (nextQuantity > available) {
          throw new UnprocessableEntityException({ status: 'error', message: `Insufficient stock for ${product.name}. Only ${available} unit(s) are available.` });
        }
      }

      const basePrice = Number(product.selling_price ?? product.price ?? 0);
      const discountPrice = product.discount_price === null ? null : Number(product.discount_price);
      const unitPrice = discountPrice !== null && discountPrice > 0 && discountPrice < basePrice ? discountPrice : basePrice;
      const totalPrice = Number((unitPrice * item.quantity).toFixed(2));
      subtotal += totalPrice;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku || `SKU-${product.id}`,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      });
    }

    const freeProductId = this.number(body.redeem_free_product_id);
    let pointsRedeemed = 0;
    if (freeProductId !== null) {
      if (user.loyalty_points < this.pointsForFreeItem) {
        throw new UnprocessableEntityException({ status: 'error', message: `You need at least ${this.pointsForFreeItem} loyalty points to redeem a free item.` });
      }
      const freeProduct = productMap.get(freeProductId) ?? (await this.database.query<ProductRow>(
        'SELECT id, name, sku, seller_id, selling_price, price, discount_price, is_active, product_type, 0 AS quantity_on_hand, 0 AS quantity_reserved FROM products WHERE id = $1 AND is_active = TRUE LIMIT 1',
        [freeProductId],
      )).rows[0];
      if (!freeProduct) throw new UnprocessableEntityException({ status: 'error', message: 'Selected free reward product was not found.' });
      const freePrice = Number(freeProduct.discount_price ?? freeProduct.selling_price ?? freeProduct.price ?? 0);
      const maxFreePrice = Number(await this.setting('loyalty_free_item_max_price', '30'));
      if (freePrice > maxFreePrice) throw new UnprocessableEntityException({ status: 'error', message: `Loyalty Free Item redemption is only eligible for products priced up to $${maxFreePrice.toFixed(2)}.` });
      orderItems.push({ product_id: freeProduct.id, product_name: `[FREE 100-PT REWARD] ${freeProduct.name}`, product_sku: freeProduct.sku || `SKU-${freeProduct.id}`, quantity: 1, unit_price: 0, total_price: 0 });
      pointsRedeemed = this.pointsForFreeItem;
    }

    let discount = 0;
    let appliedCoupon: string | null = null;
    const couponCode = this.string(body.coupon_code).toUpperCase();
    if (couponCode) {
      const coupon = await this.database.query<{ code: string; discount_type: string; discount_value: number | string; min_order_amount: number | string; max_discount_amount: number | string | null }>(`
        SELECT code, discount_type, discount_value, min_order_amount, max_discount_amount
        FROM coupons
        WHERE UPPER(code) = $1 AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `, [couponCode]);
      const record = coupon.rows[0];
      if (record && subtotal >= Number(record.min_order_amount)) {
        appliedCoupon = record.code;
        discount = record.discount_type === 'percentage'
          ? Number((subtotal * (Number(record.discount_value) / 100)).toFixed(2))
          : Math.min(subtotal, Number(record.discount_value));
        if (record.max_discount_amount !== null) discount = Math.min(discount, Number(record.max_discount_amount));
      }
    }

    const shippingFee = await this.shippingFee(subtotal, this.string(body.delivery_method_id));
    const totalAmount = Number(Math.max(0, subtotal - discount + shippingFee).toFixed(2));
    const isQr = paymentMethod === 'bakong_khqr' && totalAmount > 0;
    const isCash = paymentMethod === 'cash_on_delivery' && totalAmount > 0;
    const paymentStatus = isCash ? 'cash_on_delivery' : (isQr ? 'pending_qr' : 'paid');
    const orderNumber = `ORD-${this.datePart()}-${randomBytes(3).toString('hex').toUpperCase().slice(0, 5)}`;
    const transactionReference = `TXN-${randomBytes(6).toString('hex').toUpperCase()}`;
    const merchant = isQr ? await this.merchantAccount() : null;
    if (isQr && (!merchant || !/^[^@\s]+@[^@\s]+$/.test(merchant.account_id))) {
      throw new ServiceUnavailableException({ status: 'error', message: 'Bakong payment is not configured for verification. Please contact support or choose Cash on Delivery.' });
    }
    const qr = isQr ? this.buildQr(orderNumber, totalAmount, transactionReference, merchant as MerchantAccount) : null;
    const customerEmailValue = customerEmail || user.email;
    const pointsEarned = this.pointsPerPurchase;
    const newPoints = Math.max(0, user.loyalty_points - pointsRedeemed + (paymentStatus === 'paid' ? pointsEarned : 0));

    const orderId = await this.database.transaction(async (client) => {
      const order = await client.query<{ id: number }>(`
        INSERT INTO orders (order_number, checkout_idempotency_key, user_id, status, subtotal, discount, coupon_code, points_earned, points_redeemed, free_reward_product_id, shipping_fee, tax, total_amount, currency, payment_status, payment_method, customer_name, customer_email, customer_phone, delivery_address, notes, dest_lat, dest_lng, current_lat, current_lng, estimated_arrival, created_at, updated_at)
        VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10, 0, $11, 'USD', $12, $13, $14, $15, $16, $17, $18, $19, $20, NULL, NULL, NULL, NOW(), NOW())
        RETURNING id
      `, [orderNumber, idempotencyKey || null, userId, subtotal, discount, appliedCoupon, pointsEarned, pointsRedeemed, freeProductId, shippingFee, totalAmount, paymentStatus, paymentMethod, customerName, customerEmailValue, customerPhone, deliveryAddress, this.optional(body.notes, 500), this.number(body.dest_lat), this.number(body.dest_lng)]);
      const id = order.rows[0]?.id;
      if (!id) throw new Error('Checkout did not return an order ID.');

      for (const item of orderItems) {
        await client.query(`
          INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, total_price, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [id, item.product_id, item.product_name, item.product_sku, item.quantity, item.unit_price, item.total_price]);
      }
      await client.query(`
        INSERT INTO payments (order_id, transaction_reference, payment_method, amount, currency, status, khqr_string, khqr_md5, merchant_account, merchant_name, merchant_city, verified_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'USD', $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      `, [id, transactionReference, paymentMethod, totalAmount, isCash ? 'pending_arrival' : (isQr ? 'pending_qr' : 'completed'), qr?.qr_string ?? null, qr?.md5 ?? null, merchant?.account_id ?? null, merchant?.merchant_name ?? null, merchant?.merchant_city ?? null, paymentStatus === 'paid' ? new Date() : null]);
      await client.query('UPDATE users SET loyalty_points = $1, updated_at = NOW() WHERE id = $2', [newPoints, userId]);
      if (pointsRedeemed) {
        await client.query(`INSERT INTO loyalty_transactions (user_id, order_id, type, points, description, created_at, updated_at) VALUES ($1, $2, 'redeemed', $3, $4, NOW(), NOW())`, [userId, id, -pointsRedeemed, `Exchanged ${pointsRedeemed} points for a free product`]);
      }
      if (paymentStatus === 'paid') {
        await client.query(`INSERT INTO loyalty_transactions (user_id, order_id, type, points, description, created_at, updated_at) VALUES ($1, $2, 'earned', $3, $4, NOW(), NOW())`, [userId, id, pointsEarned, `Earned +${pointsEarned} points from Order #${orderNumber}`]);
      }
      await client.query(`INSERT INTO receipts (order_id, payment_id, receipt_number, email_status, issued_at, created_at, updated_at) VALUES ($1, (SELECT id FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1), $2, 'pending', NOW(), NOW(), NOW())`, [id, this.receiptNumber()]);
      return id;
    });

    const orderPayload = await this.orderPayload(orderId);
    const receipt = await this.database.query<{ receipt_number: string; email_status: string }>('SELECT receipt_number, email_status FROM receipts WHERE order_id = $1 LIMIT 1', [orderId]);
    const receiptRow = receipt.rows[0];
    return {
      status: 'ok',
      message: isQr
        ? `Bakong KHQR generated for Order #${orderNumber}. Please scan QR code to complete payment.`
        : (isCash ? `Order #${orderNumber} confirmed for Cash on Hand upon delivery.` : `Order #${orderNumber} paid & confirmed! You earned +${pointsEarned} Loyalty Points.`),
      data: {
        order: orderPayload,
        receipt_number: receiptRow?.receipt_number,
        transaction_reference: transactionReference,
        email_status: receiptRow?.email_status ?? 'pending',
        email_sent_to: customerEmailValue,
        telegram_admin_notified: false,
        qr_payment: qr,
        payment_mode: isCash ? 'cash_on_delivery' : (isQr ? 'awaiting_qr_scan' : 'pay_now'),
        amount_due_on_arrival: isCash ? totalAmount : 0,
        points_earned: pointsEarned,
        points_redeemed: pointsRedeemed,
        new_loyalty_points: newPoints,
        tracking_url: `/track-order/${orderNumber}`,
      },
    };
  }

  private async existingResponse(orderId: number): Promise<Record<string, unknown>> {
    const order = await this.orderPayload(orderId);
    const payment = await this.database.query<{ transaction_reference: string; khqr_string: string | null; khqr_md5: string | null; merchant_account: string | null; merchant_name: string | null; merchant_city: string | null }>('SELECT transaction_reference, khqr_string, khqr_md5, merchant_account, merchant_name, merchant_city FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1', [orderId]);
    const record = payment.rows[0];
    const qr = record?.khqr_string && record.khqr_md5 ? { qr_string: record.khqr_string, md5: record.khqr_md5, merchant_account: record.merchant_account, merchant_name: record.merchant_name, merchant_city: record.merchant_city, amount_usd: Number(order.total_amount), amount_khr: Math.round(Number(order.total_amount) * 4100), order_number: order.order_number, transaction_reference: record.transaction_reference, expires_in_seconds: 600 } : null;
    return { status: 'ok', message: qr ? `Bakong KHQR is ready for Order #${order.order_number}.` : `Checkout already processed for Order #${order.order_number}.`, data: { order, receipt_number: await this.receipt(orderId), transaction_reference: record?.transaction_reference, email_status: 'pending', email_sent_to: order.customer_email, telegram_admin_notified: false, qr_payment: qr, payment_mode: order.payment_status === 'cash_on_delivery' ? 'cash_on_delivery' : (qr ? 'awaiting_qr_scan' : 'pay_now'), amount_due_on_arrival: order.payment_status === 'cash_on_delivery' ? Number(order.total_amount) : 0, points_earned: Number(order.points_earned ?? 0), points_redeemed: Number(order.points_redeemed ?? 0), new_loyalty_points: 0, tracking_url: `/track-order/${order.order_number}` } };
  }

  private async orderPayload(orderId: number): Promise<Record<string, unknown>> {
    const order = await this.database.query<Record<string, unknown>>('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
    const row = order.rows[0];
    if (!row) throw new Error('Order not found after checkout.');
    const items = await this.database.query<Record<string, unknown>>('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [orderId]);
    return { ...row, items: items.rows };
  }

  private async receipt(orderId: number): Promise<string | null> {
    const result = await this.database.query<{ receipt_number: string }>('SELECT receipt_number FROM receipts WHERE order_id = $1 LIMIT 1', [orderId]);
    return result.rows[0]?.receipt_number ?? null;
  }

  private async merchantAccount(): Promise<MerchantAccount | null> {
    const account = await this.database.query<MerchantAccount>('SELECT account_id, merchant_name, merchant_city FROM merchant_payment_accounts WHERE user_id IS NULL AND is_active = TRUE ORDER BY is_default DESC, id DESC LIMIT 1');
    if (account.rows[0]) return account.rows[0];
    const settings = await this.database.query<{ setting_key: string; setting_value: string }>("SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN ('bakong_account_id', 'bakong_merchant_name', 'company_city')");
    const values = new Map(settings.rows.map((setting) => [setting.setting_key, setting.setting_value]));
    return { account_id: values.get('bakong_account_id') ?? '', merchant_name: values.get('bakong_merchant_name') ?? 'TYUSHOP', merchant_city: values.get('company_city') ?? 'Phnom Penh' };
  }

  private async shippingFee(subtotal: number, methodId: string): Promise<number> {
    const values = await this.settings(['delivery_is_free', 'delivery_free_threshold', 'delivery_default_fee', 'delivery_methods']);
    if (this.bool(values.get('delivery_is_free') ?? 'true')) return 0;
    const threshold = Number(values.get('delivery_free_threshold') ?? 0);
    if (threshold > 0 && subtotal >= threshold) return 0;
    let fee = Number(values.get('delivery_default_fee') ?? 1.5);
    if (methodId) {
      try {
        const methods = JSON.parse(values.get('delivery_methods') ?? '[]') as Array<Record<string, unknown>>;
        const method = methods.find((item) => String(item.id ?? '') === methodId && item.is_active !== false);
        if (method) fee = Number(method.price ?? fee);
      } catch { /* use default */ }
    }
    return Math.max(0, Number(fee.toFixed(2)));
  }

  private async setting(key: string, fallback: string): Promise<string> {
    const values = await this.settings([key]);
    return values.get(key) ?? fallback;
  }

  private async settings(keys: string[]): Promise<Map<string, string>> {
    const result = await this.database.query<{ setting_key: string; setting_value: string }>('SELECT setting_key, setting_value FROM store_settings WHERE setting_key = ANY($1::text[])', [keys]);
    return new Map(result.rows.map((setting) => [setting.setting_key, setting.setting_value]));
  }

  private buildQr(orderNumber: string, amount: number, transaction: string, merchant: MerchantAccount): Record<string, unknown> {
    const amountText = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
    const tag29Value = `00${merchant.account_id.length.toString().padStart(2, '0')}${merchant.account_id}`;
    const tag29 = `29${tag29Value.length.toString().padStart(2, '0')}${tag29Value}`;
    const tag62Value = `01${orderNumber.length.toString().padStart(2, '0')}${orderNumber}`;
    const tag62 = `62${tag62Value.length.toString().padStart(2, '0')}${tag62Value}`;
    const now = Date.now();
    const tag99Value = `0013${now}0113${now + 600000}`;
    const tag99 = `99${tag99Value.length.toString().padStart(2, '0')}${tag99Value}`;
    const payload = `000201010212${tag29}52045999530384054${amountText.length.toString().padStart(2, '0')}${amountText}5802KH59${merchant.merchant_name.length.toString().padStart(2, '0')}${merchant.merchant_name}60${merchant.merchant_city.length.toString().padStart(2, '0')}${merchant.merchant_city}${tag62}${tag99}6304`;
    const qrString = `${payload}${this.crc(payload)}`;
    return { qr_string: qrString, md5: createHash('md5').update(qrString).digest('hex'), merchant_account: merchant.account_id, merchant_name: merchant.merchant_name, merchant_city: merchant.merchant_city, amount_usd: amount, amount_khr: Math.round(amount * 4100), order_number: orderNumber, transaction_reference: transaction, expires_in_seconds: 600 };
  }

  private crc(data: string): string {
    let crc = 0xffff;
    for (let index = 0; index < data.length; index += 1) {
      crc ^= data.charCodeAt(index) << 8;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  private items(value: unknown): CheckoutItem[] {
    if (!Array.isArray(value) || value.length < 1) throw new UnprocessableEntityException({ status: 'error', message: 'The items field is required.' });
    return value.map((item) => {
      const record = item as Record<string, unknown>;
      const productId = this.number(record.product_id);
      const quantity = this.number(record.quantity);
      if (productId === null || quantity === null || !Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) throw new UnprocessableEntityException({ status: 'error', message: 'Each order item must have a valid product and quantity.' });
      return { product_id: productId, quantity };
    });
  }

  private required(value: unknown, field: string, max: number): string {
    const result = this.string(value);
    if (!result || result.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${field} field is invalid.` });
    return result;
  }

  private optional(value: unknown, max: number): string | null {
    const result = this.string(value);
    return result ? (result.length <= max ? result : null) : null;
  }

  private string(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
  private number(value: unknown): number | null { const result = Number(this.string(value)); return this.string(value) !== '' && Number.isFinite(result) ? result : null; }
  private bool(value: string): boolean { return ['true', '1', 'yes', 'on'].includes(value.toLowerCase()); }
  private datePart(): string { const now = new Date(); return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`; }
  private receiptNumber(): string { return `REC-${this.datePart()}-${randomBytes(3).toString('hex').toUpperCase()}`; }
}
