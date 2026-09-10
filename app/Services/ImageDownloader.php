<?php

namespace App\Services;

use App\Services\Domain\PublicIpGuard;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * SSRF-safe remote image downloader for product import.
 *
 * Downloads a remote image, validates MIME/content, and stores it under
 * the store's active storage disk. Returns a relative path suitable for
 * the product's cover_image / images columns.
 */
class ImageDownloader
{
    /** Maximum file size in bytes (5 MB — consistent with product image upload). */
    public const MAX_BYTES = 5 * 1024 * 1024;

    /** HTTP timeout in seconds. */
    public const TIMEOUT = 15;

    /** Maximum redirect hops. */
    public const MAX_REDIRECTS = 3;

    /** Allowed image MIME types (content-verified, not header-trusted). */
    public const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
    ];

    /** Magic bytes → MIME for content-level validation. */
    private const MAGIC_SIGNATURES = [
        "\xFF\xD8\xFF"                => 'image/jpeg',
        "\x89PNG\r\n\x1A\n"           => 'image/png',
        "GIF87a"                       => 'image/gif',
        "GIF89a"                       => 'image/gif',
        "RIFF"                         => 'image/webp',  // RIFF....WEBP
        "<svg"                         => 'image/svg+xml',
        "<?xml"                        => 'image/svg+xml',
        "BM"                           => 'image/bmp',
    ];

    /**
     * Download a remote image and store it locally.
     *
     * Redirects are followed manually, hop-by-hop, so every intermediate and
     * final host is SSRF-checked BEFORE the request is issued. A redirect into
     * a blocked network is never actually requested.
     *
     * @return array{path: string, mime: string}|array{error: string}
     */
    public function download(string $url, int $storeId): array
    {
        $current = $url;
        $hops = 0;

        while (true) {
            if ($this->isBlockedUrl($current)) {
                return ['error' => 'URL محظورة (SSRF/خاسي)'];
            }

            try {
                $response = Http::withOptions([
                    'connect_timeout' => self::TIMEOUT,
                    'timeout' => self::TIMEOUT,
                    'allow_redirects' => false,
                    'verify' => true,
                    'http_errors' => false,
                ])->get($current);
            } catch (ConnectionException $e) {
                return ['error' => 'فشل الاتصال: ' . $e->getMessage()];
            } catch (\Throwable $e) {
                return ['error' => 'خطأ في تحميل الصورة: ' . $e->getMessage()];
            }

            // Follow redirects manually with SSRF validation at every hop.
            if (in_array($response->status(), [301, 302, 303, 307, 308], true)) {
                if (++$hops > self::MAX_REDIRECTS) {
                    return ['error' => 'عدد كبير من التوجيهات عند تحميل الصورة'];
                }
                $location = trim((string) $response->header('Location'));
                if ($location === '') {
                    return ['error' => 'توجيه غير صالح عند تحميل الصورة'];
                }
                $next = $this->resolveRedirectUrl($current, $location);
                if ($next === null) {
                    return ['error' => 'توجيه غير صالح عند تحميل الصورة'];
                }
                $current = $next;
                continue;
            }

            if ($response->failed()) {
                return ['error' => 'خطأ HTTP ' . $response->status() . ' عند تحميل الصورة'];
            }

            break;
        }

        $body = $response->body();
        $bytes = strlen($body);

        if ($bytes === 0) {
            return ['error' => 'الصورة فارغة'];
        }

        if ($bytes > self::MAX_BYTES) {
            return ['error' => 'حجم الصورة يتجاوز الحد الأقصى (' . round(self::MAX_BYTES / 1024 / 1024, 1) . ' MB)'];
        }

        // Content-level MIME validation (magic bytes — not header-trusted).
        $detectedMime = $this->detectMimeFromContent($body);
        if ($detectedMime === null) {
            return ['error' => 'نوع الصورة غير مدعوم (يجب أن تكون JPEG/PNG/GIF/WebP/SVG/BMP)'];
        }
        if (! in_array($detectedMime, self::ALLOWED_MIMES, true)) {
            return ['error' => 'نوع الصورة غير مدعوم: ' . $detectedMime];
        }

        // For SVG: reject if it contains dangerous content (scripts, event handlers).
        if ($detectedMime === 'image/svg+xml') {
            $lower = mb_strtolower($body, 'UTF-8');
            if (str_contains($lower, '<script') || str_contains($lower, 'javascript:') ||
                str_contains($lower, 'onerror') || str_contains($lower, 'onload') ||
                str_contains($lower, 'onclick')) {
                return ['error' => 'SVG يحتوي على محتوى غير آمن'];
            }
        }

        // Generate a unique filename.
        $extension = $this->mimeToExtension($detectedMime);
        $hash = hash('sha256', $url);
        $filename = Str::uuid() . '_' . substr($hash, 0, 12) . '.' . $extension;

        // Store under store-scoped path.
        $path = 'products/' . $storeId . '/' . $filename;
        $disk = StorageConfigService::getActiveDisk();
        Storage::disk($disk)->put($path, $body);

        return [
            'path' => $path,
            'mime' => $detectedMime,
        ];
    }

    /**
     * Check whether a URL is blocked (SSRF protection).
     * Uses the same pattern as ErpSyncService::isBlockedUrl with
     * additional DNS resolution checks via PublicIpGuard.
     */
    public function isBlockedUrl(string $url): bool
    {
        $parts = parse_url($url);
        if (! $parts || empty($parts['host'])) {
            return true;
        }

        $scheme = strtolower($parts['scheme'] ?? '');
        if (! in_array($scheme, ['http', 'https'], true)) {
            return true;
        }

        $host = strtolower($parts['host']);

        // Block localhost and cloud metadata hosts.
        if (in_array($host, ['localhost', 'metadata.google.internal'], true)) {
            return true;
        }
        if ($host === '169.254.169.254') {
            return true;
        }

        // Hostname-level private/local fingerprints (deterministic — does not
        // depend on the resolving nameserver being reachable).
        if ($this->isLocalHostname($host)) {
            return true;
        }

        // IP literal check (strip brackets for IPv6 literals).
        $literal = trim($host, '[]');
        if (filter_var($literal, FILTER_VALIDATE_IP)) {
            if (! PublicIpGuard::isPublic($literal)) {
                return true;
            }
        } else {
            // DNS resolution check — block if it resolves to a private IP.
            $ip = @gethostbyname($host);
            if ($ip !== $host && filter_var($ip, FILTER_VALIDATE_IP)) {
                if (! PublicIpGuard::isPublic($ip)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Detect hostnames that are conventionally private/local even when DNS
     * cannot resolve them here (defense in depth — SSRF must not depend on
     * the environment's nameserver).
     */
    private function isLocalHostname(string $host): bool
    {
        // localhost variants.
        if ($host === 'localhost' || str_starts_with($host, 'localhost.') || str_ends_with($host, '.localhost')) {
            return true;
        }

        if ($host === 'metadata.google.internal') {
            return true;
        }

        // Private/reserved DNS namespaces.
        foreach (['.internal', '.local', '.test', '.lan', '.home', '.corp'] as $suffix) {
            if (str_ends_with($host, $suffix)) {
                return true;
            }
        }

        // Integer/hex/octal encoded IPv4 forms that bypass FILTER_VALIDATE_IP
        // (e.g. 2130706433, 0x7f000001, 0177.0.0.1).
        if (preg_match('/^(0x[0-9a-f]+|\d{1,10})$/i', $host)) {
            return true;
        }

        // Dotted shorthand forms that are NOT valid IPv4 but fully numeric
        // (e.g. 127.1, 192.168.1) plus dotted hex/octal encodings.
        if (preg_match('/^\d+(\.\d+)$/', $host) ||
            preg_match('/^\d+(\.\d+){2}$/', $host) ||
            preg_match('/^0x[0-9a-f]+(\.[0-9a-f]+)+$/i', $host) ||
            preg_match('/^0\d+(\.\d+)+$/', $host)) {
            return true;
        }

        return false;
    }

    /**
     * Resolve a (possibly relative) Location header into an absolute URL
     * against the current base URL. Returns null when unresolvable.
     */
    private function resolveRedirectUrl(string $base, string $location): ?string
    {
        $location = trim($location);
        if ($location === '') {
            return null;
        }
        // Fully-qualified location.
        $scheme = strtolower((string) parse_url($location, PHP_URL_SCHEME));
        if (in_array($scheme, ['http', 'https'], true)) {
            return $location;
        }
        // Scheme-relative (//host/path).
        if (str_starts_with($location, '//')) {
            $baseScheme = (string) parse_url($base, PHP_URL_SCHEME);

            return $baseScheme . ':' . $location;
        }
        // Protocol-relative or path-relative.
        $parts = parse_url($base);
        if (!$parts || empty($parts['host'])) {
            return null;
        }
        $origin = (string) $parts['scheme'] . '://' . $parts['host'];
        if (!empty($parts['port'])) {
            $origin .= ':' . $parts['port'];
        }

        if (str_starts_with($location, '/')) {
            // Absolute path.
            return $origin . $location;
        }
        // Relative path: strip the current path to its directory, then append.
        $basePath = (string) ($parts['path'] ?? '');
        $dir = substr($basePath, 0, (int) strrpos($basePath, '/') + 1);
        $resolved = preg_replace('#/+#', '/', $dir . $location) ?? $dir . $location;

        // Collapse `.` and `..` segments without filesystem access.
        $segments = [];
        foreach (explode('/', $resolved) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }
            if ($segment === '..') {
                array_pop($segments);
                continue;
            }
            $segments[] = $segment;
        }

        return $origin . '/' . implode('/', $segments);
    }

    /**
     * Detect MIME type from file content (magic bytes), not from headers.
     */
    private function detectMimeFromContent(string $content): ?string
    {
        foreach (self::MAGIC_SIGNATURES as $signature => $mime) {
            $len = strlen($signature);
            if (substr($content, 0, $len) === $signature) {
                // WebP needs extra check: RIFF header + WEBP signature at offset 8.
                if ($mime === 'image/webp') {
                    if (strlen($content) >= 12 && substr($content, 8, 4) === 'WEBP') {
                        return $mime;
                    }
                    continue;
                }

                return $mime;
            }
        }

        return null;
    }

    /**
     * Map MIME type to file extension.
     */
    private function mimeToExtension(string $mime): string
    {
        return match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/svg+xml' => 'svg',
            'image/bmp' => 'bmp',
            default => 'jpg',
        };
    }
}
