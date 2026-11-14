import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { DatabaseService } from './database/database.service';
import { HealthController } from './health/health.controller';
import { LaravelCompatibilityProxy } from './proxy/laravel-compatibility.proxy';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [CatalogController, HealthController],
  providers: [CatalogService, DatabaseService, LaravelCompatibilityProxy],
})
export class AppModule {}
