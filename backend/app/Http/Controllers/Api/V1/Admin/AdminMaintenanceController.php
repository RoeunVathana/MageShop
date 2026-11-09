<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AdminMaintenanceController extends Controller
{
    /**
     * Authorize super admin / owner.
     */
    protected function authorizeAdmin(Request $request): void
    {
        $user = Auth::guard('web')->user() ?? $request->user('sanctum') ?? $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated. Administrator session required.');
        }

        $email = strtolower((string) ($user->email ?? ''));
        $isOwner = in_array($email, ['vothanarern@gmail.com'], true) ||
                   str_ends_with($email, '@megacommerce.local') ||
                   str_contains($email, 'admin');

        if (! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN') || $isOwner)) {
            abort(403, 'Unauthorized. Super administrator privileges required.');
        }
    }

    /**
     * Run all seeders forcefully on the remote database.
     */
    public function seedAll(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        // Allow resetting seeder_runs history so all runOnce seeders execute
        $resetHistory = $request->boolean('reset_history', true);
        if ($resetHistory && Schema::hasTable('seeder_runs')) {
            DB::table('seeder_runs')->truncate();
        }

        // Set FORCE_RESEED environment variable in current process
        putenv('FORCE_RESEED=true');
        $_ENV['FORCE_RESEED'] = 'true';
        $_SERVER['FORCE_RESEED'] = 'true';

        $output = [];
        $startTime = microtime(true);

        try {
            // 1. Run migrations in case any are pending
            Artisan::call('migrate', ['--force' => true]);
            $output[] = trim(Artisan::output());

            // 2. Run DatabaseSeeder
            Artisan::call('db:seed', ['--force' => true]);
            $output[] = trim(Artisan::output());

            // 3. Clear application caches so updated seeded data is immediately live
            Artisan::call('optimize:clear');
            $output[] = trim(Artisan::output());

            Cache::flush();

            $duration = round(microtime(true) - $startTime, 2);

            Log::info("Remote seeder all executed successfully in {$duration}s by " . ($request->user()?->email ?? 'admin'));

            // Gather summary counts of seeded data
            $counts = [
                'users' => DB::table('users')->count(),
                'products' => DB::table('products')->count(),
                'categories' => DB::table('categories')->count(),
                'brands' => DB::table('brands')->count(),
                'banners' => Schema::hasTable('banners') ? DB::table('banners')->count() : 0,
                'coupons' => Schema::hasTable('coupons') ? DB::table('coupons')->count() : 0,
                'roles' => Schema::hasTable('roles') ? DB::table('roles')->count() : 0,
                'permissions' => Schema::hasTable('permissions') ? DB::table('permissions')->count() : 0,
                'store_settings' => Schema::hasTable('store_settings') ? DB::table('store_settings')->count() : 0,
            ];

            return response()->json([
                'status' => 'success',
                'message' => 'Remote database seeded completely with all seeders.',
                'duration_seconds' => $duration,
                'summary_counts' => $counts,
                'console_output' => array_filter($output),
            ], 200);

        } catch (\Throwable $e) {
            Log::error("Remote seeder failed: " . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Remote database seeding failed: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    }
}
