import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, normalize, relative, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

export interface UploadedMediaFile { originalname: string; mimetype: string; size: number; buffer: Buffer; }

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private readonly extensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico', 'avif', 'mp4', 'webm', 'mov', 'pdf', 'doc', 'docx', 'xlsx', 'csv']);
  private readonly mediaRoles = ['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER', 'SELLER', 'SELLER_STAFF'];
  private readonly s3: S3Client | null;
  private readonly bucket: string;

  constructor(private readonly auth: AuthService, private readonly config: ConfigService, private readonly database: DatabaseService) {
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID', '').trim();
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY', '').trim();
    this.bucket = config.get<string>('AWS_BUCKET', '').trim();
    this.s3 = accessKeyId && secretAccessKey && this.bucket
      ? new S3Client({
        region: config.get<string>('AWS_DEFAULT_REGION', 'auto'),
        endpoint: config.get<string>('AWS_ENDPOINT', '').trim() || undefined,
        forcePathStyle: config.get<string>('AWS_USE_PATH_STYLE_ENDPOINT', 'false') === 'true',
        credentials: { accessKeyId, secretAccessKey },
      })
      : null;
  }

  onModuleInit(): void {
    if (this.config.get<string>('MEDIA_MIGRATION_ENABLED', 'false') === 'true') {
      void this.migrateLegacyMedia();
    }
  }

  async uploadAvatar(file: UploadedMediaFile | undefined, userId: number): Promise<Record<string, unknown>> {
    if (!file?.buffer?.length) throw new UnprocessableEntityException({ status: 'error', message: 'The avatar field is required.' });
    if (file.size > 5 * 1024 * 1024) throw new UnprocessableEntityException({ status: 'error', message: 'The avatar may not be greater than 5 MB.' });
    const extension = extname(file.originalname).slice(1).toLowerCase();
    if (!new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']).has(extension)) throw new UnprocessableEntityException({ status: 'error', message: 'The avatar must be a JPEG, PNG, WEBP, or GIF image.' });
    this.rejectExecutablePayload(file.buffer);
    const filename = `avatar_${userId}_${Date.now()}_${randomBytes(4).toString('hex')}.${extension}`;
    const key = `avatars/${filename}`;
    await this.persist(key, file.buffer, file.mimetype);
    const baseUrl = this.publicApiBase();
    const url = `${baseUrl}/api/v1/media/${key}`;
    await this.database.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [url, userId]);
    const user = await this.auth.me(userId);
    return {
      status: 'success',
      message: 'Avatar photo uploaded successfully.',
      data: { avatar_url: url, user },
    };
  }

  async upload(file: UploadedMediaFile | undefined, folderValue: unknown, userId: number): Promise<Record<string, unknown>> {
    if (!file?.buffer?.length) throw new UnprocessableEntityException({ status: 'error', message: 'The file field is required.' });
    const user = await this.auth.me(userId);
    if (!this.auth.hasAnyRole(user, this.mediaRoles)) throw new ForbiddenException({ status: 'error', message: 'Forbidden. Product media upload permission is required.' });
    if (file.size > 102400 * 1024) throw new UnprocessableEntityException({ status: 'error', message: 'The uploaded file may not be greater than 100 MB.' });
    const extension = extname(file.originalname).slice(1).toLowerCase();
    if (!this.extensions.has(extension)) throw new UnprocessableEntityException({ status: 'error', message: 'Disallowed file extension.' });
    this.rejectExecutablePayload(file.buffer);
    const folder = this.safeFolder(folderValue);
    const filename = `${Date.now()}_${randomBytes(8).toString('hex')}.${extension}`;
    const key = folder ? `${folder}/${filename}` : filename;
    const root = this.storageRoot();
    const target = resolve(root, key);
    if (!this.s3 && !this.isWithin(root, target)) throw new UnprocessableEntityException({ status: 'error', message: 'The upload path is invalid.' });
    await this.persist(key, file.buffer, file.mimetype);
    const baseUrl = this.publicApiBase();
    const url = `${baseUrl}/api/v1/media/${key}`;
    return { success: true, message: 'Media successfully uploaded to cloud storage', data: { key, url, cloud_url: url, original_name: basename(file.originalname), mime_type: file.mimetype, size: file.size, disk: this.s3 ? 's3' : 'public' } };
  }

  async file(pathValue: string | string[]): Promise<{ bytes: Buffer; contentType: string }> {
    const relativePath = this.safeRelativePath(pathValue);
    const extension = extname(relativePath).slice(1).toLowerCase();
    let bytes: Buffer;
    if (this.s3) {
      try {
        bytes = await this.readCloud(relativePath);
      } catch {
        bytes = await this.readLegacy(relativePath);
      }
    } else {
      try {
        bytes = await readFile(resolve(this.storageRoot(), relativePath));
      } catch {
        bytes = await this.readLegacy(relativePath);
      }
    }
    return { bytes, contentType: this.contentType(extension) };
  }

  private async migrateLegacyMedia(): Promise<void> {
    if (!this.s3 || !this.database.enabled) {
      this.logger.warn('Legacy media migration skipped: S3 or PostgreSQL is not configured.');
      return;
    }
    const tables: Array<[string, string]> = [
      ['products', 'image_url'], ['categories', 'image_url'], ['brands', 'logo_url'],
      ['product_variants', 'image_url'], ['users', 'avatar_url'],
      ['seller_applications', 'logo_url'], ['seller_applications', 'banner_url'],
      ['banners', 'image_url'], ['banners', 'video_url'],
    ];
    let migrated = 0;
    for (const [table, column] of tables) migrated += await this.migrateColumn(table, column);
    migrated += await this.migrateProductGalleries();
    this.logger.log(`Legacy media migration completed: ${migrated} database values moved to S3.`);
  }

  private async migrateColumn(table: string, column: string): Promise<number> {
    if (!await this.tableExists(table)) return 0;
    const rows = await this.database.query<{ id: number; value: string | null }>(`SELECT id, ${this.identifier(column)} AS value FROM ${this.identifier(table)} WHERE ${this.identifier(column)} IS NOT NULL`);
    let migrated = 0;
    for (const row of rows.rows) {
      const value = await this.migrateValue(row.value);
      if (value && value !== row.value) {
        await this.database.query(`UPDATE ${this.identifier(table)} SET ${this.identifier(column)}=$1, updated_at=NOW() WHERE id=$2`, [value, row.id]);
        migrated += 1;
      }
    }
    return migrated;
  }

  private async migrateProductGalleries(): Promise<number> {
    if (!await this.tableExists('products')) return 0;
    const rows = await this.database.query<{ id: number; gallery_urls: unknown }>('SELECT id, gallery_urls FROM products WHERE gallery_urls IS NOT NULL');
    let migrated = 0;
    for (const row of rows.rows) {
      const gallery = Array.isArray(row.gallery_urls) ? row.gallery_urls : [];
      const next: unknown[] = [];
      let changed = false;
      for (const item of gallery) {
        const value = await this.migrateValue(typeof item === 'string' ? item : null);
        next.push(value ?? item);
        changed = changed || value !== item;
      }
      if (changed) {
        await this.database.query('UPDATE products SET gallery_urls=$1, updated_at=NOW() WHERE id=$2', [JSON.stringify(next), row.id]);
        migrated += 1;
      }
    }
    return migrated;
  }

  private async migrateValue(value: string | null): Promise<string | null> {
    if (!value || !value.includes('/api/v1/media/')) return value;
    const marker = '/api/v1/media/';
    const keyStart = value.indexOf(marker) + marker.length;
    const rawKey = value.slice(keyStart).split(/[?#]/, 1)[0];
    const key = rawKey.split('/').map((part) => decodeURIComponent(part)).join('/');
    if (!key || !this.extensions.has(extname(key).slice(1).toLowerCase())) return value;
    try {
      const bytes = await this.readLegacy(key);
      await this.s3?.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: this.contentType(extname(key).slice(1).toLowerCase()) }));
      return `${this.publicApiBase()}/api/v1/media/${key.split('/').map(encodeURIComponent).join('/')}`;
    } catch (error) {
      this.logger.warn(`Could not migrate media ${key}: ${error instanceof Error ? error.message : String(error)}`);
      return value;
    }
  }

  private async tableExists(table: string): Promise<boolean> {
    const result = await this.database.query<{ exists: boolean }>('SELECT to_regclass($1) IS NOT NULL AS exists', [`public.${table}`]);
    return result.rows[0]?.exists === true;
  }

  private identifier(value: string): string {
    if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid media migration identifier.');
    return `"${value}"`;
  }

  private publicApiBase(): string {
    return this.config.get<string>('PUBLIC_API_URL', this.config.get<string>('APP_URL', 'http://localhost:8080')).replace(/\/$/, '');
  }

  private storageRoot(): string { return resolve(this.config.get<string>('MEDIA_ROOT', join(process.cwd(), 'storage', 'app', 'public'))); }
  private async persist(key: string, bytes: Buffer, contentType = 'application/octet-stream'): Promise<void> {
    if (this.s3) {
      await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: contentType }));
      return;
    }
    const root = this.storageRoot();
    const target = resolve(root, key);
    if (!this.isWithin(root, target)) throw new UnprocessableEntityException({ status: 'error', message: 'The upload path is invalid.' });
    await mkdir(join(root, key.split('/').slice(0, -1).join('/')), { recursive: true });
    await writeFile(target, bytes, { flag: 'wx' });
  }
  private async readCloud(key: string): Promise<Buffer> {
    if (!this.s3) throw new Error('Cloud storage is not configured.');
    const result = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const body = result.Body;
    if (!body) throw new Error('Cloud storage returned an empty object.');
    if (body instanceof Uint8Array) return Buffer.from(body);
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
  private async readLegacy(key: string): Promise<Buffer> {
    const origin = this.config.get<string>('LARAVEL_API_ORIGIN', '').replace(/\/$/, '');
    if (origin) {
      const response = await fetch(`${origin}/api/v1/media/${key.split('/').map(encodeURIComponent).join('/')}`);
      if (response.ok) return Buffer.from(await response.arrayBuffer());
    }
    throw new NotFoundException({ status: 'error', message: 'Media file not found.' });
  }
  private rejectExecutablePayload(bytes: Buffer): void {
    const head = bytes.subarray(0, 8192).toString('utf8');
    if (/(<\?php|<\?=|<script\b|javascript\s*:|onload\s*=|onerror\s*=)/i.test(head)) throw new UnprocessableEntityException({ status: 'error', message: 'Security violation: uploaded file contains executable script or polyglot payload.' });
  }
  private safeFolder(value: unknown): string { const folder = String(value ?? 'uploads').trim().replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\/+|\/+$/g, ''); if (folder && !/^[a-zA-Z0-9_\-/]+$/.test(folder)) throw new UnprocessableEntityException({ status: 'error', message: 'The folder field is invalid.' }); return folder || 'uploads'; }
  private safeRelativePath(value: string | string[]): string { const raw = Array.isArray(value) ? value.join('/') : value; const relativePath = String(raw ?? '').replace(/\\/g, '/').replace(/\0/g, '').replace(/^\/+/, ''); const extension = extname(relativePath).slice(1).toLowerCase(); if (!relativePath || relativePath.split('/').some((part) => !part || part === '.' || part === '..') || !this.extensions.has(extension) || basename(relativePath).startsWith('.')) throw new UnprocessableEntityException({ status: 'error', message: 'Access to requested file type is forbidden by security policy.' }); const root = this.storageRoot(); const absolute = resolve(root, normalize(relativePath)); if (!this.s3 && !this.isWithin(root, absolute)) throw new UnprocessableEntityException({ status: 'error', message: 'The media path is invalid.' }); return relativePath; }
  private isWithin(root: string, target: string): boolean { const rootPath = resolve(root); return target === rootPath || relative(rootPath, target) !== '' && !relative(rootPath, target).startsWith('..') && !relative(rootPath, target).includes(':'); }
  private contentType(extension: string): string { const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', ico: 'image/x-icon', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv' }; return types[extension] ?? 'application/octet-stream'; }
}
