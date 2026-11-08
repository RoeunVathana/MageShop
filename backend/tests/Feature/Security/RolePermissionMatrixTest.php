<?php

namespace Tests\Feature\Security;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePermissionMatrixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_all_17_roles_are_seeded(): void
    {
        $expectedRoles = [
            'SUPER_ADMIN',
            'ADMIN',
            'STAFF',
            'PRODUCT_MANAGER',
            'ORDER_MANAGER',
            'INVENTORY_MANAGER',
            'WAREHOUSE_MANAGER',
            'FINANCE_MANAGER',
            'ACCOUNTANT',
            'PURCHASING_MANAGER',
            'CUSTOMER_SUPPORT',
            'LOGISTICS_MANAGER',
            'DISPATCHER',
            'DELIVERY_DRIVER',
            'SELLER',
            'SELLER_STAFF',
            'CUSTOMER',
        ];

        foreach ($expectedRoles as $roleName) {
            $this->assertDatabaseHas('roles', ['name' => $roleName]);
        }

        $this->assertEquals(count($expectedRoles), Role::count());
    }

    public function test_granular_permissions_matrix(): void
    {
        $superAdminRole = Role::where('name', 'SUPER_ADMIN')->first();
        $this->assertNotNull($superAdminRole);

        // Super Admin has all permissions
        $this->assertGreaterThanOrEqual(28, $superAdminRole->permissions()->count());

        // Check specific permissions exist
        $requiredPerms = [
            'products.view',
            'products.create',
            'orders.view',
            'inventory.adjust',
            'accounting.journals.post',
            'banking.reconcile',
            'delivery.assign',
            'staff.manage',
        ];

        foreach ($requiredPerms as $slug) {
            $this->assertDatabaseHas('permissions', ['slug' => $slug]);
        }
    }

    public function test_admin_cannot_escalate_own_roles(): void
    {
        $adminRole = Role::where('name', 'ADMIN')->first();
        $superAdminRole = Role::where('name', 'SUPER_ADMIN')->first();

        $adminUser = User::create([
            'name' => 'Admin Operator',
            'email' => 'admin.operator@megacommerce.internal',
            'password' => 'Pass123!',
        ]);
        $adminUser->roles()->attach($adminRole->id);

        $response = $this->actingAs($adminUser, 'sanctum')->postJson("/api/v1/admin/users/{$adminUser->id}/roles", [
            'role_ids' => [$superAdminRole->id],
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
            ]);
    }
}

