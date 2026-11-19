<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        if (! Schema::hasTable('seller_staff_memberships')) {
            Schema::create('seller_staff_memberships', function (Blueprint $table) {
                $table->id();
                $table->foreignId('seller_user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('staff_user_id')->constrained('users')->cascadeOnDelete();
                $table->string('status', 20)->default('active')->index();
                $table->jsonb('permissions')->default('[]');
                $table->timestamps();
                $table->unique(['seller_user_id', 'staff_user_id']);
                $table->index(['staff_user_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_staff_memberships');
    }
};
