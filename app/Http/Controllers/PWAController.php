<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\StoreConfiguration;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PWAController extends Controller
{
    /**
     * Sanitize a URL path and extract the relative path after /storage/.
     * Prevents path traversal attacks (../../etc/passwd).
     */
    private function sanitizeAndExtractStoragePath(string $urlPath): ?string
    {
        // Only allow safe characters in the path
        $cleanPath = preg_replace('/[^a-zA-Z0-9\/_.-]/', '', $urlPath);

        // Split on /storage/ and take everything after it
        $parts = explode('/storage/', $cleanPath, 2);
        if (count($parts) < 2) {
            return null;
        }

        $relativePath = $parts[1];

        // Collapse any remaining ../ sequences to prevent path traversal
        while (strpos($relativePath, '../') !== false) {
            $relativePath = str_replace('../', '', $relativePath);
        }
        while (strpos($relativePath, '..\\') !== false) {
            $relativePath = str_replace('..\\', '', $relativePath);
        }

        // Final check: ensure the resolved path stays within the storage directory
        $resolvedPath = realpath(storage_path('app/public/' . $relativePath));
        $baseStoragePath = realpath(storage_path('app/public'));
        if ($resolvedPath === false || $baseStoragePath === false) {
            return null;
        }
        if (strpos($resolvedPath, $baseStoragePath) !== 0) {
            return null;
        }

        return $relativePath;
    }

    /**
     * Check whether the store's effective plan allows the PWA feature.
     *
     * Uses the store owner's current plan (with default-plan fallback) so that
     * sub-users and plan-less stores resolve consistently with the rest of the app.
     */
    private function pwaAllowedForStore($store)
    {
        if (!$store->user) {
            return false;
        }

        $plan = $store->user->getCurrentPlan();

        return $plan && $plan->pwa_business === 'on';
    }

    /**
     * Generate PWA manifest for store
     */
    public function manifest($storeSlug)
    {
        $store = Store::where('slug', $storeSlug)->firstOrFail();

        if (!$store->enable_pwa || !$this->pwaAllowedForStore($store)) {
            return response()->json(['error' => 'PWA not available for this store'], 404);
        }

        $storeUrl = rtrim($store->getStoreUrl(), '/') . '/';
        
        $manifest = [
            'name' => $store->pwa_name ?: $store->name,
            'short_name' => $store->pwa_short_name ?: mb_substr($store->name, 0, 12),
            'description' => $store->pwa_description ?: $store->description,
            'start_url' => $storeUrl,
            'scope' => $storeUrl,
            'display' => $store->pwa_display ?: 'standalone',
            'background_color' => $store->pwa_background_color ?: '#ffffff',
            'theme_color' => $store->pwa_theme_color ?: '#3B82F6',
            'orientation' => $store->pwa_orientation ?: 'portrait',
            'categories' => ['shopping', 'business'],
            'icons' => generatePWAIcons($store)
        ];

        return response()->json($manifest)
            ->header('Content-Type', 'application/manifest+json')
            ->header('Cache-Control', 'public, max-age=3600');
    }

    /**
     * Generate service worker for store
     */
    public function serviceWorker($storeSlug)
    {
        $store = Store::where('slug', $storeSlug)->firstOrFail();
        
        if (!$store->enable_pwa || !$this->pwaAllowedForStore($store)) {
            return response('// PWA not available', 404, ['Content-Type' => 'application/javascript']);
        }

        // Safely JS-escape the store name before injecting into the service-worker script.
        // Prevents JS injection if the store name contains quotes or special characters.
        $safeStoreName = json_encode($store->name ?? '', JSON_HEX_TAG | JSON_HEX_AMP);

        $storeUrl = rtrim($store->getStoreUrl(), '/');
        $buildVersion = $this->resolveBuildVersion();
        $cacheName = 'store-' . $store->slug . '-' . $buildVersion;
        
        $serviceWorker = "
const CACHE_NAME = '{$cacheName}';
const OFFLINE_FALLBACK = '{$storeUrl}/';

// Build version: {$buildVersion} (manifest hash, changes on deploy)

self.addEventListener('install', function(event) {
    // Do NOT precache dynamic HTML snapshots (/, /products, /cart, /wishlist).
    // Previous static precache caused stale HTML to persist indefinitely.
    // Install is now lightweight; new SW activates immediately via skipWaiting.
    self.skipWaiting();
});

self.addEventListener('fetch', function(event) {
    // Only handle GET navigation requests; never cache POST/PUT/DELETE (checkout, order, payment).
    if (event.request.method !== 'GET') return;
    // Handle navigation requests: network-first, offline fallback only.
    // No precached HTML — ensures returning users always get fresh server HTML online.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(function() {
                // Offline: fallback to cached offline page if ever cached, else fail gracefully.
                return caches.match(OFFLINE_FALLBACK);
            })
        );
        return;
    }
    // For non-navigation requests (hashed assets, images): cache-first is safe
    // because Vite hashes filenames; same hash = same content.
    // Still bypass for sensitive API paths to avoid caching user-specific JSON.
    var url = new URL(event.request.url);
    if (url.pathname.indexOf('/api/') !== -1 || url.pathname.indexOf('/checkout') !== -1 || url.pathname.indexOf('/order') !== -1) {
        return;
    }
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(function(networkResponse) {
                    // Optionally runtime-cache hashed assets for offline; not required for correctness.
                    return networkResponse;
                }).catch(function() { return response; });
            }
        )
    );
});

self.addEventListener('activate', function(event) {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Web Push Notifications
self.addEventListener('push', function(event) {
    var data = {};
        data = { title: {$safeStoreName}, body: event.data ? event.data.text() : '' };
    }

    var title = data.title || {$safeStoreName};
    var options = {
        body: data.body || '',
        icon: data.icon || '{$storeUrl}/pwa-icon/192',
        badge: data.badge || '{$storeUrl}/pwa-icon/96',
        data: {
            url: data.url || '{$storeUrl}/',
            notification_id: data.notification_id || null,
            type: data.type || null
        }
    };

    if (data.image) options.image = data.image;

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    var url = (event.notification.data && event.notification.data.url) || '{$storeUrl}/';
    var notificationId = event.notification.data && event.notification.data.notification_id;

    // Record notification click
    if (notificationId) {
        fetch('{$storeUrl}/api/notifications/' + notificationId + '/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).catch(function() {});
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if ('focus' in client) {
                    return client.navigate(url).then(function() { return client.focus(); });
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
";

        return response($serviceWorker)
            ->header('Content-Type', 'text/javascript')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Service-Worker-Allowed', '/');
    }

    /**
     * Resolve a deterministic build version for cache-busting without exposing secrets.
     * Uses hash of Vite manifest (changes whenever frontend is rebuilt, stable between requests).
     * Falls back to APP_BUILD_VERSION env or filemtime to remain deterministic even if manifest missing.
     */
    private function resolveBuildVersion(): string
    {
        try {
            $manifestPath = public_path('build/manifest.json');
            if (is_file($manifestPath) && is_readable($manifestPath)) {
                $hash = @md5_file($manifestPath);
                if (is_string($hash) && strlen($hash) >= 8) {
                    return substr($hash, 0, 8);
                }
            }
        } catch (\Throwable $e) {
            // fall through to env fallback
        }
        // Env override (set by CI/deploy to git SHA short) — must be hex/alnum only.
        $envVer = trim((string) env('APP_BUILD_VERSION', ''));
        if ($envVer !== '' && preg_match('/^[a-zA-Z0-9._-]{1,32}$/', $envVer)) {
            return substr($envVer, 0, 8);
        }
        // Last resort: app version config (no secret) + file exists guard.
        $appVer = trim((string) config('app.build_version', ''));
        if ($appVer !== '' && preg_match('/^[a-zA-Z0-9._-]{1,32}$/', $appVer)) {
            return substr($appVer, 0, 8);
        }
        return 'v1';
    }

    /**
     * Generate dynamic PWA icon resized to specific dimensions
     */
    public function icon($storeSlug, $size)
    {
        $store = Store::where('slug', $storeSlug)->first();
        if (!$store) return abort(404);

        $iconUrl = getPWAIconUrl($store);
        $path = '';

        $urlPath = parse_url($iconUrl, PHP_URL_PATH);
        if ($urlPath) {
            // Prevent path traversal: only allow alphanumeric, dashes, underscores, slashes, and dots
            $cleanPath = preg_replace('/[^a-zA-Z0-9\/_.-]/', '', $urlPath);
            // Collapse any remaining ../ sequences
            while (strpos($cleanPath, '../') !== false) {
                $cleanPath = str_replace('../', '', $cleanPath);
            }
            $urlPath = $cleanPath;

            if (str_contains($urlPath, '/storage/')) {
                $relativePath = explode('/storage/', $urlPath)[1];
                $path = storage_path('app/public/' . $relativePath);
            }

            if (!$path || !file_exists($path)) {
                $segments = explode('/', ltrim($urlPath, '/'));
                foreach (['uploads', 'media', 'images', 'favicon', 'logo'] as $marker) {
                    $index = array_search($marker, $segments);
                    if ($index !== false) {
                        $subPath = implode('/', array_slice($segments, $index));
                        $possiblePath = public_path($subPath);
                        if (file_exists($possiblePath)) {
                            $path = $possiblePath;
                            break;
                        }
                    }
                }
            }

            if (!$path || !file_exists($path)) {
                $relativeFromUrl = ltrim($urlPath, '/');
                $publicPath = public_path($relativeFromUrl);
                if (file_exists($publicPath)) {
                    $path = $publicPath;
                }
            }
        }

        if (!$path || !file_exists($path) || is_dir($path)) {
            $tempPath = null;
            try {
                \App\Services\DynamicStorageService::configureDynamicDisks();
                $disk = \App\Services\StorageConfigService::getActiveDisk();

                if ($urlPath && str_contains($urlPath, '/storage/')) {
                    $relativePath = $this->sanitizeAndExtractStoragePath($urlPath);

                    if ($relativePath && $disk !== 'public' && $disk !== 'local') {
                        if (\Illuminate\Support\Facades\Storage::disk($disk)->exists($relativePath)) {
                            $tempPath = tempnam(sys_get_temp_dir(), 'pwa_icon_');
                            $contents = \Illuminate\Support\Facades\Storage::disk($disk)->get($relativePath);
                            file_put_contents($tempPath, $contents);
                            $path = $tempPath;
                        }
                    }
                }
            } catch (\Exception $e) {
            }

            if (!$path || !file_exists($path)) {
                $path = public_path('images/logos/favicon.png');
                if (!file_exists($path)) {
                    $faviconMediaPath = storage_path('app/public/media/favicon.png');
                    if (file_exists($faviconMediaPath)) {
                        $path = $faviconMediaPath;
                    } else {
                        if (isset($tempPath) && $tempPath && file_exists($tempPath)) {
                            @unlink($tempPath);
                        }
                        return response(base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='), 200, ['Content-Type' => 'image/png']);
                    }
                }
            }
        }

        $size = (int)$size;
        if ($size <= 0 || $size > 1024) $size = 192;

        try {
            $imageInfo = getimagesize($path);
            if (!$imageInfo) throw new \Exception('Invalid image');

            switch ($imageInfo[2]) {
                case IMAGETYPE_JPEG: $sourceImg = @imagecreatefromjpeg($path); break;
                case IMAGETYPE_PNG: $sourceImg = @imagecreatefrompng($path); break;
                case IMAGETYPE_GIF: $sourceImg = @imagecreatefromgif($path); break;
                case IMAGETYPE_WEBP: $sourceImg = @imagecreatefromwebp($path); break;
                default: return response()->file($path, ['Content-Type' => 'image/png']);
            }

            if (!$sourceImg) throw new \Exception('Failed to load image');

            $destImg = imagecreatetruecolor($size, $size);
            imagealphablending($destImg, false);
            imagesavealpha($destImg, true);
            $transparent = imagecolorallocatealpha($destImg, 255, 255, 255, 127);
            imagefill($destImg, 0, 0, $transparent);

            imagecopyresampled($destImg, $sourceImg, 0, 0, 0, 0, $size, $size, $imageInfo[0], $imageInfo[1]);

            ob_start();
            imagepng($destImg);
            $imageData = ob_get_clean();

            imagedestroy($sourceImg);
            imagedestroy($destImg);

            if (isset($tempPath) && $tempPath && file_exists($tempPath)) {
                @unlink($tempPath);
            }

            return response($imageData, 200, [
                'Content-Type' => 'image/png',
                'Cache-Control' => 'public, max-age=86400',
            ]);

        } catch (\Exception $e) {
            if (isset($tempPath) && $tempPath && file_exists($tempPath)) {
                @unlink($tempPath);
            }
            return response()->file($path, ['Content-Type' => 'image/png']);
        }
    }
}