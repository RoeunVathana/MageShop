<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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
        // The database probe can be expensive on Railway when the pooler or
        // database is waking up. Health detail consumers do not need a fresh
        // SQL round-trip on every poll, so serve a short-lived cached result.
        // The basic /health endpoint remains an immediate process check.
        $cacheKey = 'health:readiness:v2';

        if (! app()->environment('testing')) {
            try {
                $cached = Cache::store('redis')->get($cacheKey);
                if (is_array($cached) && isset($cached['status_code'], $cached['payload'])) {
                    return response()->json($cached['payload'], (int) $cached['status_code']);
                }
            } catch (Throwable) {
                // Fall through to a live probe when Redis is unavailable.
            }
        }

        [$payload, $statusCode] = $this->buildReadinessPayload();

        if (! app()->environment('testing')) {
            try {
                Cache::store('redis')->put(
                    $cacheKey,
                    [
                        'status_code' => $statusCode,
                        'payload' => $payload,
                    ],
                    now()->addSeconds($statusCode === 200 ? 60 : 5)
                );
            } catch (Throwable) {
                // Health checks must still work without cache storage.
            }
        }

        return response()->json($payload, $statusCode);
    }

    /**
     * Run the database, Redis, and storage probes used by readiness().
     *
     * @return array{0: array<string, mixed>, 1: int}
     */
    private function buildReadinessPayload(): array
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

        $payload = [
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
        ];

        return [$payload, $isHealthy ? 200 : 503];
    }
}
