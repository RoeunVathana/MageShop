<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\StoreCategoryAttributeRequest;
use App\Http\Requests\Category\UpdateCategoryAttributeRequest;
use App\Http\Resources\CategoryAttributeResource;
use App\Models\Category;
use App\Models\CategoryAttribute;
use App\Services\Category\CategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoryAttributeController extends Controller
{
    public function __construct(protected CategoryService $categoryService)
    {
    }

    /**
     * List all configurable attributes for a specific category.
     */
    public function index(Category $category): AnonymousResourceCollection
    {
        $attributes = $category->attributes()->with('options')->get();

        return CategoryAttributeResource::collection($attributes);
    }

    /**
     * Add a new attribute to a category.
     */
    public function store(StoreCategoryAttributeRequest $request, Category $category): JsonResponse
    {
        $attribute = $this->categoryService->addAttribute($category, $request->validated());

        return (new CategoryAttributeResource($attribute))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update an attribute definition.
     */
    public function update(UpdateCategoryAttributeRequest $request, CategoryAttribute $attribute): JsonResponse
    {
        $updated = $this->categoryService->updateAttribute($attribute, $request->validated());

        return (new CategoryAttributeResource($updated))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Delete an attribute definition.
     */
    public function destroy(Request $request, CategoryAttribute $attribute): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->hasRole('SUPER_ADMIN') && !$user->hasRole('ADMIN') && !$user->hasRole('PRODUCT_MANAGER'))) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized to remove category attributes.',
            ], 403);
        }

        $attribute->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Attribute '{$attribute->name}' removed successfully.",
        ]);
    }
}

