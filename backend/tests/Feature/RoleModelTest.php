<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleModelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    /**
     * Test all 6 foundational roles exist in the database.
     */
    public function test_foundational_roles_are_seeded(): void
    {
        $expectedRoles = [
            'SUPER_ADMIN',
            'ADMIN',
            'STAFF',
            'SELLER',
            'CUSTOMER',
            'DELIVERY_DRIVER',
        ];

        foreach ($expectedRoles as $roleName) {
            $this->assertDatabaseHas('roles', [
                'name' => $roleName,
            ]);
        }
    }

    /**
     * Test assigning a role to a user works via Eloquent relationship.
     */
    public function test_user_role_assignment(): void
    {
        $user = User::create([
            'name' => 'Test Customer',
            'email' => 'test.customer.'.uniqid().'@megacommerce.local',
            'password' => 'Secret123!',
        ]);

        $user->assignRole('CUSTOMER');

        $this->assertTrue($user->hasRole('CUSTOMER'));
        $this->assertFalse($user->hasRole('SUPER_ADMIN'));
    }
}
