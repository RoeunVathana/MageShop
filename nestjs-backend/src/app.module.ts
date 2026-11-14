import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthController } from './health/health.controller';
import { LaravelCompatibilityProxy } from './proxy/laravel-compatibility.proxy';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController],
  providers: [LaravelCompatibilityProxy],
})
export class AppModule {}
