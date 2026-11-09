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
                'name' => 'Apple',
                'slug' => 'apple',
                'logo_url' => 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=300&auto=format&fit=crop&q=80',
                'description' => 'World-renowned personal technology, MacBook Pro, Apple Watch Ultra, and Apple Silicon ecosystems.',
                'country' => 'United States',
                'website' => 'https://www.apple.com',
                'sort_order' => 1,
                'seo_title' => 'Apple Official Store | MacBook Pro, iPad & Apple Watch',
                'seo_description' => 'Experience industry-leading innovation with Apple MacBook Pro, Apple Watch Ultra, and personal electronics.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Apple', 'description' => 'World-renowned personal technology, MacBook Pro, Apple Watch Ultra, and Apple Silicon ecosystems.'],
                    ['locale' => 'km', 'name' => 'អេផល (Apple)', 'description' => 'បច្ចេកវិទ្យាកុំព្យូទ័រ និងឧបករណ៍ទំនើប MacBook Pro, Apple Watch Ultra ឈានមុខគេលើពិភពលោក។'],
                ],
            ],
            [
                'name' => 'Sony',
                'slug' => 'sony',
                'logo_url' => 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300&auto=format&fit=crop&q=80',
                'description' => 'Pioneering Japanese acoustic engineering, WH-1000XM5 wireless noise cancelling, and pro audio.',
                'country' => 'Japan',
                'website' => 'https://www.sony.com',
                'sort_order' => 2,
                'seo_title' => 'Sony Electronics | Industry-Leading Noise Cancelling Headphones',
                'seo_description' => 'Discover pure acoustic bliss with Sony WH-1000XM5 wireless noise cancelling headphones and audio systems.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Sony', 'description' => 'Pioneering Japanese acoustic engineering, WH-1000XM5 wireless noise cancelling, and pro audio.'],
                    ['locale' => 'km', 'name' => 'សូនី (Sony)', 'description' => 'វិស្វកម្មសំឡេងកម្រិតកំពូលរបស់ជប៉ុន កាសកាត់បន្ថយសំឡេងរំខាន WH-1000XM5 និងឧបករណ៍បំពងសំឡេង។'],
                ],
            ],
            [
                'name' => 'Samsung',
                'slug' => 'samsung',
                'logo_url' => 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=300&auto=format&fit=crop&q=80',
                'description' => 'Galaxy S24 Ultra AI Smartphones, Dynamic AMOLED displays, and next-gen mobile innovations.',
                'country' => 'South Korea',
                'website' => 'https://www.samsung.com',
                'sort_order' => 3,
                'seo_title' => 'Samsung Galaxy Official Flagship | Galaxy S24 Ultra AI',
                'seo_description' => 'Unleash next-generation mobile intelligence with Samsung Galaxy S24 Ultra and smart electronics.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Samsung', 'description' => 'Galaxy S24 Ultra AI Smartphones, Dynamic AMOLED displays, and next-gen mobile innovations.'],
                    ['locale' => 'km', 'name' => 'សាំសុង (Samsung)', 'description' => 'ទូរស័ព្ទវៃឆ្លាត Galaxy S24 Ultra AI អេក្រង់ Dynamic AMOLED និងបច្ចេកវិទ្យាចុងក្រោយបង្អស់។'],
                ],
            ],
            [
                'name' => 'Nike',
                'slug' => 'nike',
                'logo_url' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=80',
                'description' => 'World leader in athletic footwear, Alphafly road racing innovations, and performance gear.',
                'country' => 'United States',
                'website' => 'https://www.nike.com',
                'sort_order' => 4,
                'seo_title' => 'Nike Official Partner | Alphafly Road Racing & Footwear',
                'seo_description' => 'Elevate your run with Nike Air Zoom Alphafly NEXT% 2 and high-performance athletic footwear.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Nike', 'description' => 'World leader in athletic footwear, Alphafly road racing innovations, and performance gear.'],
                    ['locale' => 'km', 'name' => 'ណៃគី (Nike)', 'description' => 'ស្បែកជើងកីឡាលំដាប់ពិភពលោក Nike Air Zoom Alphafly សម្រាប់រត់ប្រណាំង និងម៉ូដកីឡាទំនើប។'],
                ],
            ],
            [
                'name' => 'Anker',
                'slug' => 'anker',
                'logo_url' => 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=80',
                'description' => 'The world\'s #1 mobile charging brand, PowerLine endurance cables, and GaN fast chargers.',
                'country' => 'United States',
                'website' => 'https://www.anker.com',
                'sort_order' => 5,
                'seo_title' => 'Anker Official Store | Fast Charging Cables & Power Banks',
                'seo_description' => 'Power fast and safe with Anker PowerLine USB-C fast charging cables and portable power stations.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Anker', 'description' => 'The world\'s #1 mobile charging brand, PowerLine endurance cables, and GaN fast chargers.'],
                    ['locale' => 'km', 'name' => 'អានឃឺ (Anker)', 'description' => 'ម៉ាកសាកថ្មលេខ១លើពិភពលោក ខ្សែសាកល្បឿនលឿន PowerLine និងឆ្នាំងសាក GaN ទំនើប។'],
                ],
            ],
            [
                'name' => 'Xiaomi',
                'slug' => 'xiaomi',
                'logo_url' => 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80',
                'description' => 'Smart living ecosystem, wireless dual-mode silent computer peripherals, and IoT lifestyle hardware.',
                'country' => 'China',
                'website' => 'https://www.mi.com',
                'sort_order' => 6,
                'seo_title' => 'Xiaomi Official | Silent Wireless Mice & Smart Living',
                'seo_description' => 'Experience sleek, ergonomic desktop accessories with Xiaomi Mi Wireless Dual-Mode Silent Mouse.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Xiaomi', 'description' => 'Smart living ecosystem, wireless dual-mode silent computer peripherals, and IoT lifestyle hardware.'],
                    ['locale' => 'km', 'name' => 'ស្យាវមី (Xiaomi)', 'description' => 'ឧបករណ៍កុំព្យូទ័រឥតខ្សែស្ងាត់ Xiaomi Mi Silent Mouse និងឧបករណ៍ឆ្លាតវៃសម្រាប់គេហដ្ឋាន។'],
                ],
            ],
            [
                'name' => 'JBL',
                'slug' => 'jbl',
                'logo_url' => 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=300&auto=format&fit=crop&q=80',
                'description' => 'Bold styling, rich JBL Pro Sound, IP67 waterproof Bluetooth speakers, and portable audio.',
                'country' => 'United States',
                'website' => 'https://www.jbl.com',
                'sort_order' => 7,
                'seo_title' => 'JBL Official Audio | Waterproof Bluetooth Speakers & Pro Sound',
                'seo_description' => 'Take massive JBL Pro Sound anywhere with JBL GO 3 portable waterproof Bluetooth speakers.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'JBL', 'description' => 'Bold styling, rich JBL Pro Sound, IP67 waterproof Bluetooth speakers, and portable audio.'],
                    ['locale' => 'km', 'name' => 'ជេប៊ីអិល (JBL)', 'description' => 'សំឡេង JBL Pro Sound កម្រិតស្តង់ដារ ឧបករណ៍បំពងសំឡេងការពារទឹក IP67 ម៉ូដែល JBL GO 3។'],
                ],
            ],
            [
                'name' => 'MegaBasics',
                'slug' => 'megabasics',
                'logo_url' => 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=300&auto=format&fit=crop&q=80',
                'description' => 'Everyday insulated travel tumblers, stainless steel bottles, and minimalist lifestyle essentials.',
                'country' => 'Cambodia',
                'website' => 'https://tyushop.blog/brands/megabasics',
                'sort_order' => 8,
                'seo_title' => 'MegaBasics | Premium Everyday Drinkware & Essentials',
                'seo_description' => 'Shop certified insulated stainless steel travel tumblers and everyday lifestyle goods.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'MegaBasics', 'description' => 'Everyday insulated travel tumblers, stainless steel bottles, and minimalist lifestyle essentials.'],
                    ['locale' => 'km', 'name' => 'មេហ្គាបេសិក (MegaBasics)', 'description' => 'កែវទឹកកម្តៅត្រជាក់អ៊ីណុក MegaBasics និងសម្ភារៈប្រើប្រាស់ប្រចាំថ្ងៃបែបសាមញ្ញទំនើប។'],
                ],
            ],
            [
                'name' => 'Aura Silk',
                'slug' => 'aura-silk',
                'logo_url' => 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&auto=format&fit=crop&q=80',
                'description' => 'Artisanal silk blouses, breathable linen dresses, and elegant contemporary womenswear.',
                'country' => 'Cambodia',
                'website' => 'https://tyushop.blog/brands/aura-silk',
                'sort_order' => 9,
                'seo_title' => 'Aura Silk | Cambodian Artisanal Silk & Luxury Womenswear',
                'seo_description' => 'Handcrafted pure Cambodian silk garments, luxury dresses, and modern blouses.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Aura Silk', 'description' => 'Artisanal silk blouses, breathable linen dresses, and elegant contemporary womenswear.'],
                    ['locale' => 'km', 'name' => 'អ៊ូរ៉ា សូត្រ (Aura Silk)', 'description' => 'អាវសូត្រប្រណិត រ៉ូបក្រណាត់កប្បាស និងសម្លៀកបំពាក់នារីទាន់សម័យ។'],
                ],
            ],
            [
                'name' => 'UrbanPulse',
                'slug' => 'urbanpulse',
                'logo_url' => 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=300&auto=format&fit=crop&q=80',
                'description' => 'Athleisure, dynamic streetwear, high-performance denim, and active lifestyle apparel.',
                'country' => 'Singapore',
                'website' => 'https://urbanpulse.asia',
                'sort_order' => 10,
                'seo_title' => 'UrbanPulse | High-Performance Denim & Streetwear',
                'seo_description' => 'Engineered for the city. Discover breathable hoodies, flexible jeans, and athletic gear.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'UrbanPulse', 'description' => 'Athleisure, dynamic streetwear, high-performance denim, and active lifestyle apparel.'],
                    ['locale' => 'km', 'name' => 'អឺបិន ផល្ស (UrbanPulse)', 'description' => 'សម្លៀកបំពាក់កីឡា ខោខូវប៊យយឺត និងម៉ូដយុវវ័យសម័យថ្មី។'],
                ],
            ],
            [
                'name' => 'Apex Tech',
                'slug' => 'apex-tech',
                'logo_url' => 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80',
                'description' => 'Flagship laptops, computer peripherals, high-speed NVMe storage, and productivity hardware.',
                'country' => 'Taiwan',
                'website' => 'https://apextech.io',
                'sort_order' => 11,
                'seo_title' => 'Apex Tech | Productivity Laptops & Performance Storage',
                'seo_description' => 'High-speed computing and durable accessories for creators and developers.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Apex Tech', 'description' => 'Flagship laptops, computer peripherals, high-speed NVMe storage, and productivity hardware.'],
                    ['locale' => 'km', 'name' => 'អេភិកស៍ តិច (Apex Tech)', 'description' => 'កុំព្យូទ័រយួរដៃ គ្រឿងបន្លាស់កុំព្យូទ័រ និងឧបករណ៍អេឡិចត្រូនិកទំនើប។'],
                ],
            ],
            [
                'name' => 'Lumina Audio',
                'slug' => 'lumina-audio',
                'logo_url' => 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=300&auto=format&fit=crop&q=80',
                'description' => 'Audiophile-grade wireless headphones, active noise-canceling earbuds, and studio monitors.',
                'country' => 'Japan',
                'website' => 'https://luminaaudio.jp',
                'sort_order' => 12,
                'seo_title' => 'Lumina Audio | High-Resolution Wireless Headphones',
                'seo_description' => 'Experience pristine studio sound with custom beryllium dynamic drivers.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Lumina Audio', 'description' => 'Audiophile-grade wireless headphones, active noise-canceling earbuds, and studio monitors.'],
                    ['locale' => 'km', 'name' => 'លូមីណា អូឌីយ៉ូ (Lumina Audio)', 'description' => 'កាសស្តាប់ត្រចៀកប៊្លូធូសឥតខ្សែ កាត់បន្ថយសំឡេងរំខាន និងឧបករណ៍បំពងសំឡេងគុណភាពខ្ពស់។'],
                ],
            ],
            [
                'name' => 'Terra Living',
                'slug' => 'terra-living',
                'logo_url' => 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=300&auto=format&fit=crop&q=80',
                'description' => 'Solid teak and Scandinavian inspired furniture, ergonomic desk setups, and sustainable home decor.',
                'country' => 'Cambodia',
                'website' => 'https://tyushop.blog/brands/terra-living',
                'sort_order' => 13,
                'seo_title' => 'Terra Living | Sustainable Teak Home Furniture',
                'seo_description' => 'Handcrafted sustainable wooden tables, ergonomic office chairs, and stylish decor.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Terra Living', 'description' => 'Solid teak and Scandinavian inspired furniture, ergonomic desk setups, and sustainable home decor.'],
                    ['locale' => 'km', 'name' => 'ថេរ៉ា លីវីង (Terra Living)', 'description' => 'គ្រឿងសង្ហារិមឈើប្រណិត តុធ្វើការត្រឹមត្រូវតាមកាយវិភាគវិទ្យា និងគ្រឿងតុបតែងផ្ទះ។'],
                ],
            ],
            [
                'name' => 'Botanica Care',
                'slug' => 'botanica-care',
                'logo_url' => 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80',
                'description' => 'Organic botanical skincare, clean cosmetics, and rejuvenating mineral sunscreens.',
                'country' => 'France',
                'website' => 'https://botanicacare.fr',
                'sort_order' => 14,
                'seo_title' => 'Botanica Care | Organic French Skincare & Clean Beauty',
                'seo_description' => '100% vegan, cruelty-free serums and organic French floral extracts for radiant skin.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'Botanica Care', 'description' => 'Organic botanical skincare, clean cosmetics, and rejuvenating mineral sunscreens.'],
                    ['locale' => 'km', 'name' => 'បូតានីកា ឃែរ (Botanica Care)', 'description' => 'ផលិតផលថែរក្សាស្បែកធម្មជាតិ គ្រឿងសម្អាងសរីរាង្គ និងឡេការពារកម្តៅថ្ងៃ។'],
                ],
            ],
            [
                'name' => 'KhmerCraft Heritage',
                'slug' => 'khmercraft-heritage',
                'logo_url' => 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80',
                'description' => 'Authentic handmade Cambodian crafts, traditional krama scarves, and hand-carved stone art.',
                'country' => 'Cambodia',
                'website' => 'https://tyushop.blog/brands/khmercraft',
                'sort_order' => 15,
                'seo_title' => 'KhmerCraft Heritage | Handcrafted Cambodian Art & Textiles',
                'seo_description' => 'Support local Cambodian artisans through handwoven silk kramas and intricate stonework.',
                'translations' => [
                    ['locale' => 'en', 'name' => 'KhmerCraft Heritage', 'description' => 'Authentic handmade Cambodian crafts, traditional krama scarves, and hand-carved stone art.'],
                    ['locale' => 'km', 'name' => 'ខ្មែរក្រាហ្វ បេតិកភណ្ឌ (KhmerCraft)', 'description' => 'សិប្បកម្មខ្មែរធ្វើដោយដៃពិតៗ ក្រមារខ្មែរ និងចម្លាក់ថ្មប្រពៃណីគាំទ្រសហគមន៍។'],
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
