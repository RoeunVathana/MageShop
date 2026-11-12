<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MerchantPaymentAccount;
use App\Models\SellerApplication;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MerchantPaymentAccountController extends Controller
{
    /**
     * List global checkout accounts for admins or owned payout accounts for sellers.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->currentUser($request);
        $this->authorizeAccountAccess($user);

        $query = MerchantPaymentAccount::query()
            ->with('owner:id,name,email')
            ->orderByDesc('is_default')
            ->orderByDesc('is_active')
            ->latest('id');

        if ($this->isAdmin($user)) {
            $query->whereNull('user_id');
        } else {
            $query->where('user_id', $user->id);
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->currentUser($request);
        $this->authorizeAccountAccess($user);
        $validated = $this->validateAccount($request);
        $isAdmin = $this->isAdmin($user);

        $account = DB::transaction(function () use ($validated, $user, $isAdmin) {
            $sellerApplication = null;
            if (! $isAdmin) {
                $sellerApplication = SellerApplication::where('user_id', $user->id)->first();
                if (! $sellerApplication || $sellerApplication->status !== 'approved') {
                    abort(403, 'Your seller store must be approved before adding payout accounts.');
                }
            }

            $ownerId = $isAdmin ? null : $user->id;
            $isActive = (bool) ($validated['is_active'] ?? true);
            if ($isActive) {
                $this->clearDefaultForOwner($ownerId);
            }

            $account = MerchantPaymentAccount::create([
                ...$validated,
                'user_id' => $ownerId,
                'seller_application_id' => $sellerApplication?->id,
                'is_default' => $isActive,
                'verified_at' => null,
            ]);

            if ($isAdmin) {
                if ($account->is_default) {
                    $this->syncGlobalCheckoutSettings($account);
                }
            } else {
                $sellerApplication->update([
                    'bank_name' => $account->bank_name,
                    'bakong_account_id' => $account->account_id,
                ]);
            }

            return $account;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Payment account added successfully.',
            'data' => $account->fresh('owner:id,name,email'),
        ], 201);
    }

    public function update(Request $request, MerchantPaymentAccount $account): JsonResponse
    {
        $user = $this->currentUser($request);
        $this->authorizeAccountAccess($user);
        $this->authorizeAccountMutation($user, $account);
        $validated = $this->validateAccount($request, true);

        if (array_key_exists('is_active', $validated) && ! $validated['is_active'] && $account->is_default) {
            return response()->json([
                'status' => 'error',
                'message' => 'Choose another default account before deactivating this checkout account.',
            ], 422);
        }

        DB::transaction(function () use ($account, $validated, $user) {
            $wasDefault = $account->is_default;
            $account->fill($validated);

            if ($account->is_default) {
                $this->clearDefaultForOwner($account->user_id, $account->id);
            } elseif ($wasDefault) {
                $account->is_default = true;
            }

            $account->save();

            if ($this->isAdmin($user) && $account->is_default && $account->user_id === null) {
                $this->syncGlobalCheckoutSettings($account);
            }

            if ($account->sellerApplication) {
                $account->sellerApplication->update([
                    'bank_name' => $account->bank_name,
                    'bakong_account_id' => $account->account_id,
                ]);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Payment account updated successfully.',
            'data' => $account->fresh('owner:id,name,email'),
        ]);
    }

    public function destroy(Request $request, MerchantPaymentAccount $account): JsonResponse
    {
        $user = $this->currentUser($request);
        $this->authorizeAccountAccess($user);
        $this->authorizeAccountMutation($user, $account);

        if ($this->isAdmin($user) && $account->user_id === null && $account->is_default) {
            $hasReplacement = $this->ownerQuery(null)
                ->where('id', '!=', $account->id)
                ->where('is_active', true)
                ->exists();

            if (! $hasReplacement) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Add another active global account and make it default before removing the current checkout account.',
                ], 422);
            }
        }

        DB::transaction(function () use ($account, $user) {
            $wasDefault = $account->is_default;
            $account->delete();

            if ($wasDefault) {
                $replacement = $this->ownerQuery($account->user_id)
                    ->where('is_active', true)
                    ->latest('id')
                    ->first();

                if ($replacement) {
                    $replacement->update(['is_default' => true]);
                    if ($this->isAdmin($user) && $account->user_id === null) {
                        $this->syncGlobalCheckoutSettings($replacement);
                    }
                }
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Payment account removed successfully.',
        ]);
    }

    public function makeDefault(Request $request, MerchantPaymentAccount $account): JsonResponse
    {
        $user = $this->currentUser($request);
        $this->authorizeAccountAccess($user);
        $this->authorizeAccountMutation($user, $account);

        if (! $account->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Activate the payment account before making it default.',
            ], 422);
        }

        DB::transaction(function () use ($account, $user) {
            $this->clearDefaultForOwner($account->user_id, $account->id);
            $account->update(['is_default' => true]);

            if ($this->isAdmin($user) && $account->user_id === null) {
                $this->syncGlobalCheckoutSettings($account);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Default payment account updated.',
            'data' => $account->fresh('owner:id,name,email'),
        ]);
    }

    protected function validateAccount(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'account_type' => [$partial ? 'sometimes' : 'nullable', 'string', Rule::in(['bakong'])],
            'bank_name' => [$required, 'string', 'max:100'],
            'account_id' => [$required, 'string', 'max:100', 'regex:/^[^@\s]+@[^@\s]+$/'],
            'merchant_name' => [$required, 'string', 'max:100'],
            'merchant_city' => [$required, 'string', 'max:100'],
            'merchant_phone' => ['nullable', 'string', 'max:50'],
            'currency' => [$required, Rule::in(['USD', 'KHR', 'BOTH'])],
            'is_active' => [$partial ? 'sometimes' : 'nullable', 'boolean'],
            'is_default' => [$partial ? 'sometimes' : 'nullable', 'boolean'],
        ]);
    }

    protected function currentUser(Request $request): ?User
    {
        return Auth::guard('web')->user() ?? $request->user('sanctum') ?? $request->user();
    }

    protected function authorizeAccountAccess(?User $user): void
    {
        if (! $user) {
            abort(401, 'Authentication is required to manage payment accounts.');
        }

        if (! $this->isAdmin($user) && ! $user->hasRole(['SELLER', 'SELLER_STAFF'])) {
            abort(403, 'Admin or approved seller access is required.');
        }
    }

    protected function authorizeAccountMutation(User $user, MerchantPaymentAccount $account): void
    {
        if ($this->isAdmin($user)) {
            return;
        }

        if ((int) $account->user_id !== (int) $user->id) {
            abort(403, 'You can only manage your own seller payment accounts.');
        }
    }

    protected function isAdmin(User $user): bool
    {
        return $user->hasRole(['SUPER_ADMIN', 'ADMIN', 'STAFF']);
    }

    protected function ownerQuery(?int $ownerId)
    {
        return MerchantPaymentAccount::query()
            ->when(
                $ownerId === null,
                fn ($query) => $query->whereNull('user_id'),
                fn ($query) => $query->where('user_id', $ownerId)
            );
    }

    protected function clearDefaultForOwner(?int $ownerId, ?int $exceptId = null): void
    {
        $this->ownerQuery($ownerId)
            ->when($exceptId !== null, fn ($query) => $query->where('id', '!=', $exceptId))
            ->where('is_default', true)
            ->update(['is_default' => false]);
    }

    protected function syncGlobalCheckoutSettings(MerchantPaymentAccount $account): void
    {
        StoreSetting::set('bakong_account_id', $account->account_id);
        StoreSetting::set('bakong_merchant_name', $account->merchant_name);
        StoreSetting::set('merchant_phone', $account->merchant_phone ?? '');
        StoreSetting::set('company_city', $account->merchant_city);
    }
}
