import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { DeliverySettingsService } from './delivery-settings.service';

@Controller('api/v1/delivery')
export class DeliverySettingsController {
  constructor(private readonly settings: DeliverySettingsService) {}
  @Get('settings') async get(): Promise<Record<string, unknown>> { return this.settings.settings(); }
  @Post('settings') @UseGuards(SanctumGuard) async update(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.settings.update(body, request.authUserId as number); }
  @Post('toggle-free') @UseGuards(SanctumGuard) async toggle(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.settings.toggle(body, request.authUserId as number); }
  @Post('methods') @UseGuards(SanctumGuard) async add(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.settings.add(body, request.authUserId as number); }
  @Patch('methods/:id') @UseGuards(SanctumGuard) async patch(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.settings.updateMethod(id, body, request.authUserId as number); }
  @Delete('methods/:id') @UseGuards(SanctumGuard) async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.settings.remove(id, request.authUserId as number); }
}
