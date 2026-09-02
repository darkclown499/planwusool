<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Store-isolated editable WhatsApp message templates used to compose
     * wa.me deep links for order and customer actions. A template is scoped to
     * a single store and locale (ar / en), keyed by a stable machine key
     * (order_received, order_confirmed, …). Unknown placeholders are left
     * unresolved at render time (never evaled), so merchant-authored bodies can
     * safely contain literal {text} without being executed.
     */
    public function up(): void
    {
        Schema::create('whatsapp_templates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->string('key', 64);
            $table->string('locale', 5)->default('ar');
            $table->text('body');
            $table->timestamps();

            $table->unique(['store_id', 'key', 'locale']);

            $table->foreign('store_id')
                ->references('id')
                ->on('stores')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_templates');
    }
};
