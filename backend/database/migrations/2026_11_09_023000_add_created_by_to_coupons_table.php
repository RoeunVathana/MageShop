<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('coupons') && ! Schema::hasColumn('coupons', 'created_by')) {
            Schema::table('coupons', function (Blueprint $table) {
                $table->unsignedBigInteger('created_by')->nullable()->after('expires_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('coupons') && Schema::hasColumn('coupons', 'created_by')) {
            Schema::table('coupons', function (Blueprint $table) {
                $table->dropColumn('created_by');
            });
        }
    }
};
