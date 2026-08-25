<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_whatsapp_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->unique()->constrained('stores')->cascadeOnDelete();
            $table->string('provider')->default('meta'); // meta | twilio
            $table->text('access_token')->nullable(); // encrypted
            $table->string('phone_number_id')->nullable();
            $table->string('waba_id')->nullable();
            $table->string('business_phone')->nullable();
            $table->string('notification_phone')->nullable(); // E.164 recipient
            $table->boolean('is_enabled')->default(false);
            $table->string('connection_status')->default('disconnected'); // disconnected|pending|connected|error
            $table->timestamp('last_verified_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_whatsapp_integrations');
    }
};
