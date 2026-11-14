import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class SanctumGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const identity = await this.auth.authenticate(request.headers.authorization);
    if (!identity) {
      throw new UnauthorizedException({ status: 'error', message: 'Unauthenticated.' });
    }

    request.authUserId = identity.userId;
    request.authTokenId = identity.tokenId;
    return true;
  }
}
