<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('whatsapp_messages')) {
            Schema::create('whatsapp_messages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
                $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
                $table->foreignId('abandoned_cart_id')->nullable()->constrained('abandoned_carts')->nullOnDelete();
                $table->string('recipient_phone', 30)->nullable();
                $table->string('provider')->default('meta');
                $table->string('provider_message_id', 128)->nullable();
                $table->string('direction')->default('outbound');
                $table->string('message_type')->default('order_notification');
                $table->string('status')->default('queued');
                $table->string('template_name')->nullable();
                $table->text('last_error')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->timestamp('delivered_at')->nullable();
                $table->timestamp('read_at')->nullable();
                $table->timestamp('failed_at')->nullable();
                $table->timestamps();
                $table->unique(['store_id', 'order_id'], 'wam_store_order_unique');
                $table->unique(['store_id', 'abandoned_cart_id'], 'wam_store_cart_unique');
                $table->index(['provider_message_id']);
                $table->index(['store_id', 'status']);
            });
        }
        if (!Schema::hasTable('whatsapp_webhook_events')) {
            Schema::create('whatsapp_webhook_events', function (Blueprint $table) {
                $table->id();
                $table->string('event_id', 191)->unique();
                $table->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();
                $table->string('provider_message_id', 128)->nullable()->index();
                $table->string('status', 30)->nullable();
                $table->json('payload')->nullable();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();
            });
        }
        if (Schema::hasTable('store_whatsapp_integrations') && !Schema::hasColumn('store_whatsapp_integrations', 'webhook_verify_token')) {
            Schema::table('store_whatsapp_integrations', function (Blueprint $table) {
                $table->text('webhook_verify_token')->nullable()->after('access_token');
            });
        }
        if (Schema::hasTable('abandoned_carts') && !Schema::hasColumn('abandoned_carts', 'whatsapp_status')) {
            Schema::table('abandoned_carts', function (Blueprint $table) {
                $table->string('whatsapp_status', 30)->nullable()->after('reminder_count');
                $table->string('whatsapp_message_id', 128)->nullable()->after('whatsapp_status');
                $table->timestamp('whatsapp_sent_at')->nullable()->after('whatsapp_message_id');
            });
        }
    }
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_webhook_events');
        Schema::dropIfExists('whatsapp_messages');
        if (Schema::hasTable('store_whatsapp_integrations') && Schema::hasColumn('store_whatsapp_integrations', 'webhook_verify_token')) {
            Schema::table('store_whatsapp_integrations', function (Blueprint $table) {
                $table->dropColumn('webhook_verify_token');
            });
        }
        if (Schema::hasTable('abandoned_carts') && Schema::hasColumn('abandoned_carts', 'whatsapp_status')) {
            Schema::table('abandoned_carts', function (Blueprint $table) {
                $table->dropColumn(['whatsapp_status', 'whatsapp_message_id', 'whatsapp_sent_at']);
            });
        }
    }
};
