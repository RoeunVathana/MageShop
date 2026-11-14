import { ForbiddenException, Injectable } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
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

    const isDriver = this.auth.hasAnyRole(user, ['DELIVERY_DRIVER', 'COURIER', 'DELIVERY']);
    const isSupervisor = this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN']);
    const result = await this.database.query<DeliveryOrderRow>(`
      SELECT id, order_number, user_id, driver_id, status, subtotal, discount,
             shipping_fee, tax, total_amount, currency, payment_status,
             payment_method, customer_name, customer_email, customer_phone,
             delivery_address, notes, driver_name, driver_phone, driver_vehicle,
             current_lat, current_lng, dest_lat, dest_lng, estimated_arrival,
             created_at, updated_at
      FROM orders
      ${isDriver && !isSupervisor ? 'WHERE driver_id = $1' : ''}
      ORDER BY id DESC
      LIMIT 30
    `, isDriver && !isSupervisor ? [user.id] : []);

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
}
