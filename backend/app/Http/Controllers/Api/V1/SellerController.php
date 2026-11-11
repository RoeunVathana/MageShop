<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SellerApplication;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SellerController extends Controller
{
    /**
     * Submit or update a seller application.
     */
    public function apply(Request $request): JsonResponse
    {
        $user = Auth::guard('web')->user() ?? $request->user('sanctum') ?? $request->user();

        // If guest user, allow inline account registration
        if (! $user) {
            $validatedAuth = $request->validate([
                'email' => 'required|email|max:255',
                'name' => 'required|string|max:255',
                'password' => 'required|string|min:6',
            ]);

            $existing = User::where('email', strtolower($validatedAuth['email']))->first();
            if ($existing) {
                // If user exists, verify password
                if (! Hash::check($validatedAuth['password'], $existing->password)) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'An account with this email already exists. Please log in first or verify your credentials.',
                    ], 422);
                }
                $user = $existing;
            } else {
                $user = User::create([
                    'name' => $validatedAuth['name'],
                    'email' => strtolower($validatedAuth['email']),
                    'password' => Hash::make($validatedAuth['password']),
                    'status' => 'active',
                ]);
                if (method_exists($user, 'assignRole')) {
                    $user->assignRole('CUSTOMER');
                }
            }
        }

        $validated = $request->validate([
            'store_name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:2000',
            'telegram_username' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'bank_name' => 'nullable|string|max:100',
            'bakong_account_id' => 'nullable|string|max:100',
            'logo_url' => 'nullable|string|max:1000',
            'banner_url' => 'nullable|string|max:1000',
        ]);

        $baseSlug = Str::slug($validated['store_name']) ?: 'store-' . $user->id;
        $slug = $baseSlug;
        $counter = 1;
        while (SellerApplication::where('slug', $slug)->where('user_id', '!=', $user->id)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        $application = SellerApplication::updateOrCreate(
            ['user_id' => $user->id],
            [
                'store_name' => $validated['store_name'],
                'slug' => $slug,
                'category' => $validated['category'] ?? 'General Merchandise',
                'description' => $validated['description'] ?? null,
                'phone' => $validated['phone'],
                'telegram_username' => $validated['telegram_username'] ?? null,
                'city' => $validated['city'] ?? 'Phnom Penh',
                'address' => $validated['address'] ?? null,
                'bank_name' => $validated['bank_name'] ?? 'ABA Bank',
                'bakong_account_id' => $validated['bakong_account_id'] ?? null,
                'logo_url' => $validated['logo_url'] ?? null,
                'banner_url' => $validated['banner_url'] ?? null,
                'status' => 'pending',
                'rejection_reason' => null,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Seller member application submitted successfully! Our administrative team will review your application within 2-4 hours.',
            'data' => $application->load('user:id,name,email'),
        ], 201);
    }

    /**
     * Get the logged-in user's seller application status.
     */
    public function myApplication(Request $request): JsonResponse
    {
        $user = Auth::guard('web')->user() ?? $request->user('sanctum') ?? $request->user();
        if (! $user) {
            return response()->json(['status' => 'unauthenticated', 'data' => null], 200);
        }

        $application = SellerApplication::where('user_id', $user->id)->first();

        return response()->json([
            'status' => 'ok',
            'data' => $application,
            'is_seller' => method_exists($user, 'hasRole') ? ($user->hasRole('SELLER') || $user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN')) : false,
        ]);
    }

    /**
     * Public list of verified/approved seller stores.
     */
    public function publicStores(Request $request): JsonResponse
    {
        $stores = SellerApplication::where('status', 'approved')
            ->select('id', 'store_name', 'slug', 'category', 'description', 'city', 'logo_url', 'banner_url', 'created_at')
            ->orderBy('id', 'desc')
            ->paginate(20);

        return response()->json([
            'status' => 'ok',
            'data' => $stores->items(),
            'meta' => [
                'total' => $stores->total(),
                'current_page' => $stores->currentPage(),
                'last_page' => $stores->lastPage(),
            ],
        ]);
    }

    /**
     * Admin: List all seller member applications with statistics.
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = SellerApplication::with('user:id,name,email,created_at')
            ->orderBy('id', 'desc');

        if ($status = $request->input('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('store_name', 'ILIKE', "%{$search}%")
                  ->orWhere('phone', 'ILIKE', "%{$search}%")
                  ->orWhere('city', 'ILIKE', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'ILIKE', "%{$search}%")
                         ->orWhere('email', 'ILIKE', "%{$search}%");
                  });
            });
        }

        $applications = $query->paginate(25);

        $stats = [
            'total' => SellerApplication::count(),
            'pending' => SellerApplication::where('status', 'pending')->count(),
            'approved' => SellerApplication::where('status', 'approved')->count(),
            'rejected' => SellerApplication::where('status', 'rejected')->count(),
        ];

        return response()->json([
            'status' => 'ok',
            'data' => $applications->items(),
            'stats' => $stats,
            'meta' => [
                'total' => $applications->total(),
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
            ],
        ]);
    }

    /**
     * Admin: Approve a seller application.
     */
    public function adminApprove(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $application = SellerApplication::with('user')->findOrFail($id);
        $application->approve();

        return response()->json([
            'status' => 'success',
            'message' => "Seller application for '{$application->store_name}' approved successfully! User role upgraded to SELLER.",
            'data' => $application,
        ]);
    }

    /**
     * Admin: Reject a seller application with reason.
     */
    public function adminReject(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $application = SellerApplication::with('user')->findOrFail($id);
        $application->reject($validated['reason']);

        return response()->json([
            'status' => 'success',
            'message' => "Seller application for '{$application->store_name}' marked as rejected.",
            'data' => $application,
        ]);
    }

    /**
     * Admin: Update seller application status (e.g. suspend or reactivate).
     */
    public function adminUpdateStatus(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected,suspended',
        ]);

        $application = SellerApplication::with('user')->findOrFail($id);
        $application->update(['status' => $validated['status']]);

        if ($validated['status'] === 'approved' && $application->user) {
            $application->user->assignRole('SELLER');
        }

        return response()->json([
            'status' => 'success',
            'message' => "Seller status updated to '{$validated['status']}'.",
            'data' => $application,
        ]);
    }

    /**
     * Authorize admin user.
     */
    protected function authorizeAdmin(Request $request): void
    {
        $user = Auth::guard('web')->user() ?? $request->user('sanctum') ?? $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated. Administrator session required.');
        }

        $hasRole = method_exists($user, 'hasRole') && ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN'));

        if (! $hasRole) {
            abort(403, 'Unauthorized. Super administrator privileges required.');
        }
    }
}
