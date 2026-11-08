<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            ['name' => 'SUPER_ADMIN', 'slug' => 'super_admin', 'description' => 'System Super Administrator with unrestricted root access.'],
            ['name' => 'ADMIN', 'slug' => 'admin', 'description' => 'Platform Administrator managing platform operations, disputes, and compliance.'],
            ['name' => 'STAFF', 'slug' => 'staff', 'description' => 'General operational staff handling day-to-day administrative tasks.'],
            ['name' => 'PRODUCT_MANAGER', 'slug' => 'product_manager', 'description' => 'Oversees product catalogs, categories, brands, variants, and pricing.'],
            ['name' => 'ORDER_MANAGER', 'slug' => 'order_manager', 'description' => 'Manages order lifecycle, fulfillment queues, customer cancellations, and statuses.'],
            ['name' => 'INVENTORY_MANAGER', 'slug' => 'inventory_manager', 'description' => 'Controls stock movements, counts, valuation, and threshold alerts.'],
            ['name' => 'WAREHOUSE_MANAGER', 'slug' => 'warehouse_manager', 'description' => 'Supervises physical warehouses, bin locations, and goods receiving.'],
            ['name' => 'FINANCE_MANAGER', 'slug' => 'finance_manager', 'description' => 'Authorizes expenses, budgets, payouts, and financial policy execution.'],
            ['name' => 'ACCOUNTANT', 'slug' => 'accountant', 'description' => 'Posts double-entry journals, reconciles banks, and prepares reports.'],
            ['name' => 'PURCHASING_MANAGER', 'slug' => 'purchasing_manager', 'description' => 'Creates purchase orders, handles supplier quotations, and 3-way matching.'],
            ['name' => 'CUSTOMER_SUPPORT', 'slug' => 'customer_support', 'description' => 'Assists customers, handles inquiries, and reviews dispute tickets.'],
            ['name' => 'LOGISTICS_MANAGER', 'slug' => 'logistics_manager', 'description' => 'Oversees delivery dispatch, carrier fleets, routes, and performance.'],
            ['name' => 'DISPATCHER', 'slug' => 'dispatcher', 'description' => 'Assigns parcels to delivery drivers and monitors live transit.'],
            ['name' => 'DELIVERY_DRIVER', 'slug' => 'delivery_driver', 'description' => 'Fulfills delivery packages, broadcasts GPS location, collects proof.'],
            ['name' => 'SELLER', 'slug' => 'seller', 'description' => 'Multi-vendor merchant store owner managing storefront and products.'],
            ['name' => 'SELLER_STAFF', 'slug' => 'seller_staff', 'description' => 'Staff member assisting an authorized marketplace vendor.'],
            ['name' => 'CUSTOMER', 'slug' => 'customer', 'description' => 'Verified retail customer purchasing goods and managing personal profile.'],
        ];

        $roleModels = [];
        foreach ($roles as $roleData) {
            $roleModels[$roleData['slug']] = Role::firstOrCreate(
                ['slug' => $roleData['slug']],
                [
                    'name' => $roleData['name'],
                    'description' => $roleData['description'],
                ]
            );
        }

        // Granular Permissions Matrix per Enterprise Specification
        $permissions = [
            ['name' => 'View Products', 'slug' => 'products.view', 'group' => 'products', 'description' => 'View catalog products and specifications'],
            ['name' => 'Create Products', 'slug' => 'products.create', 'group' => 'products', 'description' => 'Create new products and variants'],
            ['name' => 'Update Products', 'slug' => 'products.update', 'group' => 'products', 'description' => 'Update product details, pricing, and images'],
            ['name' => 'Delete Products', 'slug' => 'products.delete', 'group' => 'products', 'description' => 'Archive or delete products'],

            ['name' => 'View Orders', 'slug' => 'orders.view', 'group' => 'orders', 'description' => 'View customer and vendor orders'],
            ['name' => 'Update Orders', 'slug' => 'orders.update', 'group' => 'orders', 'description' => 'Update order statuses and fulfillment'],

            ['name' => 'View Payments', 'slug' => 'payments.view', 'group' => 'payments', 'description' => 'Inspect transactions and settlement references'],
            ['name' => 'Approve Refunds', 'slug' => 'payments.refund.approve', 'group' => 'payments', 'description' => 'Authorize customer refund payouts'],

            ['name' => 'View Inventory', 'slug' => 'inventory.view', 'group' => 'inventory', 'description' => 'Inspect warehouse stock levels and valuation'],
            ['name' => 'Adjust Inventory', 'slug' => 'inventory.adjust', 'group' => 'inventory', 'description' => 'Perform manual and audit stock adjustments'],
            ['name' => 'Transfer Inventory', 'slug' => 'inventory.transfer', 'group' => 'inventory', 'description' => 'Execute warehouse-to-warehouse transfers'],
            ['name' => 'Approve Inventory', 'slug' => 'inventory.approve', 'group' => 'inventory', 'description' => 'Approve write-offs and large count adjustments'],

            ['name' => 'Manage Suppliers', 'slug' => 'suppliers.manage', 'group' => 'purchasing', 'description' => 'Register and maintain vendor suppliers'],
            ['name' => 'Create Purchases', 'slug' => 'purchases.create', 'group' => 'purchasing', 'description' => 'Draft purchase requests and purchase orders'],
            ['name' => 'Approve Purchases', 'slug' => 'purchases.approve', 'group' => 'purchasing', 'description' => 'Authorize purchase order issuance'],

            ['name' => 'Create Expenses', 'slug' => 'expenses.create', 'group' => 'expenses', 'description' => 'Record operational expense claims and bills'],
            ['name' => 'Approve Expenses', 'slug' => 'expenses.approve', 'group' => 'expenses', 'description' => 'Approve corporate and departmental expenses'],

            ['name' => 'View Accounting', 'slug' => 'accounting.view', 'group' => 'accounting', 'description' => 'Inspect chart of accounts and general ledger'],
            ['name' => 'Create Journals', 'slug' => 'accounting.journals.create', 'group' => 'accounting', 'description' => 'Draft double-entry journal entries'],
            ['name' => 'Post Journals', 'slug' => 'accounting.journals.post', 'group' => 'accounting', 'description' => 'Permanently post balanced journals to general ledger'],
            ['name' => 'View Financial Reports', 'slug' => 'accounting.reports.view', 'group' => 'accounting', 'description' => 'Generate and review P&L, balance sheets, and trial balance'],
            ['name' => 'Reconcile Banking', 'slug' => 'banking.reconcile', 'group' => 'accounting', 'description' => 'Perform bank statements and Bakong KHQR reconciliations'],

            ['name' => 'Assign Deliveries', 'slug' => 'delivery.assign', 'group' => 'logistics', 'description' => 'Assign orders to delivery drivers'],
            ['name' => 'Update Deliveries', 'slug' => 'delivery.update', 'group' => 'logistics', 'description' => 'Update shipment transit state and proof of delivery'],
            ['name' => 'View Live Tracking', 'slug' => 'delivery.tracking.view', 'group' => 'logistics', 'description' => 'Monitor real-time GPS fleet positions'],

            ['name' => 'Manage Staff', 'slug' => 'staff.manage', 'group' => 'administration', 'description' => 'Invite, suspend, and configure staff accounts'],
            ['name' => 'Manage Roles', 'slug' => 'roles.manage', 'group' => 'administration', 'description' => 'Create and customize role configurations'],
            ['name' => 'Grant Permissions', 'slug' => 'permissions.grant', 'group' => 'administration', 'description' => 'Assign permissions to roles without escalation'],
            ['name' => 'Manage Settings', 'slug' => 'settings.manage', 'group' => 'administration', 'description' => 'Update system and store configurations'],
        ];

        $permModels = [];
        foreach ($permissions as $permData) {
            $perm = Permission::where('slug', $permData['slug'])
                ->orWhere('name', $permData['name'])
                ->first();

            if ($perm) {
                $perm->update([
                    'slug' => $permData['slug'],
                    'name' => $permData['name'],
                    'group' => $permData['group'],
                    'description' => $permData['description'],
                ]);
            } else {
                $perm = Permission::create($permData);
            }

            $permModels[$permData['slug']] = $perm;
        }

        // Attach all permissions to SUPER_ADMIN
        $superAdmin = $roleModels['super_admin'] ?? null;
        if ($superAdmin) {
            $superAdmin->permissions()->sync(array_values(array_map(fn ($p) => $p->id, $permModels)));
        }

        // Attach operational permissions to ADMIN
        $admin = $roleModels['admin'] ?? null;
        if ($admin) {
            $adminPerms = array_filter($permModels, fn ($p) => $p->slug !== 'permissions.grant');
            $admin->permissions()->sync(array_values(array_map(fn ($p) => $p->id, $adminPerms)));
        }

        // Attach finance & accounting permissions
        $accountant = $roleModels['accountant'] ?? null;
        if ($accountant) {
            $acctPermSlugs = ['accounting.view', 'accounting.journals.create', 'accounting.journals.post', 'accounting.reports.view', 'banking.reconcile', 'expenses.create'];
            $accountant->permissions()->sync(array_values(array_map(fn ($s) => $permModels[$s]->id, array_filter($acctPermSlugs, fn ($s) => isset($permModels[$s])))));
        }

        // Attach inventory manager permissions
        $inventoryMgr = $roleModels['inventory_manager'] ?? null;
        if ($inventoryMgr) {
            $invPermSlugs = ['inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.approve', 'products.view', 'products.update'];
            $inventoryMgr->permissions()->sync(array_values(array_map(fn ($s) => $permModels[$s]->id, array_filter($invPermSlugs, fn ($s) => isset($permModels[$s])))));
        }

        // Attach customer permissions
        $customer = $roleModels['customer'] ?? null;
        if ($customer) {
            $custPermSlugs = ['products.view', 'orders.view', 'delivery.tracking.view'];
            $customer->permissions()->sync(array_values(array_map(fn ($s) => $permModels[$s]->id, array_filter($custPermSlugs, fn ($s) => isset($permModels[$s])))));
        }
    }
}
