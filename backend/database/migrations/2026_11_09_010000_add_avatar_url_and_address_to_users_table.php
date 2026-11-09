<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Disable transaction wrapper for PgBouncer connection pooler compatibility.
     */
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(1000) NULL');
            DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT NULL');
        } catch (\Throwable $e) {
            if (Schema::hasTable('users')) {
                Schema::table('users', function (Blueprint $table) {
                    if (! Schema::hasColumn('users', 'avatar_url')) {
                        $table->string('avatar_url', 1000)->nullable();
                    }
                    if (! Schema::hasColumn('users', 'address')) {
                        $table->text('address')->nullable();
                    }
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE users DROP COLUMN IF EXISTS avatar_url');
            DB::statement('ALTER TABLE users DROP COLUMN IF EXISTS address');
        } catch (\Throwable $e) {
            if (Schema::hasTable('users')) {
                Schema::table('users', function (Blueprint $table) {
                    if (Schema::hasColumn('users', 'avatar_url')) {
                        $table->dropColumn('avatar_url');
                    }
                    if (Schema::hasColumn('users', 'address')) {
                        $table->dropColumn('address');
                    }
                });
            }
        }
    }
};
