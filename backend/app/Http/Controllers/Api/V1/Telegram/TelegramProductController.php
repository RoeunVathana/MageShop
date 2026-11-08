<?php

namespace App\Http\Controllers\Api\V1\Telegram;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramProductController extends Controller
{
    /**
     * Get products list with filters for Telegram Mini App.
     */
    public function index(Request $request): JsonResponse
    {
        $categorySlug = $request->query('category');
        $tab = $request->query('tab', 'all'); // all, featured, new, best_sellers, flash_sales
        $search = $request->query('search');
        $limit = min((int) $request->query('limit', 20), 50);

        $query = Product::with('category')->where('is_active', true);

        if (!empty($categorySlug) && $categorySlug !== 'all') {
            $cat = Category::where('slug', $categorySlug)
                ->orWhere('id', is_numeric($categorySlug) ? (int) $categorySlug : null)
                ->first();

            if ($cat) {
                $categoryIds = array_merge([$cat->id], $cat->getAllDescendantIds());
                $query->whereIn('category_id', $categoryIds);
            }
        }

        if (!empty($search)) {
            $searchLower = '%' . strtolower($search) . '%';
            $query->where(function ($q) use ($searchLower) {
                $q->whereRaw('LOWER(name) LIKE ?', [$searchLower])
                  ->orWhereRaw('LOWER(sku) LIKE ?', [$searchLower])
                  ->orWhereRaw('LOWER(brand) LIKE ?', [$searchLower])
                  ->orWhereRaw('LOWER(description) LIKE ?', [$searchLower]);
            });
        }

        // Handle section tabs
        switch ($tab) {
            case 'featured':
                $query->where('is_featured', true);
                break;
            case 'new':
                $query->where('is_new_arrival', true)->orderBy('created_at', 'desc');
                break;
            case 'best_sellers':
                $query->where('is_best_seller', true)->orderBy('reviews_count', 'desc');
                break;
            case 'flash_sales':
                $query->where('is_flash_sale', true);
                break;
            default:
                $query->orderByDesc('is_featured')->orderBy('created_at', 'desc');
                break;
        }

        $products = $query->paginate($limit);

        return response()->json([
            'status' => 'success',
            'data' => $products->items(),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    /**
     * Get single product details.
     */
    public function show(string $idOrSku): JsonResponse
    {
        $relations = [
            'category.parent',
            'variants.attributeValues.attribute',
            'variants.attributeValues.option',
            'attributeValues.attribute',
            'attributeValues.selectedOption',
        ];

        $product = is_numeric($idOrSku)
            ? Product::with($relations)->find($idOrSku)
            : Product::with($relations)->where('sku', strtoupper($idOrSku))->first();

        if (!$product) {
            return response()->json([
                'status' => 'error',
                'message' => 'Product not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $product,
        ]);
    }

    /**
     * Get active categories list.
     */
    public function categories(): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->withCount(['products' => function ($q) {
                $q->where('is_active', true);
            }])
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $categories,
        ]);
    }
}
