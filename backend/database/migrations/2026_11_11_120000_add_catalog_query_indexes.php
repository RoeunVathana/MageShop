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

    /**
     * Add indexes used by the public catalog and admin product lists.
     */
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                $table->index(['status', 'created_at'], 'products_status_created_at_idx');
                $table->index(['category_id', 'status', 'created_at'], 'products_category_status_created_at_idx');
                $table->index(['brand_id', 'status', 'created_at'], 'products_brand_status_created_at_idx');
                $table->index(['product_type', 'status', 'created_at'], 'products_type_status_created_at_idx');
            });
        }

        if (Schema::hasTable('categories')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->index(['parent_id', 'sort_order', 'name'], 'categories_parent_sort_name_idx');
            });
        }

        if (Schema::hasTable('product_categories')) {
            Schema::table('product_categories', function (Blueprint $table) {
                $table->index(['category_id', 'product_id'], 'product_categories_category_product_idx');
            });
        }

        if (Schema::hasTable('inventories')) {
            Schema::table('inventories', function (Blueprint $table) {
                $table->index(['product_id', 'quantity_on_hand'], 'inventories_product_quantity_idx');
            });
        }

        if (Schema::hasTable('brands')) {
            Schema::table('brands', function (Blueprint $table) {
                $table->index(['status', 'is_active', 'sort_order'], 'brands_status_active_sort_idx');
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
