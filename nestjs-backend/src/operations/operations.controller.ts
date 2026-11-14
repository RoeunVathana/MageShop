import { Controller, Get, Req, UseGuards } from '@nestjs/common';

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
}
