import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { ParsedQs } from 'qs';

import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

interface OrderRow {
  id: number;
  order_number: string;
  user_id: number | null;
  driver_id: number | null;
  status: string;
  subtotal: number | string;
  discount: number | string | null;
  total_amount: number | string;
  payment_status: string | null;
  payment_method: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  points_earned: number | string | null;
  points_redeemed: number | string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_vehicle: string | null;
  current_lat: number | string | null;
  current_lng: number | string | null;
  dest_lat: number | string | null;
  dest_lng: number | string | null;
  estimated_arrival: string | null;
}

interface OrderItemRow {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface PaymentRow {
  id: number;
  order_id: number;
  transaction_reference: string;
  payment_method: string;
  amount: number | string;
  currency: string;
  status: string;
  khqr_string: string | null;
  khqr_md5: string | null;
  verified_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async listCustomer(query: ParsedQs, userId: number): Promise<Record<string, unknown>> {
    const user = await this.auth.me(userId);
    const perPage = Math.min(50, Math.max(1, this.number(query.per_page) ?? 10));
    const page = Math.max(1, this.number(query.page) ?? 1);
    const offset = (page - 1) * perPage;
    const orders = await this.database.query<OrderRow & { full_count: number | string }>(`
      SELECT o.*, COUNT(*) OVER()::int AS full_count
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `, [user.id, perPage, offset]);
    const data = await this.hydrateOrders(orders.rows);
    const total = Number(orders.rows[0]?.full_count ?? 0);
    return { status: 'success', data, meta: this.meta(page, perPage, total) };
  }

  async cancel(orderNumber: string, userId: number): Promise<Record<string, unknown>> {
    const user = await this.auth.me(userId);
    const order = await this.database.query<OrderRow>('SELECT * FROM orders WHERE order_number = $1 AND user_id = $2 LIMIT 1', [orderNumber, user.id]);
    const row = order.rows[0];
    if (!row) throw new NotFoundException({ status: 'error', message: 'Order not found.' });
    if (!['pending', 'confirmed'].includes(row.status)) {
      throw new UnprocessableEntityException({ status: 'error', message: 'This order has already entered fulfillment and can no longer be cancelled here.' });
    }
    const updated = await this.database.query<OrderRow>('UPDATE orders SET status = \'cancelled\', updated_at = NOW() WHERE id = $1 RETURNING *', [row.id]);
    const hydrated = await this.hydrateOrders(updated.rows);
    return { status: 'success', message: `Order #${row.order_number} was cancelled.`, data: hydrated[0] };
  }

  async track(orderNumber: string, userId: number): Promise<Record<string, unknown>> {
    const orderResult = await this.database.query<OrderRow>(`
      SELECT id, order_number, user_id, driver_id, status, subtotal, discount,
             total_amount, payment_status, payment_method, customer_name,
             customer_phone, delivery_address, points_earned, points_redeemed,
             driver_name, driver_phone, driver_vehicle, current_lat, current_lng,
             dest_lat, dest_lng, estimated_arrival
      FROM orders
      WHERE order_number = $1
      LIMIT 1
    `, [orderNumber]);
    const order = orderResult.rows[0];
    if (!order) throw new NotFoundException({ status: 'error', message: 'Order not found.' });

    const user = await this.auth.me(userId);
    this.authorizeOrder(user, order);
    const items = await this.database.query<OrderItemRow>(`
      SELECT id, order_id, product_id, product_name, product_sku, quantity,
             unit_price, total_price, created_at, updated_at
      FROM order_items
      WHERE order_id = $1
      ORDER BY id
    `, [order.id]);

    const currentLat = Number(order.current_lat ?? order.dest_lat ?? 0);
    const currentLng = Number(order.current_lng ?? order.dest_lng ?? 0);
    const destLat = Number(order.dest_lat ?? 0);
    const destLng = Number(order.dest_lng ?? 0);
    const paymentStatus = order.payment_status ?? 'unpaid';
    const paymentMethod = order.payment_method ?? 'bakong_khqr';
    const totalAmount = Number(order.total_amount);
    const isCashOnArrival = ['cash_on_delivery', 'cash_on_hand'].includes(paymentMethod)
      && paymentStatus !== 'paid'
      && totalAmount > 0;
    const amountDueOnArrival = isCashOnArrival ? totalAmount : 0;
    const distanceRemainingKm = this.distance(currentLat, currentLng, destLat, destLng, order);
    const estimatedMins = distanceRemainingKm === null
      ? null
      : Math.max(2, Math.round((distanceRemainingKm / 28) * 60));
    const eta = order.status === 'delivered'
      ? 'Delivered'
      : (order.estimated_arrival ?? (estimatedMins === null ? null : `${estimatedMins} mins`));

    return {
      status: 'ok',
      data: {
        order_number: order.order_number,
        status: order.status,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        amount_due_on_arrival: amountDueOnArrival,
        total_amount: totalAmount,
        discount: Number(order.discount ?? 0),
        points_earned: Number(order.points_earned ?? 0),
        points_redeemed: Number(order.points_redeemed ?? 0),
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        delivery_address: order.delivery_address,
        driver: {
          name: order.driver_name,
          phone: order.driver_phone,
          vehicle: order.driver_vehicle,
          rating: 4.95,
          verified: true,
        },
        gps: {
          warehouse_lat: null,
          warehouse_lng: null,
          warehouse_name: null,
          current_lat: currentLat,
          current_lng: currentLng,
          dest_lat: destLat,
          dest_lng: destLng,
          estimated_arrival: eta,
          distance_remaining_km: order.status === 'delivered' ? 0 : distanceRemainingKm,
          speed_kmh: order.status === 'delivered' ? 0 : null,
          updated_at: new Date().toISOString(),
        },
        checkpoints: this.checkpoints(order, isCashOnArrival, amountDueOnArrival, eta),
        items: items.rows,
      },
    };
  }

  private authorizeOrder(user: AuthUser, order: OrderRow): void {
    const roleNames = user.roles.map((role) => [role.name, role.slug].map((value) => value.toUpperCase()));
    const hasRole = (roles: string[]): boolean => roleNames.some((names) => names.some((name) => roles.includes(name)));
    const isStaff = hasRole(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT', 'LOGISTICS_MANAGER', 'DISPATCHER']);
    const isAssignedDriver = hasRole(['DELIVERY_DRIVER', 'COURIER', 'DELIVERY']) && order.driver_id === user.id;
    if (!isStaff && !isAssignedDriver && order.user_id !== user.id) {
      throw new ForbiddenException({ status: 'error', message: 'You do not have access to this order.' });
    }
  }

  private checkpoints(order: OrderRow, cash: boolean, amount: number, eta: string | null): Array<Record<string, unknown>> {
    return [
      {
        title: cash ? `Order Confirmed • Cash on Hand Upon Arrival ($${amount.toFixed(2)})` : 'Order Confirmed & Online Payment Verified',
        location: 'TYUSHOP Checkout',
        time: 'Completed',
        done: true,
      },
      {
        title: 'Warehouse Dispatch',
        location: order.delivery_address,
        time: order.status === 'pending' ? 'Waiting for dispatch' : 'Completed',
        done: order.status !== 'pending',
        active: order.status === 'pending',
      },
      {
        title: 'Out for Delivery • Live GPS Telemetry',
        location: order.delivery_address,
        time: order.status === 'pending' ? 'Not started' : (order.status === 'delivered' ? 'Delivered' : 'In transit'),
        done: ['shipped', 'out_for_delivery', 'delivered'].includes(order.status),
        active: ['shipped', 'out_for_delivery'].includes(order.status),
      },
      {
        title: order.status === 'delivered'
          ? 'Delivered to Doorstep (Handover Complete)'
          : (cash ? `Arriving at Location • Pay Cash on Hand ($${amount.toFixed(2)}) to Courier` : 'Arriving at Customer Doorstep'),
        location: order.delivery_address,
        time: order.status === 'delivered' ? 'Completed' : (eta ?? 'Awaiting ETA'),
        done: order.status === 'delivered',
        active: order.status !== 'delivered',
      },
    ];
  }

  private distance(currentLat: number, currentLng: number, destLat: number, destLng: number, order: OrderRow): number | null {
    if (order.current_lat === null || order.current_lng === null || order.dest_lat === null || order.dest_lng === null) {
      return null;
    }
    const radians = Math.PI / 180;
    const theta = (currentLng - destLng) * radians;
    const value = Math.sin(currentLat * radians) * Math.sin(destLat * radians)
      + Math.cos(currentLat * radians) * Math.cos(destLat * radians) * Math.cos(theta);
    const angle = Math.acos(Math.max(-1, Math.min(1, value)));
    return Math.max(0.1, Number((angle * 60 * 1.1515 * 1.609344 * 180 / Math.PI).toFixed(2)));
  }

  private async hydrateOrders(rows: OrderRow[]): Promise<Array<Record<string, unknown>>> {
    const ids = rows.map((row) => row.id);
    if (!ids.length) return [];
    const [items, payments] = await Promise.all([
      this.database.query<OrderItemRow>('SELECT id, order_id, product_id, product_name, product_sku, quantity, unit_price, total_price, created_at, updated_at FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id', [ids]),
      this.database.query<PaymentRow>('SELECT id, order_id, transaction_reference, payment_method, amount, currency, status, khqr_string, khqr_md5, verified_at, created_at, updated_at FROM payments WHERE order_id = ANY($1::int[]) ORDER BY id', [ids]),
    ]);
    const itemsByOrder = new Map<number, OrderItemRow[]>();
    const paymentsByOrder = new Map<number, PaymentRow[]>();
    for (const item of items.rows) itemsByOrder.set(item.order_id, [...(itemsByOrder.get(item.order_id) ?? []), item]);
    for (const payment of payments.rows) paymentsByOrder.set(payment.order_id, [...(paymentsByOrder.get(payment.order_id) ?? []), payment]);
    return rows.map((row) => ({ ...row, full_count: undefined, items: itemsByOrder.get(row.id) ?? [], payments: paymentsByOrder.get(row.id) ?? [] }));
  }

  private meta(page: number, perPage: number, total: number): Record<string, unknown> {
    return { current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage, total };
  }

  private number(value: unknown): number | null {
    const raw = Array.isArray(value) ? value[0] : value;
    const result = Number(raw);
    return raw !== undefined && raw !== null && String(raw).trim() !== '' && Number.isFinite(result) ? result : null;
  }
}
