import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument = require('pdfkit');
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

interface OrderRow extends Record<string, unknown> {
  id: number;
  order_number: string;
  user_id: number | null;
  customer_email: string | null;
  customer_name: string | null;
  total_amount: number | string;
  currency: string | null;
  status: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

interface ReceiptRow {
  id: number;
  order_id: number;
  payment_id: number | null;
  receipt_number: string;
  receipt_file_path: string | null;
  email_status: string;
  issued_at: Date | string;
  sent_at: Date | string | null;
}

const staffRoles = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'LOGISTICS_MANAGER', 'DISPATCHER', 'DELIVERY_DRIVER', 'COURIER', 'DELIVERY'];
const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];

@Injectable()
export class ReceiptService {
  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  async json(identifier: string, userId: number): Promise<Record<string, unknown>> {
    const { order, user } = await this.authorizedOrder(identifier, userId, staffRoles);
    const receipt = await this.ensureReceipt(order.id);
    return {
      status: 'success',
      data: {
        receipt_number: receipt.receipt_number,
        order_number: order.order_number,
        issued_at: receipt.issued_at,
        email_status: receipt.email_status,
        total_amount: order.total_amount,
        currency: order.currency,
        customer: { id: user.id, name: user.name, email: user.email },
      },
    };
  }

  async html(identifier: string, userId: number): Promise<string> {
    const { order } = await this.authorizedOrder(identifier, userId, staffRoles);
    const receipt = await this.ensureReceipt(order.id);
    const items = await this.items(order.id);
    const payment = await this.payment(order.id);
    return this.htmlDocument(order, receipt, items, payment);
  }

  async pdf(identifier: string, userId: number): Promise<{ bytes: Buffer; filename: string }> {
    const { order } = await this.authorizedOrder(identifier, userId, staffRoles);
    const receipt = await this.ensureReceipt(order.id);
    const items = await this.items(order.id);
    const payment = await this.payment(order.id);
    return { bytes: await this.pdfDocument(order, receipt, items, payment), filename: `receipt-${receipt.receipt_number}.pdf` };
  }

  async resend(identifier: string, userId: number): Promise<Record<string, unknown>> {
    const { order, user } = await this.authorizedOrder(identifier, userId, adminRoles);
    if (!this.auth.hasAnyRole(user, adminRoles)) throw new ForbiddenException({ status: 'error', message: 'Unauthorized.' });
    const receipt = await this.generateAndSend(order.id);
    return {
      status: 'success',
      message: `Receipt #${receipt.receipt_number} generated and queued for email delivery to ${order.customer_email ?? ''}.`,
      data: { receipt_number: receipt.receipt_number, email_status: receipt.email_status, recipient: order.customer_email },
    };
  }

  async sendOrderConfirmation(orderId: number): Promise<{ emailStatus: string; telegramNotified: boolean }> {
    const order = await this.findOrderById(orderId);
    const receipt = await this.ensureReceipt(order.id);
    const items = await this.items(order.id);
    const payment = await this.payment(order.id);
    let emailStatus = receipt.email_status;
    if (order.customer_email) {
      const delivered = await this.sendEmail(order, receipt, payment, false, items);
      emailStatus = delivered ? 'sent' : 'failed';
      await this.updateEmailStatus(receipt.id, emailStatus, delivered);
    }
    // Do not send a "paid"-looking Telegram report while a KHQR is still waiting
    // for the customer to scan and confirm it. The final report is sent by
    // notifyPayment() after Bakong verification succeeds.
    const paymentMethod = String(payment?.payment_method ?? order.payment_method ?? '').toLowerCase();
    const paymentStatus = String(payment?.status ?? order.payment_status ?? '').toLowerCase();
    const telegramNotified = paymentMethod === 'cash_on_delivery' || ['paid', 'completed'].includes(paymentStatus)
      ? await this.notifyTelegram(order, receipt, payment)
      : false;
    return { emailStatus, telegramNotified };
  }

  async generateAndSend(orderId: number, notifyTelegram = false): Promise<ReceiptRow> {
    const order = await this.findOrderById(orderId);
    const receipt = await this.ensureReceipt(order.id);
    const items = await this.items(order.id);
    const payment = await this.payment(order.id);
    let pdf: Buffer | null = null;
    try {
      pdf = await this.pdfDocument(order, receipt, items, payment);
      const key = `receipts/receipt-${receipt.receipt_number}.pdf`;
      const root = resolve(this.config.get<string>('MEDIA_ROOT', join(process.cwd(), 'storage', 'app', 'public')));
      await mkdir(join(root, 'receipts'), { recursive: true });
      await writeFile(resolve(root, key), pdf);
      await this.database.query('UPDATE receipts SET receipt_file_path = $1, updated_at = NOW() WHERE id = $2', [key, receipt.id]);
    } catch {
      // PDF storage is deliberately non-fatal, matching Laravel's receipt flow.
    }
    if (order.customer_email) {
      const delivered = await this.sendEmail(order, receipt, payment, true, items, pdf);
      await this.updateEmailStatus(receipt.id, delivered ? 'sent' : 'failed', delivered);
    }
    if (notifyTelegram) await this.notifyTelegram(order, receipt, payment);
    return (await this.database.query<ReceiptRow>('SELECT * FROM receipts WHERE id = $1 LIMIT 1', [receipt.id])).rows[0] ?? receipt;
  }

  async notifyPayment(orderId: number): Promise<boolean> {
    const order = await this.findOrderById(orderId);
    const receipt = await this.ensureReceipt(order.id);
    const items = await this.items(order.id);
    const payment = await this.payment(order.id);
    const paymentStatus = String(payment?.status ?? order.payment_status ?? '').toLowerCase();
    if (!['paid', 'completed', 'verified'].includes(paymentStatus)) return false;
    const delivered = order.customer_email ? await this.sendEmail(order, receipt, payment, true, items) : false;
    if (order.customer_email) await this.updateEmailStatus(receipt.id, delivered ? 'sent' : 'failed', delivered);
    return this.notifyTelegram(order, receipt, payment);
  }

  private async authorizedOrder(identifier: string, userId: number, roles: readonly string[]): Promise<{ order: OrderRow; user: AuthUser }> {
    const user = await this.auth.me(userId);
    const order = await this.findOrder(identifier);
    if (!this.auth.hasAnyRole(user, roles) && Number(order.user_id) !== userId) throw new ForbiddenException({ status: 'error', message: 'Unauthorized.' });
    return { order, user };
  }

  private async findOrder(identifier: string): Promise<OrderRow> {
    const numeric = /^\d+$/.test(identifier);
    const result = await this.database.query<OrderRow>(
      numeric ? 'SELECT * FROM orders WHERE id = $1 LIMIT 1' : 'SELECT * FROM orders WHERE order_number = $1 LIMIT 1',
      [numeric ? Number(identifier) : identifier],
    );
    const order = result.rows[0];
    if (!order) throw new NotFoundException({ status: 'error', message: 'Order not found.' });
    return order;
  }

  private async findOrderById(id: number): Promise<OrderRow> { return this.findOrder(String(id)); }

  private async ensureReceipt(orderId: number): Promise<ReceiptRow> {
    const existing = await this.database.query<ReceiptRow>('SELECT * FROM receipts WHERE order_id = $1 LIMIT 1', [orderId]);
    if (existing.rows[0]) return existing.rows[0];
    const receiptNumber = `REC-${this.datePart()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const payment = await this.payment(orderId);
    const inserted = await this.database.query<{ id: number }>(`
      INSERT INTO receipts (order_id, payment_id, receipt_number, email_status, issued_at, created_at, updated_at)
      VALUES ($1, $2, $3, 'pending', NOW(), NOW(), NOW())
      RETURNING id
    `, [orderId, payment?.id ?? null, receiptNumber]);
    const created = await this.database.query<ReceiptRow>('SELECT * FROM receipts WHERE id = $1 LIMIT 1', [inserted.rows[0]?.id]);
    if (!created.rows[0]) throw new Error('Receipt creation did not return a record.');
    return created.rows[0];
  }

  private async items(orderId: number): Promise<Array<Record<string, unknown>>> {
    return (await this.database.query<Record<string, unknown>>('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [orderId])).rows;
  }

  private async payment(orderId: number): Promise<Record<string, unknown> | null> {
    return (await this.database.query<Record<string, unknown>>('SELECT * FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1', [orderId])).rows[0] ?? null;
  }

  private async updateEmailStatus(id: number, status: string, sent: boolean): Promise<void> {
    await this.database.query('UPDATE receipts SET email_status = $1, sent_at = $2, updated_at = NOW() WHERE id = $3', [status, sent ? new Date() : null, id]);
  }

  private async sendEmail(order: OrderRow, receipt: ReceiptRow, payment: Record<string, unknown> | null, withPdf: boolean, items: Array<Record<string, unknown>>, pdf?: Buffer | null): Promise<boolean> {
    const apiKey = await this.mailSetting('resend_api_key') || await this.mailSetting('mail_password') || this.config.get<string>('RESEND_API_KEY', this.config.get<string>('MAIL_PASSWORD', ''));
    if (!apiKey || !order.customer_email) return false;
    const from = await this.mailSetting('mail_from_address') || this.config.get<string>('MAIL_FROM_ADDRESS', 'no-reply@tyushop.blog');
    const fromName = await this.mailSetting('mail_from_name') || this.config.get<string>('MAIL_FROM_NAME', 'TYUSHOP');
    const text = this.emailText(order, receipt, payment, withPdf, items);
    const body: Record<string, unknown> = { from: `${fromName} <${from}>`, to: [order.customer_email], subject: withPdf ? `TYUSHOP Payment Receipt #${receipt.receipt_number}` : `TYUSHOP Order Confirmation #${order.order_number}`, text };
    if (withPdf && pdf) body.attachments = [{ filename: basename(`receipt-${receipt.receipt_number}.pdf`), content: pdf.toString('base64') }];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
        return response.ok;
      } finally { clearTimeout(timeout); }
    } catch { return false; }
  }

  private async notifyTelegram(order: OrderRow, receipt: ReceiptRow, payment: Record<string, unknown> | null): Promise<boolean> {
    const token = await this.setting('telegram_bot_token', this.config.get<string>('TELEGRAM_BOT_TOKEN', ''));
    const chatId = await this.setting('telegram_admin_chat_id', this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID', ''));
    if (!token || !chatId) return false;
    const items = await this.items(order.id);
    const rate = Number(await this.setting('usd_to_khr_rate', '4100')) || 4100;
    const amount = Number(order.total_amount ?? 0);
    const amountKhr = Math.round(amount * rate);
    const paymentMethod = String(payment?.payment_method ?? order.payment_method ?? '-').replaceAll('_', ' ').toUpperCase();
    const rawPaymentStatus = String(payment?.status ?? order.payment_status ?? order.status).toLowerCase();
    const paymentStatus = ['completed', 'paid', 'verified'].includes(rawPaymentStatus)
      ? '✅ PAID & VERIFIED'
      : paymentMethod === 'CASH ON DELIVERY' || ['pending_arrival', 'cash_on_delivery'].includes(rawPaymentStatus)
        ? '🟠 CASH ON DELIVERY'
        : `⏳ ${rawPaymentStatus.replaceAll('_', ' ').toUpperCase()}`;
    const itemLines = items.length
      ? items.map((item) => {
        const itemTotal = Number(item.total_price ?? 0);
        const itemCurrency = String(order.currency ?? 'USD').toUpperCase();
        const itemAmount = itemCurrency === 'USD' ? `$${itemTotal.toFixed(2)}` : `${itemTotal.toFixed(2)} ${itemCurrency}`;
        return `• ${String(item.quantity ?? 0)}x ${String(item.product_name ?? 'Product')} — ${itemAmount}`;
      }).join('\n')
      : '• No order items recorded';
    const customerPhone = String(order['customer_phone'] ?? '-');
    const deliveryAddress = String(order['delivery_address'] ?? '-');
    const trackingUrl = `https://tyushop.blog/track-order/${encodeURIComponent(order.order_number)}`;
    const issuedAt = this.reportTimestamp(order.updated_at ?? order.created_at ?? Date.now());
    const currency = String(order.currency ?? 'USD').toUpperCase();
    const totalText = currency === 'USD' ? `$${amount.toFixed(2)} USD` : `${amount.toFixed(2)} ${currency}`;
    const message = [
      `🚨 TYUSHOP — PAYMENT & ORDER REPORT`,
      '━━━━━━━━━━━━━━━━━━━━━━',
      `🧾 Order ID: #${order.order_number}`,
      `📄 Receipt No: #${receipt.receipt_number}`,
      `🔐 Transaction: ${String(payment?.transaction_reference ?? '-')}`,
      `💳 Method: ${paymentMethod}`,
      `📌 Status: ${paymentStatus}`,
      `💰 Total Amount: ${totalText} (≈ ${amountKhr.toLocaleString()} ៛)`,
      '',
      '👤 CUSTOMER INFORMATION',
      `• Name: ${String(order.customer_name ?? '-')}`,
      `• Phone: ${customerPhone}`,
      `• Email: ${String(order.customer_email ?? '-')}`,
      `• Address: ${deliveryAddress}`,
      '',
      '📦 ORDER ITEMS',
      itemLines,
      '',
      `🎁 Loyalty Points: +${Number(order['points_earned'] ?? 5)} pts`,
      `🚚 GPS Tracking: ${trackingUrl}`,
      `🕒 Time: ${issuedAt}`,
    ].join('\n');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const messageResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
          signal: controller.signal,
        });
        if (messageResponse.ok) return true;

        // Keep the report deliverable if Telegram rejects the text request
        // but a configured branding image is available.
        const photo = this.config.get<string>('TELEGRAM_REPORT_IMAGE_URL', 'https://tyushop.blog/logo.png');
        if (!photo) return false;
        const photoResponse = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, photo, caption: message.slice(0, 1024) }),
          signal: controller.signal,
        });
        return photoResponse.ok;
      } finally { clearTimeout(timeout); }
    } catch { return false; }
  }

  private async mailSetting(key: string): Promise<string> { return this.setting(key, ''); }

  private async setting(key: string, fallback: string): Promise<string> {
    const value = (await this.database.query<{ setting_value: string | null }>('SELECT setting_value FROM store_settings WHERE setting_key = $1 LIMIT 1', [key])).rows[0]?.setting_value;
    return value === null || value === undefined || value === '' ? fallback : value;
  }

  private reportTimestamp(value: Date | string | number): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('sv-SE', { timeZone: 'Asia/Phnom_Penh', hour12: false });
  }

  private async pdfDocument(order: OrderRow, receipt: ReceiptRow, items: Array<Record<string, unknown>>, payment: Record<string, unknown> | null): Promise<Buffer> {
    const document = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolvePdf, reject) => {
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolvePdf(Buffer.concat(chunks)));
      document.on('error', reject);
      document.fontSize(22).fillColor('#12345b').text('TYUSHOP', { align: 'center' });
      document.fontSize(16).fillColor('#111111').text('Payment Receipt', { align: 'center' });
      document.moveDown().fontSize(10).text(`Receipt: ${receipt.receipt_number}`).text(`Order: ${order.order_number}`).text(`Issued: ${new Date(String(receipt.issued_at)).toISOString()}`);
      document.moveDown().fontSize(12).text(`Customer: ${order.customer_name ?? '-'}`).text(`Email: ${order.customer_email ?? '-'}`);
      document.moveDown().fontSize(11).text('Items', { underline: true });
      for (const item of items) document.text(`${String(item.product_name ?? 'Product')} × ${String(item.quantity ?? 0)}    ${String(item.total_price ?? 0)} USD`);
      document.moveDown().text(`Payment: ${String(payment?.payment_method ?? '-')}`).text(`Status: ${String(payment?.status ?? order.status)}`).text(`Total: ${String(order.total_amount)} ${order.currency ?? 'USD'}`);
      document.moveDown().fontSize(9).fillColor('#52677e').text(`Track your delivery at https://www.tyushop.blog/track-order/${encodeURIComponent(order.order_number)}`);
      document.end();
    });
  }

  private htmlDocument(order: OrderRow, receipt: ReceiptRow, items: Array<Record<string, unknown>>, payment: Record<string, unknown> | null): string {
    const rows = items.map((item) => `<tr><td>${this.escape(String(item.product_name ?? 'Product'))}</td><td>${this.escape(String(item.quantity ?? 0))}</td><td>${this.escape(String(item.total_price ?? 0))}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${this.escape(receipt.receipt_number)}</title></head><body><h1>TYUSHOP Payment Receipt</h1><p>Receipt: ${this.escape(receipt.receipt_number)}<br>Order: ${this.escape(order.order_number)}</p><p>Customer: ${this.escape(order.customer_name ?? '-')}<br>Email: ${this.escape(order.customer_email ?? '-')}</p><table border="1" cellpadding="6"><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p>Payment: ${this.escape(String(payment?.payment_method ?? '-'))}<br>Total: ${this.escape(String(order.total_amount))} ${this.escape(order.currency ?? 'USD')}</p></body></html>`;
  }

  private emailText(order: OrderRow, receipt: ReceiptRow, payment: Record<string, unknown> | null, withPdf: boolean, items: Array<Record<string, unknown>>): string {
    const lines = items.map((item) => `- ${String(item.product_name ?? 'Product')} x ${String(item.quantity ?? 0)}: ${String(item.total_price ?? 0)} USD`).join('\n');
    return `${withPdf ? 'Payment receipt' : 'Order confirmation'} for ${order.order_number}\nReceipt: ${receipt.receipt_number}\nCustomer: ${order.customer_name ?? '-'}\nPayment: ${String(payment?.payment_method ?? '-')}\nTotal: ${String(order.total_amount)} ${order.currency ?? 'USD'}\n\n${lines}\n\nTrack: https://www.tyushop.blog/track-order/${encodeURIComponent(order.order_number)}`;
  }

  private escape(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character); }
  private datePart(): string { const now = new Date(); return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`; }
}
