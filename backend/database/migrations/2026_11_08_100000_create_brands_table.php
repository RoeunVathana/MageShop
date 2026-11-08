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
        // 1. Create Brands Table
        if (! Schema::hasTable('brands')) {
            Schema::create('brands', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique()->index();
                $table->string('logo_url')->nullable();
                $table->text('description')->nullable();
                $table->string('country', 100)->nullable();
                $table->string('website', 255)->nullable();
                $table->string('status', 30)->default('active')->index();
                $table->boolean('is_active')->default(true)->index();
                $table->integer('sort_order')->default(0);
                $table->string('seo_title', 255)->nullable();
                $table->text('seo_description')->nullable();
                $table->string('seo_keywords', 255)->nullable();
                $table->timestamps();
            });
        }

        // 2. Create Brand Translations Table for Khmer & English support
        if (! Schema::hasTable('brand_translations')) {
            Schema::create('brand_translations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('brand_id')->constrained('brands')->cascadeOnDelete();
                $table->string('locale', 10)->index(); // 'en', 'km'
                $table->string('name');
                $table->text('description')->nullable();
                $table->timestamps();

                $table->unique(['brand_id', 'locale']);
            });
        }

        // 3. Add brand_id to products table
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'brand_id')) {
                $table->foreignId('brand_id')->nullable()->after('category_id')->constrained('brands')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'brand_id')) {
                $table->dropConstrainedForeignId('brand_id');
            }
        });

        Schema::dropIfExists('brand_translations');
        Schema::dropIfExists('brands');
    }
};
