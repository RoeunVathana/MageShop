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
            $hasAvatar = Schema::hasColumn('users', 'avatar_url');
            $hasAddress = Schema::hasColumn('users', 'address');

            if (! $hasAvatar || ! $hasAddress) {
                Schema::table('users', function (Blueprint $table) use ($hasAvatar, $hasAddress) {
                    if (! $hasAvatar) {
                        $table->string('avatar_url', 1000)->nullable();
                    }
                    if (! $hasAddress) {
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
        if (Schema::hasTable('users')) {
            $hasAvatar = Schema::hasColumn('users', 'avatar_url');
            $hasAddress = Schema::hasColumn('users', 'address');

            if ($hasAvatar || $hasAddress) {
                Schema::table('users', function (Blueprint $table) use ($hasAvatar, $hasAddress) {
                    if ($hasAvatar) {
                        $table->dropColumn('avatar_url');
                    }
                    if ($hasAddress) {
                        $table->dropColumn('address');
                    }
                });
            }
        }
    }
};
