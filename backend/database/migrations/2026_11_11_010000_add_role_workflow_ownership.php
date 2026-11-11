<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Railway uses a transaction-pooling proxy. These DDL changes must run
     * outside a transaction so the deployment migration can complete safely.
     */
    public $withinTransaction = false;

    public function up(): void
    {
        if (Schema::hasTable('orders') && Schema::hasTable('users') && ! Schema::hasColumn('orders', 'driver_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->foreignId('driver_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
                $table->index(['driver_id', 'status']);
            });
        }

        if (Schema::hasTable('products') && Schema::hasTable('users') && ! Schema::hasColumn('products', 'seller_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->foreignId('seller_id')->nullable()->after('brand_id')->constrained('users')->nullOnDelete();
                $table->index(['seller_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'driver_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropForeign(['driver_id']);
                $table->dropIndex(['driver_id', 'status']);
                $table->dropColumn('driver_id');
            });
        }

        if (Schema::hasTable('products') && Schema::hasColumn('products', 'seller_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropForeign(['seller_id']);
                $table->dropIndex(['seller_id', 'status']);
                $table->dropColumn('seller_id');
            });
        }
    }
};
