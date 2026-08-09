<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Store-scoped password reset tokens. Kept separate from Laravel's default
     * `password_reset_tokens` (used by the admin area) so that a reset token
     * issued for one store cannot be replayed against another store.
     */
    public function up(): void
    {
        Schema::create('store_password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->index();
            $table->unsignedBigInteger('store_id')->index();
            $table->string('token');
            $table->timestamp('created_at')->nullable();

            $table->primary(['email', 'store_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_password_reset_tokens');
    }
};
