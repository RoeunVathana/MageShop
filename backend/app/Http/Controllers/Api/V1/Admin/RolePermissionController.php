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
    protected function authorizeRoleAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || !($user->hasRole('SUPER_ADMIN') || $user->hasRole('ADMIN'))) {
            abort(403, 'Unauthorized. Administrator role management privileges required.');
        }
    }

    /**
     * List all available roles with assigned permissions.
     */
    public function indexRoles(Request $request): JsonResponse
    {
        $this->authorizeRoleAdmin($request);

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
     * Prevents self-privilege escalation.
     */
    public function assignRoles(Request $request, User $user): JsonResponse
    {
        $this->authorizeRoleAdmin($request);

        $validated = $request->validate([
            'role_ids' => ['required', 'array', 'min:1'],
            'role_ids.*' => ['exists:roles,id'],
        ]);

        // Prevent self-role modification to stop unauthorized escalation
        if (Auth::id() === $user->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'You cannot modify your own administrator roles for security reasons.',
            ], 403);
        }

        $user->roles()->sync($validated['role_ids']);

        return response()->json([
            'status' => 'success',
            'message' => "Roles updated for user {$user->name}.",
            'data' => [
                'user_id' => $user->id,
                'roles' => $user->roles()->pluck('name'),
            ],
        ]);
    }
}

