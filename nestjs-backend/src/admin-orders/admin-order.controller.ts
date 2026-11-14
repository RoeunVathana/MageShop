import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { ParsedQs } from 'qs';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AdminOrderService } from './admin-order.service';

@Controller('api/v1/admin')
@UseGuards(SanctumGuard)
export class AdminOrderController {
  constructor(private readonly orders: AdminOrderService) {}

  @Get('stats')
  stats(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.orders.stats(request.authUserId as number); }

  @Get('overview')
  overview(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.orders.stats(request.authUserId as number); }

  @Get('orders')
  list(@Query() query: ParsedQs, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.orders.list(query, request.authUserId as number); }

  @Get('orders/:id')
  show(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.orders.show(id, request.authUserId as number); }

  @Patch('orders/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.orders.update(id, body, request.authUserId as number); }

  @Patch('orders/:id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.orders.updateStatus(id, body, request.authUserId as number); }

  @Patch('orders/:id/payment-status')
  updatePaymentStatus(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.orders.updatePaymentStatus(id, body, request.authUserId as number); }

  @Delete('orders/:id')
  destroy(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.orders.destroy(id, request.authUserId as number); }
}
