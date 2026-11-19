import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SellerService } from './seller.service';

@Controller('api/v1/sellers')
export class SellerController {
  constructor(private readonly sellers: SellerService) {}

  @Get('stores')
  async stores(@Query() query: Record<string, unknown>): Promise<Record<string, unknown>> { return this.sellers.publicStores(query); }

  @Post('apply')
  async apply(@Body() body: Record<string, unknown>, @Req() request: Request): Promise<Record<string, unknown>> {
    return this.sellers.apply(body, request.headers.authorization);
  }

  @Get('my-application')
  async myApplication(@Req() request: Request): Promise<Record<string, unknown>> {
    return this.sellers.myApplication(request.headers.authorization);
  }

}

@Controller('api/v1/seller')
export class SellerStaffController {
  constructor(private readonly sellers: SellerService) {}

  @Get('staff')
  @UseGuards(SanctumGuard)
  async staff(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.sellers.staff(request.authUserId as number); }

  @Post('staff')
  @UseGuards(SanctumGuard)
  @HttpCode(HttpStatus.CREATED)
  async createStaff(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.sellers.createStaff(body, request.authUserId as number); }

  @Patch('staff/:staffId')
  @UseGuards(SanctumGuard)
  async updateStaff(@Param('staffId') staffId: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.sellers.updateStaff(Number(staffId), body, request.authUserId as number); }

  @Delete('staff/:staffId')
  @UseGuards(SanctumGuard)
  async removeStaff(@Param('staffId') staffId: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.sellers.removeStaff(Number(staffId), request.authUserId as number); }
}
