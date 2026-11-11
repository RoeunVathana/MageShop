<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * This migration is intentionally a no-op.
     *
     * The order tracking columns were created nullable without synthetic
     * defaults already. The original cleanup used repeated information_schema
     * queries through Railway's PgBouncer connection and could leave the
     * migration connection in PostgreSQL's aborted-transaction state. Keeping
     * the migration as a no-op lets existing databases record it cleanly while
     * avoiding a production startup failure.
     */
    public $withinTransaction = false;

    public function up(): void
    {
        // No schema change is required.
    }

    public function down(): void
    {
        // Deliberately do not restore synthetic courier/GPS defaults.
    }
};
