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
        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('theme')->default('gadgets');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            // Domain Configuration
            $table->string('custom_domain')->nullable();
            $table->string('custom_subdomain')->nullable();
            $table->boolean('enable_custom_domain')->default(false);
            $table->boolean('enable_custom_subdomain')->default(false);
            
            $table->string('email')->nullable();
            $table->boolean('is_featured')->default(false);
            
            // PWA Configuration (StoreGo equivalent)
            $table->boolean('enable_pwa')->default(false);
            $table->string('pwa_name')->nullable();
            $table->string('pwa_short_name', 12)->nullable();
            $table->text('pwa_description')->nullable();
            $table->string('pwa_theme_color', 9)->default('#3B82F6');
            $table->string('pwa_background_color', 9)->default('#ffffff');

            $table->enum('pwa_display', ['standalone', 'fullscreen', 'minimal-ui', 'browser'])->default('standalone');
            $table->enum('pwa_orientation', ['portrait', 'landscape', 'any'])->default('portrait');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};