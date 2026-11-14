import { ForbiddenException, Injectable } from '@nestjs/common';

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
}
