<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the new 'quantity' discount type to the advanced_coupons enum column.
     *
     * On MySQL/PostgreSQL the enum check constraint is recreated to include the
     * new value. On SQLite (used by the test runner) the table is rebuilt so the
     * generated check constraint includes 'quantity'.
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE advanced_coupons MODIFY COLUMN discount_type ENUM('fixed','percentage','free_shipping','buy_one_get_one','quantity') NOT NULL DEFAULT 'percentage'");
            return;
        }

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE advanced_coupons DROP CONSTRAINT IF EXISTS advanced_coupons_discount_type_check");
            DB::statement("ALTER TABLE advanced_coupons ADD CONSTRAINT advanced_coupons_discount_type_check CHECK (discount_type IN ('fixed','percentage','free_shipping','buy_one_get_one','quantity'))");
            return;
        }

        if ($driver === 'sqlite') {
            $this->rebuildSqliteTable();
        }
    }

    /**
     * SQLite cannot ALTER an enum/check constraint, so the table is rebuilt with
     * the expanded allowed values.
     */
    protected function rebuildSqliteTable(): void
    {
        Schema::table('advanced_coupons', function ($table) {
            $table->enum('discount_type', ['fixed', 'percentage', 'free_shipping', 'buy_one_get_one', 'quantity'])
                ->default('percentage')
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE advanced_coupons MODIFY COLUMN discount_type ENUM('fixed','percentage','free_shipping','buy_one_get_one') NOT NULL DEFAULT 'percentage'");
            return;
        }

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE advanced_coupons DROP CONSTRAINT IF EXISTS advanced_coupons_discount_type_check");
            DB::statement("ALTER TABLE advanced_coupons ADD CONSTRAINT advanced_coupons_discount_type_check CHECK (discount_type IN ('fixed','percentage','free_shipping','buy_one_get_one'))");
            return;
        }

        if ($driver === 'sqlite') {
            Schema::table('advanced_coupons', function ($table) {
                $table->enum('discount_type', ['fixed', 'percentage', 'free_shipping', 'buy_one_get_one'])
                    ->default('percentage')
                    ->change();
            });
        }
    }
};
