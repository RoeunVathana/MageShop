import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { BannerService } from './banner.service';

@Controller('api/v1/admin/banners')
@UseGuards(SanctumGuard)
export class AdminBannerController {
  constructor(private readonly banners: BannerService) {}

  @Get()
  async index(@Query() query: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.banners.adminList(query, request.authUserId as number); }

  @Post()
  async store(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.banners.create(body, request.authUserId as number); }

  @Get(':bannerId')
  async show(@Param('bannerId') bannerId: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.banners.adminShow(this.id(bannerId), request.authUserId as number); }

  @Patch(':bannerId')
  async update(@Param('bannerId') bannerId: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.banners.update(this.id(bannerId), body, request.authUserId as number); }

  @Delete(':bannerId')
  async remove(@Param('bannerId') bannerId: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.banners.remove(this.id(bannerId), request.authUserId as number); }

  @Post(':bannerId/toggle')
  async toggle(@Param('bannerId') bannerId: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.banners.toggle(this.id(bannerId), request.authUserId as number); }

  @Post('reorder')
  async reorder(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.banners.reorder(body, request.authUserId as number); }

  private id(value: string): number { const id = Number(value); if (!Number.isInteger(id) || id < 1) throw new BadRequestException({ status: 'error', message: 'Invalid banner id.' }); return id; }
}
