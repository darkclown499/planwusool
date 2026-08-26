<?php

namespace App\Services;

use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Secure preview for unpublished stores.
 *
 * Unpublished stores (store_status=false) are invisible to the public (503
 * StoreDisabled). The merchant owner must still be able to inspect the real
 * storefront before publishing it — same ThemeController pipeline, same
 * products/categories — without making it public.
 *
 * Two complementary mechanisms:
 *  1) Owner session preview: authenticated user on *.store_domain subdomain
 *     who owns the store can preview by visiting the storefront directly.
 *     Session cookie must be shared across subdomains (SESSION_DOMAIN=.localhost
 *     / .wusool.ps). CheckStoreStatus/DomainResolver call canPreview() before
 *     returning 503.
 *  2) Signed URL preview: Dashboard/Designer request a short-lived HMAC token
 *     scoped to store_id. Useful when session cookie cannot be relied upon
 *     (e.g. copied link) but ownership was verified at generation time. Token
 *     expires and is store-bound — copying to another store or after expiry
 *     fails.
 */
class StorePreviewService
{
    public const EXPIRY_MINUTES = 30;

    /**
     * Generate a signed preview URL for the store owner.
     * Must be called with an owner-authenticated request.
     */
    public static function generatePreviewUrl(Store $store, ?Request $request = null): string
    {
        $expires = now()->addMinutes(self::EXPIRY_MINUTES)->timestamp;
        $payload = $store->id . '|' . $expires;
        $signature = hash_hmac('sha256', $payload, config('app.key'));
        $token = base64_encode(json_encode([
            's' => $store->id,
            'e' => $expires,
            'h' => $signature,
        ], JSON_UNESCAPED_SLASHES));

        $base = $store->getStoreUrl($request);
        $sep = str_contains($base, '?') ? '&' : '?';

        return $base . $sep . 'preview_token=' . urlencode($token);
    }

    /**
     * Validate a preview_token query param. Returns store id if valid, else null.
     */
    public static function validateToken(?string $token): ?int
    {
        if (empty($token)) {
            return null;
        }
        try {
            $decoded = json_decode(base64_decode($token, true) ?: '', true);
            if (!is_array($decoded) || !isset($decoded['s'], $decoded['e'], $decoded['h'])) {
                return null;
            }
            $storeId = (int) $decoded['s'];
            $expires = (int) $decoded['e'];
            $hash = (string) $decoded['h'];

            if ($expires < time()) {
                return null;
            }
            $payload = $storeId . '|' . $expires;
            $expected = hash_hmac('sha256', $payload, config('app.key'));
            if (!hash_equals($expected, $hash)) {
                return null;
            }
            return $storeId;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Can this request preview the given store while it is unpublished?
     *
     * True only if:
     *  - request carries a valid signed preview_token scoped to this store_id
     *    (allows preview even without session cookie, e.g. Designer iframe), OR
     *  - request has an authenticated session whose user owns the store
     *    (user_id matches store.user_id or user.current_store equals store.id
     *    or user is superadmin).
     *
     * Both paths verify store ownership and token store-binding; anonymous or
     * cross-merchant requests return false.
     */
    public static function canPreview(Request $request, Store $store): bool
    {
        // Path 1: signed token (Dashboard "معاينة" link, Designer, copied URL within expiry)
        $token = $request->query('preview_token') ?: $request->input('preview_token');
        if ($token) {
            $tokenStoreId = self::validateToken((string) $token);
            if ($tokenStoreId !== null && $tokenStoreId === (int) $store->id) {
                return true;
            }
            // Invalid/expired/wrong-store token must not fallback to open
            if ($tokenStoreId === null || $tokenStoreId !== (int) $store->id) {
                // Fall through to session check, but token itself is invalid
                // Do not return true here
            }
        }

        // Path 2: authenticated owner session (same-browser preview without token)
        $user = Auth::user() ?? $request->user();
        if (!$user) {
            return false;
        }
        if ($user->type === 'superadmin' || (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())) {
            return true;
        }
        // Owner check: store belongs to user or is current_store
        if ((int) $store->user_id === (int) $user->id) {
            return true;
        }
        if ((int) $store->id === (int) ($user->current_store ?? 0)) {
            return true;
        }

        return false;
    }

    /**
     * Is this request currently in preview mode for an unpublished store?
     * Used by ThemeController and OrderController.
     */
    public static function isPreviewRequest(Request $request, Store $store): bool
    {
        $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
        $isUnpublished = !($config['store_status'] ?? true);
        if (!$isUnpublished) {
            return false;
        }
        return self::canPreview($request, $store);
    }
}
