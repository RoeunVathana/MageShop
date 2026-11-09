<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'avatar_url')) {
                    $table->string('avatar_url', 1000)->nullable()->after('phone_number');
                }
                if (! Schema::hasColumn('users', 'address')) {
                    $table->text('address')->nullable()->after('avatar_url');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
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
};
