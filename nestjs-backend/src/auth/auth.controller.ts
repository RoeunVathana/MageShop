import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';

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

  @Put('profile')
  @UseGuards(SanctumGuard)
  async updateProfilePut(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.profileResponse(body, request);
  }

  @Post('profile')
  @UseGuards(SanctumGuard)
  async updateProfilePost(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.profileResponse(body, request);
  }

  private async profileResponse(body: Record<string, unknown>, request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return {
      status: 'success',
      message: 'Profile updated successfully.',
      data: { user: await this.auth.updateProfile(request.authUserId as number, body) },
    };
  }

  @Put('password')
  @UseGuards(SanctumGuard)
  async updatePassword(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, string>> {
    await this.auth.updatePassword(request.authUserId as number, body);
    return { status: 'success', message: 'Password updated successfully.' };
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
