import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { CatalogService } from './catalog.service';

@Controller('api/v1')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  async categories(@Req() request: Request, @Res() response: Response): Promise<void> {
    const payload = await this.catalog.listCategories(request.query);
    response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=180');
    response.json(payload);
  }

  @Get('brands')
  async brands(@Req() request: Request, @Res() response: Response): Promise<void> {
    const payload = await this.catalog.listBrands(request.query);
    response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=180');
    response.json(payload);
  }

  @Get('products')
  async products(@Req() request: Request, @Res() response: Response): Promise<void> {
    const payload = await this.catalog.listProducts(request.query);
    response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
    response.json(payload);
  }
}
