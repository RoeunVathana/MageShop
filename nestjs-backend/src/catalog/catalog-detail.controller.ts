import { Controller, Get, Param } from '@nestjs/common';

import { CatalogManagementService } from './catalog-management.service';
import { ProductManagementService } from './product-management.service';

@Controller('api/v1')
export class CatalogDetailController {
  constructor(
    private readonly catalog: CatalogManagementService,
    private readonly products: ProductManagementService,
  ) {}

  @Get('categories/:idOrSlug')
  async category(@Param('idOrSlug') idOrSlug: string): Promise<Record<string, unknown>> {
    return this.catalog.categoryDetail(idOrSlug);
  }

  @Get('categories/:idOrSlug/attributes')
  async categoryAttributes(@Param('idOrSlug') idOrSlug: string): Promise<Record<string, unknown>> {
    return this.catalog.categoryAttributes(idOrSlug);
  }

  @Get('brands/:idOrSlug')
  async brand(@Param('idOrSlug') idOrSlug: string): Promise<Record<string, unknown>> {
    return this.catalog.brandDetail(idOrSlug);
  }

  @Get('products/:idOrSlug')
  async product(@Param('idOrSlug') idOrSlug: string): Promise<Record<string, unknown>> {
    return this.products.detail(idOrSlug);
  }
}
