import { Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '../auth/auth.types';
import { SanctumGuard } from '../auth/sanctum.guard';
import { MediaService, type UploadedMediaFile } from './media.service';

@Controller('api/v1')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('admin/media/upload')
  @UseGuards(SanctumGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: UploadedMediaFile | undefined, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.media.upload(file, (request as Request & { body?: Record<string, unknown> }).body?.folder, request.authUserId as number);
  }

  @Post(['auth/avatar', 'auth/profile/avatar', 'user/avatar'])
  @UseGuards(SanctumGuard)
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(@UploadedFile() file: UploadedMediaFile | undefined, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.media.uploadAvatar(file, request.authUserId as number);
  }

  @Get('media/*path')
  async show(@Param('path') path: string, @Res() response: Response): Promise<void> {
    const result = await this.media.file(path);
    response.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.type(result.contentType).send(result.bytes);
  }
}
