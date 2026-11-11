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
        if ($user->hasRole(['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER'])) {
            return true;
        }

        if ($user->hasRole(['SELLER', 'SELLER_STAFF'])) {
            return (int) $product->seller_id === (int) $user->id;
        }

        return $user->hasPermission('products.update') &&
            ! $user->hasRole('CUSTOMER');
    }

    /**
     * Determine whether the user can archive or delete the product.
     */
    public function delete(User $user, Product $product): bool
    {
        if ($user->hasRole(['SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER'])) {
            return true;
        }

        if ($user->hasRole(['SELLER', 'SELLER_STAFF'])) {
            return (int) $product->seller_id === (int) $user->id;
        }

        return $user->hasPermission('products.delete') || $user->hasPermission('products.archive');
    }
}
