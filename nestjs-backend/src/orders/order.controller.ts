import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { ParsedQs } from 'qs';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { OrderService } from './order.service';

@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Get()
  @UseGuards(SanctumGuard)
  async list(@Query() query: ParsedQs, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.orders.listCustomer(query, request.authUserId as number);
  }

  @Get('track/:orderNumber')
  @UseGuards(SanctumGuard)
  async track(
    @Param('orderNumber') orderNumber: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.orders.track(orderNumber, request.authUserId as number);
  }

  @Post(':orderNumber/cancel')
  @UseGuards(SanctumGuard)
  async cancel(@Param('orderNumber') orderNumber: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.orders.cancel(orderNumber, request.authUserId as number);
  }
}
