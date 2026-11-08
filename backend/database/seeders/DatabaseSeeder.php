<?php

namespace Database\Seeders;

use Database\Seeders\Essential\BrandSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            CommerceAndTelegramSeeder::class,
            UniversalCategorySeeder::class,
            BrandSeeder::class,
            BannerSeeder::class,
        ]);
    }
}
