<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CommerceAndTelegramSeeder extends Seeder
{
    /**
     * Seed initial store settings, catalog, and orders.
     */
    public function run(): void
    {
        // 1. Official Store Information
        $settings = [
            'store_name' => 'MegaCommerce Flagship Store',
            'store_description' => 'Premium Multi-Vendor Marketplace specializing in verified electronics, smartphones, acoustics, and smart lifestyle.',
            'store_address' => '#182 Preah Norodom Boulevard, Sangkat Tonle Bassac, Khan Chamkarmon, Phnom Penh 12301, Cambodia',
            'business_email' => 'Vothanarern@gmail.com',
            'support_email' => 'Vothanarern@gmail.com',
            'contact_phone' => '016 555 637',
            'telegram_bot_username' => 'MegaCommerceAiBot',
            'telegram_support_contact' => '@MegaCommerceSupport',
            'website_url' => 'http://localhost:3000',
            'country' => 'Cambodia',
            'default_currency' => 'USD',
            'supported_languages' => json_encode(['en' => 'English', 'km' => 'Khmer']),
            'brand_color' => '#4f46e5',
            'receipt_footer_message' => 'Thank you for choosing MegaCommerce Flagship. For returns or warranty claims, contact support@megacommerce.local within 7 days.',
            'tax_id' => 'KHM-VAT-9024881',
            'return_policy_days' => '7',
            'shipping_policy' => 'Free express shipping on all orders exceeding $50. Standard nationwide delivery within 24 to 48 hours.',
        ];

        foreach ($settings as $key => $val) {
            StoreSetting::set($key, $val);
        }

        // 2. Categories
        $categoriesData = [
            ['name' => 'Laptops & Computers', 'slug' => 'laptops', 'icon' => 'Laptop', 'description' => 'High performance laptops, ultrabooks, and workstations'],
            ['name' => 'Smartphones & Tablets', 'slug' => 'smartphones', 'icon' => 'Smartphone', 'description' => 'Flagship iOS and Android mobile devices'],
            ['name' => 'Audio & Acoustics', 'slug' => 'audio', 'icon' => 'Headphones', 'description' => 'Wireless noise cancelling headphones and studio acoustics'],
            ['name' => 'Wearables & Smartwatches', 'slug' => 'wearables', 'icon' => 'Watch', 'description' => 'GPS fitness smartwatches and smart bands'],
            ['name' => 'Drones & Cameras', 'slug' => 'drones', 'icon' => 'Camera', 'description' => 'Aerial 4K HDR drones and handheld gimbals'],
            ['name' => 'Fashion & Sportswear', 'slug' => 'fashion', 'icon' => 'Shirt', 'description' => 'Original footwear and athletic apparel'],
        ];

        $categories = [];
        foreach ($categoriesData as $cat) {
            $categories[$cat['slug']] = Category::firstOrCreate(['slug' => $cat['slug']], $cat);
        }

        // 3. Products
        $productsData = [
            [
                'name' => 'Apple MacBook Pro 16" M3 Max (36GB RAM, 1TB SSD)',
                'slug' => 'apple-macbook-pro-16-m3-max',
                'sku' => 'LAP-MBP-016',
                'category_id' => $categories['laptops']->id,
                'description' => 'The ultimate pro laptop. Powered by M3 Max with a 14-core CPU, 30-core GPU, Liquid Retina XDR display, and up to 22 hours of battery life.',
                'price' => 3499.00,
                'discount_price' => 3299.00,
                'stock_quantity' => 15,
                'low_stock_threshold' => 3,
                'rating' => 4.9,
                'reviews_count' => 128,
                'image_url' => 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
                'gallery_urls' => [
                    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1200&q=80',
                ],
                'is_featured' => true,
                'is_best_seller' => true,
                'is_flash_sale' => false,
                'is_new_arrival' => true,
                'specifications' => [
                    'Processor' => 'Apple M3 Max 14-core',
                    'RAM' => '36GB Unified Memory',
                    'Storage' => '1TB NVMe SSD',
                    'Screen' => '16.2-inch Liquid Retina XDR',
                    'Color' => 'Space Black',
                ],
            ],
            [
                'name' => 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
                'slug' => 'sony-wh-1000xm5-wireless-headphones',
                'sku' => 'AUD-SNY-XM5',
                'category_id' => $categories['audio']->id,
                'description' => 'Industry-leading noise cancellation optimized by two processors and 8 microphones. Exceptional sound with 30-hour battery life.',
                'price' => 398.00,
                'discount_price' => 349.00,
                'stock_quantity' => 28,
                'low_stock_threshold' => 5,
                'rating' => 4.8,
                'reviews_count' => 95,
                'image_url' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
                'is_featured' => true,
                'is_best_seller' => true,
                'is_flash_sale' => true,
                'is_new_arrival' => false,
                'specifications' => [
                    'Connectivity' => 'Bluetooth 5.2 / 3.5mm Aux',
                    'Battery Life' => '30 hours (ANC on)',
                    'Microphones' => '8 Beamforming mics',
                    'Color' => 'Silver / Platinum',
                ],
            ],
            [
                'name' => 'Samsung Galaxy S24 Ultra 5G AI Smartphone (512GB)',
                'slug' => 'samsung-galaxy-s24-ultra-512gb',
                'sku' => 'PHN-SMS-S24',
                'category_id' => $categories['smartphones']->id,
                'description' => 'Galaxy AI is here. Titanium frame, 200MP camera with Quad Telephoto system, and Snapdragon 8 Gen 3 for Galaxy.',
                'price' => 1299.00,
                'discount_price' => 1199.00,
                'stock_quantity' => 22,
                'low_stock_threshold' => 4,
                'rating' => 4.9,
                'reviews_count' => 210,
                'image_url' => 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80',
                'is_featured' => true,
                'is_best_seller' => false,
                'is_flash_sale' => true,
                'is_new_arrival' => true,
                'specifications' => [
                    'Processor' => 'Snapdragon 8 Gen 3',
                    'RAM' => '12GB',
                    'Storage' => '512GB',
                    'Camera' => '200MP + 50MP + 12MP + 10MP',
                    'Display' => '6.8-inch Dynamic AMOLED 2X 120Hz',
                ],
            ],
            [
                'name' => 'Apple Watch Ultra 2 GPS + Cellular Titanium Case',
                'slug' => 'apple-watch-ultra-2-titanium',
                'sku' => 'WAT-APL-ULT2',
                'category_id' => $categories['wearables']->id,
                'description' => 'The most rugged and capable Apple Watch. Engineered for endurance athletes, outdoor adventurers, and water sports enthusiasts.',
                'price' => 799.00,
                'discount_price' => null,
                'stock_quantity' => 4, // Intentionally low stock for testing alerts!
                'low_stock_threshold' => 5,
                'rating' => 4.8,
                'reviews_count' => 64,
                'image_url' => 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
                'is_featured' => false,
                'is_best_seller' => false,
                'is_flash_sale' => false,
                'is_new_arrival' => true,
                'specifications' => [
                    'Case' => '49mm Aerospace-grade Titanium',
                    'Display' => '3000 nits Always-On Retina',
                    'Water Resistance' => '100m / EN13319 dive rated',
                ],
            ],
            [
                'name' => 'DJI Mini 4 Pro Drone with RC 2 Controller & 4K HDR',
                'slug' => 'dji-mini-4-pro-drone-rc2',
                'sku' => 'DRN-DJI-M4P',
                'category_id' => $categories['drones']->id,
                'description' => 'Sub-249g ultra-lightweight mini drone with omnidirectional obstacle sensing, 4K/60fps HDR true vertical shooting, and 20km FHD transmission.',
                'price' => 959.00,
                'discount_price' => 899.00,
                'stock_quantity' => 7,
                'low_stock_threshold' => 3,
                'rating' => 4.9,
                'reviews_count' => 43,
                'image_url' => 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=600&q=80',
                'is_featured' => true,
                'is_best_seller' => false,
                'is_flash_sale' => false,
                'is_new_arrival' => false,
                'specifications' => [
                    'Weight' => '249g',
                    'Flight Time' => '34 minutes',
                    'Video' => '4K/60fps HDR True Vertical',
                    'Sensing' => 'Omnidirectional Obstacle Avoidance',
                ],
            ],
            [
                'name' => 'Nike Air Zoom Alphafly NEXT% 2 Road Racing Shoes',
                'slug' => 'nike-air-zoom-alphafly-next-2',
                'sku' => 'FSH-NKE-ALP2',
                'category_id' => $categories['fashion']->id,
                'description' => 'Engineered for marathoners and competitive racers. Dual Zoom Air pods, full-length carbon fiber Flyplate, and ZoomX foam midsole.',
                'price' => 275.00,
                'discount_price' => 245.00,
                'stock_quantity' => 19,
                'low_stock_threshold' => 4,
                'rating' => 4.7,
                'reviews_count' => 88,
                'image_url' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
                'is_featured' => false,
                'is_best_seller' => true,
                'is_flash_sale' => true,
                'is_new_arrival' => false,
                'specifications' => [
                    'Type' => 'Marathon Road Racing',
                    'Cushioning' => 'ZoomX Foam + Dual Air Pods',
                    'Plate' => 'Full-length Carbon Fiber Flyplate',
                ],
            ],
            [
                'name' => 'Anker PowerLine III USB-C Fast Charging Cable (100W)',
                'slug' => 'anker-powerline-iii-usbc-cable',
                'sku' => 'RWD-ANK-015',
                'category_id' => $categories['smartphones']->id,
                'description' => 'Ultra-durable 100W USB-C PD fast charging cable. Redeemable for FREE with 100 Loyalty Points (under $20-$30 reward item)!',
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
                'specifications' => [
                    'Output' => '100W Power Delivery',
                    'Reward Program' => '100 Points Free Item Eligible',
                ],
            ],
            [
                'name' => 'JBL GO 3 Portable Waterproof Bluetooth Speaker',
                'slug' => 'jbl-go-3-portable-bluetooth-speaker',
                'sku' => 'RWD-JBL-029',
                'category_id' => $categories['audio']->id,
                'description' => 'Rich JBL Pro Sound with IP67 waterproof rating. Eligible for 100 Points Free Exchange (under $30)!',
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
                'specifications' => [
                    'Waterproof' => 'IP67 Rated',
                    'Reward Program' => '100 Points Free Item Eligible',
                ],
            ],
            [
                'name' => 'Xiaomi Mi Dual-Mode Silent Wireless Mouse',
                'slug' => 'xiaomi-mi-wireless-silent-mouse',
                'sku' => 'RWD-XIA-022',
                'category_id' => $categories['laptops']->id,
                'description' => 'Ergonomic Bluetooth & 2.4GHz wireless silent mouse. Eligible for 100 Loyalty Points Free Redemption!',
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
                'is_new_arrival' => true,
                'specifications' => [
                    'Connectivity' => 'Bluetooth + 2.4GHz USB',
                    'Reward Program' => '100 Points Free Item Eligible',
                ],
            ],
        ];

        foreach ($productsData as $prod) {
            $p = Product::firstOrCreate(['sku' => $prod['sku']], $prod);
            $p->update(array_merge($prod, [
                'status' => 'active',
                'is_active' => true,
            ]));
        }

        // 4. Create an Admin / Staff user for Telegram Bot management testing
        $adminUser = User::firstOrCreate(
            ['email' => 'admin.tele@megacommerce.local'],
            [
                'name' => 'MegaCommerce Store Manager',
                'password' => Hash::make('AdminPass2026!'),
                'status' => 'active',
                'phone_number' => '+85512999001',
            ]
        );
        $adminUser->assignRole('ADMIN');

        // Customer user
        $customerUser = User::firstOrCreate(
            ['email' => 'customer.tele@megacommerce.local'],
            [
                'name' => 'Sopheap Seng',
                'password' => Hash::make('CustomerPass2026!'),
                'status' => 'active',
                'phone_number' => '+85512888002',
            ]
        );
        $customerUser->assignRole('CUSTOMER');

        // 5. Seed Real Orders & Payments for Order Tracking and Receipt Testing
        $order = Order::updateOrCreate(
            ['order_number' => 'ORD-20261108-8948'],
            [
                'user_id' => $customerUser->id,
                'status' => 'shipped',
                'subtotal' => 349.00,
                'discount' => 34.90,
                'shipping_fee' => 0.00,
                'tax' => 0.00,
                'total_amount' => 314.10,
                'currency' => 'USD',
                'payment_status' => 'paid',
                'payment_method' => 'bakong_khqr',
                'customer_name' => 'Dara Sok',
                'customer_email' => 'dara.sok@tyushop.blog',
                'customer_phone' => '+855 12 888 999',
                'delivery_address' => 'BKK1, Street 310, Chamkarmon, Phnom Penh, Cambodia',
                'dest_lat' => 11.5564000,
                'dest_lng' => 104.9282000,
                'current_lat' => 11.5510000,
                'current_lng' => 104.9315000,
                'driver_name' => 'Sokha Chan (TYUSHOP Express GPS Courier)',
                'driver_phone' => '+855 12 889 900',
                'driver_vehicle' => 'Honda PCX Electric • PP 1AB-9988',
                'estimated_arrival' => '12 mins',
                'notes' => 'Call recipient upon arrival at ground lobby.',
            ]
        );

        Order::updateOrCreate(
            ['order_number' => 'ORD-2026-9041'],
            [
                'user_id' => $customerUser->id,
                'status' => 'shipped',
                'subtotal' => 349.00,
                'discount' => 34.90,
                'shipping_fee' => 0.00,
                'tax' => 0.00,
                'total_amount' => 314.10,
                'currency' => 'USD',
                'payment_status' => 'paid',
                'payment_method' => 'bakong_khqr',
                'customer_name' => 'Dara Sok',
                'customer_email' => 'dara.sok@tyushop.blog',
                'customer_phone' => '+855 12 888 999',
                'delivery_address' => 'BKK1, Street 310, Chamkarmon, Phnom Penh, Cambodia',
                'dest_lat' => 11.5564000,
                'dest_lng' => 104.9282000,
                'current_lat' => 11.5510000,
                'current_lng' => 104.9315000,
                'driver_name' => 'Sokha Chan (TYUSHOP Express GPS Courier)',
                'driver_phone' => '+855 12 889 900',
                'driver_vehicle' => 'Honda PCX Electric • PP 1AB-9988',
                'estimated_arrival' => '12 mins',
                'notes' => 'Call recipient upon arrival at ground lobby.',
            ]
        );

        $productMac = Product::where('sku', 'LAP-MBP-016')->first();
        if ($productMac) {
            OrderItem::firstOrCreate(
                ['order_id' => $order->id, 'product_id' => $productMac->id],
                [
                    'product_name' => $productMac->name,
                    'product_sku' => $productMac->sku,
                    'quantity' => 1,
                    'unit_price' => 3299.00,
                    'total_price' => 3299.00,
                ]
            );
        }

        Payment::firstOrCreate(
            ['transaction_reference' => 'TXN-BKG-904128'],
            [
                'order_id' => $order->id,
                'payment_method' => 'bakong_khqr',
                'amount' => 3299.00,
                'currency' => 'USD',
                'status' => 'completed',
                'khqr_string' => '00020101021229380016A0000007270228010108551299900052045999530384054073299.005802KH5911MEGACOMMERCE6010PHNOM PENH62210117ORD-2026-9041286304E8A2',
                'khqr_md5' => 'e8a2b5c7d8e9f0123456789abcdef012',
                'verified_at' => now()->subDay(),
            ]
        );
    }
}
