import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
export declare class LaravelCompatibilityProxy implements OnModuleDestroy {
    private readonly config;
    private readonly logger;
    private readonly proxy;
    constructor(config: ConfigService);
    middleware(): (request: Request, response: Response, next: NextFunction) => void;
    onModuleDestroy(): void;
}
