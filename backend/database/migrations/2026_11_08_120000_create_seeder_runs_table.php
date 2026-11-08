<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tracks which content seeders have already run, so redeploys never
 * overwrite admin edits or re-create content the admin deleted.
 */
return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        if (! Schema::hasTable('seeder_runs')) {
            Schema::create('seeder_runs', function (Blueprint $table) {
                $table->id();
                $table->string('seeder')->unique();
                $table->timestamp('ran_at')->useCurrent();
            });
        }

        // Existing database (e.g. production): content was already seeded earlier,
        // so mark it as done to protect the current data from being overwritten.
        if (Schema::hasTable('users') && DB::table('users')->exists()) {
            foreach ([
                'Database\\Seeders\\CommerceAndTelegramSeeder',
                'Database\\Seeders\\UniversalCategorySeeder',
                'Database\\Seeders\\Essential\\BrandSeeder',
                'Database\\Seeders\\BannerSeeder',
            ] as $seeder) {
                DB::table('seeder_runs')->insertOrIgnore(['seeder' => $seeder, 'ran_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('seeder_runs');
    }
};

