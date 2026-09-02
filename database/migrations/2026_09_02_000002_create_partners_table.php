<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Partner / Agency program foundation (Phase 1).
     *
     * A Partner is an account user (type=company) who carries a Partner profile.
     * Attribution is store-level: a merchant signs up through a partner referral
     * code, that merchant's stores carry partner_id once created. Referral does
     * NOT grant the partner any access to the merchant store.
     */
    public function up(): void
    {
        if (! Schema::hasTable('partners')) {
            Schema::create('partners', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique();
                $table->string('referral_code', 24)->unique();
                $table->string('status', 20)->default('pending'); // pending|approved|rejected|suspended
                $table->string('company_name');
                $table->string('contact_person')->nullable();
                $table->string('email');
                $table->string('phone')->nullable();
                $table->string('website')->nullable();
                $table->string('social')->nullable();
                $table->string('business_type', 60)->nullable();
                $table->text('notes')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('rejected_at')->nullable();
                $table->timestamp('suspended_at')->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // Merchant → partner attribution (set once at registration, immutable)
        if (! Schema::hasColumn('users', 'partner_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('partner_id')->nullable()->after('used_referral_code');
                $table->index('partner_id');
            });
        }

        // Store → partner attribution (inherited from the merchant user)
        if (! Schema::hasColumn('stores', 'partner_id')) {
            Schema::table('stores', function (Blueprint $table) {
                $table->unsignedBigInteger('partner_id')->nullable()->after('user_id');
                $table->index('partner_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('stores', 'partner_id')) {
            Schema::table('stores', function (Blueprint $table) {
                $table->dropIndex(['partner_id']);
                $table->dropColumn('partner_id');
            });
        }

        if (Schema::hasColumn('users', 'partner_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex(['partner_id']);
                $table->dropColumn('partner_id');
            });
        }

        Schema::dropIfExists('partners');
    }
};
