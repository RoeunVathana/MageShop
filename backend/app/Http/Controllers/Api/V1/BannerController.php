<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BannerController extends Controller
{
    /**
     * Get active banners for public storefront display.
     */
    public function index(Request $request): JsonResponse
    {
        $placement = $request->input('placement', 'hero');

        $banners = Banner::active()
            ->forPlacement($placement)
            ->ordered()
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $banners,
        ]);
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
