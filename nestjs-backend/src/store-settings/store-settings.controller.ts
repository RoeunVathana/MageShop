import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { StoreSettingsService } from './store-settings.service';

@Controller('api/v1')
export class StoreSettingsController {
  constructor(private readonly settings: StoreSettingsService) {}
  @Get('store-settings') async publicSettings(): Promise<Record<string, unknown>> { return this.settings.publicSettings(); }
  @Get('admin/store-settings') @UseGuards(SanctumGuard) async adminSettings(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.settings.adminSettings(request.authUserId as number); }
  @Patch('store-settings') @UseGuards(SanctumGuard) async updatePatch(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.settings.update(body, request.authUserId as number); }
  @Post('store-settings') @UseGuards(SanctumGuard) async updatePost(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.settings.update(body, request.authUserId as number); }
  @Post('store-settings/currency') @UseGuards(SanctumGuard) async updateCurrency(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.settings.update(body, request.authUserId as number); }
  @Patch('admin/store-settings') @UseGuards(SanctumGuard) async updateAdminPatch(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.settings.update(body, request.authUserId as number); }
  @Post('admin/store-settings/currency') @UseGuards(SanctumGuard) async updateAdminCurrency(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.settings.update(body, request.authUserId as number); }
}
