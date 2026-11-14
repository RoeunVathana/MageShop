import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerResponse } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import * as httpProxy from 'http-proxy';

@Injectable()
export class LaravelCompatibilityProxy implements OnModuleDestroy {
  private readonly logger = new Logger(LaravelCompatibilityProxy.name);
  private readonly proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    xfwd: true,
    ignorePath: false,
    secure: true,
  });

  constructor(private readonly config: ConfigService) {
    this.proxy.on('error', (error, _request, response) => {
      this.logger.error(`Laravel upstream proxy failed: ${error.message}`);
      const serverResponse = response as ServerResponse;
      if (!serverResponse.headersSent) {
        serverResponse.writeHead(502, { 'content-type': 'application/json' });
      }
      serverResponse.end(JSON.stringify({
        status: 'error',
        message: 'The API service is temporarily unavailable.',
      }));
    });
  }

  middleware(): (request: Request, response: Response, next: NextFunction) => void {
    return (request, response, next) => {
      if (request.path === '/up') {
        next();
        return;
      }

      const origin = this.config.get<string>('LARAVEL_API_ORIGIN', 'https://api.tyushop.blog');
      this.proxy.web(request, response, {
        target: origin,
        ignorePath: false,
      });
    };
  }

  onModuleDestroy(): void {
    this.proxy.close();
  }
}
