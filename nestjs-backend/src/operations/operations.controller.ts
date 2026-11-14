import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { OperationsService } from './operations.service';

@Controller('api/v1/operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('overview')
  @UseGuards(SanctumGuard)
  async overview(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.operations.overview(request.authUserId as number);
  }

  @Get('drivers')
  @UseGuards(SanctumGuard)
  async drivers(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.operations.drivers(request.authUserId as number);
  }

  @Post('orders/:orderNumber/assign-driver')
  @UseGuards(SanctumGuard)
  async assignDriver(@Param('orderNumber') orderNumber: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.operations.assignDriver(orderNumber, body, request.authUserId as number); }

  @Get('seller-dashboard')
  @UseGuards(SanctumGuard)
  async sellerDashboard(@Query() query: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.operations.sellerDashboard(query, request.authUserId as number); }
}
