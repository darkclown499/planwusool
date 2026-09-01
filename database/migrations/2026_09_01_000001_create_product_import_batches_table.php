<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_import_batches', function (Blueprint $table) {
            $table->id();
            // Tenant scoping: every batch belongs to exactly one store.
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->string('original_filename', 255);
            $table->string('file_type', 10); // csv | xlsx
            // Lifecycle: previewed -> processing -> completed | completed_with_errors | failed
            $table->string('status', 30)->default('previewed')->index();
            // duplicate strategy: create_only | update_by_sku
            $table->string('strategy', 30)->default('create_only');
            $table->json('mapping')->nullable();
            $table->json('options')->nullable();

            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('valid_rows')->default(0);
            $table->unsignedInteger('warning_rows')->default(0);
            $table->unsignedInteger('error_rows')->default(0);
            $table->unsignedInteger('created_count')->default(0);
            $table->unsignedInteger('updated_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);

            // Parsed + normalized rows (bounded by MAX_ROWS at parse time). Each
            // entry references the original spreadsheet row number for reports.
            $table->longText('data')->nullable();
            // Per-import results keyed by original row number.
            $table->longText('results')->nullable();

            $table->text('error_message')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_import_batches');
    }
};