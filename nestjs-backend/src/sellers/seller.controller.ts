import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

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
