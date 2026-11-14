import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { DatabaseService } from './database/database.service';
import { HealthController } from './health/health.controller';
import { LaravelCompatibilityProxy } from './proxy/laravel-compatibility.proxy';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { SanctumGuard } from './auth/sanctum.guard';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AuthController, CatalogController, HealthController],
  providers: [AuthService, CatalogService, DatabaseService, LaravelCompatibilityProxy, SanctumGuard],
})
export class AppModule {}
