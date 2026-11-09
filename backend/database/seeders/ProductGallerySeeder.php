<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductGallerySeeder extends Seeder
{
    /**
     * Enrich existing catalog products with multi-image gallery slides
     * so the storefront interactive gallery slider and thumbnails are immediately populated.
     */
    public function run(): void
    {
        $galleryCatalog = [
            'apple-macbook-pro-16-m3-max' => [
                'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1200&q=80',
            ],
            'sony-wh-1000xm5-wireless-headphones' => [
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80',
            ],
            'samsung-galaxy-s24-ultra-512gb' => [
                'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=1200&q=80',
            ],
            'apple-watch-ultra-2-titanium' => [
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=1200&q=80',
            ],
            'dji-mini-4-pro-drone-rc2' => [
                'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1200&q=80',
            ],
            'nike-air-zoom-alphafly-next-2' => [
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1200&q=80',
            ],
            'anker-powerline-iii-usbc-cable' => [
                'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1609592807908-1e434850fa91?auto=format&fit=crop&w=1200&q=80',
            ],
            'jbl-go-3-portable-bluetooth-speaker' => [
                'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80',
            ],
            'xiaomi-mi-wireless-silent-mouse' => [
                'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=1200&q=80',
            ],
            'megabasics-stainless-travel-tumbler' => [
                'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?auto=format&fit=crop&w=1200&q=80',
            ],
        ];

        foreach ($galleryCatalog as $slug => $images) {
            $product = Product::where('slug', $slug)->first();
            if ($product) {
                $product->update([
                    'gallery_urls' => $images,
                    'image_url' => $images[0],
                    'status' => 'active',
                    'is_active' => true,
                ]);
            }
        }

        // Also ensure any other remaining products in the catalog are active and have gallery_urls
        Product::all()->each(function (Product $p) {
            $gallery = $p->gallery_urls;
            if (empty($gallery) && !empty($p->image_url)) {
                $gallery = [$p->image_url];
            }
            $p->update([
                'status' => 'active',
                'is_active' => true,
                'gallery_urls' => $gallery,
            ]);
        });
    }
}
