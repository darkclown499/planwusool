<?php

namespace App\Services\Domain;

/**
 * SSRF guard: decides whether an IP address is safe for the server to connect
 * out to as part of a live DNS/SSL probe.
 *
 * A merchant-controlled hostname may resolve to an internal destination, so
 * this guard is applied to the RESOLVED IP (never only the domain text). It
 * rejects loopback, RFC1918 private, link-local (incl. 169.254.169.254 cloud
 * metadata), CGNAT, documentation, multicast, broadcast and all other reserved
 * ranges, for both IPv4 and IPv6 (incl. IPv4-mapped forms).
 */
class PublicIpGuard
{
    /**
     * Whether an IP string is globally routable and thus safe to probe.
     */
    public static function isPublic(?string $ip): bool
    {
        if ($ip === null || $ip === '') {
            return false;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return self::isPublicV4($ip);
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            return self::isPublicV6($ip);
        }

        return false;
    }

    private static function isPublicV4(string $ip): bool
    {
        $long = ip2long($ip);
        if ($long === false) {
            return false;
        }
        // Treat as unsigned 32-bit.
        $long = $long + 4294967296 * ($long < 0 ? 1 : 0);

        $in = function (int $start, int $end) use ($long): bool {
            return $long >= $start && $long <= $end;
        };

        return !(
            $in(0x00000000, 0x00FFFFFF) ||      // 0.0.0.0/8
            $in(0x0A000000, 0x0AFFFFFF) ||      // 10.0.0.0/8
            $in(0x64400000, 0x647FFFFF) ||      // 100.64.0.0/10 CGNAT
            $in(0x7F000000, 0x7FFFFFFF) ||      // 127.0.0.0/8 loopback
            $in(0xA9FE0000, 0xA9FEFFFF) ||      // 169.254.0.0/16 link-local + metadata
            $in(0xAC100000, 0xAC1FFFFF) ||      // 172.16.0.0/12
            $in(0xC0000000, 0xC00000FF) ||      // 192.0.0.0/24
            $in(0xC0000200, 0xC00002FF) ||      // 192.0.2.0/24 TEST-NET-1
            $in(0xC0A80000, 0xC0A8FFFF) ||      // 192.168.0.0/16
            $in(0xC6120000, 0xC613FFFF) ||      // 198.18.0.0/15 bench
            $in(0xC6336400, 0xC63364FF) ||      // 198.51.100.0/24 TEST-NET-2
            $in(0xCB007100, 0xCB0071FF) ||      // 203.0.113.0/24 TEST-NET-3
            $in(0xE0000000, 0xFFFFFFFF)         // 224/4 multicast + 240/4 reserved + broadcast
        );
    }

    private static function isPublicV6(string $ip): bool
    {
        $packed = @inet_pton($ip);
        if ($packed === false || strlen($packed) !== 16) {
            return false;
        }
        $inet = unpack('H*', $packed)[1];

        // Unspecified :: and loopback ::1
        if ($inet === '00000000000000000000000000000000') {
            return false;
        }
        if ($inet === '00000000000000000000000000000001') {
            return false;
        }

        // IPv4-mapped ::ffff:x.x.x.x (10 zero bytes + ffff + IPv4) and the
        // deprecated IPv4-compatible ::x.x.x.x (12 zero bytes + IPv4): both end
        // in a 32-bit IPv4 literal. PHP normalizes the leading zero run, so we
        // match it structurally rather than by a fixed byte offset.
        if (preg_match('/^(?:0{20}ffff|0{24})[0-9a-f]{8}$/', $inet)) {
            $v4 = long2ip(hexdec(substr($inet, -8)));
            return self::isPublicV4($v4);
        }

        // Documentation 2001:db8::/32 — first 4 bytes (8 hex chars).
        if (substr($inet, 0, 8) === '20010db8') {
            return false;
        }

        $first16 = hexdec(substr($inet, 0, 4));

        // Link-local fe80::/10
        if (($first16 & 0xffc0) === 0xfe80) {
            return false;
        }
        // Unique-local fc00::/7
        if (($first16 & 0xfe00) === 0xfc00) {
            return false;
        }
        // Multicast ff00::/8
        if (($first16 & 0xff00) === 0xff00) {
            return false;
        }

        return true;
    }
}
