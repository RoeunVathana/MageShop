import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = Number(config.get<string>('PORT', '8080'));
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
