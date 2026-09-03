<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('pos_terminal_id')->nullable()->after('payment_confirmed_by')->constrained('pos_terminals')->nullOnDelete();
            $table->string('pos_cashier_username')->nullable()->after('pos_terminal_id');

            $table->index(['store_id', 'pos_terminal_id']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'pos_terminal_id']);
            $table->dropConstrainedForeignId('pos_terminal_id');
            $table->dropColumn('pos_cashier_username');
        });
    }
};
