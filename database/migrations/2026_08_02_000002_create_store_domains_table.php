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
        Schema::create('store_domains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('domain_name')->unique();
            $table->boolean('is_verified')->default(false);
            $table->string('ssl_status')->default('pending');
            $table->string('verification_token')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_domains');
    }
};
