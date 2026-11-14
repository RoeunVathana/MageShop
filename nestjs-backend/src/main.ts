import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { LaravelCompatibilityProxy } from './proxy/laravel-compatibility.proxy';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    // The compatibility proxy must receive the original request stream so
    // JSON, multipart uploads, and file bodies reach Laravel unchanged.
    bodyParser: false,
  });
  const config = app.get(ConfigService);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const proxy = app.get(LaravelCompatibilityProxy);
  app.use(proxy.middleware());

  const port = Number(config.get<string>('PORT', '8080'));
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
