<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        if (! Schema::hasTable('merchant_payment_accounts') || Schema::hasColumn('merchant_payment_accounts', 'merchant_phone')) {
            return;
        }

        Schema::table('merchant_payment_accounts', function (Blueprint $table) {
            $table->string('merchant_phone', 50)->nullable()->after('merchant_city');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('merchant_payment_accounts') && Schema::hasColumn('merchant_payment_accounts', 'merchant_phone')) {
            Schema::table('merchant_payment_accounts', function (Blueprint $table) {
                $table->dropColumn('merchant_phone');
            });
        }
    }
};
