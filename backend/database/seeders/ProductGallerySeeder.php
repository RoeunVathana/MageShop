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
        ];

        foreach ($galleryCatalog as $slug => $images) {
            $product = Product::where('slug', $slug)->first();
            if ($product) {
                // If product doesn't have gallery_urls yet, or has fewer than 2 images
                if (empty($product->gallery_urls) || count($product->gallery_urls) < 2) {
                    $product->update([
                        'gallery_urls' => $images,
                        'image_url' => $images[0],
                    ]);
                }
            }
        }

        // Also for any remaining products in the catalog without a gallery, ensure gallery_urls has at least their cover
        Product::whereNull('gallery_urls')
            ->whereNotNull('image_url')
            ->each(function (Product $p) {
                $p->update(['gallery_urls' => [$p->image_url]]);
            });
    }
}
