<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Railway's PostgreSQL pooler uses transaction pooling for deployment
     * connections, so keep DDL outside the migration transaction.
     */
    public $withinTransaction = false;

    /**
     * Add indexes used by the public catalog and admin product lists.
     */
    public function up(): void
    {
        $this->createIndex('products', 'products_status_created_at_idx', ['status', 'created_at']);
        $this->createIndex('products', 'products_category_status_created_at_idx', ['category_id', 'status', 'created_at']);
        $this->createIndex('products', 'products_brand_status_created_at_idx', ['brand_id', 'status', 'created_at']);
        $this->createIndex('products', 'products_type_status_created_at_idx', ['product_type', 'status', 'created_at']);
        $this->createIndex('categories', 'categories_parent_sort_name_idx', ['parent_id', 'sort_order', 'name']);
        $this->createIndex('product_categories', 'product_categories_category_product_idx', ['category_id', 'product_id']);
        $this->createIndex('inventories', 'inventories_product_quantity_idx', ['product_id', 'quantity_on_hand']);
        $this->createIndex('brands', 'brands_status_active_sort_idx', ['status', 'is_active', 'sort_order']);
    }

    /**
     * Keep deployment migrations safe after a failed/partial Railway release.
     * PostgreSQL and SQLite both support CREATE INDEX IF NOT EXISTS.
     */
    private function createIndex(string $table, string $index, array $columns): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        $driver = DB::getDriverName();
        if (in_array($driver, ['pgsql', 'sqlite'], true)) {
            $quotedTable = '"'.str_replace('"', '""', $table).'"';
            $quotedIndex = '"'.str_replace('"', '""', $index).'"';
            $quotedColumns = implode(', ', array_map(
                static fn (string $column): string => '"'.str_replace('"', '""', $column).'"',
                $columns
            ));

            DB::statement("CREATE INDEX IF NOT EXISTS {$quotedIndex} ON {$quotedTable} ({$quotedColumns})");
            return;
        }

        $existingIndexes = collect(Schema::getIndexes($table))->pluck('name')->all();
        if (! in_array($index, $existingIndexes, true)) {
            Schema::table($table, function (Blueprint $blueprint) use ($columns, $index): void {
                $blueprint->index($columns, $index);
            });
        }
    }

    /**
     * Remove the catalog indexes.
     */
    public function down(): void
    {
        if (Schema::hasTable('brands')) {
            Schema::table('brands', function (Blueprint $table) {
                $table->dropIndex('brands_status_active_sort_idx');
            });
        }

        if (Schema::hasTable('product_categories')) {
            Schema::table('product_categories', function (Blueprint $table) {
                $table->dropIndex('product_categories_category_product_idx');
            });
        }

        if (Schema::hasTable('inventories')) {
            Schema::table('inventories', function (Blueprint $table) {
                $table->dropIndex('inventories_product_quantity_idx');
            });
        }

        if (Schema::hasTable('categories')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->dropIndex('categories_parent_sort_name_idx');
            });
        }

        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropIndex('products_status_created_at_idx');
                $table->dropIndex('products_category_status_created_at_idx');
                $table->dropIndex('products_brand_status_created_at_idx');
                $table->dropIndex('products_type_status_created_at_idx');
            });
        }
    }
};
