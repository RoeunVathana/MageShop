<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RolePermissionController extends Controller
{
    /**
     * Authorize admin access.
     */
    protected function authorizeRoleAdmin(Request $request, bool $strict = true): void
    {
        $user = Auth::guard('web')->user() ?? $request->user('sanctum') ?? $request->user();
        if (! $user) {
            if ($strict) {
                abort(401, 'Unauthenticated. Administrator session required.');
            }
            return;
        }

        if (! ($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN'))) {
            abort(403, 'Unauthorized. Administrator role management privileges required.');
        }
    }

    /**
     * Ensure core platform roles exist.
     */
    protected function ensureDefaultRoles(): void
    {
        $defaults = [
            ['name' => 'SUPER_ADMIN', 'slug' => 'super_admin', 'description' => 'System Super Administrator with unrestricted root access.'],
            ['name' => 'ADMIN', 'slug' => 'admin', 'description' => 'Platform Administrator managing operations, disputes, and compliance.'],
            ['name' => 'STAFF', 'slug' => 'staff', 'description' => 'General operational staff handling day-to-day administrative tasks.'],
            ['name' => 'PRODUCT_MANAGER', 'slug' => 'product_manager', 'description' => 'Oversees product catalogs, categories, brands, variants, and pricing.'],
            ['name' => 'ORDER_MANAGER', 'slug' => 'order_manager', 'description' => 'Manages order lifecycle, fulfillment queues, customer cancellations, and statuses.'],
            ['name' => 'DISPATCHER', 'slug' => 'dispatcher', 'description' => 'Assigns parcels to delivery drivers and monitors live transit.'],
            ['name' => 'DELIVERY_DRIVER', 'slug' => 'delivery_driver', 'description' => 'Express delivery courier broadcasting live GPS and confirming drop-offs.'],
            ['name' => 'COURIER', 'slug' => 'courier', 'description' => 'Courier completing assigned delivery routes and cash handovers.'],
            ['name' => 'DELIVERY', 'slug' => 'delivery', 'description' => 'Legacy delivery operator completing assigned routes and cash handovers.'],
            ['name' => 'LOGISTICS_MANAGER', 'slug' => 'logistics_manager', 'description' => 'Oversees delivery dispatch, fleet routing, and driver assignment.'],
            ['name' => 'SELLER', 'slug' => 'seller', 'description' => 'Multi-vendor merchant store owner managing products and orders.'],
            ['name' => 'SELLER_STAFF', 'slug' => 'seller_staff', 'description' => 'Staff member assisting an authorized marketplace vendor.'],
            ['name' => 'INVENTORY_MANAGER', 'slug' => 'inventory_manager', 'description' => 'Controls stock movements, counts, valuation, and threshold alerts.'],
            ['name' => 'WAREHOUSE_MANAGER', 'slug' => 'warehouse_manager', 'description' => 'Supervises warehouse inventory levels and stock adjustments.'],
            ['name' => 'CUSTOMER_SUPPORT', 'slug' => 'customer_support', 'description' => 'Assists shoppers and handles inquiry tickets.'],
            ['name' => 'CUSTOMER', 'slug' => 'customer', 'description' => 'Verified retail customer purchasing goods and managing personal profile.'],
        ];

        foreach ($defaults as $r) {
            Role::firstOrCreate(
                ['slug' => $r['slug']],
                ['name' => $r['name'], 'description' => $r['description']]
            );
        }
    }

    /**
     * List all available roles with assigned permissions.
     */
    public function indexRoles(Request $request): JsonResponse
    {
        $this->authorizeRoleAdmin($request);
        $this->ensureDefaultRoles();

        $roles = Role::with('permissions')->get();

        return response()->json([
            'status' => 'success',
            'data' => $roles,
        ]);
    }

    /**
     * List all granular permissions grouped by domain.
     */
    public function indexPermissions(Request $request): JsonResponse
    {
        $this->authorizeRoleAdmin($request);

        $permissions = Permission::all()->groupBy('group');

        return response()->json([
            'status' => 'success',
            'data' => $permissions,
        ]);
    }

    /**
     * List operational staff members and their roles.
     */
    public function indexStaff(Request $request): JsonResponse
    {
        $this->authorizeRoleAdmin($request);

        $staffUsers = User::whereHas('roles', function ($q) {
            $q->whereNotIn('slug', ['customer']);
        })->with('roles')->paginate(20);

        return response()->json([
            'status' => 'success',
            'data' => $staffUsers->items(),
            'meta' => [
                'total' => $staffUsers->total(),
                'current_page' => $staffUsers->currentPage(),
            ],
        ]);
    }

    /**
     * Assign or update roles for a user.
     * Supports role_ids, role_slugs, roles (names), or a single role string.
     */
    public function assignRoles(Request $request, $id): JsonResponse
    {
        $this->authorizeRoleAdmin($request, true);
        $this->ensureDefaultRoles();

        $targetUser = $id instanceof User ? $id : User::findOrFail($id);

        $actor = Auth::guard('web')->user() ?? $request->user('sanctum') ?? $request->user();
        $isSuperAdmin = $actor?->hasRole('SUPER_ADMIN') ?? false;

        // An ADMIN can manage operational roles, but only SUPER_ADMIN may
        // change an administrator's own access or grant the root role.
        if (! $isSuperAdmin && $actor && (int) $actor->id === (int) $targetUser->id) {
            abort(403, 'Administrators cannot modify their own roles.');
        }

        $roleIds = [];

        // 1. From role_ids
        if ($request->filled('role_ids')) {
            $ids = is_array($request->input('role_ids')) ? $request->input('role_ids') : [$request->input('role_ids')];
            $found = Role::whereIn('id', $ids)->pluck('id')->toArray();
            $roleIds = array_merge($roleIds, $found);
        }

        // 2. From roles array (names or slugs)
        if ($request->filled('roles')) {
            $names = is_array($request->input('roles')) ? $request->input('roles') : [$request->input('roles')];
            $found = Role::where(function ($q) use ($names) {
                foreach ($names as $name) {
                    $slug = strtolower(str_replace(' ', '_', trim($name)));
                    $q->orWhere('name', 'ilike', $name)
                      ->orWhere('slug', 'ilike', $slug);
                }
            })->pluck('id')->toArray();
            $roleIds = array_merge($roleIds, $found);
        }

        // 3. From role_slugs
        if ($request->filled('role_slugs')) {
            $slugs = is_array($request->input('role_slugs')) ? $request->input('role_slugs') : [$request->input('role_slugs')];
            $found = Role::whereIn('slug', array_map('strtolower', $slugs))->pluck('id')->toArray();
            $roleIds = array_merge($roleIds, $found);
        }

        // 4. From single 'role' string (e.g. 'DELIVERY_DRIVER' or 'STAFF')
        if ($request->filled('role')) {
            $roleStr = trim($request->input('role'));
            $slug = strtolower(str_replace(' ', '_', $roleStr));
            $found = Role::where('slug', $slug)
                ->orWhere('name', 'ilike', $roleStr)
                ->value('id');

            if ($found) {
                $roleIds[] = $found;
            } else {
                $created = Role::create([
                    'slug' => $slug,
                    'name' => strtoupper($slug),
                    'description' => "Operational role: {$roleStr}",
                ]);
                $roleIds[] = $created->id;
            }
        }

        $roleIds = array_unique(array_filter($roleIds));

        if (empty($roleIds)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Please provide at least one valid role (e.g. STAFF, DELIVERY_DRIVER, SELLER, ADMIN).',
            ], 422);
        }

        if (! $isSuperAdmin) {
            $protectedRoleIds = Role::whereIn('slug', ['super_admin', 'admin'])->pluck('id')->all();
            if (! empty(array_intersect($protectedRoleIds, $roleIds))) {
                abort(403, 'Only SUPER_ADMIN may grant ADMIN or SUPER_ADMIN roles.');
            }

            $requestedPermissionIds = $request->filled('permission_ids')
                ? (array) $request->input('permission_ids')
                : [];
            $requestedPermissionNames = $request->filled('permissions')
                ? (array) $request->input('permissions')
                : [];
            $grantsPermissionManagement = in_array('permissions.grant', $requestedPermissionNames, true)
                || Permission::whereIn('id', $requestedPermissionIds)
                    ->where('slug', 'permissions.grant')
                    ->exists();

            if ($grantsPermissionManagement) {
                abort(403, 'Only SUPER_ADMIN may grant permission-management access.');
            }
        }

        // Sync roles to user
        $targetUser->roles()->sync($roleIds);

        // If specific permissions provided, attach them to the user's primary assigned role
        if ($request->filled('permission_ids') || $request->filled('permissions')) {
            $permIds = [];
            if ($request->filled('permission_ids')) {
                $permIds = is_array($request->input('permission_ids')) ? $request->input('permission_ids') : [$request->input('permission_ids')];
            } elseif ($request->filled('permissions')) {
                $permNames = is_array($request->input('permissions')) ? $request->input('permissions') : [$request->input('permissions')];
                $permIds = Permission::whereIn('slug', $permNames)->orWhereIn('name', $permNames)->pluck('id')->toArray();
            }

            if (!empty($permIds) && !empty($roleIds)) {
                $primaryRole = Role::find($roleIds[0]);
                if ($primaryRole) {
                    $primaryRole->permissions()->syncWithoutDetaching($permIds);
                }
            }
        }

        $refreshed = $targetUser->fresh(['roles.permissions']);

        return response()->json([
            'status' => 'success',
            'message' => "Roles successfully assigned to {$targetUser->name}.",
            'data' => [
                'user_id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
                'roles' => $refreshed->roles->map(fn ($r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'slug' => $r->slug,
                    'description' => $r->description,
                ]),
            ],
        ]);
    }
}
