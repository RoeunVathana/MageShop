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
        // 1. Extend categories table for parent/child nesting and SEO
        Schema::table('categories', function (Blueprint $table) {
            if (!Schema::hasColumn('categories', 'parent_id')) {
                $table->foreignId('parent_id')->nullable()->after('id')->constrained('categories')->nullOnDelete();
            }
            if (!Schema::hasColumn('categories', 'image_url')) {
                $table->string('image_url')->nullable()->after('icon');
            }
            if (!Schema::hasColumn('categories', 'seo_title')) {
                $table->string('seo_title')->nullable()->after('description');
            }
            if (!Schema::hasColumn('categories', 'seo_description')) {
                $table->text('seo_description')->nullable()->after('seo_title');
            }
            if (!Schema::hasColumn('categories', 'seo_keywords')) {
                $table->string('seo_keywords')->nullable()->after('seo_description');
            }
        });

        // 2. Extend products table with universal fields
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'product_type')) {
                $table->string('product_type', 30)->default('simple')->index()->after('sku');
            }
            if (!Schema::hasColumn('products', 'brand')) {
                $table->string('brand')->nullable()->index()->after('name');
            }
            if (!Schema::hasColumn('products', 'currency')) {
                $table->string('currency', 10)->default('USD')->after('cost_price');
            }
            if (!Schema::hasColumn('products', 'weight')) {
                $table->decimal('weight', 10, 3)->nullable()->after('currency');
            }
            if (!Schema::hasColumn('products', 'dimensions')) {
                $table->json('dimensions')->nullable()->after('weight');
            }
        });

        // 3. Category attributes (schema-less dynamic attributes per category)
        if (!Schema::hasTable('category_attributes')) {
            Schema::create('category_attributes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
                $table->string('name');
                $table->string('code')->index();
                $table->string('type', 30)->default('text'); // text, number, select, multiselect, boolean, date
                $table->boolean('is_required')->default(false);
                $table->boolean('is_filterable')->default(true);
                $table->boolean('is_variant_option')->default(false);
                $table->integer('sort_order')->default(0);
                $table->json('validation_rules')->nullable();
                $table->timestamps();

                $table->unique(['category_id', 'code']);
            });
        }

        // 4. Category attribute options (predefined values for select / multiselect)
        if (!Schema::hasTable('category_attribute_options')) {
            Schema::create('category_attribute_options', function (Blueprint $table) {
                $table->id();
                $table->foreignId('category_attribute_id')->constrained('category_attributes')->cascadeOnDelete();
                $table->string('value');
                $table->string('label');
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
        }

        // 5. Product attribute values (structured attributes stored per product)
        if (!Schema::hasTable('product_attribute_values')) {
            Schema::create('product_attribute_values', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->foreignId('category_attribute_id')->constrained('category_attributes')->cascadeOnDelete();
                $table->foreignId('selected_option_id')->nullable()->constrained('category_attribute_options')->nullOnDelete();
                $table->text('value')->nullable();
                $table->timestamps();

                $table->index(['product_id', 'category_attribute_id']);
            });
        }

        // 6. Product variants for variable products (size, color, capacity variants)
        if (!Schema::hasTable('product_variants')) {
            Schema::create('product_variants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->string('sku')->unique()->index();
                $table->string('name');
                $table->decimal('selling_price', 12, 2);
                $table->decimal('cost_price', 12, 2)->default(0.00);
                $table->integer('stock_quantity')->default(0);
                $table->integer('low_stock_threshold')->default(5);
                $table->string('image_url')->nullable();
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();
            });
        }

        // 7. Variant attribute values (which options compose this specific variant)
        if (!Schema::hasTable('variant_attribute_values')) {
            Schema::create('variant_attribute_values', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
                $table->foreignId('category_attribute_id')->constrained('category_attributes')->cascadeOnDelete();
                $table->foreignId('attribute_option_id')->nullable()->constrained('category_attribute_options')->nullOnDelete();
                $table->string('custom_value')->nullable();
                $table->timestamps();

                $table->index(['product_variant_id', 'category_attribute_id'], 'pvar_attr_idx');
            });
        }

        // 8. Product multiple categories pivot table
        if (!Schema::hasTable('product_categories')) {
            Schema::create('product_categories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
                $table->boolean('is_primary')->default(false);
                $table->timestamps();

                $table->unique(['product_id', 'category_id']);
            });
        }

        // 9. Backfill product_categories from existing products.category_id
        $products = DB::table('products')->whereNotNull('category_id')->get(['id', 'category_id']);
        foreach ($products as $p) {
            $exists = DB::table('product_categories')
                ->where('product_id', $p->id)
                ->where('category_id', $p->category_id)
                ->exists();

            if (!$exists) {
                DB::table('product_categories')->insert([
                    'product_id' => $p->id,
                    'category_id' => $p->category_id,
                    'is_primary' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 10. Extend inventories with variant_id
        Schema::table('inventories', function (Blueprint $table) {
            if (!Schema::hasColumn('inventories', 'variant_id')) {
                $table->foreignId('variant_id')->nullable()->after('product_id')->constrained('product_variants')->cascadeOnDelete();
            }
        });

        // 11. Extend inventory_movements with variant_id
        Schema::table('inventory_movements', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_movements', 'variant_id')) {
                $table->foreignId('variant_id')->nullable()->after('product_id')->constrained('product_variants')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_movements', 'variant_id')) {
                $table->dropConstrainedForeignId('variant_id');
            }
        });

        Schema::table('inventories', function (Blueprint $table) {
            if (Schema::hasColumn('inventories', 'variant_id')) {
                $table->dropConstrainedForeignId('variant_id');
            }
        });

        Schema::dropIfExists('product_categories');
        Schema::dropIfExists('variant_attribute_values');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('product_attribute_values');
        Schema::dropIfExists('category_attribute_options');
        Schema::dropIfExists('category_attributes');

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'dimensions')) {
                $table->dropColumn('dimensions');
            }
            if (Schema::hasColumn('products', 'weight')) {
                $table->dropColumn('weight');
            }
            if (Schema::hasColumn('products', 'currency')) {
                $table->dropColumn('currency');
            }
            if (Schema::hasColumn('products', 'brand')) {
                $table->dropColumn('brand');
            }
            if (Schema::hasColumn('products', 'product_type')) {
                $table->dropColumn('product_type');
            }
        });

        Schema::table('categories', function (Blueprint $table) {
            if (Schema::hasColumn('categories', 'seo_keywords')) {
                $table->dropColumn('seo_keywords');
            }
            if (Schema::hasColumn('categories', 'seo_description')) {
                $table->dropColumn('seo_description');
            }
            if (Schema::hasColumn('categories', 'seo_title')) {
                $table->dropColumn('seo_title');
            }
            if (Schema::hasColumn('categories', 'image_url')) {
                $table->dropColumn('image_url');
            }
            if (Schema::hasColumn('categories', 'parent_id')) {
                $table->dropConstrainedForeignId('parent_id');
            }
        });
    }
};

