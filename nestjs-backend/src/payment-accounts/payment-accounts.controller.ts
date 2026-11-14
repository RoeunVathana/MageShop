import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { PaymentAccountsService } from './payment-accounts.service';

@Controller('api/v1/payment-accounts')
@UseGuards(SanctumGuard)
export class PaymentAccountsController {
  constructor(private readonly accounts: PaymentAccountsService) {}

  @Get()
  async index(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.accounts.index(request.authUserId as number);
  }

  @Post()
  async store(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.accounts.store(body, request.authUserId as number);
  }

  @Patch(':accountId')
  async update(@Param('accountId') accountId: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.accounts.update(this.id(accountId), body, request.authUserId as number);
  }

  @Delete(':accountId')
  async destroy(@Param('accountId') accountId: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.accounts.destroy(this.id(accountId), request.authUserId as number);
  }

  @Post(':accountId/default')
  async makeDefault(@Param('accountId') accountId: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.accounts.makeDefault(this.id(accountId), request.authUserId as number);
  }

  private id(value: string): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException({ status: 'error', message: 'Invalid payment account id.' });
    }
    return id;
  }
}
