<?php

namespace App\Listeners;

use App\Events\CustomerVerified;
use App\Jobs\SendStoreCustomerEmail;

class DispatchWelcomeEmail
{
    public function handle(CustomerVerified $event): void
    {
        $customer = $event->customer;
        $storeId = $customer->store_id;
        $email = $customer->email;
        if (!$storeId || !$email) return;
        // Only after verified (email_verified_at must be set)
        if (is_null($customer->email_verified_at)) return;
        // Dispatch welcome email job (idempotent via StoreEmailLog)
        try {
            SendStoreCustomerEmail::dispatch($storeId, 'welcome_customer', $email, null, null, $customer->id)->afterCommit();
        } catch (\Throwable $e) {
            \Log::warning('Welcome email dispatch failed', ['store_id'=>$storeId,'customer_id'=>$customer->id,'error'=>$e->getMessage()]);
        }
    }
}
