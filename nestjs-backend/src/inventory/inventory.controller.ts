import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { ParsedQs } from 'qs';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { InventoryService } from './inventory.service';

@Controller('api/v1/inventory')
@UseGuards(SanctumGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  async list(@Query() query: ParsedQs): Promise<Record<string, unknown>> {
    return this.inventory.list(query);
  }

  @Get(':productId')
  async show(@Param('productId', ParseIntPipe) productId: number): Promise<Record<string, unknown>> {
    return this.inventory.show(productId);
  }

  @Get(':productId/movements')
  async movements(@Param('productId', ParseIntPipe) productId: number, @Query() query: ParsedQs): Promise<Record<string, unknown>> {
    return this.inventory.movements(productId, query);
  }

  @Post(':productId/adjust')
  async adjust(@Param('productId', ParseIntPipe) productId: number, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.inventory.adjust(productId, body, request.authUserId as number);
  }
}
