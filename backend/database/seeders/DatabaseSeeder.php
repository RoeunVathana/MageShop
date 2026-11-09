<?php

namespace Database\Seeders;

use Database\Seeders\Essential\BrandSeeder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DatabaseSeeder extends Seeder
{
    /**
     * Seeders that must run on every deploy (idempotent system data).
     */
    protected array $alwaysRun = [
        RoleSeeder::class,
        BrandSeeder::class,
    ];

    /**
     * Demo/content seeders: run ONCE per database, never again on redeploy,
     * so admin-edited or admin-deleted brands, categories, banners, products
     * and their images/videos are preserved. Set FORCE_RESEED=true to override.
     */
    protected array $runOnce = [
        CommerceAndTelegramSeeder::class,
        UniversalCategorySeeder::class,
        BannerSeeder::class,
    ];

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call($this->alwaysRun);

        $tracked = Schema::hasTable('seeder_runs');
        $force = filter_var(env('FORCE_RESEED', false), FILTER_VALIDATE_BOOLEAN);

        foreach ($this->runOnce as $seeder) {
            if ($tracked && ! $force && DB::table('seeder_runs')->where('seeder', $seeder)->exists()) {
                if ($this->command) {
                    $this->command->line("Skipping {$seeder} (already seeded; preserving existing data)");
                }

                continue;
            }

            $this->call($seeder);

            if ($tracked) {
                DB::table('seeder_runs')->insertOrIgnore(['seeder' => $seeder, 'ran_at' => now()]);
            }
        }
    }
}
