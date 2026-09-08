<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hardened storefront phone OTP storage (B2-03).
 *
 * Forward-only, non-destructive. The legacy platform `verification_codes`
 * table keeps serving the platform/merchant email OTP flows untouched.
 * Storefront express-checkout phone OTPs live here instead: hashed at rest,
 * explicitly store-scoped via a real FK, expiring, attempt-limited and
 * one-time-use. No plaintext `code` column exists on purpose.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storefront_phone_otps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('phone')->index();
            $table->string('code_hash');
            $table->timestamp('expires_at')->index();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedTinyInteger('max_attempts')->default(5);
            $table->boolean('used')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'phone', 'used']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_phone_otps');
    }
};