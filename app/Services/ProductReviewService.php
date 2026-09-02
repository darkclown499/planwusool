<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductReview;

/**
 * Server-authoritative logic for verified purchase reviews.
 *
 * Everything a customer can NOT influence from the browser lives here:
 * whether they are allowed to review, whether the "verified purchase" badge
 * is genuine, and how customer PII is masked on the public storefront.
 */
class ProductReviewService
{
    /**
     * Fulfillment states that prove a purchase actually happened. Only a DELIVERED
     * order qualifies — pending or terminal states (cancelled, failed, refunded,
     * returned) never do, and confirmed/processing/shipped have not reached the
     * customer yet, so their reviews cannot be verified purchases.
     */
    public const REVIEWABLE_STATUSES = [
        OrderTransitionService::STATUS_DELIVERED,
    ];

    /**
     * Decide whether a customer may write/update a verified review for a product.
     *
     * Phase 1: verified-purchase only. Guest reviews are deferred because a
     * guest order's null customer_id could previously pass the ownership check
     * and forge the verified badge.
     *
     * @return array{eligible: bool, message: string|null, order: Order|null, orderItem: OrderItem|null}
     */
    public function eligibility(Product $product, ?int $customerId, ?int $orderId): array
    {
        $fail = static fn (string $message) => [
            'eligible' => false,
            'message' => $message,
            'order' => null,
            'orderItem' => null,
        ];

        if (!$customerId) {
            return $fail('You must sign in to review a product you purchased.');
        }

        if (!$orderId) {
            return $fail('Only customers who purchased this product can review it.');
        }

        $order = Order::find($orderId);
        if (!$order) {
            return $fail('The order could not be found.');
        }

        if ((int) $order->store_id !== (int) $product->store_id) {
            return $fail('The order does not belong to this store.');
        }

        if ((int) $order->customer_id !== (int) $customerId) {
            return $fail('You can only review products from your own orders.');
        }

        if (!in_array($order->status, self::REVIEWABLE_STATUSES, true)) {
            return $fail('You can only review products after the order has been delivered.');
        }

        $orderItem = OrderItem::where('order_id', $order->id)
            ->where('product_id', $product->id)
            ->first();

        if (!$orderItem) {
            return $fail('This product is not part of the selected order.');
        }

        return [
            'eligible' => true,
            'message' => null,
            'order' => $order,
            'orderItem' => $orderItem,
        ];
    }

    /**
     * Public-facing identity for a review: masked last name, no email/phone.
     *
     * @return array{display_name: string, initials: string, first_name: string}
     */
    public function publicCustomer(Customer $customer): array
    {
        $first = trim((string) $customer->first_name);
        $last = trim((string) $customer->last_name);

        $displayName = $first;
        if ($last !== '') {
            $displayName .= ' ' . mb_substr($last, 0, 1) . '.';
        }
        if ($displayName === '') {
            $displayName = 'Customer';
        }

        $initials = mb_strtoupper(mb_substr($first, 0, 1));
        if ($last !== '') {
            $initials .= mb_strtoupper(mb_substr($last, 0, 1));
        }

        return [
            'display_name' => $displayName,
            'initials' => $initials ?: 'C',
            'first_name' => $first,
        ];
    }

    /**
     * Strip HTML/control characters from free-text review content. Reviews are
     * plain text stored server-side; React escapes them on render.
     */
    public function sanitizeText(?string $value, int $maxLength): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $clean = strip_tags($value);
        // Remove control chars except newline/tab (keeps Arabic/line wraps intact).
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $clean) ?? $clean;
        $clean = preg_replace('/\s+/u', ' ', $clean) ?? $clean;
        $clean = trim($clean);

        if ($clean === '') {
            return null;
        }

        return mb_substr($clean, 0, $maxLength);
    }

    /**
     * Build the hasOne-of-legacy practice: the review row a customer owns for a
     * given product, so edits update in place instead of creating duplicates.
     */
    public function existingReview(int $storeId, int $productId, int $customerId): ?ProductReview
    {
        return ProductReview::where('store_id', $storeId)
            ->where('product_id', $productId)
            ->where('customer_id', $customerId)
            ->first();
    }
}