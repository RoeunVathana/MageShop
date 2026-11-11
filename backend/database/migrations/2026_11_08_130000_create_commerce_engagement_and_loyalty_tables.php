<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add loyalty_points to users table
        if (Schema::hasTable('users') && ! Schema::hasColumn('users', 'loyalty_points')) {
            Schema::table('users', function (Blueprint $table) {
                $table->integer('loyalty_points')->default(0)->after('status');
            });
        }

        // 2. Extend orders table with loyalty, coupon, and real-time GPS tracking fields
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (! Schema::hasColumn('orders', 'coupon_code')) {
                    $table->string('coupon_code')->nullable()->after('discount');
                }
                if (! Schema::hasColumn('orders', 'points_earned')) {
                    $table->integer('points_earned')->default(5)->after('coupon_code');
                }
                if (! Schema::hasColumn('orders', 'points_redeemed')) {
                    $table->integer('points_redeemed')->default(0)->after('points_earned');
                }
                if (! Schema::hasColumn('orders', 'free_reward_product_id')) {
                    $table->unsignedBigInteger('free_reward_product_id')->nullable()->after('points_redeemed');
                }
                if (! Schema::hasColumn('orders', 'driver_name')) {
                    $table->string('driver_name')->nullable()->after('notes');
                }
                if (! Schema::hasColumn('orders', 'driver_phone')) {
                    $table->string('driver_phone')->nullable()->after('driver_name');
                }
                if (! Schema::hasColumn('orders', 'driver_vehicle')) {
                    $table->string('driver_vehicle')->nullable()->after('driver_phone');
                }
                if (! Schema::hasColumn('orders', 'current_lat')) {
                    $table->decimal('current_lat', 10, 7)->nullable()->after('driver_vehicle');
                }
                if (! Schema::hasColumn('orders', 'current_lng')) {
                    $table->decimal('current_lng', 10, 7)->nullable()->after('current_lat');
                }
                if (! Schema::hasColumn('orders', 'dest_lat')) {
                    $table->decimal('dest_lat', 10, 7)->nullable()->after('current_lng');
                }
                if (! Schema::hasColumn('orders', 'dest_lng')) {
                    $table->decimal('dest_lng', 10, 7)->nullable()->after('dest_lat');
                }
                if (! Schema::hasColumn('orders', 'estimated_arrival')) {
                    $table->string('estimated_arrival')->nullable()->after('dest_lng');
                }
            });
        }

        // 3. Create coupons table
        if (! Schema::hasTable('coupons')) {
            Schema::create('coupons', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique()->index();
                $table->string('description')->nullable();
                $table->string('discount_type')->default('percentage'); // percentage, fixed
                $table->decimal('discount_value', 10, 2);
                $table->decimal('min_order_amount', 10, 2)->default(0);
                $table->decimal('max_discount_amount', 10, 2)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
        }

        // Seed default promotional coupons idempotently
        $defaultCoupons = [
            [
                'code' => 'WELCOME10',
                'description' => '10% OFF for New & Returning Customers',
                'discount_type' => 'percentage',
                'discount_value' => 10.00,
                'min_order_amount' => 10.00,
                'max_discount_amount' => 100.00,
                'is_active' => true,
            ],
            [
                'code' => 'MEGA20',
                'description' => '20% OFF Mega Flash Promotion (up to $150 off)',
                'discount_type' => 'percentage',
                'discount_value' => 20.00,
                'min_order_amount' => 50.00,
                'max_discount_amount' => 150.00,
                'is_active' => true,
            ],
            [
                'code' => 'KHQR5',
                'description' => '$5.00 Instant Discount for Bakong KHQR Checkout',
                'discount_type' => 'fixed',
                'discount_value' => 5.00,
                'min_order_amount' => 15.00,
                'max_discount_amount' => 5.00,
                'is_active' => true,
            ],
            [
                'code' => 'VIP30',
                'description' => '30% VIP Storewide Discount',
                'discount_type' => 'percentage',
                'discount_value' => 30.00,
                'min_order_amount' => 100.00,
                'max_discount_amount' => 250.00,
                'is_active' => true,
            ],
        ];

        foreach ($defaultCoupons as $coupon) {
            DB::table('coupons')->updateOrInsert(
                ['code' => $coupon['code']],
                array_merge($coupon, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        // 4. Create loyalty_transactions table
        if (! Schema::hasTable('loyalty_transactions')) {
            Schema::create('loyalty_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
                $table->string('type')->default('earned'); // earned, redeemed, bonus
                $table->integer('points');
                $table->string('description')->nullable();
                $table->timestamps();
            });
        }

        // 5. Create wishlists (customer favorites) table
        if (! Schema::hasTable('wishlists')) {
            Schema::create('wishlists', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['user_id', 'product_id']);
            });
        }

        // 6. Create support_tickets table
        if (! Schema::hasTable('support_tickets')) {
            Schema::create('support_tickets', function (Blueprint $table) {
                $table->id();
                $table->string('ticket_number')->unique()->index();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('name');
                $table->string('email')->index();
                $table->string('subject');
                $table->string('category')->default('general'); // general, order, delivery, points, technical
                $table->string('order_number')->nullable();
                $table->text('message');
                $table->string('status')->default('open')->index(); // open, in_progress, resolved
                $table->text('admin_reply')->nullable();
                $table->timestamps();
            });
        }

        // 7. Ensure reward-eligible products under $20-$30 exist in catalog
        if (Schema::hasTable('products') && Schema::hasTable('categories')) {
            $defaultCatId = DB::table('categories')->value('id');
            if ($defaultCatId) {
                $rewardProducts = [
                    [
                        'name' => 'Anker PowerLine III USB-C Fast Charging Cable (6ft)',
                        'slug' => 'anker-powerline-iii-usbc-cable',
                        'sku' => 'RWD-ANK-015',
                        'category_id' => $defaultCatId,
                        'description' => 'Ultra-durable 100W USB-C PD fast charging cable. Eligible for 100 Loyalty Points Free Redemption!',
                        'price' => 18.00,
                        'discount_price' => 14.50,
                        'stock_quantity' => 50,
                        'low_stock_threshold' => 5,
                        'rating' => 4.9,
                        'reviews_count' => 84,
                        'image_url' => 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
                        'is_featured' => true,
                        'is_best_seller' => true,
                        'is_flash_sale' => true,
                        'is_new_arrival' => true,
                        'status' => 'active',
                    ],
                    [
                        'name' => 'Xiaomi Mi Wireless Dual-Mode Silent Mouse',
                        'slug' => 'xiaomi-mi-wireless-silent-mouse',
                        'sku' => 'RWD-XIA-022',
                        'category_id' => $defaultCatId,
                        'description' => 'Ergonomic Bluetooth & 2.4GHz wireless silent mouse. Redeemable for FREE with 100 Loyalty Points!',
                        'price' => 22.00,
                        'discount_price' => 19.00,
                        'stock_quantity' => 40,
                        'low_stock_threshold' => 5,
                        'rating' => 4.8,
                        'reviews_count' => 62,
                        'image_url' => 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80',
                        'is_featured' => false,
                        'is_best_seller' => true,
                        'is_flash_sale' => true,
                        'is_new_arrival' => false,
                        'status' => 'active',
                    ],
                    [
                        'name' => 'JBL GO 3 Portable Waterproof Bluetooth Speaker',
                        'slug' => 'jbl-go-3-portable-bluetooth-speaker',
                        'sku' => 'RWD-JBL-029',
                        'category_id' => $defaultCatId,
                        'description' => 'Bold styling and rich JBL Pro Sound with IP67 waterproof & dustproof rating. Eligible for 100 Points Free Exchange!',
                        'price' => 29.00,
                        'discount_price' => 24.99,
                        'stock_quantity' => 35,
                        'low_stock_threshold' => 5,
                        'rating' => 4.9,
                        'reviews_count' => 140,
                        'image_url' => 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80',
                        'is_featured' => true,
                        'is_best_seller' => true,
                        'is_flash_sale' => true,
                        'is_new_arrival' => true,
                        'status' => 'active',
                    ],
                    [
                        'name' => 'MegaBasics Insulated Stainless Steel Travel Tumbler (750ml)',
                        'slug' => 'megabasics-stainless-travel-tumbler',
                        'sku' => 'RWD-MGB-019',
                        'category_id' => $defaultCatId,
                        'description' => 'Double-wall vacuum insulated tumbler keeping drinks icy cold for 24 hours. Free with 100 Loyalty Points!',
                        'price' => 19.50,
                        'discount_price' => 16.00,
                        'stock_quantity' => 60,
                        'low_stock_threshold' => 5,
                        'rating' => 4.7,
                        'reviews_count' => 51,
                        'image_url' => 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80',
                        'is_featured' => false,
                        'is_best_seller' => false,
                        'is_flash_sale' => true,
                        'is_new_arrival' => true,
                        'status' => 'active',
                    ],
                ];

                foreach ($rewardProducts as $rp) {
                    if (! DB::table('products')->where('sku', $rp['sku'])->exists()) {
                        DB::table('products')->insert(array_merge($rp, [
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]));
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('wishlists');
        Schema::dropIfExists('loyalty_transactions');
        Schema::dropIfExists('coupons');
    }
};
