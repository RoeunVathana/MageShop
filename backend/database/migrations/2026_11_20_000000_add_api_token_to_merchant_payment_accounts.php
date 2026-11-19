<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Keep this migration compatible with the PgBouncer connection pooler.
     */
    public $withinTransaction = false;

    public function up(): void
    {
        if (! Schema::hasTable('merchant_payment_accounts') || Schema::hasColumn('merchant_payment_accounts', 'api_token_encrypted')) {
            return;
        }

        Schema::table('merchant_payment_accounts', function (Blueprint $table): void {
            $table->text('api_token_encrypted')->nullable()->after('merchant_phone');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('merchant_payment_accounts') && Schema::hasColumn('merchant_payment_accounts', 'api_token_encrypted')) {
            Schema::table('merchant_payment_accounts', function (Blueprint $table): void {
                $table->dropColumn('api_token_encrypted');
            });
        }
    }
};
