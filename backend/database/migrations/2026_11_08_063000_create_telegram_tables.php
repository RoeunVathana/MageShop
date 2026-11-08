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
        Schema::create('telegram_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->bigInteger('telegram_user_id')->unique()->index();
            $table->string('telegram_username')->nullable()->index();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->text('photo_url')->nullable();
            $table->string('language_code', 10)->default('en');
            $table->boolean('is_bot_admin')->default(false)->index();
            $table->timestamp('linked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('telegram_bot_updates', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('update_id')->unique()->index();
            $table->timestamp('processed_at')->nullable();
            $table->string('status')->default('processed');
            $table->timestamps();
        });

        Schema::create('telegram_chat_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('telegram_account_id')->constrained()->cascadeOnDelete();
            $table->string('session_type')->default('customer')->index(); // customer, admin
            $table->json('context_data')->nullable();
            $table->timestamps();
        });

        Schema::create('telegram_ai_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('telegram_chat_sessions')->cascadeOnDelete();
            $table->string('sender', 20); // user, assistant, system, tool
            $table->text('message');
            $table->json('tool_calls')->nullable();
            $table->timestamps();
        });

        Schema::create('telegram_admin_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action'); // stock_adjust, order_status_change, etc.
            $table->string('target_type');
            $table->string('target_id');
            $table->json('payload')->nullable();
            $table->string('confirmation_status')->default('pending')->index(); // pending, confirmed, cancelled
            $table->timestamps();
        });

        Schema::create('telegram_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->bigInteger('chat_id')->index();
            $table->string('notification_type')->index();
            $table->string('delivery_status')->default('sent');
            $table->json('payload')->nullable();
            $table->timestamp('sent_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('telegram_notifications');
        Schema::dropIfExists('telegram_admin_actions');
        Schema::dropIfExists('telegram_ai_messages');
        Schema::dropIfExists('telegram_chat_sessions');
        Schema::dropIfExists('telegram_bot_updates');
        Schema::dropIfExists('telegram_accounts');
    }
};
