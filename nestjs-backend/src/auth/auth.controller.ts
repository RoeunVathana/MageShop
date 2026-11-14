import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';
import { SanctumGuard } from './sanctum.guard';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.auth.register(body);
    return {
      status: 'success',
      message: 'Registration completed successfully.',
      data: result,
    };
  }

  @Post('login')
  async login(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.auth.login(body);
    return {
      status: 'success',
      message: 'Authenticated successfully.',
      data: result,
    };
  }

  @Get('me')
  @UseGuards(SanctumGuard)
  async me(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return {
      status: 'success',
      data: { user: await this.auth.me(request.authUserId as number) },
    };
  }

  @Post('logout')
  @UseGuards(SanctumGuard)
  async logout(@Req() request: AuthenticatedRequest): Promise<Record<string, string>> {
    await this.auth.revokeToken(request.authTokenId);
    return { status: 'success', message: 'Logged out successfully. Session invalidated.' };
  }

  @Post('logout-all')
  @UseGuards(SanctumGuard)
  async logoutAll(@Req() request: AuthenticatedRequest): Promise<Record<string, string>> {
    await this.auth.revokeOtherTokens(request.authUserId as number, request.authTokenId);
    return { status: 'success', message: 'Successfully terminated all other active sessions.' };
  }
}
