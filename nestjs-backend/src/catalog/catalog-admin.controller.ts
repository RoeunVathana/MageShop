import { BadRequestException, Body, Controller, Delete, Patch, Post, Param, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { CatalogManagementService } from './catalog-management.service';

@Controller('api/v1/admin')
@UseGuards(SanctumGuard)
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogManagementService) {}

  @Post('categories')
  async storeCategory(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.catalog.storeCategory(body, request.authUserId as number);
  }

  @Patch('categories/:categoryId')
  async updateCategory(@Param('categoryId') categoryId: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.catalog.updateCategory(this.id(categoryId), body, request.authUserId as number);
  }

  @Delete('categories/:categoryId')
  async destroyCategory(@Param('categoryId') categoryId: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.catalog.destroyCategory(this.id(categoryId), request.authUserId as number);
  }

  @Post('categories/:categoryId/attributes')
  async storeAttribute(@Param('categoryId') categoryId: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.catalog.storeAttribute(this.id(categoryId), body, request.authUserId as number);
  }

  @Patch('category-attributes/:attributeId')
  async updateAttribute(@Param('attributeId') attributeId: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.catalog.updateAttribute(this.id(attributeId), body, request.authUserId as number);
  }

  @Delete('category-attributes/:attributeId')
  async destroyAttribute(@Param('attributeId') attributeId: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.catalog.destroyAttribute(this.id(attributeId), request.authUserId as number);
  }

  @Post('brands')
  async storeBrand(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.catalog.storeBrand(body, request.authUserId as number);
  }

  @Patch('brands/:brandId')
  async updateBrand(@Param('brandId') brandId: string, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.catalog.updateBrand(this.id(brandId), body, request.authUserId as number);
  }

  @Delete('brands/:brandId')
  async destroyBrand(@Param('brandId') brandId: string, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.catalog.destroyBrand(this.id(brandId), request.authUserId as number);
  }

  private id(value: string): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) throw new BadRequestException({ status: 'error', message: 'Invalid catalog resource id.' });
    return id;
  }
}
