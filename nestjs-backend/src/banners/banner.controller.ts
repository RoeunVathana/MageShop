import { BadRequestException, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { BannerService } from './banner.service';

@Controller('api/v1/banners')
export class BannerController {
  constructor(private readonly banners: BannerService) {}

  @Get()
  async index(@Query('placement') placement?: string): Promise<Record<string, unknown>> { return this.banners.publicList(placement); }

  @Get(':bannerId')
  async show(@Param('bannerId') bannerId: string): Promise<Record<string, unknown>> { return this.banners.publicShow(this.id(bannerId)); }

  @Post(':bannerId/click')
  async click(@Param('bannerId') bannerId: string): Promise<Record<string, unknown>> { return this.banners.click(this.id(bannerId)); }

  private id(value: string): number { const id = Number(value); if (!Number.isInteger(id) || id < 1) throw new BadRequestException({ status: 'error', message: 'Invalid banner id.' }); return id; }
}
