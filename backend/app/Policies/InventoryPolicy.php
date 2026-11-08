<?php

namespace App\Policies;

use App\Models\Inventory;
use App\Models\User;

class InventoryPolicy
{
    /**
     * Determine whether the user can view inventory.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('inventory.view') ||
            $user->hasRole('SUPER_ADMIN') ||
            $user->hasRole('ADMIN') ||
            $user->hasRole('INVENTORY_MANAGER') ||
            $user->hasRole('WAREHOUSE_MANAGER') ||
            $user->hasRole('STAFF');
    }

    /**
     * Determine whether the user can view specific inventory.
     */
    public function view(User $user, ?Inventory $inventory = null): bool
    {
        return $this->viewAny($user);
    }

    /**
     * Determine whether the user can adjust stock quantities.
     */
    public function adjust(User $user, ?Inventory $inventory = null): bool
    {
        return $user->hasPermission('inventory.adjust') ||
            $user->hasRole('SUPER_ADMIN') ||
            $user->hasRole('ADMIN') ||
            $user->hasRole('INVENTORY_MANAGER');
    }

    /**
     * Determine whether the user can view movement audit history.
     */
    public function viewHistory(User $user): bool
    {
        return $user->hasPermission('inventory.history.view') ||
            $user->hasPermission('inventory.view') ||
            $user->hasRole('SUPER_ADMIN') ||
            $user->hasRole('ADMIN') ||
            $user->hasRole('INVENTORY_MANAGER') ||
            $user->hasRole('WAREHOUSE_MANAGER');
    }
}
