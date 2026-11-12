<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        if (! Schema::hasTable('payments')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table): void {
            if (! Schema::hasColumn('payments', 'merchant_account')) {
                $table->string('merchant_account', 100)->nullable()->after('khqr_md5');
            }
            if (! Schema::hasColumn('payments', 'merchant_name')) {
                $table->string('merchant_name', 100)->nullable()->after('merchant_account');
            }
            if (! Schema::hasColumn('payments', 'merchant_city')) {
                $table->string('merchant_city', 100)->nullable()->after('merchant_name');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('payments')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table): void {
            $columns = [];
            foreach (['merchant_city', 'merchant_name', 'merchant_account'] as $column) {
                if (Schema::hasColumn('payments', $column)) {
                    $columns[] = $column;
                }
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
