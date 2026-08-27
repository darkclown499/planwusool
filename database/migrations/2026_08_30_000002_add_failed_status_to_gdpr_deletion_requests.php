<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Extend enum to include 'failed' for deletion job error path — smallest change, no column addition
        try {
            DB::statement("ALTER TABLE gdpr_deletion_requests MODIFY COLUMN status ENUM('pending','processing','completed','cancelled','failed') DEFAULT 'pending'");
        } catch (\Throwable $e) {
            // SQLite (testing) does not support enum modify; skip
        }
    }

    public function down(): void
    {
        try {
            DB::statement("ALTER TABLE gdpr_deletion_requests MODIFY COLUMN status ENUM('pending','processing','completed','cancelled') DEFAULT 'pending'");
        } catch (\Throwable $e) {}
    }
};
