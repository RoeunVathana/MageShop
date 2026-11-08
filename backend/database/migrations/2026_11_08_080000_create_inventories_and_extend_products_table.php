<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Extend products table with selling_price, cost_price, and status
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'selling_price')) {
                $table->decimal('selling_price', 12, 2)->nullable()->after('description');
            }
            if (! Schema::hasColumn('products', 'cost_price')) {
                $table->decimal('cost_price', 12, 2)->default(0.00)->after('selling_price');
            }
            if (! Schema::hasColumn('products', 'status')) {
                $table->string('status', 20)->default('active')->index()->after('cost_price');
            }
        });

        // Backfill selling_price from price where available
        DB::table('products')
            ->whereNull('selling_price')
            ->update([
                'selling_price' => DB::raw('price'),
                'status' => 'active',
            ]);

        // 2. Create inventories table
        if (! Schema::hasTable('inventories')) {
            Schema::create('inventories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->integer('quantity_on_hand')->default(0);
                $table->integer('quantity_reserved')->default(0);
                $table->timestamps();
            });
        }

        // 3. Extend inventory_movements table with enterprise audit fields
        Schema::table('inventory_movements', function (Blueprint $table) {
            if (! Schema::hasColumn('inventory_movements', 'movement_type')) {
                $table->string('movement_type', 30)->nullable()->after('product_id');
            }
            if (! Schema::hasColumn('inventory_movements', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->after('reason');
            }
            if (! Schema::hasColumn('inventory_movements', 'reference')) {
                $table->string('reference')->nullable()->after('created_by');
            }
            if (! Schema::hasColumn('inventory_movements', 'idempotency_key')) {
                $table->string('idempotency_key', 64)->nullable()->unique()->after('reference');
            }
        });

        // 4. Backfill inventories for all existing products using current stock_quantity
        $products = DB::table('products')->get();
        foreach ($products as $p) {
            $exists = DB::table('inventories')->where('product_id', $p->id)->exists();
            if (! $exists) {
                DB::table('inventories')->insert([
                    'product_id' => $p->id,
                    'quantity_on_hand' => (int) ($p->stock_quantity ?? 0),
                    'quantity_reserved' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventories');

        Schema::table('inventory_movements', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_movements', 'idempotency_key')) {
                $table->dropColumn('idempotency_key');
            }
            if (Schema::hasColumn('inventory_movements', 'reference')) {
                $table->dropColumn('reference');
            }
            if (Schema::hasColumn('inventory_movements', 'created_by')) {
                $table->dropConstrainedForeignId('created_by');
            }
            if (Schema::hasColumn('inventory_movements', 'movement_type')) {
                $table->dropColumn('movement_type');
            }
        });

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'status')) {
                $table->dropColumn('status');
            }
            if (Schema::hasColumn('products', 'cost_price')) {
                $table->dropColumn('cost_price');
            }
            if (Schema::hasColumn('products', 'selling_price')) {
                $table->dropColumn('selling_price');
            }
        });
    }
};
