<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\Product\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    /**
     * List products with pagination and search.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 15), 100);
        $filters = $request->query();
        $user = $request->user('sanctum') ?? $request->user();
        if ($user && $user->hasRole(['SELLER', 'SELLER_STAFF']) && ! $user->hasRole(['SUPER_ADMIN', 'ADMIN'])) {
            $filters['seller_id'] = $user->id;
        }
        $products = $this->productService->listProducts($filters, $perPage);

        return ProductResource::collection($products);
    }

    /**
     * Store a newly created product.
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        try {
            $user = $request->user();
            $product = $this->productService->createProduct($request->validated(), $user ? $user->id : null);

            return (new ProductResource($product))
                ->response()
                ->setStatusCode(201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Display the specified product.
     */
    public function show(Product $product): ProductResource
    {
        $product->load([
            'category.parent',
            'categories',
            'brandRecord',
            'inventory',
            'variants.attributeValues.attribute',
            'variants.attributeValues.option',
            'variants.inventory',
            'attributeValues.attribute',
            'attributeValues.selectedOption',
        ]);

        return new ProductResource($product);
    }

    /**
     * Update the specified product.
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        try {
            $updated = $this->productService->updateProduct($product, $request->validated());

            return (new ProductResource($updated))
                ->response()
                ->setStatusCode(200);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Safely archive product instead of permanent deletion.
     */
    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        $this->productService->archiveProduct($product);

        return response()->json([
            'status' => 'success',
            'message' => "Product '{$product->name}' ({$product->sku}) has been safely archived.",
            'data' => new ProductResource($product),
        ]);
    }
}
