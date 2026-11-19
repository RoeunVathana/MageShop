import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function encryptionKey(appKey: string): Buffer | null {
  const rawKey = String(appKey ?? '').trim();
  if (!rawKey) return null;
  const key = rawKey.startsWith('base64:') ? Buffer.from(rawKey.slice(7), 'base64') : Buffer.from(rawKey);
  return key.length === 32 ? key : null;
}

export function normalizeBakongToken(value: unknown): string {
  return String(value ?? '').trim().replace(/^["']|["']$/g, '').replace(/\\$/g, '');
}

/**
 * Uses the same payload shape as Laravel Crypt::encryptString so the NestJS
 * gateway and the legacy Laravel API can share the encrypted value safely.
 */
export function encryptBakongToken(token: string, appKey: string): string {
  const key = encryptionKey(appKey);
  const normalized = normalizeBakongToken(token);
  if (!key || !normalized) return '';

  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const value = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]).toString('base64');
  const ivText = iv.toString('base64');
  const mac = createHmac('sha256', key).update(ivText + value).digest('hex');
  return Buffer.from(JSON.stringify({ iv: ivText, value, mac })).toString('base64');
}

export function decryptBakongToken(payload: unknown, appKey: string): string {
  try {
    const key = encryptionKey(appKey);
    if (!key || !String(payload ?? '').trim()) return '';
    const parsed = JSON.parse(Buffer.from(String(payload), 'base64').toString('utf8')) as { iv?: string; value?: string; mac?: string };
    if (!parsed.iv || !parsed.value || !parsed.mac) return '';
    const expected = createHmac('sha256', key).update(parsed.iv + parsed.value).digest('hex');
    if (parsed.mac.length !== expected.length || !timingSafeEqual(Buffer.from(parsed.mac), Buffer.from(expected))) return '';
    const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(parsed.iv, 'base64'));
    return normalizeBakongToken(Buffer.concat([decipher.update(Buffer.from(parsed.value, 'base64')), decipher.final()]).toString('utf8'));
  } catch {
    return '';
  }
}

export function maskBakongToken(token: string): string | null {
  const normalized = normalizeBakongToken(token);
  if (!normalized) return null;
  if (normalized.length <= 8) return '••••••••';
  return `${normalized.slice(0, 4)}••••${normalized.slice(-4)}`;
}
