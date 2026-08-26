<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('store_whatsapp_integrations', function (Blueprint $table) {
            $table->string('message_mode')->default('text')->after('provider'); // text | template
            $table->string('template_name')->nullable()->after('message_mode');
            $table->string('template_language')->nullable()->after('template_name'); // e.g. ar, en_US
        });
    }
    public function down(): void {
        Schema::table('store_whatsapp_integrations', function (Blueprint $table) {
            $table->dropColumn(['message_mode','template_name','template_language']);
        });
    }
};
