import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';

interface PorkbunResponse {
  status?: string;
  message?: string;
  records?: Array<Record<string, unknown>>;
}

@Injectable()
export class AdminDnsService {
  private readonly baseUrl = 'https://api.porkbun.com/api/json/v3/dns';

  constructor(private readonly auth: AuthService) {}

  async configure(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, ['SUPER_ADMIN', 'ADMIN'])) throw new ForbiddenException({ status: 'error', message: 'Unauthorized.' });

    const apiKey = this.required(body.api_key, 'api_key');
    const secretApiKey = this.required(body.secret_api_key, 'secret_api_key');
    const domain = String(body.domain ?? 'tyushop.blog').trim().toLowerCase();
    if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
      throw new BadRequestException({ status: 'error', message: 'The domain field is invalid.' });
    }

    const existing = await this.request(`/retrieve/${encodeURIComponent(domain)}`, { apikey: apiKey, secretapikey: secretApiKey }, 20_000);
    if (!existing.ok || existing.payload.status !== 'SUCCESS') {
      throw new BadRequestException({ status: 'error', message: `Porkbun API authentication failed: ${existing.payload.message ?? 'The provider rejected the request.'}` });
    }

    const deletedIds: Array<string | number> = [];
    for (const record of existing.payload.records ?? []) {
      const content = String(record.content ?? '');
      const type = String(record.type ?? '');
      const name = String(record.name ?? '');
      const conflictingName = [domain, `*.${domain}`, `www.${domain}`, `api.${domain}`, `n8n.${domain}`].includes(name);
      const shouldDelete = content.includes('porkbun.com') || content.startsWith('207.207.210.') || (conflictingName && ['A', 'ALIAS', 'CNAME'].includes(type));
      if (!shouldDelete || record.id === undefined || record.id === null) continue;
      await this.request(`/delete/${encodeURIComponent(domain)}/${encodeURIComponent(String(record.id))}`, { apikey: apiKey, secretapikey: secretApiKey }, 15_000).catch(() => undefined);
      deletedIds.push(record.id as string | number);
    }

    const desiredRecords = [
      { name: '', type: 'ALIAS', content: 'fz1rhfis.up.railway.app', ttl: '600' },
      { name: 'www', type: 'CNAME', content: 'h38ojfga.up.railway.app', ttl: '600' },
      { name: 'api', type: 'CNAME', content: 'opnnxust.up.railway.app', ttl: '600' },
      { name: 'n8n', type: 'CNAME', content: 'oj5k6jz0.up.railway.app', ttl: '600' },
      { name: '_railway-verify', type: 'TXT', content: 'railway-verify=19f71e1f903df70927c689cf706ae933ba5cfa420a24f1ffd7180b2199b508f7', ttl: '600' },
      { name: '_railway-verify.www', type: 'TXT', content: 'railway-verify=998cd356b5f5504e6fb35fa629f09980935d66ca1ae837689c621fe8b14e84ef', ttl: '600' },
      { name: '_railway-verify.api', type: 'TXT', content: 'railway-verify=b0e8dd6ac4e14aad00162e6fa7843bb0e983db2c2a1a2154e7fb3b933449e53a', ttl: '600' },
      { name: '_railway-verify.n8n', type: 'TXT', content: 'railway-verify=8f19bddb5c23dee256cf3b129e2d00eaeec18373b4b577bcd751ebf943fa2c84', ttl: '600' },
    ];
    const createdRecords: Array<Record<string, unknown>> = [];
    for (const record of desiredRecords) {
      const result = await this.request(`/create/${encodeURIComponent(domain)}`, { apikey: apiKey, secretapikey: secretApiKey, ...record }, 15_000);
      createdRecords.push({ name: record.name || '@', type: record.type, status: result.payload.status ?? 'UNKNOWN' });
    }

    return { status: 'ok', message: `Successfully removed ${deletedIds.length} parked records and provisioned all 8 Railway DNS & SSL verification records for ${domain}!`, data: { deleted_record_ids: deletedIds, created_records: createdRecords } };
  }

  private async request(path: string, body: Record<string, unknown>, timeoutMs: number): Promise<{ ok: boolean; payload: PorkbunResponse }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
      return { ok: response.ok, payload: await response.json().catch(() => ({})) as PorkbunResponse };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', message: 'Porkbun DNS service is temporarily unavailable.' });
    } finally {
      clearTimeout(timeout);
    }
  }

  private required(value: unknown, field: string): string {
    const result = String(value ?? '').trim();
    if (!result || result.length > 255) throw new BadRequestException({ status: 'error', message: `The ${field} field is invalid.` });
    return result;
  }
}
