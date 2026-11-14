import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { TelegramWebhookService } from './telegram-webhook.service';

@Controller('api/v1/telegram')
export class TelegramWebhookController {
  constructor(private readonly webhook: TelegramWebhookService) {}

  @Post('webhook')
  async receive(@Body() body: Record<string, unknown>, @Req() request: Request): Promise<Record<string, unknown>> {
    await this.webhook.verify(request.headers['x-telegram-bot-api-secret-token'] as string | undefined);
    if (!body || Object.keys(body).length === 0) return { status: 'empty_payload' };
    try {
      return { status: 'ok', result: await this.webhook.handle(body) };
    } catch (error) {
      return { status: 'handled_with_error', message: error instanceof Error ? error.message : String(error) };
    }
  }
}
