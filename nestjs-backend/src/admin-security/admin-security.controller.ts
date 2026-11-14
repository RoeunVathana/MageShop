import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { ParsedQs } from 'qs';

import { SanctumGuard } from '../auth/sanctum.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AdminSecurityService } from './admin-security.service';

@Controller('api/v1/admin')
@UseGuards(SanctumGuard)
export class AdminSecurityController {
  constructor(private readonly security: AdminSecurityService) {}

  @Get('roles') roles(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.roles(request.authUserId as number); }
  @Get('permissions') permissions(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.permissions(request.authUserId as number); }
  @Get('staff') staff(@Query() query: ParsedQs, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.staff(query, request.authUserId as number); }
  @Get('users') users(@Query() query: ParsedQs, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.listUsers(query, request.authUserId as number); }
  @Get('security/users') securityUsers(@Query() query: ParsedQs, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.listUsers(query, request.authUserId as number); }
  @Post('users/:id/roles') assignRoles(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.assignRoles(id, body, request.authUserId as number); }
  @Put('users/:id/roles') assignRolesPut(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.assignRoles(id, body, request.authUserId as number); }
  @Patch('users/:id/roles') assignRolesPatch(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.assignRoles(id, body, request.authUserId as number); }
  @Post('users/roles/by-email') assignRolesByEmail(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.assignRolesByEmail(body, request.authUserId as number); }
  @Post('security/users') create(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.createUser(body, request.authUserId as number); }
  @Patch('security/users/:id') update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.updateUser(id, body, request.authUserId as number); }
  @Delete('security/users/:id') destroy(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.deleteUser(id, request.authUserId as number); }
  @Patch('security/users/:id/email') email(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.updateEmail(id, body, request.authUserId as number); }
  @Patch('security/users/:id/password') password(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.updatePassword(id, body, request.authUserId as number); }
  @Post('security/users/:id/send-otp') sendUserOtp(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.sendUserOtp(id, request.authUserId as number); }
  @Get('security/otps') otps(@Query() query: ParsedQs, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.indexOtps(query, request.authUserId as number); }
  @Post('security/otps/dispatch') dispatchOtp(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.dispatchOtp(body, request.authUserId as number); }
  @Post('security/otps/:id/invalidate') invalidateOtp(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.invalidateOtp(id, request.authUserId as number); }
  @Post('security/otps/:id/resend') resendOtp(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.resendOtp(id, request.authUserId as number); }
  @Get('security/email-settings') emailSettings(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.emailSettings(request.authUserId as number); }
  @Patch('security/email-settings') updateEmailSettings(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.updateEmailSettings(body, request.authUserId as number); }
  @Post('security/email-settings/test-otp') testEmail(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.testEmail(body, request.authUserId as number); }
  @Get('security/telegram-settings') telegramSettings(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.telegramSettings(request.authUserId as number); }
  @Patch('security/telegram-settings') updateTelegramSettings(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.updateTelegramSettings(body, request.authUserId as number); }
  @Post('security/telegram-settings/test') testTelegram(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> { return this.security.testTelegram(body, request.authUserId as number); }
}
