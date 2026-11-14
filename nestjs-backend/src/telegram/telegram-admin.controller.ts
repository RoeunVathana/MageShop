import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { ParsedQs } from 'qs';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { TelegramAdminService } from './telegram-admin.service';

@Controller('api/v1/telegram/admin')
@UseGuards(SanctumGuard)
export class TelegramAdminController {
  constructor(private readonly admin: TelegramAdminService) {}

  @Get('stock')
  stock(@Query() query: ParsedQs, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.admin.stock(query, request.authUserId as number);
  }

  @Post('stock-adjust')
  adjust(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.admin.adjustStock(body ?? {}, request.authUserId as number);
  }

  @Get('sales-summary')
  salesSummary(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.admin.salesSummary(request.authUserId as number);
  }
}
