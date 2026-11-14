import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { EngagementService } from './engagement.service';
import { SanctumGuard } from '../auth/sanctum.guard';

@Controller('api/v1')
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}
  @Get('loyalty/summary') async loyalty(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.engagement.loyalty(request); }
  @Get('wishlist') async wishlist(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.engagement.wishlist(request); }
  @Post('loyalty/redeem-free-item') @UseGuards(SanctumGuard) async redeem(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.engagement.redeemFreeItem(body, request); }
  @Post('wishlist/toggle') @HttpCode(200) async toggle(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.engagement.toggleWishlist(body, request); }
  @Post('support/tickets') async ticket(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.engagement.ticket(body, request); }
  @Post('support/chat') @HttpCode(200) async chat(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> { return this.engagement.chat(body); }
}
