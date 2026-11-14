import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/up')
  up(): { status: string; service: string; migrationMode: string } {
    return {
      status: 'ok',
      service: 'mageshop-nestjs-compatibility-gateway',
      migrationMode: 'laravel-upstream',
    };
  }
}
