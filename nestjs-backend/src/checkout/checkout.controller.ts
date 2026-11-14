import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CheckoutService } from './checkout.service';

@Controller('api/v1/orders')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('checkout')
  @UseGuards(SanctumGuard)
  async checkoutOrder(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.checkout.create(body, request.authUserId as number);
  }
}
