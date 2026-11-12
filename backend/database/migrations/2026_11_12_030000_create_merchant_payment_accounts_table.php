<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Keep this migration compatible with the PgBouncer connection pooler.
     */
    public $withinTransaction = false;

    public function up(): void
    {
        if (Schema::hasTable('merchant_payment_accounts')) {
            return;
        }

        Schema::create('merchant_payment_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('seller_application_id')->nullable()->constrained('seller_applications')->nullOnDelete();
            $table->string('account_type', 20)->default('bakong');
            $table->string('bank_name', 100)->default('Bakong');
            $table->string('account_id', 100);
            $table->string('merchant_name', 100)->default('TYUSHOP');
            $table->string('merchant_city', 100)->default('Phnom Penh');
            $table->string('currency', 10)->default('USD');
            $table->boolean('is_default')->default(false)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
            $table->index(['seller_application_id', 'is_active']);
        });

        $now = now();
        $legacyAccountId = trim((string) (DB::table('store_settings')
            ->where('setting_key', 'bakong_account_id')
            ->value('setting_value') ?: env('BAKONG_ACCOUNT_ID', 'roeun_vathana1@bkrt')));

        if ($legacyAccountId !== '') {
            DB::table('merchant_payment_accounts')->insert([
                'user_id' => null,
                'seller_application_id' => null,
                'account_type' => 'bakong',
                'bank_name' => 'Bakong',
                'account_id' => $legacyAccountId,
                'merchant_name' => (string) (DB::table('store_settings')->where('setting_key', 'bakong_merchant_name')->value('setting_value') ?: env('BAKONG_MERCHANT_NAME', 'TYUSHOP')),
                'merchant_city' => (string) (DB::table('store_settings')->where('setting_key', 'company_city')->value('setting_value') ?: env('BAKONG_MERCHANT_CITY', 'Phnom Penh')),
                'currency' => 'USD',
                'is_default' => true,
                'is_active' => true,
                'verified_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        DB::table('seller_applications')
            ->whereNotNull('bakong_account_id')
            ->where('bakong_account_id', '!=', '')
            ->get(['id', 'user_id', 'bank_name', 'bakong_account_id'])
            ->each(function (object $seller) use ($now): void {
                DB::table('merchant_payment_accounts')->insert([
                    'user_id' => $seller->user_id,
                    'seller_application_id' => $seller->id,
                    'account_type' => 'bakong',
                    'bank_name' => $seller->bank_name ?: 'Bakong',
                    'account_id' => $seller->bakong_account_id,
                    'merchant_name' => 'TYUSHOP Seller',
                    'merchant_city' => 'Phnom Penh',
                    'currency' => 'USD',
                    'is_default' => true,
                    'is_active' => true,
                    'verified_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_payment_accounts');
    }
};
