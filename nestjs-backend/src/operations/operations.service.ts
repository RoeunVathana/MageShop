import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

interface DriverRow {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  status: string;
  roles: string[] | null;
  assigned_orders_count: number | string;
}

interface DriverAssignment {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
}

@Injectable()
export class OperationsService {
  private readonly operationsRoles = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT', 'LOGISTICS_MANAGER', 'DISPATCHER'];

  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async overview(userId: number): Promise<Record<string, unknown>> {
    const user = await this.auth.me(userId);
    this.requireOperationsRole(user);
    const [pending, processing, tickets, lowStock, activeProducts, deliveredToday, pendingSellers, queue, drivers] = await Promise.all([
      this.database.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM orders WHERE status IN ('pending', 'confirmed')"),
      this.database.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM orders WHERE status IN ('processing', 'shipped', 'out_for_delivery')"),
      this.database.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM support_tickets WHERE status IN ('open', 'in_progress')"),
      this.database.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM products WHERE is_active = TRUE AND stock_quantity <= low_stock_threshold'),
      this.database.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM products WHERE is_active = TRUE'),
      this.database.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM orders WHERE status = 'delivered' AND updated_at::date = CURRENT_DATE"),
      this.database.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM seller_applications WHERE status = 'pending'"),
      this.database.query<Record<string, unknown>>('SELECT * FROM orders WHERE status IN (\'pending\', \'confirmed\', \'processing\', \'shipped\', \'out_for_delivery\') ORDER BY created_at DESC LIMIT 12'),
      this.driverRows(),
    ]);

    return {
      status: 'ok',
      data: {
        stats: {
          pending_orders: this.count(pending.rows[0]?.count),
          processing_orders: this.count(processing.rows[0]?.count),
          open_tickets: this.count(tickets.rows[0]?.count),
          low_stock_products: this.count(lowStock.rows[0]?.count),
          active_products: this.count(activeProducts.rows[0]?.count),
          delivered_today: this.count(deliveredToday.rows[0]?.count),
          pending_seller_applications: this.count(pendingSellers.rows[0]?.count),
        },
        queue: queue.rows,
        drivers: drivers.data,
      },
    };
  }

  async drivers(userId: number): Promise<Record<string, unknown>> {
    const user = await this.auth.me(userId);
    this.requireOperationsRole(user);
    return { status: 'ok', data: (await this.driverRows()).data };
  }

  async assignDriver(orderNumber: string, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.auth.me(userId);
    this.requireOperationsRole(user);
    const order = await this.database.query<Record<string, unknown>>('SELECT * FROM orders WHERE order_number=$1 LIMIT 1', [orderNumber]);
    const current = order.rows[0];
    if (!current) throw new NotFoundException({ status: 'error', message: 'Order not found.' });
    if (['delivered', 'cancelled'].includes(String(current.status))) throw new UnprocessableEntityException({ status: 'error', message: `Order #${orderNumber} is already ${current.status} and cannot be assigned.` });
    const driverId = this.id(body.driver_id);
    let driver: DriverAssignment | null = null;
    if (driverId !== null) {
      const result = await this.database.query<DriverAssignment>(`
        SELECT u.id, u.name, u.email, u.phone_number
        FROM users u JOIN role_user ru ON ru.user_id=u.id JOIN roles r ON r.id=ru.role_id
        WHERE u.id=$1 AND u.status='active' AND r.slug IN ('delivery_driver','courier','delivery') LIMIT 1
      `, [driverId]);
      driver = result.rows[0] ?? null;
      if (!driver) throw new UnprocessableEntityException({ status: 'error', message: 'The selected user is not an active delivery driver.' });
    }
    await this.database.query('UPDATE orders SET driver_id=$1, driver_name=$2, driver_phone=$3, updated_at=NOW() WHERE id=$4', [driver?.id ?? null, driver?.name ?? null, driver?.phone_number ?? null, current.id]);
    const refreshed = await this.database.query<Record<string, unknown>>('SELECT * FROM orders WHERE id=$1', [current.id]);
    const items = await this.database.query<Record<string, unknown>>('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id', [current.id]);
    return { status: 'ok', message: driver ? `Order #${orderNumber} assigned to ${driver.name}.` : `Driver assignment removed from Order #${orderNumber}.`, data: { ...refreshed.rows[0], driver, items: items.rows } };
  }

  async sellerDashboard(query: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN', 'SELLER', 'SELLER_STAFF'])) throw new ForbiddenException({ status: 'error', message: 'Seller access is required.' });
    const requestedSellerId = this.id(query.seller_id);
    const sellerId = requestedSellerId !== null && this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN']) ? requestedSellerId : user.id;
    const application = await this.database.query<Record<string, unknown>>('SELECT * FROM seller_applications WHERE user_id=$1 LIMIT 1', [sellerId]);
    const products = await this.database.query<{ active: number; total: number }>('SELECT COUNT(*) FILTER (WHERE is_active=TRUE)::int AS active, COUNT(*)::int AS total FROM products WHERE seller_id=$1', [sellerId]);
    const sales = await this.database.query<{ gross_revenue: number | string; pending_orders: number }>(`
      SELECT COALESCE(SUM(oi.total_price),0) AS gross_revenue,
             COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('pending','confirmed','processing'))::int AS pending_orders
      FROM order_items oi JOIN products p ON p.id=oi.product_id JOIN orders o ON o.id=oi.order_id
      WHERE p.seller_id=$1 AND o.status <> 'cancelled'
    `, [sellerId]);
    const orders = await this.database.query<Record<string, unknown>>(`
      SELECT DISTINCT o.* FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN products p ON p.id=oi.product_id
      WHERE p.seller_id=$1 AND o.status <> 'cancelled' ORDER BY o.created_at DESC LIMIT 12
    `, [sellerId]);
    const orderIds = orders.rows.map((row) => row.id);
    const items = orderIds.length ? await this.database.query<Record<string, unknown>>('SELECT oi.*, p.name AS product_name, p.slug AS product_slug, p.image_url AS product_image_url FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=ANY($1::int[]) AND p.seller_id=$2 ORDER BY oi.id', [orderIds, sellerId]) : { rows: [] } as { rows: Record<string, unknown>[] };
    const itemMap = new Map<number, Record<string, unknown>[]>();
    for (const item of items.rows) itemMap.set(Number(item.order_id), [...(itemMap.get(Number(item.order_id)) ?? []), item]);
    return { status: 'ok', data: { application: application.rows[0] ?? null, store: { name: application.rows[0]?.store_name ?? null, slug: application.rows[0]?.slug ?? null, status: application.rows[0]?.status ?? (this.auth.hasAnyRole(user, ['SELLER', 'SELLER_STAFF']) ? 'approved' : 'pending') }, stats: { gross_revenue: Number(sales.rows[0]?.gross_revenue ?? 0), pending_orders: Number(sales.rows[0]?.pending_orders ?? 0), active_listings: Number(products.rows[0]?.active ?? 0), total_listings: Number(products.rows[0]?.total ?? 0), payout_balance: 0 }, orders: orders.rows.map((order) => ({ ...order, items: itemMap.get(Number(order.id)) ?? [] })) } };
  }

  private async driverRows(): Promise<{ data: Array<Record<string, unknown>> }> {
    const result = await this.database.query<DriverRow>(`
      SELECT u.id, u.name, u.email, u.phone_number, u.status,
             ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.name), NULL) AS roles,
             COUNT(DISTINCT CASE WHEN o.status IN ('shipped', 'out_for_delivery') THEN o.id END)::text AS assigned_orders_count
      FROM users u
      INNER JOIN role_user ru ON ru.user_id = u.id
      INNER JOIN roles r ON r.id = ru.role_id
      LEFT JOIN orders o ON o.driver_id = u.id
      WHERE u.status = 'active'
        AND r.slug IN ('delivery_driver', 'courier', 'delivery')
      GROUP BY u.id, u.name, u.email, u.phone_number, u.status
      ORDER BY u.name
    `);
    return {
      data: result.rows.map((driver) => ({
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone_number: driver.phone_number,
        status: driver.status,
        roles: driver.roles ?? [],
        assigned_orders_count: this.count(driver.assigned_orders_count),
      })),
    };
  }

  private requireOperationsRole(user: Parameters<AuthService['hasAnyRole']>[0]): void {
    if (!this.auth.hasAnyRole(user, this.operationsRoles)) {
      throw new ForbiddenException({ status: 'error', message: 'You do not have permission to access this operation.' });
    }
  }

  private count(value: string | number | null | undefined): number {
    return Number(value ?? 0);
  }

  private id(value: unknown): number | null { const result = Number(value); return value !== undefined && value !== null && String(value).trim() !== '' && Number.isInteger(result) && result > 0 ? result : null; }
}
