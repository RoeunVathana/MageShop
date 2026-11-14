import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { SellerService } from './seller.service';

@Controller('api/v1/admin/sellers')
@UseGuards(SanctumGuard)
export class AdminSellerController {
  constructor(private readonly sellers: SellerService) {}

  @Get()
  async index(@Query() query: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.sellers.adminList(query, request.authUserId as number); }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.sellers.update(this.resourceId(id), body, request.authUserId as number); }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.sellers.remove(this.resourceId(id), request.authUserId as number); }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.sellers.approve(this.resourceId(id), request.authUserId as number); }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.sellers.reject(this.resourceId(id), body, request.authUserId as number); }

  @Patch(':id/status')
  async status(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.sellers.updateStatus(this.resourceId(id), body, request.authUserId as number); }

  private resourceId(value: string): number { const id = Number(value); if (!Number.isInteger(id) || id < 1) throw new BadRequestException({ status: 'error', message: 'Invalid seller application id.' }); return id; }
}
