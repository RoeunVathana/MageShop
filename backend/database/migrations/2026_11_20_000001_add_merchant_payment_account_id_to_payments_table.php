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
        if (! Schema::hasTable('payments') || Schema::hasColumn('payments', 'merchant_payment_account_id')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table): void {
            $table->unsignedBigInteger('merchant_payment_account_id')->nullable()->after('merchant_city');
            $table->index('merchant_payment_account_id');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('payments') && Schema::hasColumn('payments', 'merchant_payment_account_id')) {
            Schema::table('payments', function (Blueprint $table): void {
                $table->dropIndex(['merchant_payment_account_id']);
                $table->dropColumn('merchant_payment_account_id');
            });
        }
    }
};
