import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { AdminMaintenanceService } from './admin-maintenance.service';

@Controller('api/v1/admin')
@UseGuards(SanctumGuard)
export class AdminMaintenanceController {
  constructor(private readonly maintenance: AdminMaintenanceService) {}

  @Post('seed-all')
  seedAll(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.maintenance.seedAll(body, request.authUserId as number);
  }

  @Post('database/seed')
  seedDatabase(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.maintenance.seedAll(body, request.authUserId as number);
  }

  @Post('database/clear-application-data')
  clear(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.maintenance.clearApplicationData(body, request.authUserId as number);
  }
}
