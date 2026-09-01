<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;
use App\Models\CustomerAddress;
use App\Models\AbandonedCart;
use App\Models\LoyaltyTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CustomerDataErasureService
{
    /**
     * Deterministic neutral placeholders — never looks like real PII.
     */
    public const ANON_EMAIL_PREFIX = 'deleted_';
    public const ANON_EMAIL_DOMAIN = '@deleted.local';
    public const ANON_NAME = 'Deleted User';
    public const ANON_PHONE = '0000000000';
    public const ANON_ADDRESS = 'Deleted';

    /**
     * Anonymize all PII for a single customer while preserving financial facts.
     * Idempotent — safe to call twice.
     */
    public function erase(Customer $customer): void
    {
        DB::transaction(function () use ($customer) {
            $customerId = $customer->id;
            $storeId = $customer->store_id;

            // 1. Anonymize denormalized PII in orders (retain financial columns)
            Order::where('customer_id', $customerId)->orWhere(function ($q) use ($customer, $storeId) {
                // Also anonymize guest orders that share email/phone but not yet linked (defensive)
                // Only within same store to avoid cross-tenant spill
                $q->where('store_id', $storeId)
                  ->where('customer_id', null)
                  ->where('customer_email', $customer->email);
            })->chunkById(200, function ($orders) use ($customerId) {
                foreach ($orders as $order) {
                    $updates = [
                        'customer_first_name' => self::ANON_NAME,
                        'customer_last_name'  => 'User',
                        'customer_email'      => self::ANON_EMAIL_PREFIX . $order->id . self::ANON_EMAIL_DOMAIN,
                        'customer_phone'      => self::ANON_PHONE,
                        'shipping_address'    => self::ANON_ADDRESS,
                        'shipping_city'       => self::ANON_ADDRESS,
                        'shipping_state'      => self::ANON_ADDRESS,
                        'shipping_postal_code'=> null,
                        'shipping_country'    => self::ANON_ADDRESS,
                        'billing_address'     => self::ANON_ADDRESS,
                        'billing_city'        => self::ANON_ADDRESS,
                        'billing_state'       => self::ANON_ADDRESS,
                        'billing_postal_code' => null,
                        'billing_country'     => self::ANON_ADDRESS,
                        'whatsapp_number'     => null,
                        'notes'               => null,
                    ];
                    // Detach customer link if this order belonged to the customer
                    if ((int) $order->customer_id === (int) $customerId) {
                        $updates['customer_id'] = null;
                        $updates['session_id'] = null;
                    }
                    // Use query builder to avoid triggering Order::boot stock restore
                    DB::table('orders')->where('id', $order->id)->update($updates);
                }
            });

            // Ensure main customer-linked orders are detached even if chunk missed due to where clause nuance
            DB::table('orders')->where('customer_id', $customerId)->update([
                'customer_id' => null,
                'session_id'  => null,
            ]);

            // 2. Delete addresses (PII)
            CustomerAddress::where('customer_id', $customerId)->delete();

            // 2b. Purge merchant CRM rows keyed to this customer identity so a
            // deletion cannot leave internal notes/tags about a deleted person.
            $ref = app(\App\Services\CustomerIdentityService::class)->refForCanonical($customerId);
            \App\Models\CustomerNote::where('store_id', $storeId)->where('customer_ref', $ref)->delete();
            \App\Models\CustomerTag::where('store_id', $storeId)->where('customer_ref', $ref)->delete();

            // 3. Remove abandoned cart PII where customer matches
            try {
                AbandonedCart::where('customer_id', $customerId)
                    ->orWhere(function ($q) use ($customer, $storeId) {
                        $q->where('store_id', $storeId)->where('customer_email', $customer->email);
                    })
                    ->delete();
            } catch (\Throwable $e) {
                Log::warning('CustomerDataErasure: abandoned cart cleanup skipped', ['customer_id' => $customerId]);
            }

            // 4. Loyalty: keep transactions for audit but anonymize is not needed; optionally delete balance
            // We do not delete loyalty history that is financial; just ensure no PII leak via customer row
            // Customer row itself will be deleted/anonymized below; loyalty_transactions remain linked by customer_id for now
            // If hard delete customer, FK will cascade/set null; we detach after

            // 5. Refresh customer to check idempotency - if already anonymized skip
            $fresh = Customer::find($customerId);
            if (!$fresh) {
                return;
            }
            // If email already anonymized, consider already erased but still delete addresses above idempotently done
            if (str_starts_with($fresh->email, self::ANON_EMAIL_PREFIX) && str_ends_with($fresh->email, self::ANON_EMAIL_DOMAIN)) {
                // Ensure deleted
                $fresh->delete();
                return;
            }

            // 6. Delete customer row (hard delete per current model — no SoftDeletes in phase 1)
            // This also cascades addresses/cart/wishlist already handled; orders detached so financial history retained
            $fresh->delete();

            // 7. Best-effort: clear customer sessions/tokens if sessions table exists
            try {
                if (DB::getSchemaBuilder()->hasTable('sessions')) {
                    // Laravel database sessions store user_id if implemented; otherwise no-op
                    if (DB::getSchemaBuilder()->hasColumn('sessions', 'user_id')) {
                        DB::table('sessions')->where('user_id', $customerId)->delete();
                    }
                }
                DB::table('customer_email_otps')->where('customer_id', $customerId)->delete();
            } catch (\Throwable $e) {
                // non-critical
            }
        });
    }

    /**
     * Anonymize a customer without deleting row (used for order snapshot retention cases).
     * Not used in Phase 1 default but available for future soft-delete.
     */
    public function anonymizeInPlace(Customer $customer): void
    {
        $customer->forceFill([
            'first_name' => self::ANON_NAME,
            'last_name'  => 'User',
            'email'      => self::ANON_EMAIL_PREFIX . $customer->id . self::ANON_EMAIL_DOMAIN,
            'phone'      => self::ANON_PHONE,
            'is_active'  => false,
            'notes'      => null,
        ])->save();
    }

    public static function anonymizedEmailForOrder(int $orderId): string
    {
        return self::ANON_EMAIL_PREFIX . $orderId . self::ANON_EMAIL_DOMAIN;
    }
}
