import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { OrderService } from './order.service';

@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Get('track/:orderNumber')
  @UseGuards(SanctumGuard)
  async track(
    @Param('orderNumber') orderNumber: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.orders.track(orderNumber, request.authUserId as number);
  }
}
