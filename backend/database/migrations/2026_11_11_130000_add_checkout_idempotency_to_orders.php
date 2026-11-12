<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Railway's PostgreSQL pooler uses transaction pooling for deployment
     * connections, so keep DDL outside the migration transaction.
     */
    public $withinTransaction = false;

    public function up(): void
    {
        if (! Schema::hasTable('orders') || Schema::hasColumn('orders', 'checkout_idempotency_key')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->string('checkout_idempotency_key', 80)->nullable();
            // Idempotency keys are scoped to the authenticated customer in
            // checkout(), so the database constraint must use the same scope.
            $table->unique(['user_id', 'checkout_idempotency_key'], 'orders_user_checkout_idempotency_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('orders') || ! Schema::hasColumn('orders', 'checkout_idempotency_key')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('orders_user_checkout_idempotency_unique');
            $table->dropColumn('checkout_idempotency_key');
        });
    }
};
