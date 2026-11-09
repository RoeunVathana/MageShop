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
        if (! Schema::hasTable('seller_applications')) {
            Schema::create('seller_applications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('store_name');
                $table->string('slug')->unique();
                $table->string('category')->nullable();
                $table->text('description')->nullable();
                $table->string('phone');
                $table->string('telegram_username')->nullable();
                $table->string('city')->default('Phnom Penh');
                $table->text('address')->nullable();
                $table->string('bank_name')->default('ABA Bank');
                $table->string('bakong_account_id')->nullable();
                $table->string('logo_url')->nullable();
                $table->string('banner_url')->nullable();
                $table->string('status', 20)->default('pending')->index(); // pending, approved, rejected, suspended
                $table->text('rejection_reason')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('rejected_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seller_applications');
    }
};
