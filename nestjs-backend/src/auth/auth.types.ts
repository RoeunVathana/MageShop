import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  authUserId?: number;
  authTokenId?: number;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  address: string | null;
  loyalty_points: number;
  status: string;
  email_verified_at: Date | string | null;
  roles: Array<{
    id: number;
    name: string;
    slug: string;
    permissions?: Array<{ id: number; name: string; slug: string }>;
  }>;
}
