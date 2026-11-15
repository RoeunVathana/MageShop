import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import type { Response } from 'express';
import { randomBytes } from 'node:crypto';

/**
 * Preserve the Laravel Sanctum SPA bootstrap contract for existing clients.
 * Authentication is still enforced by NestJS Bearer tokens; this endpoint
 * only issues the non-HttpOnly XSRF cookie expected by Axios clients.
 */
@Controller()
export class SanctumController {
  @Get('/sanctum/csrf-cookie')
  @HttpCode(204)
  csrfCookie(@Res({ passthrough: true }) response: Response): void {
    response.cookie('XSRF-TOKEN', randomBytes(32).toString('hex'), {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  }
}
