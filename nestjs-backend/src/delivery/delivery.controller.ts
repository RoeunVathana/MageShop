import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { DeliveryService } from './delivery.service';

@Controller('api/v1/delivery')
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get('orders')
  @UseGuards(SanctumGuard)
  async orders(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.delivery.orders(request.authUserId as number);
  }

  @Patch('orders/:orderNumber/location')
  @UseGuards(SanctumGuard)
  async location(@Param('orderNumber') orderNumber: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.delivery.updateLocation(orderNumber, body, request.authUserId as number); }

  @Post('orders/:orderNumber/status')
  @UseGuards(SanctumGuard)
  async status(@Param('orderNumber') orderNumber: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.delivery.updateStatus(orderNumber, body, request.authUserId as number); }

  @Post('broadcast-gps')
  @UseGuards(SanctumGuard)
  async broadcastGps(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.delivery.broadcastGps(body, request.authUserId as number); }
}
