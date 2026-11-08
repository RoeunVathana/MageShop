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
        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider'); // google, etc.
            $table->string('provider_id');
            $table->string('avatar')->nullable();
            $table->json('token_metadata')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'provider_id']);
        });

        Schema::create('password_reset_otps', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('otp_hash');
            $table->timestamp('expires_at');
            $table->integer('attempts')->default(0);
            $table->timestamp('cooldown_until')->nullable();
            $table->string('reset_token', 64)->nullable()->unique();
            $table->timestamp('reset_token_expires_at')->nullable();
            $table->boolean('is_used')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('password_reset_otps');
        Schema::dropIfExists('social_accounts');
    }
};
