<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BannerController extends Controller
{
    /**
     * Get active banners for public storefront display.
     */
    public function index(Request $request): JsonResponse
    {
        $placement = $request->input('placement', 'hero');

        try {
            $banners = Cache::store('redis')->remember(
                'catalog:banners:'.sha1($placement),
                now()->addMinutes(2),
                fn () => Banner::active()
                    ->forPlacement($placement)
                    ->ordered()
                    ->get()
            );
        } catch (\Throwable) {
            $banners = Banner::active()
                ->forPlacement($placement)
                ->ordered()
                ->get();
        }

        return response()->json([
            'status' => 'success',
            'data' => $banners,
        ])->header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    }

    /**
     * Get single banner details.
     */
    public function show(Banner $banner): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $banner,
        ]);
    }

    /**
     * Record a click on a banner.
     */
    public function click(Banner $banner): JsonResponse
    {
        $banner->increment('clicks_count');

        return response()->json([
            'status' => 'success',
            'message' => 'Click tracked.',
            'clicks_count' => $banner->clicks_count,
        ]);
    }
}
