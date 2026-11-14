import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';
import { SanctumGuard } from './sanctum.guard';

/** Backward-compatible aliases retained by the storefront and older clients. */
@Controller('api/v1')
@UseGuards(SanctumGuard)
export class UserAuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('user')
  async me(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return { status: 'success', data: { user: await this.auth.me(request.authUserId as number) } };
  }

  @Get('user/profile')
  async profile(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return { status: 'success', data: { user: await this.auth.me(request.authUserId as number) } };
  }

  @Put('user/profile')
  async updateProfilePut(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.profileResponse(body, request);
  }

  @Post('user/profile')
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
}
