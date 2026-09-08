<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reconcile the orders.status schema with the canonical lifecycle.
 *
 * `failed` is a genuine order lifecycle state (written by the gateway/coupon
 * failure path and the merchant "mark failed" action, and treated as terminal
 * by Order::boot() / OrderTransitionService). It was missing from the schema
 * enum, so on MySQL (strict=false) those writes were silently coerced to the
 * empty string '', which then inflated financial metrics that did not exclude it.
 *
 * This migration:
 *   1. widens the enum to include `failed` (MySQL/MariaDB only; other drivers
 *      such as SQLite treat the enum as advisory TEXT and need no ALTER), and
 *   2. idempotently normalizes the legacy coerce-write artifact: rows whose
 *      status is '' and whose payment_status is authoritatively 'failed' are
 *      reclassified to 'failed'. It never reassigns store_id/customer_id, never
 *      touches other rows, and is safe to re-run.
 */
return new class extends Migration
{
    private const ORDER_STATUS_ENUM = [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'failed',
        'refunded',
    ];

    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $values = implode("', '", self::ORDER_STATUS_ENUM);
            DB::statement("ALTER TABLE orders MODIFY status ENUM('{$values}') NOT NULL DEFAULT 'pending'");
        }

        // Idempotent, tenant-safe normalization of the legacy coerce-write
        // artifact ('' is the pre-strict MySQL representation of 'failed').
        DB::table('orders')
            ->where('status', '')
            ->where('payment_status', 'failed')
            ->update(['status' => 'failed']);
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            // Reverting the enum. Any 'failed' rows still present would be
            // coerced back to '' by MySQL (the legacy artifact this migration
            // cleaned up). Best-effort rollback only.
            DB::statement("ALTER TABLE orders MODIFY status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending'");
        }
    }
};
