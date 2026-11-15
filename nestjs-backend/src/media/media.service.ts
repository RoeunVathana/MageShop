import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, normalize, relative, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

export interface UploadedMediaFile { originalname: string; mimetype: string; size: number; buffer: Buffer; }

@Injectable()
export class MediaService {
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
    try {
      bytes = this.s3
        ? await this.readCloud(relativePath)
        : await readFile(resolve(this.storageRoot(), relativePath));
    } catch {
      throw new NotFoundException({ status: 'error', message: 'Media file not found.' });
    }
    return { bytes, contentType: this.contentType(extension) };
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
  private rejectExecutablePayload(bytes: Buffer): void {
    const head = bytes.subarray(0, 8192).toString('utf8');
    if (/(<\?php|<\?=|<script\b|javascript\s*:|onload\s*=|onerror\s*=)/i.test(head)) throw new UnprocessableEntityException({ status: 'error', message: 'Security violation: uploaded file contains executable script or polyglot payload.' });
  }
  private safeFolder(value: unknown): string { const folder = String(value ?? 'uploads').trim().replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\/+|\/+$/g, ''); if (folder && !/^[a-zA-Z0-9_\-/]+$/.test(folder)) throw new UnprocessableEntityException({ status: 'error', message: 'The folder field is invalid.' }); return folder || 'uploads'; }
  private safeRelativePath(value: string | string[]): string { const raw = Array.isArray(value) ? value.join('/') : value; const relativePath = String(raw ?? '').replace(/\\/g, '/').replace(/\0/g, '').replace(/^\/+/, ''); const extension = extname(relativePath).slice(1).toLowerCase(); if (!relativePath || relativePath.split('/').some((part) => !part || part === '.' || part === '..') || !this.extensions.has(extension) || basename(relativePath).startsWith('.')) throw new UnprocessableEntityException({ status: 'error', message: 'Access to requested file type is forbidden by security policy.' }); const root = this.storageRoot(); const absolute = resolve(root, normalize(relativePath)); if (!this.s3 && !this.isWithin(root, absolute)) throw new UnprocessableEntityException({ status: 'error', message: 'The media path is invalid.' }); return relativePath; }
  private isWithin(root: string, target: string): boolean { const rootPath = resolve(root); return target === rootPath || relative(rootPath, target) !== '' && !relative(rootPath, target).startsWith('..') && !relative(rootPath, target).includes(':'); }
  private contentType(extension: string): string { const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', ico: 'image/x-icon', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv' }; return types[extension] ?? 'application/octet-stream'; }
}
