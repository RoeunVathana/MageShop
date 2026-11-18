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
    const html = this.emailHtml(order, receipt, payment, withPdf, items);
    const body: Record<string, unknown> = {
      from: `${fromName} <${from}>`,
      to: [order.customer_email],
      subject: withPdf ? `TYUSHOP Payment Receipt #${receipt.receipt_number}` : `TYUSHOP Order Confirmation #${order.order_number}`,
      text,
      html,
    };
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
      ? items.slice(0, 20).map((item) => {
        const itemTotal = Number(item.total_price ?? 0);
        const itemCurrency = String(order.currency ?? 'USD').toUpperCase();
        const itemAmount = itemCurrency === 'USD' ? `$${itemTotal.toFixed(2)}` : `${itemTotal.toFixed(2)} ${itemCurrency}`;
        return `• <b>${this.escape(String(item.quantity ?? 0))}×</b> ${this.escape(String(item.product_name ?? 'Product'))} <i>— ${this.escape(itemAmount)}</i>`;
      }).join('\n')
      : '• No order items recorded';
    const omittedItems = items.length > 20 ? `\n<i>…and ${items.length - 20} more item(s)</i>` : '';
    const customerPhone = this.escape(String(order['customer_phone'] ?? '-'));
    const deliveryAddress = this.escape(String(order['delivery_address'] ?? '-'));
    const trackingUrl = `https://tyushop.blog/track-order/${encodeURIComponent(order.order_number)}`;
    const miniAppUrl = await this.setting('telegram_mini_app_url', this.config.get<string>('TELEGRAM_MINI_APP_URL', 'https://tyushop.blog/telegram-app'));
    const issuedAt = this.reportTimestamp(order.updated_at ?? order.created_at ?? Date.now());
    const currency = String(order.currency ?? 'USD').toUpperCase();
    const totalText = currency === 'USD' ? `$${amount.toFixed(2)} USD` : `${amount.toFixed(2)} ${currency}`;
    const message = [
      '🚨 <b>TYUSHOP | PAYMENT &amp; ORDER</b>',
      '<i>New order activity requires your attention</i>',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '<b>🧾 ORDER SUMMARY</b>',
      `Order: <code>#${this.escape(order.order_number)}</code>`,
      `Receipt: <code>#${this.escape(receipt.receipt_number)}</code>`,
      `Transaction: <code>${this.escape(String(payment?.transaction_reference ?? '-'))}</code>`,
      `Payment: <b>${this.escape(paymentMethod)}</b>`,
      `Status: <b>${this.escape(paymentStatus)}</b>`,
      `Total: <b>${this.escape(totalText)}</b> <i>(≈ ${amountKhr.toLocaleString()} ៛)</i>`,
      '',
      '<b>👤 CUSTOMER</b>',
      `Name: ${this.escape(String(order.customer_name ?? '-'))}`,
      `Phone: ${customerPhone}`,
      `Email: ${this.escape(String(order.customer_email ?? '-'))}`,
      `Address: ${deliveryAddress}`,
      '',
      '<b>📦 ITEMS</b>',
      itemLines + omittedItems,
      '',
      `🎁 Loyalty points: <b>+${Number(order['points_earned'] ?? 5)} pts</b>`,
      `🕒 Reported: ${this.escape(issuedAt)}`,
      '',
      `<a href="${trackingUrl}">🚚 Open live delivery tracking</a>`,
    ].join('\n');
    const replyMarkup = {
      inline_keyboard: [[
        { text: '🚚 View Delivery', url: trackingUrl },
        // A normal HTTPS URL works in both private admin chats and group chats.
        { text: '🛍️ Open Mini App', url: miniAppUrl },
      ]],
    };
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const messageResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: replyMarkup }),
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
          body: JSON.stringify({ chat_id: chatId, photo, caption: message.replace(/<[^>]+>/g, '').slice(0, 1024), reply_markup: replyMarkup }),
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
    const lines = items.length
      ? items.map((item) => `- ${String(item.product_name ?? 'Product')} × ${String(item.quantity ?? 0)}: ${String(item.total_price ?? 0)} ${order.currency ?? 'USD'}`).join('\n')
      : '- No order items recorded';
    const paymentStatus = this.paymentStatusText(order, payment);
    return [
      `TYUSHOP ${withPdf ? 'PAYMENT RECEIPT' : 'ORDER CONFIRMATION'}`,
      '========================================',
      `Order: #${order.order_number}`,
      `Receipt: #${receipt.receipt_number}`,
      `Status: ${paymentStatus}`,
      `Payment: ${String(payment?.payment_method ?? order.payment_method ?? '-')}`,
      `Total: ${String(order.total_amount)} ${order.currency ?? 'USD'}`,
      '',
      `Customer: ${order.customer_name ?? '-'}`,
      `Email: ${order.customer_email ?? '-'}`,
      `Phone: ${order['customer_phone'] ?? '-'}`,
      `Delivery address: ${order['delivery_address'] ?? '-'}`,
      '',
      'ITEMS',
      lines,
      '',
      `Track delivery: https://www.tyushop.blog/track-order/${encodeURIComponent(order.order_number)}`,
      '',
      'Thank you for shopping with TYUSHOP.',
    ].join('\n');
  }

  private emailHtml(order: OrderRow, receipt: ReceiptRow, payment: Record<string, unknown> | null, withPdf: boolean, items: Array<Record<string, unknown>>): string {
    const orderNumber = this.escape(order.order_number);
    const receiptNumber = this.escape(receipt.receipt_number);
    const trackingUrl = `https://tyushop.blog/track-order/${encodeURIComponent(order.order_number)}`;
    const paymentStatus = this.paymentStatusText(order, payment);
    const isPaid = ['paid', 'completed', 'verified'].includes(String(payment?.status ?? order.payment_status ?? '').toLowerCase());
    const statusColor = isPaid ? '#047857' : '#b45309';
    const statusBackground = isPaid ? '#d1fae5' : '#fef3c7';
    const paymentMethod = this.escape(String(payment?.payment_method ?? order.payment_method ?? '-').replaceAll('_', ' ').toUpperCase());
    const currency = this.escape(String(order.currency ?? 'USD').toUpperCase());
    const total = this.escape(`${Number(order.total_amount ?? 0).toFixed(2)} ${order.currency ?? 'USD'}`);
    const customerName = this.escape(String(order.customer_name ?? '-'));
    const customerEmail = this.escape(String(order.customer_email ?? '-'));
    const customerPhone = this.escape(String(order['customer_phone'] ?? '-'));
    const address = this.escape(String(order['delivery_address'] ?? 'Delivery address not provided'));
    const reportedAt = this.escape(this.reportTimestamp(order.updated_at ?? order.created_at ?? Date.now()));
    const itemRows = items.length
      ? items.map((item) => `<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#172033;font-weight:600;">${this.escape(String(item.product_name ?? 'Product'))}</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:center;color:#64748b;">${this.escape(String(item.quantity ?? 0))}</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#172033;font-weight:700;">${this.escape(String(item.total_price ?? 0))} ${currency}</td></tr>`).join('')
      : '<tr><td colspan="3" style="padding:12px 0;color:#64748b;">No order items recorded.</td></tr>';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TYUSHOP ${withPdf ? 'Payment Receipt' : 'Order Confirmation'} #${orderNumber}</title></head><body style="margin:0;background:#f1f5f9;color:#172033;font-family:Arial,Helvetica,sans-serif;"><div style="padding:28px 12px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.10);"><tr><td style="padding:28px 32px;background:linear-gradient(135deg,#102a56,#2563eb);color:#ffffff;"><div style="font-size:26px;font-weight:800;letter-spacing:.04em;">TYUSHOP</div><div style="margin-top:6px;color:#dbeafe;font-size:14px;">${withPdf ? 'Payment receipt & delivery details' : 'Your order has been received'}</div></td></tr><tr><td style="padding:28px 32px 10px;"><div style="font-size:22px;font-weight:800;">${withPdf ? 'Payment received successfully' : 'Thank you for your order'} 🎉</div><p style="margin:8px 0 0;color:#64748b;font-size:14px;line-height:1.6;">Order <strong style="color:#172033;">#${orderNumber}</strong> is recorded in your TYUSHOP account.</p></td></tr><tr><td style="padding:16px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${statusBackground};border-radius:14px;"><tr><td style="padding:16px 18px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:${statusColor};font-weight:800;">Payment status</div><div style="margin-top:5px;font-size:18px;color:${statusColor};font-weight:800;">${this.escape(paymentStatus)}</div><div style="margin-top:6px;font-size:13px;color:#475569;">${paymentMethod} · ${total}</div></td></tr></table></td></tr><tr><td style="padding:8px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="padding:12px 0;color:#64748b;font-size:13px;">Receipt number</td><td style="padding:12px 0;text-align:right;font-family:monospace;font-weight:700;font-size:13px;">#${receiptNumber}</td></tr><tr><td style="padding:12px 0;color:#64748b;font-size:13px;border-top:1px solid #e5e7eb;">Reported at</td><td style="padding:12px 0;text-align:right;font-size:13px;border-top:1px solid #e5e7eb;">${reportedAt}</td></tr></table></td></tr><tr><td style="padding:16px 32px;"><div style="font-size:16px;font-weight:800;margin-bottom:8px;">📦 Order items</div><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><thead><tr><th align="left" style="padding:8px 0;color:#94a3b8;font-size:11px;text-transform:uppercase;">Product</th><th align="center" style="padding:8px 0;color:#94a3b8;font-size:11px;text-transform:uppercase;">Qty</th><th align="right" style="padding:8px 0;color:#94a3b8;font-size:11px;text-transform:uppercase;">Total</th></tr></thead><tbody>${itemRows}</tbody></table></td></tr><tr><td style="padding:16px 32px;"><div style="font-size:16px;font-weight:800;margin-bottom:10px;">👤 Customer & delivery</div><div style="padding:16px;background:#f8fafc;border-radius:14px;font-size:13px;line-height:1.8;color:#475569;"><strong style="color:#172033;">${customerName}</strong><br>${customerEmail}<br>${customerPhone}<br><span style="color:#172033;font-weight:600;">${address}</span></div></td></tr><tr><td style="padding:18px 32px 28px;text-align:center;"><a href="${trackingUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:12px;font-size:14px;font-weight:800;">🚚 Track my delivery</a><p style="margin:14px 0 0;font-size:12px;color:#64748b;">You can follow delivery status and courier GPS from the tracking page.</p></td></tr><tr><td style="padding:18px 32px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.6;text-align:center;">TYUSHOP · Cambodia Online Marketplace<br>Need help? Reply to this email or contact TYUSHOP support.</td></tr></table></div></body></html>`;
  }

  private paymentStatusText(order: OrderRow, payment: Record<string, unknown> | null): string {
    const rawStatus = String(payment?.status ?? order.payment_status ?? order.status).toLowerCase();
    if (['completed', 'paid', 'verified'].includes(rawStatus)) return 'PAID & VERIFIED';
    if (['pending_arrival', 'cash_on_delivery'].includes(rawStatus) || String(payment?.payment_method ?? order.payment_method ?? '').toLowerCase() === 'cash_on_delivery') return 'CASH ON DELIVERY';
    return rawStatus.replaceAll('_', ' ').toUpperCase();
  }

  private escape(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character); }
  private datePart(): string { const now = new Date(); return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`; }
}
