import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { AdminDnsService } from './admin-dns.service';

@Controller('api/v1/admin/dns')
@UseGuards(SanctumGuard)
export class AdminDnsController {
  constructor(private readonly dns: AdminDnsService) {}

  @Post('porkbun-configure')
  configure(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.dns.configure(body, request.authUserId as number);
  }
}
