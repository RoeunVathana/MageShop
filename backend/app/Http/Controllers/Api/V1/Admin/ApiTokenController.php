<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Security\SecurityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class ApiTokenController extends Controller
{
    /**
     * Authorize admin privilege for API token management.
     */
    protected function authorizeAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN'))) {
            abort(403, 'Unauthorized. Administrator API key management privileges required.');
        }
    }

    /**
     * List all system and user Personal Access Tokens.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = PersonalAccessToken::with('tokenable')->latest();

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhereHasMorph('tokenable', [User::class], function ($uq) use ($search) {
                        $uq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    });
            });
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 20)));
        $tokens = $query->paginate($perPage);

        $transformed = collect($tokens->items())->map(function ($token) {
            $user = $token->tokenable;

            return [
                'id' => $token->id,
                'name' => $token->name,
                'abilities' => $token->abilities ?? ['*'],
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'expires_at' => $token->expires_at?->toIso8601String(),
                'is_expired' => $token->expires_at ? $token->expires_at->isPast() : false,
                'created_at' => $token->created_at?->toIso8601String(),
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status,
                ] : null,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $transformed,
            'meta' => [
                'total' => $tokens->total(),
                'current_page' => $tokens->currentPage(),
                'last_page' => $tokens->lastPage(),
                'per_page' => $tokens->perPage(),
            ],
        ]);
    }

    /**
     * Create/issue a new API Personal Access Token.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'user_id' => ['nullable', 'exists:users,id'],
            'abilities' => ['nullable', 'array'],
            'abilities.*' => ['string', 'max:50'],
            'expires_in_days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $targetUser = isset($validated['user_id'])
            ? User::findOrFail($validated['user_id'])
            : $request->user();

        $abilities = $validated['abilities'] ?? ['*'];
        $expiresAt = ! empty($validated['expires_in_days'])
            ? now()->addDays((int) $validated['expires_in_days'])
            : null;

        $newAccessToken = $targetUser->createToken(
            $validated['name'],
            $abilities,
            $expiresAt
        );

        SecurityLogService::log('API_TOKEN_CREATED', $request->user()->id, [
            'token_id' => $newAccessToken->accessToken->id,
            'token_name' => $validated['name'],
            'target_user_id' => $targetUser->id,
            'target_email' => $targetUser->email,
            'expires_at' => $expiresAt?->toIso8601String(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'API token key generated successfully. Copy this key now as it will not be displayed again.',
            'data' => [
                'id' => $newAccessToken->accessToken->id,
                'name' => $newAccessToken->accessToken->name,
                'plain_text_token' => $newAccessToken->plainTextToken,
                'abilities' => $newAccessToken->accessToken->abilities,
                'expires_at' => $newAccessToken->accessToken->expires_at?->toIso8601String(),
                'created_at' => $newAccessToken->accessToken->created_at?->toIso8601String(),
                'user' => [
                    'id' => $targetUser->id,
                    'name' => $targetUser->name,
                    'email' => $targetUser->email,
                ],
            ],
        ], 201);
    }

    /**
     * Revoke / delete a specific API Token.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $token = PersonalAccessToken::findOrFail($id);
        $tokenName = $token->name;
        $tokenId = $token->id;

        $token->delete();

        SecurityLogService::log('API_TOKEN_REVOKED', $request->user()->id, [
            'token_id' => $tokenId,
            'token_name' => $tokenName,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "API token '{$tokenName}' has been permanently revoked.",
        ]);
    }

    /**
     * Regenerate an existing API Token (revokes old and creates new key).
     */
    public function regenerate(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin($request);

        $oldToken = PersonalAccessToken::with('tokenable')->findOrFail($id);
        $targetUser = $oldToken->tokenable;

        if (! $targetUser) {
            return response()->json([
                'status' => 'error',
                'message' => 'Associated user account could not be found.',
            ], 422);
        }

        $name = $oldToken->name;
        $abilities = $oldToken->abilities ?? ['*'];
        $expiresAt = $oldToken->expires_at && $oldToken->expires_at->isFuture()
            ? $oldToken->expires_at
            : null;

        $oldToken->delete();

        $newToken = $targetUser->createToken($name, $abilities, $expiresAt);

        SecurityLogService::log('API_TOKEN_REGENERATED', $request->user()->id, [
            'old_token_id' => $id,
            'new_token_id' => $newToken->accessToken->id,
            'token_name' => $name,
            'target_user_id' => $targetUser->id,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'API token key regenerated successfully. Store the new key securely.',
            'data' => [
                'id' => $newToken->accessToken->id,
                'name' => $newToken->accessToken->name,
                'plain_text_token' => $newToken->plainTextToken,
                'abilities' => $newToken->accessToken->abilities,
                'expires_at' => $newToken->accessToken->expires_at?->toIso8601String(),
                'created_at' => $newToken->accessToken->created_at?->toIso8601String(),
                'user' => [
                    'id' => $targetUser->id,
                    'name' => $targetUser->name,
                    'email' => $targetUser->email,
                ],
            ],
        ]);
    }
}
