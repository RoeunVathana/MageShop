import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CatalogService } from '../catalog/catalog.service';
import { ProductManagementService } from '../catalog/product-management.service';

@Controller('api/v1/telegram')
export class TelegramProductsController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly products: ProductManagementService,
  ) {}

  @Get('products')
  async productsList(@Req() request: Request): Promise<Record<string, unknown>> {
    const query = { ...request.query } as Record<string, unknown>;
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20) || 20));
    const tab = String(query.tab ?? 'all');
    query.per_page = limit;
    if (tab === 'featured') query.is_featured = true;
    if (tab === 'new') query.is_new_arrival = true;
    if (tab === 'best_sellers') query.is_best_seller = true;
    if (tab === 'flash_sales') query.is_flash_sale = true;
    const payload = await this.catalog.listProducts(query as never);
    return { status: 'success', ...payload };
  }

  @Get('products/:idOrSku')
  async product(@Param('idOrSku') idOrSku: string): Promise<Record<string, unknown>> {
    const payload = await this.products.detail(idOrSku);
    return { status: 'success', ...payload };
  }

  @Get('categories')
  async categories(): Promise<Record<string, unknown>> {
    const payload = await this.catalog.listCategories({ is_active: 'true' } as never);
    return { status: 'success', data: payload.data ?? [] };
  }
}
