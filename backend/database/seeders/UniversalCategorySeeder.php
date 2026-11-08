<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\CategoryAttribute;
use App\Models\CategoryAttributeOption;
use App\Models\Product;
use App\Models\ProductAttributeValue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UniversalCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categoriesData = [
            [
                'name' => 'Electronics & Computers',
                'slug' => 'electronics-computers',
                'icon' => 'Laptop',
                'description' => 'Laptops, desktop PCs, PC parts, monitors, and computer accessories.',
                'sort_order' => 1,
                'subcategories' => [
                    ['name' => 'Laptops & Ultrabooks', 'slug' => 'laptops-ultrabooks', 'icon' => 'Laptop', 'description' => 'Flagship performance, thin & light, and creator notebooks'],
                    ['name' => 'Computer Components', 'slug' => 'computer-components', 'icon' => 'Cpu', 'description' => 'CPUs, GPUs, motherboards, RAM, and internal SSDs'],
                    ['name' => 'Audio & Headphones', 'slug' => 'audio-headphones', 'icon' => 'Headphones', 'description' => 'Studio acoustics, wireless earbuds, and soundbars'],
                ],
            ],
            [
                'name' => 'Mobile Phones & Accessories',
                'slug' => 'mobile-phones-accessories',
                'icon' => 'Smartphone',
                'description' => 'Smartphones, tablets, phone cases, fast chargers, and smart wearables.',
                'sort_order' => 2,
                'subcategories' => [
                    ['name' => 'Smartphones', 'slug' => 'smartphones', 'icon' => 'Smartphone', 'description' => 'Flagship iOS and Android mobile phones'],
                    ['name' => 'Tablets & e-Readers', 'slug' => 'tablets-ereaders', 'icon' => 'Tablet', 'description' => 'Productivity tablets, iPads, and digital readers'],
                    ['name' => 'Smartwatches & Bands', 'slug' => 'smartwatches-bands', 'icon' => 'Watch', 'description' => 'GPS sports trackers and health watches'],
                ],
            ],
            [
                'name' => 'Fashion & Clothing',
                'slug' => 'fashion-clothing',
                'icon' => 'Shirt',
                'description' => 'Men\'s, women\'s, and kids\' apparel, casual wear, and formal outfits.',
                'sort_order' => 3,
                'subcategories' => [
                    ['name' => 'Men\'s Fashion', 'slug' => 'mens-fashion', 'icon' => 'Shirt', 'description' => 'Men\'s shirts, pants, jackets, and sportswear'],
                    ['name' => 'Women\'s Fashion', 'slug' => 'womens-fashion', 'icon' => 'Sparkles', 'description' => 'Dresses, blouses, skirts, and activewear'],
                ],
            ],
            [
                'name' => 'Shoes & Bags',
                'slug' => 'shoes-bags',
                'icon' => 'Footprints',
                'description' => 'Running shoes, casual sneakers, leather boots, backpacks, and luxury handbags.',
                'sort_order' => 4,
            ],
            [
                'name' => 'Beauty & Personal Care',
                'slug' => 'beauty-personal-care',
                'icon' => 'Sparkles',
                'description' => 'Skincare, fragrances, makeup, hair care, and grooming essentials.',
                'sort_order' => 5,
            ],
            [
                'name' => 'Health & Wellness',
                'slug' => 'health-wellness',
                'icon' => 'HeartPulse',
                'description' => 'Vitamins, supplements, fitness gear, medical monitors, and wellness tea.',
                'sort_order' => 6,
            ],
            [
                'name' => 'Home & Living',
                'slug' => 'home-living',
                'icon' => 'Home',
                'description' => 'Home decor, bedsheets, smart lighting, curtains, and air purifiers.',
                'sort_order' => 7,
            ],
            [
                'name' => 'Furniture',
                'slug' => 'furniture',
                'icon' => 'Armchair',
                'description' => 'Sofas, ergonomic office chairs, dining tables, beds, and storage cabinets.',
                'sort_order' => 8,
            ],
            [
                'name' => 'Kitchen & Dining',
                'slug' => 'kitchen-dining',
                'icon' => 'Utensils',
                'description' => 'Cookware sets, blenders, espresso machines, dinnerware, and cutlery.',
                'sort_order' => 9,
            ],
            [
                'name' => 'Groceries & Food',
                'slug' => 'groceries-food',
                'icon' => 'Apple',
                'description' => 'Fresh produce, beverages, organic snacks, pantry essentials, and coffee beans.',
                'sort_order' => 10,
            ],
            [
                'name' => 'Baby & Kids',
                'slug' => 'baby-kids',
                'icon' => 'Baby',
                'description' => 'Baby strollers, car seats, infant nutrition, baby care, and nursery items.',
                'sort_order' => 11,
            ],
            [
                'name' => 'Toys & Games',
                'slug' => 'toys-games',
                'icon' => 'Gamepad2',
                'description' => 'Board games, Lego & building sets, gaming consoles, action figures, and puzzles.',
                'sort_order' => 12,
            ],
            [
                'name' => 'Sports & Outdoors',
                'slug' => 'sports-outdoors',
                'icon' => 'Trophy',
                'description' => 'Gym equipment, camping tents, hiking boots, cycling gear, and swimsuits.',
                'sort_order' => 13,
            ],
            [
                'name' => 'Automotive Accessories',
                'slug' => 'automotive-accessories',
                'icon' => 'Car',
                'description' => 'Dash cameras, car chargers, interior organizers, detailing waxes, and helmets.',
                'sort_order' => 14,
            ],
            [
                'name' => 'Books & Stationery',
                'slug' => 'books-stationery',
                'icon' => 'BookOpen',
                'description' => 'Bestselling novels, educational textbooks, journals, luxury pens, and art supplies.',
                'sort_order' => 15,
            ],
            [
                'name' => 'Office Supplies',
                'slug' => 'office-supplies',
                'icon' => 'Briefcase',
                'description' => 'Paper, printers, shredders, filing cabinets, and office stationery.',
                'sort_order' => 16,
            ],
            [
                'name' => 'Pet Supplies',
                'slug' => 'pet-supplies',
                'icon' => 'Dog',
                'description' => 'Cat and dog food, grooming tools, scratching posts, toys, and pet beds.',
                'sort_order' => 17,
            ],
            [
                'name' => 'Garden & Outdoor',
                'slug' => 'garden-outdoor',
                'icon' => 'Flower2',
                'description' => 'Planters, outdoor lighting, gardening shears, hoses, and BBQ grills.',
                'sort_order' => 18,
            ],
            [
                'name' => 'Tools & Home Improvement',
                'slug' => 'tools-home-improvement',
                'icon' => 'Wrench',
                'description' => 'Power drills, hardware toolkits, safety gloves, ladders, and plumbing supplies.',
                'sort_order' => 19,
            ],
            [
                'name' => 'Jewelry & Watches',
                'slug' => 'jewelry-watches',
                'icon' => 'Watch',
                'description' => 'Precious necklaces, rings, earrings, luxury chronographs, and bracelets.',
                'sort_order' => 20,
            ],
            [
                'name' => 'Digital Products',
                'slug' => 'digital-products',
                'icon' => 'Binary',
                'description' => 'Software licenses, online courses, digital gift cards, and eBooks.',
                'sort_order' => 21,
            ],
            [
                'name' => 'Handmade Products',
                'slug' => 'handmade-products',
                'icon' => 'Palette',
                'description' => 'Artisanal crafts, woven textiles, handmade pottery, and local souvenirs.',
                'sort_order' => 22,
            ],
            [
                'name' => 'Gifts & Flowers',
                'slug' => 'gifts-flowers',
                'icon' => 'Gift',
                'description' => 'Fresh floral bouquets, festive gift hampers, customized greeting cards.',
                'sort_order' => 23,
            ],
            [
                'name' => 'Musical Instruments',
                'slug' => 'musical-instruments',
                'icon' => 'Music',
                'description' => 'Acoustic guitars, digital pianos, violins, drums, and DJ audio controllers.',
                'sort_order' => 24,
            ],
            [
                'name' => 'Travel Accessories',
                'slug' => 'travel-accessories',
                'icon' => 'Luggage',
                'description' => 'Hard-shell suitcases, passport covers, neck pillows, and universal travel adapters.',
                'sort_order' => 25,
            ],
            [
                'name' => 'Other Products',
                'slug' => 'other-products',
                'icon' => 'Package',
                'description' => 'General merchandise, seasonal seasonal items, and novelties.',
                'sort_order' => 26,
            ],
        ];

        $createdCategories = [];

        foreach ($categoriesData as $catData) {
            $subcategories = $catData['subcategories'] ?? [];
            unset($catData['subcategories']);

            $catData['is_active'] = true;
            $catData['seo_title'] = "Buy {$catData['name']} Online | MegaCommerce";
            $catData['seo_description'] = "Explore the widest selection of {$catData['name']} at MegaCommerce Flagship Store.";

            $category = Category::updateOrCreate(
                ['slug' => $catData['slug']],
                $catData
            );
            $createdCategories[$category->slug] = $category;

            // Seed subcategories
            foreach ($subcategories as $sub) {
                $sub['parent_id'] = $category->id;
                $sub['is_active'] = true;
                $sub['seo_title'] = "Buy {$sub['name']} Online | MegaCommerce";
                $sub['seo_description'] = "Shop top quality {$sub['name']} with fast delivery.";

                $subCat = Category::updateOrCreate(
                    ['slug' => $sub['slug']],
                    $sub
                );
                $createdCategories[$subCat->slug] = $subCat;
            }
        }

        // 2. Seed Configurable Category Attributes
        $this->seedFashionAttributes($createdCategories['fashion-clothing'] ?? null);
        $this->seedElectronicsAttributes($createdCategories['electronics-computers'] ?? null);
        $this->seedFurnitureAttributes($createdCategories['furniture'] ?? null);
        $this->seedGroceryAttributes($createdCategories['groceries-food'] ?? null);
        $this->seedBookAttributes($createdCategories['books-stationery'] ?? null);

        // 3. Migrate existing flagship products to structured attributes and categories
        $this->migrateExistingProducts($createdCategories);
    }

    protected function seedFashionAttributes(?Category $category): void
    {
        if (!$category) return;

        // Size
        $sizeAttr = CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'size'],
            [
                'name' => 'Clothing Size',
                'type' => 'select',
                'is_required' => true,
                'is_filterable' => true,
                'is_variant_option' => true,
                'sort_order' => 1,
            ]
        );
        foreach (['XS', 'S', 'M', 'L', 'XL', 'XXL'] as $idx => $size) {
            CategoryAttributeOption::firstOrCreate(
                ['category_attribute_id' => $sizeAttr->id, 'value' => $size],
                ['label' => $size, 'sort_order' => $idx + 1]
            );
        }

        // Color
        $colorAttr = CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'color'],
            [
                'name' => 'Color',
                'type' => 'select',
                'is_required' => true,
                'is_filterable' => true,
                'is_variant_option' => true,
                'sort_order' => 2,
            ]
        );
        foreach (['Black', 'White', 'Navy Blue', 'Red', 'Heather Gray', 'Olive Green'] as $idx => $color) {
            CategoryAttributeOption::firstOrCreate(
                ['category_attribute_id' => $colorAttr->id, 'value' => Str::slug($color)],
                ['label' => $color, 'sort_order' => $idx + 1]
            );
        }

        // Material
        CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'material'],
            [
                'name' => 'Material Fabric',
                'type' => 'text',
                'is_required' => false,
                'is_filterable' => true,
                'is_variant_option' => false,
                'sort_order' => 3,
            ]
        );
    }

    protected function seedElectronicsAttributes(?Category $category): void
    {
        if (!$category) return;

        // Brand
        CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'brand'],
            [
                'name' => 'Brand Name',
                'type' => 'text',
                'is_required' => true,
                'is_filterable' => true,
                'is_variant_option' => false,
                'sort_order' => 1,
            ]
        );

        // RAM Memory
        $ramAttr = CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'ram'],
            [
                'name' => 'RAM Capacity',
                'type' => 'select',
                'is_required' => false,
                'is_filterable' => true,
                'is_variant_option' => true,
                'sort_order' => 2,
            ]
        );
        foreach (['8GB', '16GB', '32GB', '36GB', '64GB', '128GB'] as $idx => $ram) {
            CategoryAttributeOption::firstOrCreate(
                ['category_attribute_id' => $ramAttr->id, 'value' => $ram],
                ['label' => $ram, 'sort_order' => $idx + 1]
            );
        }

        // Storage
        $storageAttr = CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'storage'],
            [
                'name' => 'Internal Storage',
                'type' => 'select',
                'is_required' => false,
                'is_filterable' => true,
                'is_variant_option' => true,
                'sort_order' => 3,
            ]
        );
        foreach (['256GB SSD', '512GB SSD', '1TB NVMe', '2TB NVMe'] as $idx => $storage) {
            CategoryAttributeOption::firstOrCreate(
                ['category_attribute_id' => $storageAttr->id, 'value' => $storage],
                ['label' => $storage, 'sort_order' => $idx + 1]
            );
        }

        // Processor
        CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'processor'],
            [
                'name' => 'Processor CPU',
                'type' => 'text',
                'is_required' => false,
                'is_filterable' => true,
                'is_variant_option' => false,
                'sort_order' => 4,
            ]
        );
    }

    protected function seedFurnitureAttributes(?Category $category): void
    {
        if (!$category) return;

        CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'material'],
            [
                'name' => 'Primary Material',
                'type' => 'text',
                'is_required' => false,
                'is_filterable' => true,
                'sort_order' => 1,
            ]
        );

        CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'dimensions'],
            [
                'name' => 'Dimensions (W x H x L)',
                'type' => 'text',
                'is_required' => false,
                'sort_order' => 2,
            ]
        );

        CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'assembly_required'],
            [
                'name' => 'Assembly Required',
                'type' => 'boolean',
                'is_required' => false,
                'sort_order' => 3,
            ]
        );
    }

    protected function seedGroceryAttributes(?Category $category): void
    {
        if (!$category) return;

        CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'net_weight'],
            [
                'name' => 'Net Weight',
                'type' => 'text',
                'is_required' => false,
                'sort_order' => 1,
            ]
        );

        CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'expiration_date'],
            [
                'name' => 'Expiration Date',
                'type' => 'date',
                'is_required' => false,
                'sort_order' => 2,
            ]
        );
    }

    protected function seedBookAttributes(?Category $category): void
    {
        if (!$category) return;

        CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'author'],
            [
                'name' => 'Author',
                'type' => 'text',
                'is_required' => true,
                'is_filterable' => true,
                'sort_order' => 1,
            ]
        );

        CategoryAttribute::updateOrCreate(
            ['category_id' => $category->id, 'code' => 'isbn'],
            [
                'name' => 'ISBN Number',
                'type' => 'text',
                'is_required' => false,
                'sort_order' => 2,
            ]
        );
    }

    protected function migrateExistingProducts(array $categories): void
    {
        // Link existing products to the universal categories
        $macbook = Product::where('sku', 'LAP-MBP-016')->first();
        if ($macbook && isset($categories['laptops-ultrabooks'])) {
            $macbook->update([
                'category_id' => $categories['laptops-ultrabooks']->id,
                'brand' => 'Apple',
                'product_type' => 'simple',
            ]);
        }

        $headphones = Product::where('sku', 'AUD-SNY-XM5')->first();
        if ($headphones && isset($categories['audio-headphones'])) {
            $headphones->update([
                'category_id' => $categories['audio-headphones']->id,
                'brand' => 'Sony',
                'product_type' => 'simple',
            ]);
        }

        $s24 = Product::where('sku', 'PHN-SMS-S24')->first();
        if ($s24 && isset($categories['smartphones'])) {
            $s24->update([
                'category_id' => $categories['smartphones']->id,
                'brand' => 'Samsung',
                'product_type' => 'simple',
            ]);
        }

        $watch = Product::where('sku', 'WAT-APL-ULT2')->first();
        if ($watch && isset($categories['smartwatches-bands'])) {
            $watch->update([
                'category_id' => $categories['smartwatches-bands']->id,
                'brand' => 'Apple',
                'product_type' => 'simple',
            ]);
        }

        $shoes = Product::where('sku', 'FSH-NKE-ALP2')->first();
        if ($shoes && isset($categories['shoes-bags'])) {
            $shoes->update([
                'category_id' => $categories['shoes-bags']->id,
                'brand' => 'Nike',
                'product_type' => 'simple',
            ]);
        }
    }
}

