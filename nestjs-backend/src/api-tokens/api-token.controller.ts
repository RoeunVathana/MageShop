import { BadRequestException, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { ApiTokenService } from './api-token.service';

@Controller('api/v1/admin/api-tokens')
@UseGuards(SanctumGuard)
export class ApiTokenController {
  constructor(private readonly tokens: ApiTokenService) {}
  @Get() async list(@Query() query: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.tokens.list(query, request.authUserId as number); }
  @Post() async create(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.tokens.create((request as AuthenticatedRequest & { body: Record<string, unknown> }).body ?? {}, request.authUserId as number); }
  @Delete(':id') async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.tokens.remove(this.id(id), request.authUserId as number); }
  @Post(':id/regenerate') async regenerate(@Param('id') id: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.tokens.regenerate(this.id(id), request.authUserId as number); }
  private id(value: string): number { const id = Number(value); if (!Number.isInteger(id) || id < 1) throw new BadRequestException({ status: 'error', message: 'Invalid token id.' }); return id; }
}
