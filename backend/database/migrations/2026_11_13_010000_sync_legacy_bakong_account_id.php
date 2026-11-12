<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * This migration only repairs the account created with the old demo ID.
     * It must not overwrite a merchant account that an admin configured later.
     */
    public $withinTransaction = false;

    public function up(): void
    {
        if (! Schema::hasTable('merchant_payment_accounts')) {
            return;
        }

        $configuredAccountId = trim((string) env('BAKONG_ACCOUNT_ID', 'roeun_vathana1@bkrt'), " \t\n\r\0\x0B\"'\\");
        if ($configuredAccountId === '') {
            return;
        }

        $legacyAccountIds = ['vathana@bakong'];
        $now = now();

        $defaultAdminAccount = DB::table('merchant_payment_accounts')
            ->whereNull('user_id')
            ->where('is_default', true)
            ->orderByDesc('id')
            ->first();

        $defaultAccountId = strtolower(trim((string) ($defaultAdminAccount->account_id ?? '')));

        if ($defaultAdminAccount && in_array($defaultAccountId, $legacyAccountIds, true)) {
            DB::table('merchant_payment_accounts')
                ->where('id', $defaultAdminAccount->id)
                ->update([
                    'account_id' => $configuredAccountId,
                    'updated_at' => $now,
                ]);
        }

        if (Schema::hasTable('store_settings')) {
            DB::table('store_settings')
                ->where('setting_key', 'bakong_account_id')
                ->whereRaw('LOWER(TRIM(setting_value)) = ?', [$legacyAccountIds[0]])
                ->update([
                    'setting_value' => $configuredAccountId,
                    'updated_at' => $now,
                ]);
        }
    }

    public function down(): void
    {
        // The migration is intentionally non-destructive and does not roll back
        // a merchant's payment account to a legacy demo ID.
    }
};
