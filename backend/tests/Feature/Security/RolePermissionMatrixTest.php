<?php

namespace Tests\Feature\Security;

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

    public function test_all_delivery_and_operations_roles_are_seeded(): void
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
            'COURIER',
            'DELIVERY',
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

    public function test_super_admin_can_assign_admin_role_by_email(): void
    {
        $superAdminRole = Role::where('name', 'SUPER_ADMIN')->first();
        $adminRole = Role::where('name', 'ADMIN')->first();

        $superAdmin = User::create([
            'name' => 'Root Administrator',
            'email' => 'root.admin@megacommerce.internal',
            'password' => 'Pass123!',
        ]);
        $superAdmin->roles()->attach($superAdminRole->id);

        $targetUser = User::create([
            'name' => 'New Platform Administrator',
            'email' => 'new.admin@megacommerce.internal',
            'password' => 'Pass123!',
        ]);

        $response = $this->actingAs($superAdmin, 'sanctum')->postJson('/api/v1/admin/users/roles/by-email', [
            'email' => strtoupper($targetUser->email),
            'role' => 'ADMIN',
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.email', $targetUser->email)
            ->assertJsonPath('data.roles.0.slug', 'admin');

        $this->assertTrue($targetUser->fresh()->hasRole($adminRole->name));
    }

    public function test_role_assignment_by_email_returns_not_found_for_unknown_account(): void
    {
        $superAdminRole = Role::where('name', 'SUPER_ADMIN')->first();
        $superAdmin = User::create([
            'name' => 'Root Administrator',
            'email' => 'root.lookup@megacommerce.internal',
            'password' => 'Pass123!',
        ]);
        $superAdmin->roles()->attach($superAdminRole->id);

        $response = $this->actingAs($superAdmin, 'sanctum')->postJson('/api/v1/admin/users/roles/by-email', [
            'email' => 'missing.user@megacommerce.internal',
            'role' => 'ADMIN',
        ]);

        $response->assertStatus(404)
            ->assertJson([
                'status' => 'error',
                'message' => 'No user account was found for that email address.',
            ]);
    }
}
