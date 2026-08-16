<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Plan-tier template editing control.
        if (! Schema::hasColumn('plans', 'template_editor_level')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->string('template_editor_level', 20)->default('none');
            });

            // Free = none, Growth = limited, Professional = full.
            DB::table('plans')->get()->each(function ($plan) {
                $level = match ($plan->name ?? null) {
                    'Growth' => 'limited',
                    'Professional' => 'full',
                    default => 'none',
                };
                DB::table('plans')->where('id', $plan->id)->update([
                    'template_editor_level' => $level,
                ]);
            });
        }

        // Per-store persisted template state (design tokens + overrides).
        if (! Schema::hasColumn('stores', 'design_tokens')) {
            Schema::table('stores', function (Blueprint $table) {
                $table->json('design_tokens')->nullable()->after('theme');
                $table->json('template_overrides')->nullable()->after('design_tokens');
            });
        }

        // Simple custom store pages (Professional editing).
        if (! Schema::hasTable('store_pages')) {
            Schema::create('store_pages', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('store_id');
                $table->string('slug');
                $table->string('title');
                $table->longText('content')->nullable();
                $table->string('meta_title')->nullable();
                $table->string('meta_description')->nullable();
                $table->string('image')->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();

                $table->unique(['store_id', 'slug']);
                $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            });
        }

        // Store offers (promo cards + product-discount offers).
        if (! Schema::hasTable('store_offers')) {
            Schema::create('store_offers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('store_id');
                $table->string('title');
                $table->string('subtitle')->nullable();
                $table->string('image')->nullable();
                $table->unsignedBigInteger('product_id')->nullable();
                $table->string('link')->nullable();
                $table->decimal('discount_percent', 5, 2)->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();

                $table->index('store_id');
                $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
                $table->foreign('product_id')->references('id')->on('products')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('store_offers');
        Schema::dropIfExists('store_pages');
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['design_tokens', 'template_overrides']);
        });
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('template_editor_level');
        });
    }
};