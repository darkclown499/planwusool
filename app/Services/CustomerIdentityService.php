<?php

namespace App\Services;

/**
 * Customer CRM identity references.
 *
 * A customer_ref is the stable key the CRM uses to attach notes/tags and to
 * route to a Customer 360 profile WITHOUT putting PII in URLs.
 *
 * Precedence (Phase 1, read-only — orders are never rewritten):
 *   1. c:{id}        — canonical registered/manual customer row
 *   2. p:{e164}      — guest grouped by safe normalized phone (PhoneNormalizer)
 *   3. e:{email}     — guest grouped by lowercase email when no valid phone
 *   4. o:{order_id}  — guest that left no contact info (each order its own)
 *
 * Phone normalization reuses the existing canonical PhoneNormalizer. It never
 * merges across +970 and +972 (they are distinct E.164 strings), so two
 * different people are never merged because of normalization ambiguity.
 */
class CustomerIdentityService
{
    public const PREFIX_CANONICAL = 'c:';
    public const PREFIX_PHONE = 'p:';
    public const PREFIX_EMAIL = 'e:';
    public const PREFIX_ORDER = 'o:';

    /** Statuses that MUST NOT count toward "valid" order metrics. */
    public const NON_VALID_ORDER_STATUSES = ['cancelled', 'failed', 'refunded'];

    /** Re-use the canonical Wusool phone normalizer — do not invent a new policy. */
    public function normalizePhone(?string $raw): ?string
    {
        if ($raw === null || trim((string) $raw) === '') {
            return null;
        }
        return PhoneNormalizer::normalize($raw);
    }

    public function refForCanonical(int $customerId): string
    {
        return self::PREFIX_CANONICAL . $customerId;
    }

    public function refForGuestPhone(string $e164): string
    {
        return self::PREFIX_PHONE . $e164;
    }

    public function refForGuestEmail(string $email): string
    {
        return self::PREFIX_EMAIL . strtolower(trim($email));
    }

    public function refForGuestOrderId(int $orderId): string
    {
        return self::PREFIX_ORDER . $orderId;
    }

    /**
     * Derive the identity ref from an order's denormalized fields.
     *
     * @param  array<string,mixed>  $order
     */
    public function refForOrder(array $order): string
    {
        if (! empty($order['customer_id'])) {
            return $this->refForCanonical((int) $order['customer_id']);
        }

        $phone = $this->normalizePhone($order['customer_phone'] ?? null);
        if ($phone !== null) {
            return $this->refForGuestPhone($phone);
        }

        $email = trim((string) ($order['customer_email'] ?? ''));
        if ($email !== '') {
            return $this->refForGuestEmail($email);
        }

        return $this->refForGuestOrderId((int) ($order['id'] ?? 0));
    }

    /**
     * Build a URL-safe signed token for a ref so raw phone/email never appear
     * in the address bar. Tampering breaks the HMAC signature.
     */
    public function tokenForRef(string $ref): string
    {
        $payload = rtrim(strtr(base64_encode($ref), '+/', '-_'), '=');
        $sig = substr(hash_hmac('sha256', $ref, (string) config('app.key')), 0, 16);

        return $payload . '.' . $sig;
    }

    /**
     * Resolve a signed token back to a ref. Returns null on any tampering.
     */
    public function refFromToken(string $token): ?string
    {
        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            return null;
        }
        [$payload, $sig] = $parts;
        $ref = base64_decode(strtr($payload, '-_', '+/'), false);
        if ($ref === false || $ref === '') {
            return null;
        }
        $expected = substr(hash_hmac('sha256', $ref, (string) config('app.key')), 0, 16);
        if (! hash_equals($expected, (string) $sig)) {
            return null;
        }
        if (! preg_match('/^[cpeo]:.+$/D', $ref)) {
            return null;
        }

        return $ref;
    }

    public function isCanonicalRef(string $ref): bool
    {
        return str_starts_with($ref, self::PREFIX_CANONICAL);
    }

    public function canonicalIdFromRef(string $ref): ?int
    {
        if (! $this->isCanonicalRef($ref)) {
            return null;
        }
        $id = (int) substr($ref, strlen(self::PREFIX_CANONICAL));

        return $id > 0 ? $id : null;
    }

    /** wa.me digits = E.164 without the leading '+'. */
    public function whatsappDigits(?string $e164): ?string
    {
        if ($e164 === null || ! str_starts_with($e164, '+')) {
            return null;
        }

        return substr($e164, 1);
    }

    /**
     * A merchant-initiated WhatsApp link. Phase 1 is a plain wa.me link — no
     * API messaging, no automated/bulk marketing.
     */
    public function whatsappUrl(?string $e164): ?string
    {
        $digits = $this->whatsappDigits($e164);
        if ($digits === null) {
            return null;
        }

        return 'https://wa.me/' . $digits;
    }

    /** tel: link — only for mobile when a valid normalized phone exists. */
    public function callUrl(?string $e164): ?string
    {
        if ($e164 === null) {
            return null;
        }

        return 'tel:' . preg_replace('/[^0-9+]/', '', $e164);
    }

    /**
     * CSV formula injection guard: prefixes dangerous leading characters for
     * free-text cells (names, emails, phones, addresses). Numeric sums are NOT
     * passed through here — they are emitted as raw numbers.
     */
    public function csvSafe(?string $value): string
    {
        $str = (string) $value;
        if ($str === '') {
            return $str;
        }
        if (in_array($str[0], ['=', '+', '-', '@'], true) || $str[0] === "\t" || $str[0] === "\r") {
            return "'" . $str;
        }

        return $str;
    }
}