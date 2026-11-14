import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { PoolClient } from 'pg';

import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';

interface AccountRow {
  id: number;
  user_id: number | null;
  seller_application_id: number | null;
  account_type: string;
  bank_name: string;
  account_id: string;
  merchant_name: string;
  merchant_city: string;
  merchant_phone: string | null;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  verified_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  owner_name?: string | null;
  owner_email?: string | null;
}

@Injectable()
export class PaymentAccountsService {
  private readonly adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];
  private readonly sellerRoles = ['SELLER', 'SELLER_STAFF'];

  constructor(
    private readonly database: DatabaseService,
    private readonly auth: AuthService,
  ) {}

  async index(userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireAccess(user);
    const admin = this.isAdmin(user);
    const result = await this.database.query<AccountRow>(this.accountQuery(admin ? 'user_id IS NULL' : 'user_id = $1'), admin ? [] : [user.id]);
    return { status: 'success', data: result.rows.map((account) => this.publicAccount(account)) };
  }

  async store(body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireAccess(user);
    const input = this.validate(body, false);
    const admin = this.isAdmin(user);

    const account = await this.database.transaction(async (client) => {
      let sellerApplicationId: number | null = null;
      if (!admin) {
        sellerApplicationId = await this.approvedSellerApplication(client, user.id);
      }
      const ownerId = admin ? null : user.id;
      const isActive = input.is_active ?? true;
      if (isActive) await this.clearDefault(client, ownerId);
      const inserted = await client.query<AccountRow>(`
        INSERT INTO merchant_payment_accounts
          (user_id, seller_application_id, account_type, bank_name, account_id,
           merchant_name, merchant_city, merchant_phone, currency, is_default,
           is_active, verified_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, NOW(), NOW())
        RETURNING id, user_id, seller_application_id, account_type, bank_name,
                  account_id, merchant_name, merchant_city, merchant_phone,
                  currency, is_default, is_active, verified_at, created_at, updated_at
      `, [ownerId, sellerApplicationId, input.account_type, input.bank_name ?? '', input.account_id ?? '', input.merchant_name ?? '', input.merchant_city ?? '', input.merchant_phone, input.currency ?? 'USD', isActive, isActive]);
      const created = inserted.rows[0];
      if (!created) throw new Error('Payment account was not created.');
      if (admin && created.is_default) await this.syncGlobalSettings(client, created);
      if (!admin && sellerApplicationId) await this.syncSellerApplication(client, sellerApplicationId, created);
      return created;
    });

    return { status: 'success', message: 'Payment account added successfully.', data: this.publicAccount(account) };
  }

  async update(accountId: number, body: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireAccess(user);
    const existing = await this.findAccount(accountId);
    this.requireMutation(user, existing);
    const input = this.validate(body, true);
    if (input.is_active === false && existing.is_default) {
      throw new UnprocessableEntityException({ status: 'error', message: 'Choose another default account before deactivating this checkout account.' });
    }

    const account = await this.database.transaction(async (client) => {
      const values = {
        account_type: input.account_type ?? existing.account_type,
        bank_name: input.bank_name ?? existing.bank_name,
        account_id: input.account_id ?? existing.account_id,
        merchant_name: input.merchant_name ?? existing.merchant_name,
        merchant_city: input.merchant_city ?? existing.merchant_city,
        merchant_phone: input.merchant_phone ?? existing.merchant_phone,
        currency: input.currency ?? existing.currency,
        is_active: input.is_active ?? existing.is_active,
        is_default: input.is_default ?? existing.is_default,
      };
      if (values.is_default) await this.clearDefault(client, existing.user_id, accountId);
      else if (existing.is_default) values.is_default = true;
      const result = await client.query<AccountRow>(`
        UPDATE merchant_payment_accounts
        SET account_type = $1, bank_name = $2, account_id = $3,
            merchant_name = $4, merchant_city = $5, merchant_phone = $6,
            currency = $7, is_active = $8, is_default = $9, updated_at = NOW()
        WHERE id = $10
        RETURNING id, user_id, seller_application_id, account_type, bank_name,
                  account_id, merchant_name, merchant_city, merchant_phone,
                  currency, is_default, is_active, verified_at, created_at, updated_at
      `, [values.account_type, values.bank_name, values.account_id, values.merchant_name, values.merchant_city, values.merchant_phone, values.currency, values.is_active, values.is_default, accountId]);
      const updated = result.rows[0];
      if (!updated) throw new NotFoundException({ status: 'error', message: 'Payment account not found.' });
      if (this.isAdmin(user) && updated.is_default && updated.user_id === null) await this.syncGlobalSettings(client, updated);
      if (updated.seller_application_id) await this.syncSellerApplication(client, updated.seller_application_id, updated);
      return updated;
    });

    return { status: 'success', message: 'Payment account updated successfully.', data: this.publicAccount(account) };
  }

  async destroy(accountId: number, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireAccess(user);
    const existing = await this.findAccount(accountId);
    this.requireMutation(user, existing);
    if (this.isAdmin(user) && existing.user_id === null && existing.is_default) {
      const replacement = await this.database.query<{ id: number }>('SELECT id FROM merchant_payment_accounts WHERE user_id IS NULL AND id <> $1 AND is_active = TRUE ORDER BY id DESC LIMIT 1', [accountId]);
      if (!replacement.rows[0]) throw new UnprocessableEntityException({ status: 'error', message: 'Add another active global account and make it default before removing the current checkout account.' });
    }

    await this.database.transaction(async (client) => {
      await client.query('DELETE FROM merchant_payment_accounts WHERE id = $1', [accountId]);
      if (existing.is_default) {
        const replacement = await client.query<AccountRow>(`
          SELECT id, user_id, seller_application_id, account_type, bank_name,
                 account_id, merchant_name, merchant_city, merchant_phone,
                 currency, is_default, is_active, verified_at, created_at, updated_at
          FROM merchant_payment_accounts
          WHERE user_id IS NOT DISTINCT FROM $1 AND is_active = TRUE
          ORDER BY id DESC LIMIT 1
        `, [existing.user_id]);
        if (replacement.rows[0]) {
          await client.query('UPDATE merchant_payment_accounts SET is_default = TRUE, updated_at = NOW() WHERE id = $1', [replacement.rows[0].id]);
          if (this.isAdmin(user) && existing.user_id === null) await this.syncGlobalSettings(client, replacement.rows[0]);
        }
      }
    });
    return { status: 'success', message: 'Payment account removed successfully.' };
  }

  async makeDefault(accountId: number, userId: number): Promise<Record<string, unknown>> {
    const user = await this.currentUser(userId);
    this.requireAccess(user);
    const existing = await this.findAccount(accountId);
    this.requireMutation(user, existing);
    if (!existing.is_active) throw new UnprocessableEntityException({ status: 'error', message: 'Activate the payment account before making it default.' });

    const account = await this.database.transaction(async (client) => {
      await this.clearDefault(client, existing.user_id, accountId);
      const result = await client.query<AccountRow>(`
        UPDATE merchant_payment_accounts SET is_default = TRUE, updated_at = NOW()
        WHERE id = $1
        RETURNING id, user_id, seller_application_id, account_type, bank_name,
                  account_id, merchant_name, merchant_city, merchant_phone,
                  currency, is_default, is_active, verified_at, created_at, updated_at
      `, [accountId]);
      const updated = result.rows[0];
      if (!updated) throw new NotFoundException({ status: 'error', message: 'Payment account not found.' });
      if (this.isAdmin(user) && updated.user_id === null) await this.syncGlobalSettings(client, updated);
      if (updated.seller_application_id) await this.syncSellerApplication(client, updated.seller_application_id, updated);
      return updated;
    });
    return { status: 'success', message: 'Default payment account updated.', data: this.publicAccount(account) };
  }

  private async currentUser(userId: number): Promise<AuthUser> {
    return this.auth.me(userId);
  }

  private requireAccess(user: AuthUser): void {
    if (!this.isAdmin(user) && !this.auth.hasAnyRole(user, this.sellerRoles)) {
      throw new ForbiddenException({ status: 'error', message: 'Admin or approved seller access is required.' });
    }
  }

  private requireMutation(user: AuthUser, account: AccountRow): void {
    if (this.isAdmin(user)) return;
    if (account.user_id !== user.id) throw new ForbiddenException({ status: 'error', message: 'You can only manage your own seller payment accounts.' });
  }

  private isAdmin(user: AuthUser): boolean {
    return this.auth.hasAnyRole(user, this.adminRoles);
  }

  private async findAccount(id: number): Promise<AccountRow> {
    const result = await this.database.query<AccountRow>(this.accountQuery('mpa.id = $1'), [id]);
    const account = result.rows[0];
    if (!account) throw new NotFoundException({ status: 'error', message: 'Payment account not found.' });
    return account;
  }

  private accountQuery(condition: string): string {
    return `SELECT mpa.id, mpa.user_id, mpa.seller_application_id, mpa.account_type,
                   mpa.bank_name, mpa.account_id, mpa.merchant_name,
                   mpa.merchant_city, mpa.merchant_phone, mpa.currency,
                   mpa.is_default, mpa.is_active, mpa.verified_at,
                   mpa.created_at, mpa.updated_at,
                   owner.name AS owner_name, owner.email AS owner_email
            FROM merchant_payment_accounts mpa
            LEFT JOIN users owner ON owner.id = mpa.user_id
            WHERE ${condition}
            ORDER BY mpa.is_default DESC, mpa.is_active DESC, mpa.id DESC`;
  }

  private async approvedSellerApplication(client: PoolClient, userId: number): Promise<number> {
    const result = await client.query<{ id: number }>("SELECT id FROM seller_applications WHERE user_id = $1 AND status = 'approved' LIMIT 1", [userId]);
    if (!result.rows[0]) throw new ForbiddenException({ status: 'error', message: 'Your seller store must be approved before adding payout accounts.' });
    return result.rows[0].id;
  }

  private async clearDefault(client: PoolClient, ownerId: number | null, exceptId?: number): Promise<void> {
    const params: Array<number | null> = [ownerId];
    let except = '';
    if (exceptId !== undefined) {
      params.push(exceptId);
      except = ' AND id <> $2';
    }
    await client.query(`UPDATE merchant_payment_accounts SET is_default = FALSE, updated_at = NOW() WHERE user_id IS NOT DISTINCT FROM $1${except}`, params);
  }

  private async syncGlobalSettings(client: PoolClient, account: AccountRow): Promise<void> {
    await this.upsertSetting(client, 'bakong_account_id', account.account_id);
    await this.upsertSetting(client, 'bakong_merchant_name', account.merchant_name);
    await this.upsertSetting(client, 'merchant_phone', account.merchant_phone ?? '');
    await this.upsertSetting(client, 'company_city', account.merchant_city);
  }

  private async upsertSetting(client: PoolClient, key: string, value: string): Promise<void> {
    await client.query(`
      INSERT INTO store_settings (store_id, setting_key, setting_value, created_at, updated_at)
      VALUES ('primary', $1, $2, NOW(), NOW())
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
    `, [key, value]);
  }

  private async syncSellerApplication(client: PoolClient, sellerApplicationId: number, account: AccountRow): Promise<void> {
    await client.query('UPDATE seller_applications SET bank_name = $1, bakong_account_id = $2, updated_at = NOW() WHERE id = $3', [account.bank_name, account.account_id, sellerApplicationId]);
  }

  private validate(body: Record<string, unknown>, partial: boolean): {
    account_type: string;
    bank_name: string | null;
    account_id: string | null;
    merchant_name: string | null;
    merchant_city: string | null;
    merchant_phone: string | null;
    currency: string | null;
    is_active?: boolean;
    is_default?: boolean;
  } {
    const text = (key: string, max: number, required: boolean): string | null => {
      const value = body[key];
      if (value === undefined && partial) return null;
      const result = value === undefined || value === null ? '' : String(value).trim();
      if ((required && !result) || result.length > max) throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
      return result || null;
    };
    const accountType = text('account_type', 20, false) ?? 'bakong';
    const bankName = text('bank_name', 100, !partial);
    const accountId = text('account_id', 100, !partial);
    const merchantName = text('merchant_name', 100, !partial);
    const merchantCity = text('merchant_city', 100, !partial);
    const merchantPhone = text('merchant_phone', 50, false);
    const currency = text('currency', 10, !partial);
    if (accountType !== 'bakong' || (accountId !== null && !/^[^@\s]+@[^@\s]+$/.test(accountId))) throw new UnprocessableEntityException({ status: 'error', message: 'The payment account details are invalid.' });
    if (currency !== null && !['USD', 'KHR', 'BOTH'].includes(currency)) throw new UnprocessableEntityException({ status: 'error', message: 'The currency is invalid.' });
    const booleanValue = (key: string): boolean | undefined => {
      if (body[key] === undefined && partial) return undefined;
      if (typeof body[key] === 'boolean') return body[key] as boolean;
      if (['true', '1', 'yes', 'on'].includes(String(body[key]).toLowerCase())) return true;
      if (['false', '0', 'no', 'off'].includes(String(body[key]).toLowerCase())) return false;
      throw new UnprocessableEntityException({ status: 'error', message: `The ${key} field is invalid.` });
    };
    return { account_type: accountType, bank_name: bankName, account_id: accountId, merchant_name: merchantName, merchant_city: merchantCity, merchant_phone: merchantPhone, currency: currency ?? (partial ? null : 'USD'), is_active: booleanValue('is_active'), is_default: booleanValue('is_default') };
  }

  private publicAccount(account: AccountRow): Record<string, unknown> {
    return { ...account, owner: account.user_id ? { id: account.user_id, name: account.owner_name, email: account.owner_email } : null };
  }
}
