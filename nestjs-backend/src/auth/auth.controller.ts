import { Body, Controller, Get, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { AuthRecoveryService } from './auth-recovery.service';
import type { AuthenticatedRequest } from './auth.types';
import { SanctumGuard } from './sanctum.guard';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly recovery: AuthRecoveryService) {}

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

  @Post('forgot-password')
  async forgotPassword(@Body() body: Record<string, unknown>): Promise<Record<string, string>> {
    await this.recovery.requestPasswordOtp(body.email);
    return { status: 'success', message: 'If this email is registered, a 6-digit recovery code has been sent.' };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const resetToken = await this.recovery.verifyPasswordOtp(body.email, body.otp);
    return { status: 'success', message: 'Verification code confirmed.', data: { reset_token: resetToken } };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: Record<string, unknown>): Promise<Record<string, string>> {
    await this.recovery.resetPassword(body.email, body.reset_token, body.password);
    return { status: 'success', message: 'Your password has been reset successfully. Please log in with your new password.' };
  }

  @Get('google/redirect')
  async googleRedirect(@Req() request: Request, @Res() response: Response): Promise<void> {
    try {
      const url = await this.recovery.googleRedirect();
      if (this.wantsJson(request)) response.json({ url });
      else response.redirect(url);
    } catch (error) {
      this.googleFailure(request, response, error);
    }
  }

  @Get('google/callback')
  async googleCallback(@Req() request: Request, @Res() response: Response): Promise<void> {
    try {
      const result = await this.recovery.googleCallback(request.query.code);
      if (this.wantsJson(request)) {
        response.json({ status: 'success', data: result });
        return;
      }
      const frontend = (process.env.FRONTEND_URL || 'https://tyushop.blog').replace(/\/$/, '');
      const userJson = encodeURIComponent(JSON.stringify(result.user));
      response.redirect(`${frontend}/login?token=${encodeURIComponent(result.token)}&google_user=${userJson}`);
    } catch (error) {
      this.googleFailure(request, response, error);
    }
  }

  @Post('google/firebase')
  async googleFirebase(@Body() body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const data = await this.recovery.firebaseGoogle(body);
    return { status: 'success', message: 'Authenticated successfully with Google.', data };
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

  private wantsJson(request: Request): boolean {
    const accept = String(request.headers.accept ?? '');
    return accept.includes('application/json') || request.query.format === 'json';
  }

  private googleFailure(request: Request, response: Response, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Google authentication failed.';
    if (this.wantsJson(request)) {
      response.status(400).json({ status: 'error', message });
      return;
    }
    const frontend = (process.env.FRONTEND_URL || 'https://tyushop.blog').replace(/\/$/, '');
    response.redirect(`${frontend}/login?error=${encodeURIComponent(message)}`);
  }
}
