import { Controller, Get, Req, UseGuards } from '@nestjs/common';

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
}
