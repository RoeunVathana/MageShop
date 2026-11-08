<?php

namespace App\Http\Controllers\Api\V1\Telegram;

use App\Http\Controllers\Controller;
use App\Services\Telegram\TelegramAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class TelegramAuthController extends Controller
{
    protected TelegramAuthService $authService;

    public function __construct(TelegramAuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Authenticate Telegram Mini App session using initData.
     */
    public function authenticate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'init_data' => 'nullable|string',
            'demo_mode' => 'nullable|boolean',
            'demo_role' => 'nullable|string',
        ]);

        $initData = $validated['init_data'] ?? '';

        // Support local sandbox/dev preview if initData is omitted in local dev
        if (empty($initData) && config('app.debug') && ! empty($validated['demo_mode'])) {
            $demoRole = strtolower($validated['demo_role'] ?? 'customer');
            $adminChatId = config('telegram.admin_chat_id', 987654321);
            $userId = ($demoRole === 'admin' || $demoRole === 'staff') ? (int) $adminChatId : 88001122;

            $fakeParams = [
                'auth_date' => time(),
                'user' => json_encode([
                    'id' => $userId,
                    'first_name' => $demoRole === 'admin' ? 'Admin' : 'Sophea',
                    'last_name' => 'MegaCommerce',
                    'username' => $demoRole === 'admin' ? 'megacommerce_admin' : 'sophea_buyer',
                    'language_code' => 'en',
                ]),
            ];

            $result = $this->authService->authenticateTelegramUser($fakeParams, Auth::user());

            return response()->json([
                'status' => 'success',
                'data' => $result,
                'mode' => 'development_demo',
            ]);
        }

        if (empty($initData)) {
            return response()->json([
                'status' => 'error',
                'message' => 'The init_data parameter is required.',
            ], 422);
        }

        try {
            $parsed = $this->authService->validateInitData($initData);
            $result = $this->authService->authenticateTelegramUser($parsed, Auth::user());

            return response()->json([
                'status' => 'success',
                'data' => $result,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 401);
        }
    }

    /**
     * Get current Telegram user profile and linked customer stats.
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthenticated.'], 401);
        }

        $user->load('roles', 'telegramAccount');
        $ordersCount = $user->orders()->count();
        $recentOrders = $user->orders()->latest()->limit(5)->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'roles' => $user->roles->pluck('name'),
                ],
                'telegram' => $user->telegramAccount,
                'stats' => [
                    'orders_count' => $ordersCount,
                    'wallet_balance' => 0.00, // future wallet support
                ],
                'recent_orders' => $recentOrders,
            ],
        ]);
    }
}
