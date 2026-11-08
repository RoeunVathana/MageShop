<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
        if (! Schema::hasTable('banners')) {
            Schema::create('banners', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('subtitle')->nullable();
                $table->string('badge_text')->nullable();
                $table->string('image_url')->nullable();
                $table->string('video_url')->nullable();
                $table->string('link_url')->nullable();
                $table->string('button_text')->nullable()->default('Explore Catalog');
                $table->string('background_style')->nullable()->default('gradient-primary');
                $table->string('placement')->default('hero')->index();
                $table->integer('sort_order')->default(0)->index();
                $table->boolean('is_active')->default(true)->index();
                $table->timestamp('start_at')->nullable();
                $table->timestamp('end_at')->nullable();
                $table->unsignedBigInteger('clicks_count')->default(0);
                $table->timestamps();

                $table->index(['placement', 'is_active', 'sort_order']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('banners');
    }
};
