<?php

namespace Database\Seeders\Essential;

use App\Models\Brand;
use App\Models\BrandTranslation;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;

class BrandSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $brands = [
            [
                'name' => 'MegaBasics',
                'slug' => 'megabasics',
                'logo_url' => 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=200&auto=format&fit=crop&q=80',
                'description' => 'Everyday apparel, wardrobe essentials, and minimalist lifestyle goods.',
                'country' => 'Cambodia',
                'website' => 'https://megacommerce.store/brands/megabasics',
                'sort_order' => 1,
                'seo_title' => 'MegaBasics | Premium Everyday Clothing & Essentials',
                'seo_description' => 'Shop certified Pima cotton shirts, chinos, and essentials crafted for ultimate daily comfort.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'MegaBasics', 'description' => 'Everyday apparel, wardrobe essentials, and minimalist lifestyle goods.'],
                    ['locale' => 'km', 'name' => 'មេហ្គាបេសិក', 'description' => 'សម្លៀកបំពាក់ប្រចាំថ្ងៃ សម្ភារៈចាំបាច់ និងទំនិញរស់នៅបែបសាមញ្ញទំនើប។'],
                ],
            ],
            [
                'name' => 'Aura Silk',
                'slug' => 'aura-silk',
                'logo_url' => 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&auto=format&fit=crop&q=80',
                'description' => 'Artisanal silk blouses, breathable linen dresses, and elegant contemporary womenswear.',
                'country' => 'Cambodia',
                'website' => 'https://megacommerce.store/brands/aura-silk',
                'sort_order' => 2,
                'seo_title' => 'Aura Silk | Cambodian Artisanal Silk & Luxury Womenswear',
                'seo_description' => 'Handcrafted pure Cambodian silk garments, luxury dresses, and modern blouses.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Aura Silk', 'description' => 'Artisanal silk blouses, breathable linen dresses, and elegant contemporary womenswear.'],
                    ['locale' => 'km', 'name' => 'អូរ៉ា សូត្រ', 'description' => 'អាវសូត្រប្រណិត រ៉ូបក្រណាត់កប្បាស និងសម្លៀកបំពាក់នារីទាន់សម័យ។'],
                ],
            ],
            [
                'name' => 'UrbanPulse',
                'slug' => 'urbanpulse',
                'logo_url' => 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200&auto=format&fit=crop&q=80',
                'description' => 'Athleisure, dynamic streetwear, high-performance denim, and active lifestyle apparel.',
                'country' => 'Singapore',
                'website' => 'https://urbanpulse.asia',
                'sort_order' => 3,
                'seo_title' => 'UrbanPulse | High-Performance Denim & Streetwear',
                'seo_description' => 'Engineered for the city. Discover breathable hoodies, flexible jeans, and athletic gear.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'UrbanPulse', 'description' => 'Athleisure, dynamic streetwear, high-performance denim, and active lifestyle apparel.'],
                    ['locale' => 'km', 'name' => 'អ័បិន ផល្ស', 'description' => 'សម្លៀកបំពាក់កីឡា ខោខូវប៊យយឺត និងម៉ូដយុវវ័យសម័យថ្មី។'],
                ],
            ],
            [
                'name' => 'Apex Tech',
                'slug' => 'apex-tech',
                'logo_url' => 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80',
                'description' => 'Flagship laptops, computer peripherals, high-speed NVMe storage, and productivity hardware.',
                'country' => 'Taiwan',
                'website' => 'https://apextech.hardware',
                'sort_order' => 4,
                'seo_title' => 'Apex Tech Hardware & Computing',
                'seo_description' => 'Ultra-reliable enterprise and gaming computing hardware, processors, and monitors.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Apex Tech', 'description' => 'Flagship laptops, computer peripherals, high-speed NVMe storage, and productivity hardware.'],
                    ['locale' => 'km', 'name' => 'អេផិកស៍ តិច', 'description' => 'កុំព្យូទ័រយួរដៃ គ្រឿងបន្លាស់កុំព្យូទ័រ និងឧបករណ៍អេឡិចត្រូនិចទំនើប។'],
                ],
            ],
            [
                'name' => 'Lumina Audio',
                'slug' => 'lumina-audio',
                'logo_url' => 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&auto=format&fit=crop&q=80',
                'description' => 'Audiophile-grade wireless headphones, active noise-canceling earbuds, and studio monitors.',
                'country' => 'Japan',
                'website' => 'https://lumina-audio.jp',
                'sort_order' => 5,
                'seo_title' => 'Lumina Audio Acoustics',
                'seo_description' => 'Experience crystal clarity with Lumina lossless audio gear and noise-canceling headphones.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Lumina Audio', 'description' => 'Audiophile-grade wireless headphones, active noise-canceling earbuds, and studio monitors.'],
                    ['locale' => 'km', 'name' => 'លូមីណា អូឌីយ៉ូ', 'description' => 'កាសស្តាប់ត្រចៀកប៊្លូធូសឥតខ្សែ កាត់បន្ថយសំឡេងរំខាន និងឧបករណ៍បំពងសំឡេងគុណភាពខ្ពស់។'],
                ],
            ],
            [
                'name' => 'Terra Living',
                'slug' => 'terra-living',
                'logo_url' => 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=200&auto=format&fit=crop&q=80',
                'description' => 'Solid teak and Scandinavian inspired furniture, ergonomic desk setups, and sustainable home decor.',
                'country' => 'Cambodia',
                'website' => 'https://terraliving.design',
                'sort_order' => 6,
                'seo_title' => 'Terra Living Modern Furniture',
                'seo_description' => 'Sustainable hardwood dining tables, ergonomic chairs, and modern living room fixtures.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Terra Living', 'description' => 'Solid teak and Scandinavian inspired furniture, ergonomic desk setups, and sustainable home decor.'],
                    ['locale' => 'km', 'name' => 'ថេរ៉ា លីវីង', 'description' => 'គ្រឿងសង្ហារិមឈើប្រណិត តុធ្វើការត្រឹមត្រូវតាមកាយវិភាគវិទ្យា និងគ្រឿងតុបតែងផ្ទះ។'],
                ],
            ],
            [
                'name' => 'Botanica Care',
                'slug' => 'botanica-care',
                'logo_url' => 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&auto=format&fit=crop&q=80',
                'description' => 'Organic botanical skincare, clean cosmetics, and rejuvenating mineral sunscreens.',
                'country' => 'France',
                'website' => 'https://botanicacare.fr',
                'sort_order' => 7,
                'seo_title' => 'Botanica Care Skincare & Wellness',
                'seo_description' => 'Dermatologist tested clean skincare formulated with organic active botanical extracts.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Botanica Care', 'description' => 'Organic botanical skincare, clean cosmetics, and rejuvenating mineral sunscreens.'],
                    ['locale' => 'km', 'name' => 'បូតានីកា ឃែរ', 'description' => 'ផលិតផលថែរក្សាស្បែកធម្មជាតិ គ្រឿងសម្អាងសរីរាង្គ និងឡេការពារកម្តៅថ្ងៃ។'],
                ],
            ],
            [
                'name' => 'KhmerCraft Heritage',
                'slug' => 'khmercraft-heritage',
                'logo_url' => 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop&q=80',
                'description' => 'Authentic handmade Cambodian crafts, traditional krama scarves, and hand-carved stone art.',
                'country' => 'Cambodia',
                'website' => 'https://khmercraft.org',
                'sort_order' => 8,
                'seo_title' => 'KhmerCraft Heritage | Authentic Artisan Cambodian Crafts',
                'seo_description' => 'Fair-trade handwoven kramas, ceramic sculptures, and traditional textiles supporting local artisans.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'KhmerCraft Heritage', 'description' => 'Authentic handmade Cambodian crafts, traditional krama scarves, and hand-carved stone art.'],
                    ['locale' => 'km', 'name' => 'ខ្មែរក្រាហ្វ បេតិកភណ្ឌ', 'description' => 'សិប្បកម្មខ្មែរធ្វើដោយដៃពិតៗ ក្រមាខ្មែរ និងចម្លាក់ថ្មប្រពៃណីគាំទ្រសហគមន៍។'],
                ],
            ],
        ];

        foreach ($brands as $item) {
            $translations = $item['translations'] ?? [];
            unset($item['translations']);

            try {
                $brand = Brand::updateOrCreate(
                    ['slug' => $item['slug']],
                    array_merge($item, [
                        'status' => 'active',
                        'is_active' => true,
                    ])
                );

                foreach ($translations as $tr) {
                    BrandTranslation::updateOrCreate(
                        [
                            'brand_id' => $brand->id,
                            'locale' => $tr['locale'],
                        ],
                        [
                            'name' => $tr['name'],
                            'description' => $tr['description'] ?? null,
                        ]
                    );
                }

                // Associate products matching brand name in their title
                Product::whereRaw('LOWER(name) LIKE ?', ['%'.strtolower($brand->name).'%'])
                    ->update(['brand_id' => $brand->id]);
            } catch (\Throwable $e) {
                Log::warning("BrandSeeder item {$item['slug']} error: ".$e->getMessage());
            }
        }
    }
}
