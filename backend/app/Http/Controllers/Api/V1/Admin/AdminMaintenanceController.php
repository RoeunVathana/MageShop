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

        if (! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN'))) {
            abort(403, 'Unauthorized. Super administrator privileges required.');
        }
    }

    /**
     * Run all seeders forcefully on the remote database.
     */
    public function seedAll(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        if (! filter_var(env('ALLOW_REMOTE_SEEDING', false), FILTER_VALIDATE_BOOLEAN)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Remote seeding is disabled. Enable ALLOW_REMOTE_SEEDING only for a controlled maintenance window.',
            ], 403);
        }

        // Allow resetting seeder_runs history so all runOnce seeders execute
        $resetHistory = $request->boolean('reset_history', false);
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

            // 3. Guarantee all catalog products, categories, and brands are active & visible in storefront
            if (Schema::hasTable('products')) {
                DB::table('products')->update([
                    'status' => 'active',
                    'is_active' => true,
                ]);
            }
            if (Schema::hasTable('categories')) {
                DB::table('categories')->update([
                    'is_active' => true,
                ]);
            }
            if (Schema::hasTable('brands')) {
                DB::table('brands')->update([
                    'is_active' => true,
                ]);
            }

            // 4. Clear application caches so updated seeded data is immediately live
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
                'message' => 'Remote database seeding failed. Check the server logs for details.',
            ], 500);
        }
    }

    /**
     * Delete application records while preserving the database structure and
     * the platform's admin, authorization, configuration, and payment setup.
     */
    public function clearApplicationData(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        if ($request->input('confirmation') !== 'CLEAR_ALL_APPLICATION_DATA') {
            return response()->json([
                'status' => 'error',
                'message' => 'Explicit confirmation is required before application data can be cleared.',
            ], 422);
        }

        $user = Auth::guard('web')->user() ?? $request->user('sanctum') ?? $request->user();
        $adminUserIds = DB::table('role_user')
            ->join('roles', 'roles.id', '=', 'role_user.role_id')
            ->whereIn('roles.name', ['ADMIN', 'SUPER_ADMIN'])
            ->pluck('role_user.user_id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $adminUserIds[] = (int) $user->id;
        $adminUserIds = array_values(array_unique($adminUserIds));

        $deleted = [];
        $deleteTable = function (string $table) use (&$deleted): void {
            if (! Schema::hasTable($table)) {
                return;
            }

            $count = DB::table($table)->delete();
            if ($count > 0) {
                $deleted[$table] = $count;
            }
        };

        try {
            DB::transaction(function () use (&$deleted, $deleteTable, $adminUserIds): void {
                // Delete dependent rows first so all tables and constraints remain intact.
                foreach ([
                    'variant_attribute_values',
                    'product_attribute_values',
                    'category_attribute_options',
                    'product_categories',
                    'inventories',
                    'inventory_movements',
                    'product_variants',
                    'receipts',
                    'payments',
                    'order_items',
                    'loyalty_transactions',
                    'wishlists',
                    'support_tickets',
                    'telegram_ai_messages',
                    'telegram_chat_sessions',
                    'telegram_admin_actions',
                    'telegram_notifications',
                    'telegram_accounts',
                    'social_accounts',
                    'seller_applications',
                    'password_reset_otps',
                    'password_reset_tokens',
                    'seeder_runs',
                    'banners',
                    'brand_translations',
                    'brands',
                    'coupons',
                    'category_attributes',
                ] as $table) {
                    $deleteTable($table);
                }

                if (Schema::hasTable('merchant_payment_accounts')) {
                    $count = DB::table('merchant_payment_accounts')
                        ->where(function ($query) use ($adminUserIds): void {
                            $query->whereNotNull('seller_application_id')
                                ->orWhere(function ($userQuery) use ($adminUserIds): void {
                                    $userQuery->whereNotNull('user_id')
                                        ->whereNotIn('user_id', $adminUserIds);
                                });
                        })
                        ->delete();
                    if ($count > 0) {
                        $deleted['merchant_payment_accounts'] = $count;
                    }
                }

                foreach (['products', 'categories', 'orders'] as $table) {
                    $deleteTable($table);
                }

                if (Schema::hasTable('personal_access_tokens')) {
                    $count = DB::table('personal_access_tokens')
                        ->where('tokenable_type', 'App\\Models\\User')
                        ->whereNotIn('tokenable_id', $adminUserIds)
                        ->delete();
                    if ($count > 0) {
                        $deleted['personal_access_tokens'] = $count;
                    }
                }

                if (Schema::hasTable('sessions')) {
                    $count = DB::table('sessions')
                        ->where(function ($query) use ($adminUserIds): void {
                            $query->whereNull('user_id')->orWhereNotIn('user_id', $adminUserIds);
                        })
                        ->delete();
                    if ($count > 0) {
                        $deleted['sessions'] = $count;
                    }
                }

                if (Schema::hasTable('users')) {
                    $count = DB::table('users')->whereNotIn('id', $adminUserIds)->delete();
                    if ($count > 0) {
                        $deleted['users'] = $count;
                    }
                }

                foreach (['cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs'] as $table) {
                    $deleteTable($table);
                }
            });

            Cache::flush();
            Log::warning('Application data cleared by admin.', [
                'admin_user_id' => $user->id,
                'deleted' => $deleted,
                'preserved_admin_user_ids' => $adminUserIds,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Application data cleared. Tables, admin accounts, roles, permissions, store settings, and global Bakong configuration were preserved.',
                'deleted' => $deleted,
                'preserved_admin_user_ids' => $adminUserIds,
            ]);
        } catch (\Throwable $e) {
            Log::error('Application data clear failed.', [
                'admin_user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Application data could not be cleared. No partial result was accepted.',
            ], 500);
        }
    }
}
