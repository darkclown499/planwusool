<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_courier_connection_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('provider', 50);
            $table->string('display_name')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->boolean('has_existing_account')->default(false);
            $table->string('account_number')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 30)->default('new'); // new, contacted, waiting_provider, credentials_received, configured, rejected
            $table->timestamps();
            $table->index(['store_id','provider']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_courier_connection_requests');
    }
};
