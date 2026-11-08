<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Brand\StoreBrandRequest;
use App\Http\Requests\Brand\UpdateBrandRequest;
use App\Http\Resources\BrandResource;
use App\Models\Brand;
use App\Services\Brand\BrandService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BrandController extends Controller
{
    public function __construct(protected BrandService $brandService) {}

    /**
     * List brands with pagination and search.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 20), 100);
        $filters = $request->query();

        // If not authenticated admin/staff, only show active brands
        $user = $request->user('sanctum');
        $isAdmin = $user && ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN') || $user->hasRole('PRODUCT_MANAGER') || $user->hasRole('STAFF'));

        if (! $isAdmin) {
            $filters['is_active'] = true;
            $filters['status'] = 'active';
        }

        $brands = $this->brandService->listBrands($filters, $perPage);

        return BrandResource::collection($brands);
    }

    /**
     * Show single brand with translations and product count.
     */
    public function show(Brand $brand): JsonResponse
    {
        $brand->load(['translations'])->loadCount('products');

        return response()->json([
            'status' => 'success',
            'data' => new BrandResource($brand),
        ]);
    }

    /**
     * Create new brand.
     */
    public function store(StoreBrandRequest $request): JsonResponse
    {
        $brand = $this->brandService->createBrand($request->validated());

        return (new BrandResource($brand))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update existing brand.
     */
    public function update(UpdateBrandRequest $request, Brand $brand): JsonResponse
    {
        $updated = $this->brandService->updateBrand($brand, $request->validated());

        return (new BrandResource($updated))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Safely archive brand.
     */
    public function destroy(Request $request, Brand $brand): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN'))) {
            abort(403, 'Unauthorized. Administrator privileges required to archive brands.');
        }

        $archived = $this->brandService->archiveBrand($brand);

        return response()->json([
            'status' => 'success',
            'message' => "Brand '{$archived->name}' has been safely archived.",
            'data' => new BrandResource($archived),
        ]);
    }
}
