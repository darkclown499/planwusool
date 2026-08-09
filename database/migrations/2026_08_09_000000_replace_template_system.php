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
        // Add new template fields to plans table
        Schema::table('plans', function (Blueprint $table) {
            $table->json('template_config')->nullable()->after('themes');
            $table->boolean('enable_advanced_builder')->default(false)->after('enable_mobile_app');
        });

        // Add new template fields to stores table
        Schema::table('stores', function (Blueprint $table) {
            $table->string('template_slug')->nullable()->after('theme');
            $table->json('template_overrides')->nullable()->after('template_slug');
            $table->json('design_tokens')->nullable()->after('template_overrides');
        });

        // Create templates table for template management
        Schema::create('templates', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('name_en')->nullable();
            $table->text('description')->nullable();
            $table->string('category')->default('general');
            $table->boolean('is_free')->default(true);
            $table->string('plan_required')->default('starter'); // starter, growth, professional
            $table->json('config')->nullable(); // Template sections, layout
            $table->json('design_tokens')->nullable(); // Tailwind CSS variables
            $table->json('advanced_components')->nullable(); // Premium-only components
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            $table->index(['is_free', 'is_active']);
            $table->index(['plan_required', 'is_active']);
        });

        // Create store_template_overrides table for user customizations
        Schema::create('store_template_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->onDelete('cascade');
            $table->string('template_slug');
            $table->json('overrides')->nullable(); // User section/layout overrides
            $table->json('design_tokens')->nullable(); // User design token customizations
            $table->timestamps();
            
            $table->unique(['store_id', 'template_slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_template_overrides');
        Schema::dropIfExists('templates');
        
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['template_slug', 'template_overrides', 'design_tokens']);
        });
        
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['template_config', 'enable_advanced_builder']);
        });
    }
};