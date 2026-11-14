import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { TelegramAuthService } from './telegram-auth.service';

@Controller('api/v1/telegram')
export class TelegramAuthController {
  constructor(private readonly telegram: TelegramAuthService) {}

  @Post('auth')
  async authenticate(@Body() body: Record<string, unknown>, @Req() request: Request): Promise<Record<string, unknown>> {
    return this.telegram.authenticate(body ?? {}, request.headers.authorization);
  }

  @Get('profile')
  @UseGuards(SanctumGuard)
  async profile(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.telegram.profile(request.authUserId as number);
  }
}
