import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { DeliverySettingsService } from './delivery-settings.service';

/**
 * Laravel registers delivery pricing inside the authenticated admin group.
 * Keep those URLs separate from the public delivery-settings controller so
 * the NestJS implementation preserves both route families exactly.
 */
@Controller('api/v1/admin/delivery')
@UseGuards(SanctumGuard)
export class AdminDeliverySettingsController {
  constructor(private readonly settings: DeliverySettingsService) {}

  @Get('settings')
  get(): Promise<Record<string, unknown>> {
    return this.settings.settings();
  }

  @Post('settings')
  update(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.settings.update(body, request.authUserId as number);
  }

  @Post('toggle-free')
  toggle(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.settings.toggle(body, request.authUserId as number);
  }

  @Post('methods')
  add(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.settings.add(body, request.authUserId as number);
  }

  @Patch('methods/:id')
  patch(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.settings.updateMethod(id, body, request.authUserId as number);
  }

  @Delete('methods/:id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.settings.remove(id, request.authUserId as number);
  }
}
