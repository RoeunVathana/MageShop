import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { CouponService } from './coupon.service';

@Controller('api/v1/coupons')
export class CouponController {
  constructor(private readonly coupons: CouponService) {}

  @Get()
  async active(): Promise<Record<string, unknown>> { return this.coupons.active(); }

  @Post('validate')
  async validate(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> { return this.coupons.validate(body.code, body.subtotal); }
}

@Controller('api/v1/coupons')
@UseGuards(SanctumGuard)
export class CouponManagementController {
  constructor(private readonly coupons: CouponService) {}

  @Get('manage')
  async list(@Query() query: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.list(query, request.authUserId as number); }

  @Post()
  async create(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.create(body, request.authUserId as number); }

  @Get(':id')
  async show(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.show(this.id(id), request.authUserId as number); }

  @Put(':id')
  async updatePut(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.update(this.id(id), body, request.authUserId as number); }

  @Patch(':id')
  async updatePatch(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.update(this.id(id), body, request.authUserId as number); }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.remove(this.id(id), request.authUserId as number); }

  @Patch(':id/toggle-active')
  async toggle(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.toggle(this.id(id), request.authUserId as number); }

  private id(value: string): number { const id = Number(value); if (!Number.isInteger(id) || id < 1) throw new BadRequestException({ status: 'error', message: 'Invalid coupon id.' }); return id; }
}

@Controller('api/v1/admin/coupons')
@UseGuards(SanctumGuard)
export class AdminCouponController {
  constructor(private readonly coupons: CouponService) {}

  @Get()
  async list(@Query() query: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.list(query, request.authUserId as number); }

  @Post()
  async create(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.create(body, request.authUserId as number); }

  @Get(':id')
  async show(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.show(this.id(id), request.authUserId as number); }

  @Put(':id')
  async updatePut(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.update(this.id(id), body, request.authUserId as number); }

  @Patch(':id')
  async updatePatch(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.update(this.id(id), body, request.authUserId as number); }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.remove(this.id(id), request.authUserId as number); }

  @Patch(':id/toggle-active')
  async toggle(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.coupons.toggle(this.id(id), request.authUserId as number); }

  private id(value: string): number { const id = Number(value); if (!Number.isInteger(id) || id < 1) throw new BadRequestException({ status: 'error', message: 'Invalid coupon id.' }); return id; }
}
