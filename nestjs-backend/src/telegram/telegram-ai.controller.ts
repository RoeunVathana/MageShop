import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { TelegramAiService } from './telegram-ai.service';

@Controller('api/v1/telegram/ai')
export class TelegramAiController {
  constructor(private readonly ai: TelegramAiService) {}

  @Post('chat')
  chat(@Body() body: Record<string, unknown>, @Req() request: Request): Promise<Record<string, unknown>> {
    return this.ai.chat(body ?? {}, request.headers.authorization);
  }

  @Get('history/:sessionId')
  history(@Param('sessionId') sessionId: string): Promise<Record<string, unknown>> {
    return this.ai.history(sessionId);
  }
}
