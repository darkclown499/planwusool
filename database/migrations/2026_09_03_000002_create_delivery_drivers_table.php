<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_drivers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->boolean('active')->default(true);
            $table->text('notes')->nullable();
            $table->string('vehicle_info')->nullable();
            $table->string('code')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_drivers');
    }
};
