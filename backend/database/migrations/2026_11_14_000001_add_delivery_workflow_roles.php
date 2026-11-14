<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add delivery roles and their minimum workflow permissions without
     * changing existing users or removing manually granted permissions.
     */
    public function up(): void
    {
        $now = now();

        foreach ([
            [
                'name' => 'COURIER',
                'slug' => 'courier',
                'description' => 'Courier completing assigned delivery routes and cash handovers.',
            ],
            [
                'name' => 'DELIVERY',
                'slug' => 'delivery',
                'description' => 'Legacy delivery operator completing assigned routes and cash handovers.',
            ],
        ] as $role) {
            $rolesTable = DB::table('roles');
            if ($rolesTable->where('slug', $role['slug'])->exists()) {
                $rolesTable->where('slug', $role['slug'])->update([
                    'name' => $role['name'],
                    'description' => $role['description'],
                    'updated_at' => $now,
                ]);
            } else {
                $rolesTable->insert(array_merge($role, ['updated_at' => $now, 'created_at' => $now]));
            }
        }

        $permissionIds = [];
        foreach ([
            ['name' => 'View Orders', 'slug' => 'orders.view', 'group' => 'orders', 'description' => 'View customer and vendor orders'],
            ['name' => 'Update Orders', 'slug' => 'orders.update', 'group' => 'orders', 'description' => 'Update order statuses and fulfillment'],
            ['name' => 'Update Deliveries', 'slug' => 'delivery.update', 'group' => 'logistics', 'description' => 'Update shipment transit state and proof of delivery'],
            ['name' => 'View Live Tracking', 'slug' => 'delivery.tracking.view', 'group' => 'logistics', 'description' => 'Monitor real-time GPS fleet positions'],
        ] as $permission) {
            $permissionsTable = DB::table('permissions');
            if ($permissionsTable->where('slug', $permission['slug'])->exists()) {
                $permissionsTable->where('slug', $permission['slug'])->update([
                    'name' => $permission['name'],
                    'group' => $permission['group'],
                    'description' => $permission['description'],
                    'updated_at' => $now,
                ]);
            } else {
                $permissionsTable->insert(array_merge($permission, ['updated_at' => $now, 'created_at' => $now]));
            }
            $permissionIds[$permission['slug']] = (int) DB::table('permissions')
                ->where('slug', $permission['slug'])
                ->value('id');
        }

        $roleIds = DB::table('roles')
            ->whereIn('slug', ['courier', 'delivery'])
            ->pluck('id', 'slug');

        foreach ($roleIds as $roleId) {
            foreach ($permissionIds as $permissionId) {
                DB::table('role_permissions')->insertOrIgnore([
                    'role_id' => $roleId,
                    'permission_id' => $permissionId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    /**
     * Keep the roles on rollback because an operator may have assigned them
     * after deployment; removing access data would be unsafe and irreversible.
     */
    public function down(): void
    {
        // Intentionally non-destructive.
    }
};
