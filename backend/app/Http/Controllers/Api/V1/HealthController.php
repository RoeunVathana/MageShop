<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Throwable;

class HealthController extends Controller
{
    /**
     * Basic application health check.
     */
    public function index(Request $request): JsonResponse
    {
        // When detailed view is requested
        if ($request->boolean('details') || $request->has('detailed')) {
            return $this->readiness();
        }

        return response()->json([
            'status' => 'ok',
            'application' => 'MegaCommerce API',
        ], 200);
    }

    /**
     * Detailed dependency readiness check.
     */
    public function readiness(): JsonResponse
    {
        $dbStatus = 'healthy';
        $dbLatency = 0;
        $dbError = null;

        $startTime = microtime(true);
        try {
            DB::connection()->getPdo();
            DB::select('SELECT 1');
            $dbLatency = round((microtime(true) - $startTime) * 1000, 2);
        } catch (Throwable $e) {
            $dbStatus = 'unhealthy';
            $dbError = $e->getMessage();
        }

        $redisStatus = 'healthy';
        $redisLatency = 0;
        $redisError = null;

        $rStartTime = microtime(true);
        try {
            Redis::connection()->ping();
            $redisLatency = round((microtime(true) - $rStartTime) * 1000, 2);
        } catch (Throwable $e) {
            $redisStatus = 'skipped_or_idle';
            $redisError = 'Redis optional in phase 1 local fallback';
        }

        $isHealthy = $dbStatus === 'healthy';

        return response()->json([
            'status' => $isHealthy ? 'ok' : 'degraded',
            'application' => 'MegaCommerce API',
            'version' => '1.0.0-phase1',
            'timestamp' => now()->toIso8601String(),
            'dependencies' => [
                'database' => [
                    'driver' => config('database.default'),
                    'status' => $dbStatus,
                    'latency_ms' => $dbLatency,
                    'error' => $dbError,
                ],
                'redis' => [
                    'status' => $redisStatus,
                    'latency_ms' => $redisLatency,
                    'message' => $redisError,
                ],
                'storage' => [
                    'status' => is_writable(storage_path()) ? 'healthy' : 'unwritable',
                ],
            ],
        ], $isHealthy ? 200 : 503);
    }
}

