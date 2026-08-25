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
        Schema::create('customer_email_otps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('code_hash');
            $table->timestamp('expires_at')->index();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedTinyInteger('max_attempts')->default(5);
            $table->boolean('used')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->index(['customer_id', 'used']);
            $table->index(['store_id', 'customer_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_email_otps');
    }
};
