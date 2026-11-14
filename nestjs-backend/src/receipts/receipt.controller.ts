import { Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { ReceiptService } from './receipt.service';

@Controller('api/v1')
@UseGuards(SanctumGuard)
export class ReceiptController {
  constructor(private readonly receipts: ReceiptService) {}

  @Get('orders/:identifier/receipt')
  async show(@Param('identifier') identifier: string, @Query('format') format: string | undefined, @Req() request: AuthenticatedRequest, @Res() response: Response): Promise<void> {
    const userId = request.authUserId as number;
    if (format === 'json') {
      response.json(await this.receipts.json(identifier, userId));
      return;
    }
    if (format === 'html') {
      response.type('html').send(await this.receipts.html(identifier, userId));
      return;
    }
    const pdf = await this.receipts.pdf(identifier, userId);
    response.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
    response.type('application/pdf').send(pdf.bytes);
  }

  @Post('admin/orders/:identifier/resend-receipt')
  async resend(@Param('identifier') identifier: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.receipts.resend(identifier, request.authUserId as number);
  }
}
