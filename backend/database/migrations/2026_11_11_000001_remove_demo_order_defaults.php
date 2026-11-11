<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('orders')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            foreach (['driver_name', 'driver_phone', 'driver_vehicle', 'current_lat', 'current_lng', 'dest_lat', 'dest_lng', 'estimated_arrival'] as $column) {
                if (Schema::hasColumn('orders', $column)) {
                    DB::statement("ALTER TABLE orders ALTER COLUMN {$column} DROP DEFAULT");
                }
            }
        }
    }

    public function down(): void
    {
        // Deliberately do not restore synthetic courier/GPS defaults.
    }
};
