import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { AdminMaintenanceService } from './admin-maintenance.service';

@Controller('api/v1/admin/database')
@UseGuards(SanctumGuard)
export class AdminMaintenanceController {
  constructor(private readonly maintenance: AdminMaintenanceService) {}

  @Post('clear-application-data')
  clear(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.maintenance.clearApplicationData(body, request.authUserId as number);
  }
}
