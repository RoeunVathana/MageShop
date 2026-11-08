<?php

namespace Database\Seeders;

use App\Models\Banner;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;

class BannerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $banners = [
            [
                'title' => 'The Next-Gen Universal Marketplace',
                'subtitle' => 'Engineered with modern multi-vendor commerce architecture. Browse 26 universal departments, dynamic specifications, and multi-SKU variants powered by real-time inventory control.',
                'badge_text' => 'Universal Multi-Category Marketplace',
                'image_url' => '/Gemini_Generated_Image_1n7mgq1n7mgq1n7m.jpg',
                'video_url' => '/gemini_generated_video_4b7f1e53.mp4',
                'link_url' => '/products',
                'button_text' => 'Explore Catalog',
                'background_style' => 'gradient-primary',
                'placement' => 'hero',
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'title' => 'Cambodia Flagship Tech & Mobile Deals',
                'subtitle' => 'Official Apple, Sony, Samsung, DJI & tech accessories with nationwide express delivery and 0% fee Bakong KHQR checkout.',
                'badge_text' => 'Official Tech Flagship',
                'image_url' => 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
                'video_url' => null,
                'link_url' => '/products?category=electronics-computers',
                'button_text' => 'Shop Electronics',
                'background_style' => 'gradient-purple',
                'placement' => 'hero',
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'title' => "Men's & Women's Fashion Master Showcase",
                'subtitle' => 'Curated premium apparel, streetwear, athletic sportswear, and handcrafted traditional Khmer silk collections.',
                'badge_text' => 'Trending Collections',
                'image_url' => 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
                'video_url' => null,
                'link_url' => '/products?category=fashion-clothing',
                'button_text' => 'Browse Fashion',
                'background_style' => 'gradient-emerald',
                'placement' => 'hero',
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'title' => 'Nationwide Express Courier & Live GPS Tracking',
                'subtitle' => 'Order before 2 PM for same-day delivery across Phnom Penh. Real-time driver parcel tracking with verified delivery security.',
                'badge_text' => 'Fast Dispatch',
                'image_url' => 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
                'video_url' => null,
                'link_url' => '/about',
                'button_text' => 'Learn About Delivery',
                'background_style' => 'gradient-amber',
                'placement' => 'hero',
                'sort_order' => 4,
                'is_active' => true,
            ],
        ];

        foreach ($banners as $data) {
            try {
                Banner::firstOrCreate(
                    ['title' => $data['title'], 'placement' => $data['placement']],
                    $data
                );
            } catch (\Throwable $e) {
                Log::warning("BannerSeeder skipped record [{$data['title']}]: {$e->getMessage()}");
            }
        }
    }
}
