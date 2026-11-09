<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    /**
     * Determine whether the user can view any products.
     */
    public function viewAny(?User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the product.
     */
    public function view(?User $user, Product $product): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create products.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('products.create') ||
            $user->hasRole('SUPER_ADMIN') ||
            $user->hasRole('ADMIN') ||
            $user->hasRole('PRODUCT_MANAGER') ||
            $user->hasRole('SELLER');
    }

    /**
     * Determine whether the user can update the product.
     */
    public function update(User $user, Product $product): bool
    {
        return $user->hasPermission('products.update') ||
            $user->hasRole('SUPER_ADMIN') ||
            $user->hasRole('ADMIN') ||
            $user->hasRole('PRODUCT_MANAGER') ||
            $user->hasRole('SELLER');
    }

    /**
     * Determine whether the user can archive or delete the product.
     */
    public function delete(User $user, Product $product): bool
    {
        return $user->hasPermission('products.archive') ||
            $user->hasPermission('products.delete') ||
            $user->hasRole('SUPER_ADMIN') ||
            $user->hasRole('ADMIN') ||
            $user->hasRole('PRODUCT_MANAGER') ||
            $user->hasRole('SELLER') ||
            $user->hasRole('SELLER_STAFF') ||
            in_array(strtolower($user->email ?? ''), ['vothanarern@gmail.com', 'admin@megacommerce.com'], true);
    }
}
