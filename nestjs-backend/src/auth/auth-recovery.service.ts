import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomInt } from 'node:crypto';

import { ConfigService } from '@nestjs/config';

import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GoogleProfile {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

interface FirebaseProfile {
  localId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  emailVerified?: boolean;
}

@Injectable()
export class AuthRecoveryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  async requestPasswordOtp(emailValue: unknown): Promise<void> {
    const email = this.email(emailValue);
    const latest = await this.database.query<{ cooldown_until: Date | string | null }>(`
      SELECT cooldown_until
      FROM password_reset_otps
      WHERE LOWER(email) = LOWER($1) AND is_used = false
      ORDER BY id DESC
      LIMIT 1
    `, [email]);
    const cooldown = latest.rows[0]?.cooldown_until ? new Date(latest.rows[0].cooldown_until).getTime() : 0;
    if (cooldown > Date.now()) {
      throw new UnprocessableEntityException({
        status: 'error',
        message: 'Please wait 60 seconds before requesting another recovery code.',
        errors: { email: ['Please wait 60 seconds before requesting another recovery code.'] },
      });
    }

    const user = await this.database.query<{ id: number }>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email],
    );
    // Preserve Laravel's anti-enumeration contract: unknown addresses receive
    // the same successful response but never create or send a code.
    if (!user.rows[0]) return;

    await this.database.query(
      'UPDATE password_reset_otps SET is_used = true, updated_at = NOW() WHERE LOWER(email) = LOWER($1) AND is_used = false',
      [email],
    );
    const otp = String(randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 12);
    await this.database.query(`
      INSERT INTO password_reset_otps (email, otp_hash, expires_at, attempts, cooldown_until, is_used, created_at, updated_at)
      VALUES ($1, $2, NOW() + INTERVAL '5 minutes', 0, NOW() + INTERVAL '60 seconds', false, NOW(), NOW())
    `, [email, otpHash]);

    try {
      await this.sendEmail(
        email,
        'TYUSHOP — 6-Digit Password Recovery OTP Code',
        `Your TYUSHOP password recovery verification code is: ${otp}\n\nThis 6-digit OTP code expires in 5 minutes. If you did not request this, please ignore this message.`,
      );
    } catch (error) {
      await this.database.query(
        'UPDATE password_reset_otps SET is_used = true, updated_at = NOW() WHERE LOWER(email) = LOWER($1) AND is_used = false',
        [email],
      );
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Email delivery is temporarily unavailable. Please try again later.',
        cause: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async verifyPasswordOtp(emailValue: unknown, otpValue: unknown): Promise<string> {
    const email = this.email(emailValue);
    const otp = String(otpValue ?? '').trim();
    if (!/^\d{6}$/.test(otp)) {
      throw new UnprocessableEntityException({ status: 'error', message: 'The otp field is invalid.', errors: { otp: ['The OTP must be 6 digits.'] } });
    }
    const result = await this.database.query<{
      id: number;
      otp_hash: string;
      expires_at: Date | string;
      attempts: number;
    }>(`
      SELECT id, otp_hash, expires_at, attempts
      FROM password_reset_otps
      WHERE LOWER(email) = LOWER($1) AND is_used = false
      ORDER BY id DESC
      LIMIT 1
    `, [email]);
    const record = result.rows[0];
    if (!record) this.validation('No active password recovery request found for this email.');
    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await this.invalidateOtp(record.id);
      this.validation('Verification code has expired. Please request a new code.');
    }
    if (Number(record.attempts) >= 5) {
      await this.invalidateOtp(record.id);
      this.validation('Maximum incorrect attempts exceeded. This code has been invalidated for security.');
    }
    if (!(await bcrypt.compare(otp, record.otp_hash))) {
      await this.database.query('UPDATE password_reset_otps SET attempts = attempts + 1, updated_at = NOW() WHERE id = $1', [record.id]);
      const remaining = Math.max(0, 4 - Number(record.attempts));
      this.validation(`Invalid verification code. ${remaining} attempts remaining.`);
    }

    const resetToken = randomBytes(32).toString('hex');
    await this.database.query(`
      UPDATE password_reset_otps
      SET reset_token = $1, reset_token_expires_at = NOW() + INTERVAL '15 minutes', updated_at = NOW()
      WHERE id = $2
    `, [resetToken, record.id]);
    return resetToken;
  }

  async resetPassword(emailValue: unknown, tokenValue: unknown, passwordValue: unknown): Promise<void> {
    const email = this.email(emailValue);
    const token = String(tokenValue ?? '').trim();
    const password = this.password(passwordValue);
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      throw new UnprocessableEntityException({ status: 'error', message: 'Invalid or expired password reset authorization token.', errors: { token: ['Invalid or expired password reset authorization token.'] } });
    }
    const record = await this.database.query<{ id: number }>(`
      SELECT id
      FROM password_reset_otps
      WHERE LOWER(email) = LOWER($1) AND reset_token = $2 AND is_used = false
        AND reset_token_expires_at > NOW()
      LIMIT 1
    `, [email, token]);
    if (!record.rows[0]) {
      throw new UnprocessableEntityException({ status: 'error', message: 'Invalid or expired password reset authorization token.', errors: { token: ['Invalid or expired password reset authorization token.'] } });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await this.database.transaction(async (client) => {
      const user = await client.query<{ id: number }>('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1 FOR UPDATE', [email]);
      if (!user.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: 'User not found.', errors: { email: ['User not found.'] } });
      await client.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [passwordHash, user.rows[0].id]);
      await client.query('UPDATE password_reset_otps SET is_used = true, reset_token = NULL, updated_at = NOW() WHERE id = $1', [record.rows[0].id]);
      await client.query('DELETE FROM personal_access_tokens WHERE tokenable_type = \'App\\Models\\User\' AND tokenable_id = $1', [user.rows[0].id]);
    });
  }

  async googleRedirect(): Promise<string> {
    const google = await this.googleConfig();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', google.clientId);
    url.searchParams.set('redirect_uri', google.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('access_type', 'online');
    url.searchParams.set('prompt', 'select_account');
    return url.toString();
  }

  async googleCallback(codeValue: unknown): Promise<{ token: string; user: Record<string, unknown> }> {
    const code = String(codeValue ?? '').trim();
    if (!code) throw new BadRequestException({ status: 'error', message: 'Google authorization code is required.' });
    const google = await this.googleConfig();
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: google.clientId, client_secret: google.clientSecret, redirect_uri: google.redirectUri, grant_type: 'authorization_code' }),
    });
    if (!tokenResponse.ok) throw new BadRequestException({ status: 'error', message: 'Google authentication failed.' });
    const tokens = await tokenResponse.json() as { access_token?: string };
    if (!tokens.access_token) throw new BadRequestException({ status: 'error', message: 'Google authentication did not return an access token.' });
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { authorization: `Bearer ${tokens.access_token}` } });
    if (!profileResponse.ok) throw new BadRequestException({ status: 'error', message: 'Google profile could not be loaded.' });
    const profile = await profileResponse.json() as GoogleProfile;
    if (profile.email_verified === false || !profile.email || !profile.sub) {
      throw new BadRequestException({ status: 'error', message: 'Your Google email is unverified or missing.' });
    }
    return this.signInWithSocial('google', profile.sub, profile.email, profile.name || 'Google User', profile.picture || '');
  }

  async firebaseGoogle(payload: Record<string, unknown>): Promise<{ token: string; user: Record<string, unknown> }> {
    const idToken = String(payload.id_token ?? '').trim();
    if (idToken.length < 20) throw new UnprocessableEntityException({ status: 'error', message: 'A Firebase ID token is required.', errors: { id_token: ['A Firebase ID token is required.'] } });
    const apiKey = await this.setting('firebase_api_key', this.config.get<string>('FIREBASE_API_KEY', ''));
    if (!apiKey) throw new UnprocessableEntityException({ status: 'error', message: 'Firebase authentication is not configured on the server.', errors: { id_token: ['Firebase authentication is not configured on the server.'] } });
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const body = await response.json() as { users?: FirebaseProfile[] };
    const profile = body.users?.[0];
    if (!response.ok || !profile?.localId || profile.emailVerified !== true || !profile.email) {
      throw new UnprocessableEntityException({ status: 'error', message: 'Firebase authentication token is invalid or expired.', errors: { id_token: ['Firebase authentication token is invalid or expired.'] } });
    }
    return this.signInWithSocial('google', profile.localId, profile.email, profile.displayName || String(payload.name ?? 'Google User'), profile.photoUrl || String(payload.avatar ?? ''));
  }

  private async signInWithSocial(provider: string, providerId: string, emailValue: string, name: string, avatar: string): Promise<{ token: string; user: Record<string, unknown> }> {
    const email = this.email(emailValue);
    const result = await this.database.transaction(async (client) => {
      const linked = await client.query<{ user_id: number }>(
        'SELECT user_id FROM social_accounts WHERE provider = $1 AND provider_id = $2 LIMIT 1',
        [provider, providerId],
      );
      let userId = linked.rows[0]?.user_id;
      if (!userId) {
        const existing = await client.query<{ id: number; email_verified_at: Date | null }>('SELECT id, email_verified_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1 FOR UPDATE', [email]);
        if (existing.rows[0]) {
          userId = existing.rows[0].id;
          if (!existing.rows[0].email_verified_at) await client.query('UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1', [userId]);
        } else {
          const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
          const inserted = await client.query<{ id: number }>(`
            INSERT INTO users (name, email, password, status, email_verified_at, loyalty_points, created_at, updated_at)
            VALUES ($1, $2, $3, 'active', NOW(), 0, NOW(), NOW())
            RETURNING id
          `, [name.trim().slice(0, 255) || 'Google User', email, passwordHash]);
          userId = inserted.rows[0]?.id;
          if (!userId) throw new Error('Google user creation did not return an ID.');
          const role = await client.query<{ id: number }>("SELECT id FROM roles WHERE LOWER(slug) = 'customer' OR UPPER(name) = 'CUSTOMER' ORDER BY id LIMIT 1");
          if (role.rows[0]) await client.query('INSERT INTO role_user (user_id, role_id, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT DO NOTHING', [userId, role.rows[0].id]);
        }
        await client.query(`
          INSERT INTO social_accounts (user_id, provider, provider_id, avatar, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (provider, provider_id) DO UPDATE SET user_id = EXCLUDED.user_id, avatar = EXCLUDED.avatar, updated_at = NOW()
        `, [userId, provider, providerId, avatar || null]);
      }
      return userId;
    });
    const user = await this.auth.findUser(result);
    const token = await this.auth.createToken(result, 'google-auth-token');
    return { token, user: { id: user.id, name: user.name, email: user.email, avatar, roles: user.roles.map((role) => role.name) } };
  }

  private async googleConfig(): Promise<GoogleConfig> {
    const clientId = await this.setting('google_client_id', this.config.get<string>('GOOGLE_CLIENT_ID', ''));
    const clientSecret = await this.setting('google_client_secret', this.config.get<string>('GOOGLE_CLIENT_SECRET', ''));
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI', `${this.config.get<string>('APP_URL', 'https://api.tyushop.blog').replace(/\/$/, '')}/api/v1/auth/google/callback`);
    if (!clientId || !clientSecret || clientId === 'your-google-client-id' || clientSecret === 'your-google-client-secret') {
      throw new BadRequestException({ status: 'error', message: 'Google OAuth is not configured with valid production credentials yet.' });
    }
    return { clientId, clientSecret, redirectUri };
  }

  private async sendEmail(to: string, subject: string, text: string): Promise<void> {
    const configuredResendKey = await this.setting('resend_api_key', '');
    const configuredMailPassword = await this.setting('mail_password', '');
    const apiKey = configuredResendKey
      || configuredMailPassword
      || this.config.get<string>('RESEND_API_KEY', this.config.get<string>('MAIL_PASSWORD', ''));
    if (!apiKey) throw new Error('No email delivery API key is configured.');
    const from = await this.setting('mail_from_address', this.config.get<string>('MAIL_FROM_ADDRESS', 'no-reply@tyushop.blog'));
    const fromName = await this.setting('mail_from_name', this.config.get<string>('MAIL_FROM_NAME', 'TYUSHOP'));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: `${fromName} <${from}>`, to: [to], subject, text }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}.`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async setting(key: string, fallback: string): Promise<string> {
    const result = await this.database.query<{ setting_value: string | null }>('SELECT setting_value FROM store_settings WHERE setting_key = $1 LIMIT 1', [key]);
    const value = result.rows[0]?.setting_value;
    return value === null || value === undefined || value === '' ? fallback : value;
  }

  private async invalidateOtp(id: number): Promise<void> {
    await this.database.query('UPDATE password_reset_otps SET is_used = true, updated_at = NOW() WHERE id = $1', [id]);
  }

  private validation(message: string): never {
    throw new UnprocessableEntityException({ status: 'error', message, errors: { otp: [message] } });
  }

  private email(value: unknown): string {
    const email = String(value ?? '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 255) throw new UnprocessableEntityException({ status: 'error', message: 'The email must be a valid email address.', errors: { email: ['The email must be a valid email address.'] } });
    return email;
  }

  private password(value: unknown): string {
    const password = String(value ?? '');
    if (password.length < 8 || password.length > 255 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) throw new UnprocessableEntityException({ status: 'error', message: 'The password must be at least 8 characters and include uppercase, lowercase, and a number.', errors: { password: ['The password must be at least 8 characters and include uppercase, lowercase, and a number.'] } });
    return password;
  }
}
