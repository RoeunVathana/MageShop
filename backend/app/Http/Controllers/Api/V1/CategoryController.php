<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Http\Requests\Category\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\Category\CategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use InvalidArgumentException;

class CategoryController extends Controller
{
    protected CategoryService $categoryService;

    public function __construct(CategoryService $categoryService)
    {
        $this->categoryService = $categoryService;
    }

    /**
     * List categories with optional hierarchy nesting and search filtering.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $isTree = filter_var($request->query('tree', false), FILTER_VALIDATE_BOOLEAN);
        $categories = $this->categoryService->listCategories($request->query(), $isTree);

        return CategoryResource::collection($categories);
    }

    /**
     * Display the specified category by ID or slug.
     */
    public function show(string $idOrSlug): CategoryResource
    {
        $category = $this->categoryService->getCategory($idOrSlug);

        return new CategoryResource($category);
    }

    /**
     * Store a newly created category.
     */
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        try {
            $category = $this->categoryService->createCategory($request->validated());

            return (new CategoryResource($category))
                ->response()
                ->setStatusCode(201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Update an existing category with hierarchy loop protection.
     */
    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        try {
            $updated = $this->categoryService->updateCategory($category, $request->validated());

            return (new CategoryResource($updated))
                ->response()
                ->setStatusCode(200);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Safely delete a category and reassign child relations.
     */
    public function destroy(Request $request, Category $category): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();
        if ($user && (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN'))) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized to delete platform categories.',
            ], 403);
        }

        $this->categoryService->deleteCategory($category);

        return response()->json([
            'status' => 'success',
            'message' => "Category '{$category->name}' has been deleted successfully.",
        ]);
    }
}
