import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

interface DeliveryOrderRow {
  id: number;
  order_number: string;
  user_id: number | null;
  driver_id: number | null;
  status: string;
  subtotal: number | string;
  discount: number | string | null;
  shipping_fee: number | string | null;
  tax: number | string | null;
  total_amount: number | string;
  currency: string;
  payment_status: string | null;
  payment_method: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  notes: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_vehicle: string | null;
  current_lat: number | string | null;
  current_lng: number | string | null;
  dest_lat: number | string | null;
  dest_lng: number | string | null;
  estimated_arrival: string | null;
  created_at: Date | string;
  updated_at: Date | string;
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

@Injectable()
export class DeliveryService {
  private readonly deliveryRoles = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'LOGISTICS_MANAGER', 'DISPATCHER', 'DELIVERY_DRIVER', 'COURIER', 'DELIVERY'];

  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async orders(userId: number): Promise<Record<string, unknown>> {
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, this.deliveryRoles)) {
      throw new ForbiddenException({ status: 'error', message: 'Delivery staff privileges are required for this operation.' });
    }

    // DELIVERY is the fleet-monitoring role. It can read every driver's live
    // GPS position, while DELIVERY_DRIVER/COURIER remain scoped to assigned
    // routes. Mutation endpoints still enforce assignment separately below.
    const isAssignedDriver = this.auth.hasAnyRole(user, ['DELIVERY_DRIVER', 'COURIER']);
    const canViewAllFleetGps = this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'LOGISTICS_MANAGER', 'DISPATCHER', 'DELIVERY']);
    const result = await this.database.query<DeliveryOrderRow>(`
      SELECT id, order_number, user_id, driver_id, status, subtotal, discount,
             shipping_fee, tax, total_amount, currency, payment_status,
             payment_method, customer_name, customer_email, customer_phone,
             delivery_address, notes, driver_name, driver_phone, driver_vehicle,
             current_lat, current_lng, dest_lat, dest_lng, estimated_arrival,
             created_at, updated_at
      FROM orders
      ${isAssignedDriver && !canViewAllFleetGps ? 'WHERE driver_id = $1' : ''}
      ORDER BY id DESC
      LIMIT 30
    `, isAssignedDriver && !canViewAllFleetGps ? [user.id] : []);

    const orderIds = result.rows.map((order) => order.id);
    const itemResult = orderIds.length
      ? await this.database.query<OrderItemRow>('SELECT id, order_id, product_id, product_name, product_sku, quantity, unit_price, total_price, created_at, updated_at FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id', [orderIds])
      : { rows: [] } as { rows: OrderItemRow[] };
    const itemsByOrder = new Map<number, OrderItemRow[]>();
    for (const item of itemResult.rows) {
      const items = itemsByOrder.get(item.order_id) ?? [];
      items.push(item);
      itemsByOrder.set(item.order_id, items);
    }

    const data = result.rows.map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) ?? [],
      driver: order.driver_id ? {
        id: order.driver_id,
        name: order.driver_name,
        phone_number: order.driver_phone,
      } : null,
    }));

    return {
      status: 'ok',
      data,
      summary: {
        total_orders: data.length,
        in_transit: data.filter((order) => ['shipped', 'out_for_delivery'].includes(order.status)).length,
        delivered: data.filter((order) => order.status === 'delivered').length,
        pending: data.filter((order) => order.status === 'pending').length,
      },
    };
  }

  async updateLocation(orderNumber: string, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.authorizeStaff(userId);
    const order = await this.findOrder(orderNumber);
    // DELIVERY is the fleet-wide Delivery Location Manager. Drivers and
    // couriers may still edit only orders assigned to their own route.
    this.authorizeLocationOrder(user, order);
    const nextStatus = this.text(body.status);
    if (nextStatus && nextStatus !== order.status) {
      const transition = this.transitionError(user, order.status, nextStatus, orderNumber);
      if (transition) throw new UnprocessableEntityException({ status: 'error', message: transition });
    }
    const allowed: Record<string, string> = {
      delivery_address: 'delivery_address', dest_lat: 'dest_lat', dest_lng: 'dest_lng',
      current_lat: 'current_lat', current_lng: 'current_lng', estimated_arrival: 'estimated_arrival',
      driver_name: 'driver_name', driver_phone: 'driver_phone', driver_vehicle: 'driver_vehicle', status: 'status',
    };
    const values: unknown[] = [];
    const sets: string[] = [];
    for (const [key, column] of Object.entries(allowed)) {
      if (body[key] === undefined || body[key] === null) continue;
      const value = key.endsWith('_lat') || key.endsWith('_lng') ? this.coordinate(body[key]) : this.text(body[key]);
      if (value === null || (typeof value === 'string' && value.length > (key === 'delivery_address' ? 500 : 120))) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      values.push(value); sets.push(`${column}=$${values.length}`);
    }
    if (!sets.length) return { status: 'ok', message: `Location updated for Order #${orderNumber}.`, data: await this.orderPayload(order.id) };
    values.push(order.id);
    const updated = await this.database.query<{ id: number }>(`UPDATE orders SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING id`, values);
    return { status: 'ok', message: `Location updated for Order #${orderNumber}!`, data: await this.orderPayload(updated.rows[0].id) };
  }

  async updateStatus(orderNumber: string, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.authorizeStaff(userId);
    const order = await this.findOrder(orderNumber);
    this.authorizeOrder(user, order);
    const status = this.text(body.status);
    if (!['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) throw new UnprocessableEntityException({ status: 'error', message: 'The status field is invalid.' });
    const transition = this.transitionError(user, order.status, status, orderNumber);
    if (transition) throw new UnprocessableEntityException({ status: 'error', message: transition });
    if (status === 'delivered' && order.payment_status === 'pending_qr') throw new UnprocessableEntityException({ status: 'error', message: 'Verify the online payment before marking this order delivered.' });

    if (status === 'delivered' && ['cash_on_delivery', 'cash_on_hand'].includes(order.payment_method ?? '')) {
      const settled = await this.database.transaction(async (client) => {
        const locked = await client.query<Record<string, unknown>>('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [order.id]);
        const current = locked.rows[0];
        if (!current) throw new NotFoundException({ status: 'error', message: 'Order not found.' });
        await client.query("UPDATE orders SET status='delivered', payment_status='paid', updated_at=NOW() WHERE id=$1", [order.id]);
        await client.query("UPDATE payments SET status='completed', verified_at=COALESCE(verified_at,NOW()), updated_at=NOW() WHERE order_id=$1", [order.id]);
        if (current.user_id) {
          const earned = await client.query<{ exists: boolean }>("SELECT EXISTS(SELECT 1 FROM loyalty_transactions WHERE order_id=$1 AND type='earned') AS exists", [order.id]);
          if (!earned.rows[0]?.exists) {
            const points = Number(current.points_earned ?? 5);
            await client.query('UPDATE users SET loyalty_points=loyalty_points+$1, updated_at=NOW() WHERE id=$2', [points, current.user_id]);
            await client.query("INSERT INTO loyalty_transactions (user_id, order_id, type, points, description, created_at, updated_at) VALUES ($1,$2,'earned',$3,$4,NOW(),NOW())", [current.user_id, order.id, points, `Earned +${points} points from Order #${orderNumber}`]);
          }
        }
        return current;
      });
      return { status: 'ok', message: `Order #${orderNumber} delivered and cash payment confirmed.`, data: { order: await this.orderPayload(order.id), payment_status: 'paid', amount_due_on_arrival: 0, new_loyalty_points: settled.user_id ? await this.userPoints(Number(settled.user_id)) : null } };
    }
    await this.database.query('UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2', [status, order.id]);
    return { status: 'ok', message: `Order #${orderNumber} marked as ${status}.`, data: await this.orderPayload(order.id) };
  }

  async broadcastGps(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.authorizeStaff(userId);
    const orderNumber = this.text(body.order_number);
    const latitude = this.coordinate(body.latitude);
    const longitude = this.coordinate(body.longitude);
    if (!orderNumber || latitude === null || longitude === null) throw new UnprocessableEntityException({ status: 'error', message: 'The GPS coordinates and order_number are required.' });
    const order = await this.findOrder(orderNumber);
    this.authorizeOrder(user, order);
    if (!['shipped', 'out_for_delivery'].includes(order.status)) throw new UnprocessableEntityException({ status: 'error', message: 'The selected order is not currently in delivery.' });
    const driverName = this.optional(body.driver_name, 120);
    await this.database.query('UPDATE orders SET current_lat=$1, current_lng=$2, driver_name=COALESCE($3,driver_name), updated_at=NOW() WHERE id=$4', [latitude, longitude, driverName, order.id]);
    return { status: 'ok', message: `Live GPS coordinates (${latitude}, ${longitude}) broadcast for Order #${orderNumber}.`, data: { current_lat: latitude, current_lng: longitude, order_number: orderNumber, broadcast_at: new Date().toISOString() } };
  }

  private async authorizeStaff(userId: number): Promise<AuthUser> {
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, [...this.deliveryRoles, 'ORDER_MANAGER', 'LOGISTICS_MANAGER', 'DISPATCHER'])) throw new ForbiddenException({ status: 'error', message: 'Delivery staff privileges are required for this operation.' });
    return user;
  }

  private async findOrder(orderNumber: string): Promise<DeliveryOrderRow> {
    const result = await this.database.query<DeliveryOrderRow>('SELECT * FROM orders WHERE order_number=$1 LIMIT 1', [orderNumber]);
    if (!result.rows[0]) throw new NotFoundException({ status: 'error', message: 'Order not found.' });
    return result.rows[0];
  }

  private authorizeOrder(user: AuthUser, order: DeliveryOrderRow): void {
    const driver = this.auth.hasAnyRole(user, ['DELIVERY_DRIVER', 'COURIER', 'DELIVERY']);
    const supervisor = this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'LOGISTICS_MANAGER', 'DISPATCHER']);
    if (driver && !supervisor && order.driver_id !== user.id) throw new ForbiddenException({ status: 'error', message: 'This order is not assigned to your delivery route.' });
  }

  private authorizeLocationOrder(user: AuthUser, order: DeliveryOrderRow): void {
    const canManageFleetLocations = this.auth.hasAnyRole(user, [
      'SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'LOGISTICS_MANAGER', 'DISPATCHER', 'DELIVERY',
    ]);
    const isAssignedDriver = this.auth.hasAnyRole(user, ['DELIVERY_DRIVER', 'COURIER'])
      && order.driver_id === user.id;

    if (!canManageFleetLocations && !isAssignedDriver) {
      throw new ForbiddenException({ status: 'error', message: 'You can only manage locations for delivery orders assigned to your route.' });
    }
  }

  private transitionError(user: AuthUser, from: string, to: string, orderNumber: string): string | null {
    if (from === to) return null;
    const driver = this.auth.hasAnyRole(user, ['DELIVERY_DRIVER', 'COURIER', 'DELIVERY']);
    const supervisor = this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'LOGISTICS_MANAGER', 'DISPATCHER']);
    const allowed = ['pending', 'confirmed'].includes(from) ? (driver ? ['shipped'] : ['processing', 'shipped', 'cancelled']) : from === 'processing' ? (driver ? ['shipped'] : ['shipped', 'cancelled']) : ['shipped'].includes(from) ? (driver || supervisor ? ['out_for_delivery', 'delivered'] : []) : from === 'out_for_delivery' ? (driver || supervisor ? ['delivered'] : []) : [];
    return allowed.includes(to) ? null : `Order #${orderNumber} cannot move from ${from} to ${to} in the current workflow.`;
  }

  private async orderPayload(orderId: number): Promise<Record<string, unknown>> {
    const order = await this.database.query<Record<string, unknown>>('SELECT * FROM orders WHERE id=$1 LIMIT 1', [orderId]);
    const items = await this.database.query<Record<string, unknown>>('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id', [orderId]);
    return { ...order.rows[0], items: items.rows };
  }

  private async userPoints(userId: number): Promise<number> { const result = await this.database.query<{ loyalty_points: number | string }>('SELECT loyalty_points FROM users WHERE id=$1', [userId]); return Number(result.rows[0]?.loyalty_points ?? 0); }
  private text(value: unknown): string { return value === undefined || value === null ? '' : String(value).trim(); }
  private optional(value: unknown, max: number): string | null { const text = this.text(value); return text && text.length <= max ? text : null; }
  private coordinate(value: unknown): number | null { const result = Number(this.text(value)); return this.text(value) !== '' && Number.isFinite(result) ? result : null; }
}
