<?php

namespace App\Services;

/**
 * Phone Normalizer for Wusool — handles Palestine/Israel region numbers.
 *
 * Supports:
 *  - 0591234567 → +970591234567
 *  - 0561234567 → +970561234567
 *  - +970591234567 → +970591234567
 *  - 970591234567 → +970591234567
 *  - +972591234567 → +972591234567
 *  - 972591234567 → +972591234567
 *  - Numbers with spaces/dashes: +970 59 123 4567 → +970591234567
 *
 * Returns E.164 format (+970... or +972...) or null if invalid.
 */
class PhoneNormalizer
{
    public static function normalize(string $raw): ?string
    {
        $clean = preg_replace('/[^0-9+]/', '', trim($raw));
        if (!$clean) return null;

        // Remove all non-digits for analysis, keep leading + for E.164 check
        $digits = preg_replace('/[^0-9]/', '', $clean);
        if (!$digits) return null;

        // Already E.164 with +
        if (str_starts_with($clean, '+')) {
            // Must be +970 or +972 for our region, or other valid E.164 (10-15 digits)
            if (preg_match('/^\+(970|972)[0-9]{8,9}$/', $clean)) {
                return $clean;
            }
            if (preg_match('/^\+[0-9]{10,15}$/', $clean)) {
                return $clean;
            }
            return null;
        }

        // Handle 00 prefix (e.g., 00970591234567)
        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
            if (str_starts_with($digits, '970') || str_starts_with($digits, '972')) {
                return '+' . $digits;
            }
            if (strlen($digits) >= 10 && strlen($digits) <= 15) {
                return '+' . $digits;
            }
            return null;
        }

        // Handle 970/972 without +
        if (str_starts_with($digits, '970') || str_starts_with($digits, '972')) {
            if (strlen($digits) >= 11 && strlen($digits) <= 12) {
                return '+' . $digits;
            }
        }

        // Handle local Palestinian numbers: 059xxxxxxx or 056xxxxxxx (10 digits starting with 05)
        if (preg_match('/^05[0-9]{8}$/', $digits)) {
            // 05x is local, convert to +9705x
            // 0591234567 → 970591234567 → +970591234567
            return '+970' . substr($digits, 1);
        }

        // Handle 5xx without leading 0 (e.g., 591234567) — assume Palestinian if 9 digits starting with 5,6,9
        if (preg_match('/^5[0-9]{8}$/', $digits)) {
            return '+970' . $digits;
        }

        // Handle +970 without + but with 059 already handled, fallback: if 10-15 digits, treat as E.164 without +
        if (strlen($digits) >= 10 && strlen($digits) <= 15) {
            // For safety, only normalize 059/056 style already handled; otherwise require explicit country code
            // So we reject bare 10-digit numbers that don't start with 05
            return null;
        }

        return null;
    }

    public static function isValid(string $raw): bool
    {
        return self::normalize($raw) !== null;
    }

    public static function mask(string $e164): string
    {
        if (strlen($e164) < 8) return str_repeat('*', strlen($e164));
        return substr($e164, 0, 4) . str_repeat('*', strlen($e164) - 8) . substr($e164, -4);
    }
}
