<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Services\Security\SecurityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminBannerController extends Controller
{
    /**
     * Authorize administrator access.
     */
    protected function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN'))) {
            abort(403, 'Unauthorized. Administrator banner management privileges required.');
        }
    }

    /**
     * List all banners (including inactive and scheduled) for admin management.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = Banner::query()->ordered();

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                    ->orWhere('subtitle', 'ilike', "%{$search}%")
                    ->orWhere('badge_text', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('placement')) {
            $query->where('placement', $request->input('placement'));
        }

        if ($request->filled('status')) {
            $status = $request->input('status');
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 20)));
        $banners = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $banners->items(),
            'meta' => [
                'total' => $banners->total(),
                'current_page' => $banners->currentPage(),
                'last_page' => $banners->lastPage(),
                'per_page' => $banners->perPage(),
            ],
        ]);
    }

    /**
     * Create a new slide banner.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:1000'],
            'badge_text' => ['nullable', 'string', 'max:100'],
            'image_url' => ['nullable', 'string', 'max:2000'],
            'video_url' => ['nullable', 'string', 'max:2000'],
            'link_url' => ['nullable', 'string', 'max:2000'],
            'button_text' => ['nullable', 'string', 'max:100'],
            'background_style' => ['nullable', 'string', 'max:50'],
            'placement' => ['nullable', 'string', 'in:hero,promo,category,sidebar'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'start_at' => ['nullable', 'date'],
            'end_at' => ['nullable', 'date'],
        ]);

        if (! isset($validated['sort_order'])) {
            $maxOrder = Banner::where('placement', $validated['placement'] ?? 'hero')->max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        }

        $banner = Banner::create($validated);

        SecurityLogService::log('ADMIN_BANNER_CREATED', $request->user()->id, [
            'banner_id' => $banner->id,
            'title' => $banner->title,
            'placement' => $banner->placement,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Slide banner created successfully.',
            'data' => $banner,
        ], 201);
    }

    /**
     * Show single banner.
     */
    public function show(Request $request, Banner $banner): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'status' => 'success',
            'data' => $banner,
        ]);
    }

    /**
     * Update an existing banner.
     */
    public function update(Request $request, Banner $banner): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:1000'],
            'badge_text' => ['nullable', 'string', 'max:100'],
            'image_url' => ['nullable', 'string', 'max:2000'],
            'video_url' => ['nullable', 'string', 'max:2000'],
            'link_url' => ['nullable', 'string', 'max:2000'],
            'button_text' => ['nullable', 'string', 'max:100'],
            'background_style' => ['nullable', 'string', 'max:50'],
            'placement' => ['sometimes', 'required', 'string', 'in:hero,promo,category,sidebar'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'start_at' => ['nullable', 'date'],
            'end_at' => ['nullable', 'date'],
        ]);

        $banner->update($validated);

        SecurityLogService::log('ADMIN_BANNER_UPDATED', $request->user()->id, [
            'banner_id' => $banner->id,
            'title' => $banner->title,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Slide banner updated successfully.',
            'data' => $banner,
        ]);
    }

    /**
     * Delete a banner.
     */
    public function destroy(Request $request, Banner $banner): JsonResponse
    {
        $this->authorizeAdmin($request);

        $title = $banner->title;
        $id = $banner->id;
        $banner->delete();

        SecurityLogService::log('ADMIN_BANNER_DELETED', $request->user()->id, [
            'banner_id' => $id,
            'title' => $title,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Slide banner '{$title}' deleted successfully.",
        ]);
    }

    /**
     * Toggle active state of a banner.
     */
    public function toggleActive(Request $request, Banner $banner): JsonResponse
    {
        $this->authorizeAdmin($request);

        $banner->is_active = ! $banner->is_active;
        $banner->save();

        SecurityLogService::log('ADMIN_BANNER_TOGGLED', $request->user()->id, [
            'banner_id' => $banner->id,
            'is_active' => $banner->is_active,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Slide banner is now '.($banner->is_active ? 'active' : 'inactive').'.',
            'data' => $banner,
        ]);
    }

    /**
     * Reorder banners.
     */
    public function reorder(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'exists:banners,id'],
            'items.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['items'] as $item) {
                Banner::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
            }
        });

        SecurityLogService::log('ADMIN_BANNERS_REORDERED', $request->user()->id, [
            'count' => count($validated['items']),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Banner display order updated successfully.',
            'data' => Banner::ordered()->get(),
        ]);
    }
}
