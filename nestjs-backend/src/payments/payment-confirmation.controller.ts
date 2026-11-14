import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { PaymentConfirmationService } from './payment-confirmation.service';

@Controller('api/v1/orders/track')
export class PaymentConfirmationController {
  constructor(private readonly payments: PaymentConfirmationService) {}

  @Post(':orderNumber/confirm-payment')
  @UseGuards(SanctumGuard)
  async confirm(
    @Param('orderNumber') orderNumber: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.payments.confirm(orderNumber, request.authUserId as number);
  }
}
