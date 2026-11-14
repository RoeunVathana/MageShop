import { BadRequestException, Body, Controller, Delete, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { ProductManagementService } from './product-management.service';

@Controller('api/v1/products')
@UseGuards(SanctumGuard)
export class ProductAdminController {
  constructor(private readonly products: ProductManagementService) {}

  @Post()
  async store(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.products.store(body, request.authUserId as number);
  }

  @Patch(':productId')
  async update(@Param('productId') productId: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.products.update(this.id(productId), body, request.authUserId as number);
  }

  @Delete(':productId')
  async destroy(@Param('productId') productId: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.products.destroy(this.id(productId), request.authUserId as number);
  }

  private id(value: string): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) throw new BadRequestException({ status: 'error', message: 'Invalid product id.' });
    return id;
  }
}
