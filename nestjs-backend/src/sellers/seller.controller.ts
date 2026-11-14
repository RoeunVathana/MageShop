import { Controller, Get, Query } from '@nestjs/common';

import { SellerService } from './seller.service';

@Controller('api/v1/sellers')
export class SellerController {
  constructor(private readonly sellers: SellerService) {}

  @Get('stores')
  async stores(@Query() query: Record<string, unknown>): Promise<Record<string, unknown>> { return this.sellers.publicStores(query); }
}
