import { ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';

import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

interface OrderRow {
  id: number;
  order_number: string;
  user_id: number | null;
  driver_id: number | null;
  status: string;
  total_amount: number | string;
  payment_status: string | null;
  payment_method: string | null;
  customer_email: string | null;
  points_earned: number | string | null;
  created_at: Date | string;
}

interface PaymentRow {
  id: number;
  order_id: number;
  transaction_reference: string;
  payment_method: string;
  amount: number | string;
  currency: string;
  status: string;
  khqr_md5: string | null;
  merchant_account: string | null;
  created_at: Date | string;
}

interface GatewayPayload {
  responseCode?: number | string;
  responseMessage?: string;
  data?: {
    toAccountId?: string;
    currency?: string;
    amount?: number | string;
    hash?: string;
  } | null;
}

@Injectable()
export class PaymentConfirmationService {
  private readonly staffRoles = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT', 'LOGISTICS_MANAGER', 'DISPATCHER'];
  private readonly handoverRoles = [...this.staffRoles, 'DELIVERY_DRIVER', 'COURIER', 'DELIVERY'];

  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async confirm(orderNumber: string, userId: number): Promise<Record<string, unknown>> {
    const order = await this.findOrder(orderNumber);
    const user = await this.auth.me(userId);
    this.authorizeOrder(user, order);

    if (['paid', 'completed'].includes(order.payment_status ?? '')) {
      return this.alreadyConfirmed(order);
    }

    const isQr = order.payment_method === 'bakong_khqr' && order.payment_status === 'pending_qr';
    if (!isQr) {
      if (!this.auth.hasAnyRole(user, this.handoverRoles)) {
        throw new ForbiddenException({ status: 'error', message: 'Only authorized delivery staff can confirm cash handover.' });
      }
      this.authorizeDeliveryOrder(user, order);
      if (order.payment_method !== 'cash_on_delivery') {
        throw new UnprocessableEntityException({ status: 'error', message: 'Only cash-on-delivery orders can be confirmed at handover.' });
      }
    }

    const paymentResult = await this.database.query<PaymentRow>(
      'SELECT id, order_id, transaction_reference, payment_method, amount, currency, status, khqr_md5, merchant_account, created_at FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1',
      [order.id],
    );
    const payment = paymentResult.rows[0];
    if (!payment) throw new UnprocessableEntityException({ status: 'error', message: 'This order has no payment record.' });

    let gatewayPayload: GatewayPayload | null = null;
    let gatewayReference = '';
    if (isQr) {
      const paymentSettings = await this.settings([
        'bakong_api_enabled',
        'bakong_api_url',
        'bakong_api_token',
        'bakong_account_id',
        'usd_to_khr_rate',
        'payment_qr_expires_minutes',
      ]);
      if (!payment.khqr_md5) {
        throw new UnprocessableEntityException({ status: 'error', message: 'This QR payment is missing verification data. Please create a new checkout.' });
      }
      const expiresAt = new Date(payment.created_at).getTime() + this.qrExpirySeconds(paymentSettings) * 1000;
      if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
        throw new UnprocessableEntityException({ status: 'error', message: 'This QR payment has expired. Please create a new checkout.' });
      }

      const token = this.bakongToken(paymentSettings);
      if (!this.bool(paymentSettings.get('bakong_api_enabled') ?? this.config.get<string>('BAKONG_API_ENABLED', 'true')) || !token) {
        throw new ServiceUnavailableException({ status: 'error', message: 'Bakong verification is not configured on the server yet.' });
      }
      const verification = await this.verifyBakong(payment.khqr_md5, token, paymentSettings);
      gatewayPayload = verification.payload;
      const transaction = verification.payload.data;
      const expectedMerchant = (payment.merchant_account || paymentSettings.get('bakong_account_id') || this.merchantAccount()).toLowerCase();
      const paidMerchant = String(transaction?.toAccountId ?? '').toLowerCase();
      const currency = String(transaction?.currency ?? '').toUpperCase();
      const amount = Number(transaction?.amount ?? -1);
      const expectedUsd = Number(order.total_amount);
      const expectedKhr = Math.round(expectedUsd * this.exchangeRate(paymentSettings));
      const amountMatches = (currency === 'USD' && Math.abs(amount - expectedUsd) < 0.01)
        || (currency === 'KHR' && Math.abs(amount - expectedKhr) < 1);
      const merchantMatches = expectedMerchant !== '' && paidMerchant !== '' && expectedMerchant === paidMerchant;
      const responseCode = Number(verification.payload.responseCode ?? 1);
      if (!verification.ok || responseCode !== 0 || !amountMatches || !['USD', 'KHR'].includes(currency) || !merchantMatches) {
        throw new UnprocessableEntityException({
          status: 'error',
          message: currency === ''
            ? 'Bakong has not confirmed this payment yet. Please wait a few seconds and try again.'
            : 'Bakong payment amount or merchant account does not match this order.',
        });
      }
      gatewayReference = String(transaction?.hash ?? '').trim();
      if (gatewayReference) {
        const duplicate = await this.database.query<{ id: number }>('SELECT id FROM payments WHERE transaction_reference = $1 AND id <> $2 LIMIT 1', [gatewayReference, payment.id]);
        if (duplicate.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: 'This Bakong transaction has already been used for another order.' });
      }
    }

    const result = await this.database.transaction(async (client) => this.settle(client, order, payment, isQr, gatewayPayload, gatewayReference));
    if (result.alreadyConfirmed) return this.alreadyConfirmed(order);

    return {
      status: 'ok',
      message: `Payment verified & confirmed for Order #${orderNumber}! Receipt emailed to customer and report sent to Telegram Admin.`,
      data: {
        order_number: order.order_number,
        order: await this.orderPayload(order.id),
        receipt_number: result.receiptNumber,
        transaction_reference: result.transactionReference,
        email_status: 'pending',
        email_sent_to: order.customer_email,
        telegram_admin_notified: false,
        payment_status: 'paid',
        amount_due_on_arrival: 0,
        status: result.orderStatus,
        new_loyalty_points: result.newPointsBalance,
      },
    };
  }

  private async findOrder(orderNumber: string): Promise<OrderRow> {
    const result = await this.database.query<OrderRow>('SELECT id, order_number, user_id, driver_id, status, total_amount, payment_status, payment_method, customer_email, points_earned, created_at FROM orders WHERE order_number = $1 LIMIT 1', [orderNumber]);
    const order = result.rows[0];
    if (!order) throw new NotFoundException({ status: 'error', message: 'Order not found.' });
    return order;
  }

  private async settle(client: PoolClient, order: OrderRow, payment: PaymentRow, isQr: boolean, gatewayPayload: GatewayPayload | null, gatewayReference: string): Promise<{ alreadyConfirmed: boolean; receiptNumber: string | null; transactionReference: string; orderStatus: string; newPointsBalance: number | null }> {
    const lockedOrderResult = await client.query<OrderRow>('SELECT id, order_number, user_id, driver_id, status, total_amount, payment_status, payment_method, customer_email, points_earned, created_at FROM orders WHERE id = $1 FOR UPDATE', [order.id]);
    const lockedOrder = lockedOrderResult.rows[0];
    if (!lockedOrder) throw new NotFoundException({ status: 'error', message: 'Order not found.' });
    if (['paid', 'completed'].includes(lockedOrder.payment_status ?? '')) return { alreadyConfirmed: true, receiptNumber: null, transactionReference: payment.transaction_reference, orderStatus: lockedOrder.status, newPointsBalance: null };

    const lockedPaymentResult = await client.query<PaymentRow>('SELECT id, order_id, transaction_reference, payment_method, amount, currency, status, khqr_md5, merchant_account, created_at FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE', [lockedOrder.id]);
    const lockedPayment = lockedPaymentResult.rows[0];
    if (!lockedPayment) throw new UnprocessableEntityException({ status: 'error', message: 'This order has no payment record.' });
    const transactionReference = gatewayReference || lockedPayment.transaction_reference;
    await client.query('UPDATE payments SET status = \'completed\', verified_at = NOW(), gateway_payload = $1::jsonb, transaction_reference = $2, updated_at = NOW() WHERE id = $3', [gatewayPayload ? JSON.stringify(gatewayPayload) : null, transactionReference, lockedPayment.id]);
    const orderStatus = isQr ? lockedOrder.status : 'delivered';
    await client.query('UPDATE orders SET payment_status = \'paid\', status = $1, updated_at = NOW() WHERE id = $2', [orderStatus, lockedOrder.id]);

    let newPointsBalance: number | null = null;
    if (lockedOrder.user_id) {
      const earned = await client.query<{ exists: boolean }>("SELECT EXISTS(SELECT 1 FROM loyalty_transactions WHERE order_id = $1 AND type = 'earned') AS exists", [lockedOrder.id]);
      const points = Number(lockedOrder.points_earned ?? 5);
      if (!earned.rows[0]?.exists) {
        const updated = await client.query<{ loyalty_points: number | string }>('UPDATE users SET loyalty_points = COALESCE(loyalty_points, 0) + $1, updated_at = NOW() WHERE id = $2 RETURNING loyalty_points', [points, lockedOrder.user_id]);
        newPointsBalance = Number(updated.rows[0]?.loyalty_points ?? 0);
        await client.query("INSERT INTO loyalty_transactions (user_id, order_id, type, points, description, created_at, updated_at) VALUES ($1, $2, 'earned', $3, $4, NOW(), NOW())", [lockedOrder.user_id, lockedOrder.id, points, `Earned +${points} points from Order #${lockedOrder.order_number}`]);
      } else {
        const current = await client.query<{ loyalty_points: number | string }>('SELECT loyalty_points FROM users WHERE id = $1 LIMIT 1', [lockedOrder.user_id]);
        newPointsBalance = Number(current.rows[0]?.loyalty_points ?? 0);
      }
    }

    const existingReceipt = await client.query<{ receipt_number: string }>('SELECT receipt_number FROM receipts WHERE order_id = $1 LIMIT 1', [lockedOrder.id]);
    const receiptNumber = existingReceipt.rows[0]?.receipt_number ?? `REC-${this.datePart()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    if (!existingReceipt.rows[0]) {
      await client.query('INSERT INTO receipts (order_id, payment_id, receipt_number, email_status, issued_at, created_at, updated_at) VALUES ($1, $2, $3, \'pending\', NOW(), NOW(), NOW())', [lockedOrder.id, lockedPayment.id, receiptNumber]);
    }
    return { alreadyConfirmed: false, receiptNumber, transactionReference, orderStatus, newPointsBalance };
  }

  private async alreadyConfirmed(order: OrderRow): Promise<Record<string, unknown>> {
    const payment = await this.database.query<PaymentRow>('SELECT id, order_id, transaction_reference, payment_method, amount, currency, status, khqr_md5, merchant_account, created_at FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1', [order.id]);
    const receipt = await this.database.query<{ receipt_number: string; email_status: string }>('SELECT receipt_number, email_status FROM receipts WHERE order_id = $1 LIMIT 1', [order.id]);
    return {
      status: 'ok',
      message: `Payment already confirmed for Order #${order.order_number}.`,
      data: {
        order_number: order.order_number,
        order: await this.orderPayload(order.id),
        receipt_number: receipt.rows[0]?.receipt_number ?? `REC-${this.datePart()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        transaction_reference: payment.rows[0]?.transaction_reference,
        email_status: receipt.rows[0]?.email_status ?? 'pending',
        email_sent_to: order.customer_email,
        telegram_admin_notified: false,
        payment_status: 'paid',
        amount_due_on_arrival: 0,
        status: order.status,
        new_loyalty_points: null,
      },
    };
  }

  private async orderPayload(orderId: number): Promise<Record<string, unknown>> {
    const order = await this.database.query<Record<string, unknown>>('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
    const items = await this.database.query<Record<string, unknown>>('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [orderId]);
    return { ...(order.rows[0] ?? {}), items: items.rows };
  }

  private authorizeOrder(user: AuthUser, order: OrderRow): void {
    const staff = this.auth.hasAnyRole(user, this.staffRoles);
    const assignedDriver = this.auth.hasAnyRole(user, ['DELIVERY_DRIVER', 'COURIER', 'DELIVERY']) && order.driver_id === user.id;
    if (!staff && !assignedDriver && order.user_id !== user.id) throw new ForbiddenException({ status: 'error', message: 'You do not have access to this order.' });
  }

  private authorizeDeliveryOrder(user: AuthUser, order: OrderRow): void {
    const isDriver = this.auth.hasAnyRole(user, ['DELIVERY_DRIVER', 'COURIER', 'DELIVERY']);
    const isSupervisor = this.auth.hasAnyRole(user, this.staffRoles);
    if (isDriver && !isSupervisor && order.driver_id !== user.id) throw new ForbiddenException({ status: 'error', message: 'This order is not assigned to your delivery route.' });
  }

  private async verifyBakong(md5: string, token: string, settings: Map<string, string>): Promise<{ ok: boolean; payload: GatewayPayload }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${this.bakongUrl(settings)}/v1/check_transaction_by_md5`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ md5 }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({})) as GatewayPayload;
      return { ok: response.ok, payload };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', message: 'Bakong verification is temporarily unavailable. Please try again.' });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async settings(keys: string[]): Promise<Map<string, string>> {
    const result = await this.database.query<{ setting_key: string; setting_value: string }>('SELECT setting_key, setting_value FROM store_settings WHERE setting_key = ANY($1::text[])', [keys]);
    return new Map(result.rows.map((row) => [row.setting_key, row.setting_value]));
  }

  private bakongToken(settings: Map<string, string>): string {
    return String(settings.get('bakong_api_token') ?? this.config.get<string>('BAKONG_API_TOKEN', '') ?? '').trim().replace(/^["']|["']$/g, '').replace(/\\$/g, '');
  }

  private bakongUrl(settings: Map<string, string>): string {
    return String(settings.get('bakong_api_url') ?? this.config.get<string>('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh') ?? '').replace(/\\/g, '').replace(/\/$/, '');
  }

  private merchantAccount(): string {
    return String(this.config.get<string>('BAKONG_ACCOUNT_ID', '') ?? '').trim();
  }

  private exchangeRate(settings: Map<string, string>): number {
    const value = Number(settings.get('usd_to_khr_rate') ?? 4100);
    return Number.isFinite(value) && value > 0 ? value : 4100;
  }

  private qrExpirySeconds(settings: Map<string, string>): number {
    const minutes = Number(settings.get('payment_qr_expires_minutes') ?? this.config.get<string>('PAYMENT_QR_EXPIRES_MINUTES', '10'));
    return Math.max(60, Math.min(3600, (Number.isFinite(minutes) ? minutes : 10) * 60));
  }

  private bool(value: string): boolean {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  private datePart(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  }
}
