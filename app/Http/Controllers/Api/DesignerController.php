<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MediaItem;
use App\Models\Store;
use App\Support\ThemeAssetSanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/**
 * Visual Designer API — the drag & drop store builder.
 *
 * Unlike TemplateEditorController (form-based, tier-gated per field), the
 * designer owns the full store layout: the ordered section list, the design
 * tokens and the active template. Any store owner (or admin) with access may
 * redesign their own store; premium templates stay gated by the plan-aware
 * theme picker on the client side.
 */
class DesignerController extends Controller
{
    public function show(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $overrides = $store->template_overrides ?? [];

        // Store categories power the designer's category multi-select editor.
        // Image values follow the same /storage/... convention as the storefront.
        $categories = \App\Models\Category::query()
            ->where('store_id', $store->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'image'])
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'image' => $c->image,
            ])
            ->values();

        // Fallback to StoreConfiguration for custom assets (canonical source is template_overrides, but legacy stores may have it in StoreConfiguration)
        $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
        return response()->json([
            'success' => true,
            'theme' => $store->getTemplateSlug(),
            'sections' => $overrides['sections'] ?? [],
            'design_tokens' => $store->design_tokens ?? [],
            'content' => $store->store_content ?? [],
            'custom_css' => $overrides['custom_css'] ?? $config['custom_css'] ?? '',
            'custom_js' => $overrides['custom_js'] ?? $config['custom_javascript'] ?? '',
            'head_inject' => $overrides['head_inject'] ?? $config['custom_head_scripts'] ?? '',
            'availableThemes' => $request->user()->getAvailableThemes(),
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $user = $request->user();

        $validated = $request->validate([
            'theme' => 'sometimes|string',
            'sections' => 'sometimes|array',
            'design_tokens' => 'sometimes|array',
            'content' => 'sometimes|array|max:300',
            'custom_css' => 'sometimes|nullable|string|max:100000',
            'custom_js' => 'sometimes|nullable|string|max:100000',
            'head_inject' => 'sometimes|nullable|string|max:100000',
        ]);

        if (isset($validated['theme'])) {
            $available = $user->getAvailableThemes();
            $theme = Store::normalizeThemeSlug($validated['theme']);
            if (!in_array($theme, $available, true)) {
                return response()->json(['error' => 'This template is not available on your current plan.'], 422);
            }
            $store->theme = $theme;
        }

        if (isset($validated['sections'])) {
            $store->template_overrides = array_merge($store->template_overrides ?? [], [
                'sections' => $this->normalizeSections($validated['sections']),
            ]);
        }

        if (isset($validated['design_tokens'])) {
            $store->design_tokens = $validated['design_tokens'];
            // Sync branding to StoreConfiguration so ThemeController fallback chain
            // and legacy integrations see the same logo/favicon. Single source remains
            // design_tokens; this is a mirrored write for backward compat.
            try {
                if (array_key_exists('logo', $validated['design_tokens'])) {
                    \App\Models\StoreConfiguration::setConfiguration($store->id, 'logo', (string) ($validated['design_tokens']['logo'] ?? ''));
                }
                if (array_key_exists('favicon', $validated['design_tokens'])) {
                    \App\Models\StoreConfiguration::setConfiguration($store->id, 'favicon', (string) ($validated['design_tokens']['favicon'] ?? ''));
                }
            } catch (\Throwable $e) {
                // non-fatal
            }
        }

        // Slot content (v2 editor): dotted keys expand into the store_content
        // blob so templates read them via the merged content object.
        // FIX: correctly persist nested structures like hero_banner (type, images[], video_url, overlay_opacity)
        // without dropping them on refresh. Previous logic used array_values(array_filter(is_scalar)) which
        // stripped associative keys and nested arrays (e.g., hero_images).
        if (isset($validated['content']) && is_array($validated['content'])) {
            $merged = $store->store_content ?? [];
            foreach ($validated['content'] as $key => $value) {
                $key = (string) $key;
                if ($key === '' || strlen($key) > 100) {
                    continue;
                }
                $sanitized = $this->sanitizeContentValue($value);
                // Allow null to clear a key, but skip invalid structures
                if ($sanitized === null && $value !== null && !is_scalar($value) && !is_array($value)) {
                    continue;
                }
                data_set($merged, $key, $sanitized);
            }
            // Normalize hero_banner.media as canonical ordered collection (max 10, stable ids, per-item crop)
            if (isset($merged['hero_banner']['media']) && is_array($merged['hero_banner']['media'])) {
                $media = array_slice($merged['hero_banner']['media'], 0, 10);
                $normalized = [];
                foreach ($media as $idx => $item) {
                    if (!is_array($item)) continue;
                    $type = strtolower(trim((string)($item['type'] ?? '')));
                    if (!in_array($type, ['image','video','youtube'], true)) continue;
                    $src = trim((string)($item['src'] ?? $item['url'] ?? ''));
                    if ($src === '') continue;
                    if ($type === 'youtube') {
                        $src = $this->extractYoutubeId($src) ?? $src;
                        if (!preg_match('/^[a-zA-Z0-9_-]{11}$/', $src)) continue;
                    } else {
                        if (!str_starts_with($src, '/storage') && !str_starts_with($src, 'http')) continue;
                        $isLocal = str_starts_with($src, '/storage') || preg_match('#/storage/#i', $src) === 1;
                        if ($isLocal) {
                            // FAIL-CLOSED local ownership: a local /storage reference must resolve to a
                            // MediaItem row owned by this store, OR already exist verbatim inside this
                            // store's SERVER-SIDE saved hero content (legacy exception). Unknown or
                            // foreign local paths are rejected — never silently allowed.
                            $storedContent = $store->store_content ?? [];
                            $ownership = $this->resolveLocalMediaOwnership($src, $store->id, $storedContent);
                            if (!$ownership->allows) continue;
                            $src = $ownership->path;
                        }
                        $srcMobCheck = $item['srcMobile'] ?? $item['src_mobile'] ?? null;
                        if ($srcMobCheck !== null && $srcMobCheck !== '' && is_string($srcMobCheck)) {
                            $mobIsLocal = str_starts_with(trim($srcMobCheck), '/storage') || preg_match('#/storage/#i', $srcMobCheck) === 1;
                            if ($mobIsLocal) {
                                $mobOwnership = $this->resolveLocalMediaOwnership($srcMobCheck, $store->id, $storedContent ?? []);
                                if (!$mobOwnership->allows) continue;
                            }
                        }
                    }
                    $id = trim((string)($item['id'] ?? ''));
                    if ($id === '' || strlen($id) > 100) $id = 'media-' . $idx . '-' . substr(md5($src), 0, 8);
                    $pos = isset($item['position']) ? trim((string)$item['position']) : '50% 50%';
                    if (!preg_match('/^\d{1,3}% \d{1,3}%$/', $pos)) $pos = '50% 50%';
                    else { [$x,$y]=explode(' ', $pos); $x=max(0,min(100,(int)rtrim($x,'%'))); $y=max(0,min(100,(int)rtrim($y,'%'))); $pos=$x.'% '.$y.'%'; }
                    $posMob = isset($item['positionMobile']) ? trim((string)$item['positionMobile']) : (isset($item['position_mobile']) ? trim((string)$item['position_mobile']) : null);
                    if ($posMob !== null && $posMob !== '' && !preg_match('/^\d{1,3}% \d{1,3}%$/', $posMob)) $posMob='50% 50%';
                    elseif ($posMob !== null && $posMob !== '') { [$xm,$ym]=explode(' ', $posMob); $xm=max(0,min(100,(int)rtrim($xm,'%'))); $ym=max(0,min(100,(int)rtrim($ym,'%'))); $posMob=$xm.'% '.$ym.'%'; }
                    // Per-banner optional content — canonical keys: heading/subtitle/cta_label/cta_link/show_content
                    $rawHeading = $item['heading'] ?? $item['title'] ?? null;
                    $rawSubtitle = $item['subtitle'] ?? null;
                    $rawCtaLabel = $item['cta_label'] ?? $item['ctaLabel'] ?? $item['button_text'] ?? null;
                    $rawCtaLink = $item['cta_link'] ?? $item['ctaLink'] ?? $item['button_link'] ?? null;
                    $rawShow = $item['showContent'] ?? $item['show_content'] ?? $item['show_content_enabled'] ?? null;
                    $heading = $rawHeading !== null ? mb_substr(trim((string)$rawHeading), 0, 200) : null;
                    $subtitle = $rawSubtitle !== null ? mb_substr(trim((string)$rawSubtitle), 0, 500) : null;
                    $ctaLabel = $rawCtaLabel !== null ? mb_substr(trim((string)$rawCtaLabel), 0, 100) : null;
                    $ctaLink = $rawCtaLink !== null ? mb_substr(trim((string)$rawCtaLink), 0, 500) : null;
                    $showContent = null;
                    if ($rawShow !== null && $rawShow !== '') {
                        if (is_bool($rawShow)) $showContent = $rawShow;
                        elseif (is_numeric($rawShow)) $showContent = ((int)$rawShow) !== 0;
                        else {
                            $vs = strtolower(trim((string)$rawShow));
                            if (in_array($vs, ['1','true','yes','on','show','enabled'], true)) $showContent = true;
                            elseif (in_array($vs, ['0','false','no','off','hide','disabled'], true)) $showContent = false;
                        }
                    }
                    $normalized[] = [
                        'id' => $id,
                        'type' => $type,
                        'src' => $src,
                        'srcMobile' => isset($item['srcMobile']) ? trim((string)$item['srcMobile']) : (isset($item['src_mobile']) ? trim((string)$item['src_mobile']) : null),
                        'poster' => isset($item['poster']) ? trim((string)$item['poster']) : null,
                        'position' => $pos,
                        'positionMobile' => $posMob,
                        'heading' => $heading,
                        'subtitle' => $subtitle,
                        'cta_label' => $ctaLabel,
                        'cta_link' => $ctaLink,
                        'show_content' => $showContent,
                        // camel aliases for JS convenience — kept in sync
                        'showContent' => $showContent,
                        'ctaLabel' => $ctaLabel,
                        'ctaLink' => $ctaLink,
                    ];
                }
                $merged['hero_banner']['media'] = $normalized;
                // Derive legacy mirrors from canonical for backward compat
                $images = array_values(array_map(fn($m)=>$m['src'], array_filter($normalized, fn($m)=>$m['type']==='image')));
                $merged['hero_banner']['images'] = $images;
                $merged['hero_images'] = $images;
                $firstVideo=null; foreach($normalized as $m) if($m['type']==='video'){ $firstVideo=$m['src']; break; }
                $merged['hero_banner']['video_url']=$firstVideo??'';
                $merged['hero_video_url']=$firstVideo??'';
                $firstYt=null; foreach($normalized as $m) if($m['type']==='youtube'){ $firstYt=$m['src']; break; }
                $merged['hero_banner']['youtube_url']=$firstYt ? 'https://www.youtube.com/watch?v='.$firstYt : '';
                $merged['hero_youtube_url']=$merged['hero_banner']['youtube_url'];
            }
            $store->store_content = $merged;
            // Sync store description / welcome / copyright to StoreConfiguration so ThemeController::getStoreConfig sees them via both paths (preview + live share same source)
            foreach (['welcome_message' => 'welcome_message', 'store_description' => 'store_description', 'copyright_text' => 'copyright_text'] as $contentKey => $configKey) {
                if (array_key_exists($contentKey, $merged) || data_get($merged, $contentKey) !== null) {
                    $val = data_get($merged, $contentKey, '');
                    try { \App\Models\StoreConfiguration::setConfiguration($store->id, $configKey, (string) ($val ?? '')); } catch (\Throwable $e) {}
                }
            }
        }

        // Custom code assets (code editor mode) — sanitized before storage so
        // the storefront injection can never break out of its container.
        // Dual-write: template_overrides is the designer source, StoreConfiguration is the storefront source (ThemeController reads from there).
        $customAssetKeys = ['custom_css', 'custom_js', 'head_inject'];
        if (collect($customAssetKeys)->contains(fn ($key) => array_key_exists($key, $validated))) {
            $overrides = $store->template_overrides ?? [];
            foreach ($customAssetKeys as $key) {
                if (array_key_exists($key, $validated)) {
                    $sanitized = match ($key) {
                        'custom_css' => ThemeAssetSanitizer::css($validated[$key]),
                        'custom_js' => ThemeAssetSanitizer::js($validated[$key]),
                        default => ThemeAssetSanitizer::html($validated[$key]),
                    };
                    $overrides[$key] = $sanitized;
                    // Sync to StoreConfiguration for ThemeController::formatStoreData
                    try {
                        $configKey = match ($key) {
                            'custom_css' => 'custom_css',
                            'custom_js' => 'custom_javascript',
                            'head_inject' => 'custom_head_scripts',
                            default => $key,
                        };
                        \App\Models\StoreConfiguration::setConfiguration($store->id, $configKey, $sanitized);
                    } catch (\Throwable $e) {}
                }
            }
            $store->template_overrides = $overrides;
        }

        $store->save();
        $store->refresh();

        // Invalidate storefront caches so Public Store immediately reflects new hero/banner/logo
        try {
            $themes = \App\Models\Store::ALL_TEMPLATES;
            $locales = ['ar', 'en'];
            foreach ($themes as $t) {
                foreach ($locales as $loc) {
                    \Illuminate\Support\Facades\Cache::forget("store_catalog.{$store->id}.theme_{$t}.locale_{$loc}.active_1");
                    \Illuminate\Support\Facades\Cache::forget("store_categories.{$store->id}.theme_{$t}.locale_{$loc}");
                }
            }
            // Also clear the exact current theme/locale keys
            $curTheme = $store->getTemplateSlug();
            foreach ($locales as $loc) {
                \Illuminate\Support\Facades\Cache::forget("store_catalog.{$store->id}.theme_{$curTheme}.locale_{$loc}.active_1");
                \Illuminate\Support\Facades\Cache::forget("store_categories.{$store->id}.theme_{$curTheme}.locale_{$loc}");
            }
            // Clear StoreConfiguration request cache so ThemeController reads fresh design_tokens/store_content
            \App\Models\StoreConfiguration::forgetConfiguration($store->id);
            \Illuminate\Support\Facades\Cache::forget('store_configuration.' . $store->id);
        } catch (\Throwable $e) {}

        $overrides = $store->template_overrides ?? [];

        return response()->json([
            'success' => true,
            'theme' => $store->getTemplateSlug(),
            'sections' => $overrides['sections'] ?? [],
            'design_tokens' => $store->design_tokens ?? [],
            'content' => $store->store_content ?? [],
            'custom_css' => $overrides['custom_css'] ?? '',
            'custom_js' => $overrides['custom_js'] ?? '',
            'head_inject' => $overrides['head_inject'] ?? '',
        ]);
    }

    /**
     * Normalize the incoming section list: drop empty entries, coerce
     * booleans/order, merge default props so the stored shape is always valid.
     */
    protected function normalizeSections(array $sections): array
    {
        return collect($sections)
            ->filter(function ($section) {
                return is_array($section) && !empty($section['type']);
            })
            ->map(function ($section, $index) {
                $type = (string) ($section['type'] ?? 'custom');
                return [
                    'id' => (string) ($section['id'] ?? $type . '-' . ($index + 1)),
                    'type' => $type,
                    'enabled' => array_key_exists('enabled', $section) ? (bool) $section['enabled'] : true,
                    'order' => is_numeric($section['order'] ?? null) ? (int) $section['order'] : $index,
                    'props' => is_array($section['props'] ?? null) ? $section['props'] : [],
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Recursively sanitize content values so hero_banner and other nested
     * structures persist correctly.
     * - Scalars and null pass through (with length cap for strings).
     * - Indexed arrays are filtered to scalars (for hero_images as string[]).
     * - Associative arrays (like hero_banner) are preserved with their keys,
     *   recursing into nested values (e.g., hero_banner.images => string[]).
     * This fixes the previous bug where array_values(array_filter(is_scalar))
     * dropped hero_images and converted hero_banner into an indexed array,
     * causing saved hero_type/hero_images/overlay settings to disappear on refresh.
     */
    private function sanitizeContentValue(mixed $value): mixed
    {
        if (is_null($value) || is_scalar($value)) {
            if (is_string($value) && strlen($value) > 100000) {
                return substr($value, 0, 100000);
            }
            return $value;
        }

        if (is_array($value)) {
            if (count($value) > 100) {
                $value = array_slice($value, 0, 100, true);
            }

            $isAssoc = array_keys($value) !== range(0, count($value) - 1);

            if ($isAssoc) {
                $result = [];
                foreach ($value as $k => $v) {
                    $k = (string) $k;
                    if ($k === '' || strlen($k) > 100) {
                        continue;
                    }
                    $sanitized = $this->sanitizeContentValue($v);
                    // Keep nulls to allow clearing, skip only truly invalid
                    if ($sanitized !== null || $v === null) {
                        $result[$k] = $sanitized;
                    } elseif (is_array($v)) {
                        // If sanitize returned null for an array, skip that key
                        continue;
                    }
                }
                return $result;
            }

            // Indexed array — keep scalars (e.g., hero_images: string[]) OR associative objects (e.g., banners: [{image,title}])
            $result = [];
            foreach (array_slice($value, 0, 50) as $v) {
                if (is_scalar($v) && $v !== '' && $v !== null) {
                    $result[] = is_string($v) && strlen($v) > 5000 ? substr($v, 0, 5000) : $v;
                } elseif (is_array($v)) {
                    $sanitized = $this->sanitizeContentValue($v);
                    if (is_array($sanitized) && count($sanitized) > 0) {
                        $result[] = $sanitized;
                    }
                }
            }
            return $result;
        }

        return null;
    }

    private function extractYoutubeId(string $url): ?string
    {
        $url = trim($url);
        if ($url === '') return null;
        try {
            $parsed = parse_url($url);
            $host = $parsed['host'] ?? '';
            $path = $parsed['path'] ?? '';
            $query = $parsed['query'] ?? '';
            if (str_contains($host, 'youtu.be')) {
                $id = trim(ltrim($path, '/'), '/');
                $id = explode('?', $id)[0];
                $id = explode('&', $id)[0];
                return $id !== '' ? $id : null;
            }
            if ($query !== '') {
                parse_str($query, $qs);
                if (!empty($qs['v'])) return explode('&', $qs['v'])[0];
            }
            $parts = array_values(array_filter(explode('/', $path)));
            $idx = array_search('embed', $parts);
            if ($idx !== false && isset($parts[$idx+1])) return explode('?', $parts[$idx+1])[0];
            if (count($parts) > 0) {
                $last = end($parts);
                $last = explode('?', $last)[0];
                $last = explode('&', $last)[0];
                if (preg_match('/^[a-zA-Z0-9_-]{11}$/', $last)) return $last;
            }
        } catch (\Throwable $e) {}
        if (preg_match('/[a-zA-Z0-9_-]{11}/', $url, $m)) return $m[0];
        return null;
    }

    /**
     * Normalize a client-submitted local media reference to the canonical form
     * used in this project's stored hero content: /storage/media/{mediaId}/{file}.
     *
     * Handles: trailing slashes, cache-busting query/fragment, url-encoded
     * segments and absolute URLs (https://host/storage/...).
     * Returns the normalized path or null when the value is NOT a local
     * storage path of this project (caller must treat null as unowned).
     */
    protected function normalizeLocalMediaPath(string $input): ?string
    {
        $path = trim($input);
        $path = preg_replace('/[?#].*$/s', '', $path);
        $path = rtrim($path, '/');
        if ($path === '') return null;

        // Absolute URLs: local only when they point at this project's /storage route
        if (preg_match('#^https?://#i', $path)) {
            $pos = stripos($path, '/storage/');
            if ($pos === false) return null;
            $path = substr($path, $pos);
        }

        if (!str_starts_with($path, '/storage/')) return null;

        // url-decode each segment so matching against stored rows is exact
        $segments = array_map('rawurldecode', explode('/', ltrim($path, '/')));
        return '/' . implode('/', $segments);
    }

    /**
     * True when the given normalized local path already appears verbatim in the
     * server-side saved hero content of this store (src / srcMobile / srcMobile-safe
     * images / images_mobile / video_url / youtube wrappers). Proof comes ONLY from
     * server state, never from the request body.
     */
    protected function pathReferencedInStoredContent(string $path, array $storedContent): bool
    {
        $hb = $storedContent['hero_banner'] ?? null;
        $needle = $path;

        if (is_array($hb)) {
            foreach ([
                'src', 'srcMobile', 'images', 'images_mobile',
                'video_url', 'video_url_mobile', 'youtube_url',
            ] as $key) {
                $v = $hb[$key] ?? null;
                if (is_array($v)) {
                    if (in_array($needle, $v, true)) return true;
                } elseif (is_string($v) && trim($v) === $needle) {
                    return true;
                }
            }
            // Legacy tree keys may sit at top level (hero_images / hero_video_url / hero_youtube_url…)
        }
        foreach ([
            'hero_images', 'hero_images_mobile',
            'hero_video_url', 'hero_video_url_mobile', 'hero_youtube_url',
        ] as $key) {
            $v = $storedContent[$key] ?? null;
            if (is_array($v)) {
                if (in_array($needle, $v, true)) return true;
            } elseif (is_string($v) && trim($v) === $needle) {
                return true;
            }
        }

        return false;
    }

    /**
     * FAIL-CLOSED local media ownership gate for canonical hero_banner.media items.
     *
     * The submitted reference must resolve to a MediaItem media row owned by the
     * current store (exact media-id match via the real MediaItem/id + media/fk
     * representation) — OR — for historical stores, the exact path must already
     * exist inside the store's server-side saved hero content (safe legacy
     * exception). Unknown and foreign local paths are rejected.
     *
     * @return object{allows:bool, path:string, reason:string}
     */
    protected function resolveLocalMediaOwnership(string $rawPath, int $storeId, array $storedContent): object
    {
        $path = $this->normalizeLocalMediaPath($rawPath);
        if ($path === null) {
            return (object) ['allows' => false, 'path' => $rawPath, 'reason' => 'not_a_local_storage_path'];
        }

        // Canonical local media references ONLY the original uploaded file:
        //   /storage/media/{media_item_id}/{original_file_name}
        // Conversion (/conversions/) and responsive-image (/responsive-images/) subpaths are NOT
        // part of the api.media.batch upload contract (it returns the original URL), so they are
        // rejected for canonical hero src/srcMobile.
        $segments = explode('/', trim($path, '/'));
        if (count($segments) !== 4 || $segments[0] !== 'storage' || $segments[1] !== 'media') {
            return (object) ['allows' => false, 'path' => $path, 'reason' => 'unsupported_subpath'];
        }
        $mediaItemId = $segments[2];
        $fileName = $segments[3];
        if (!preg_match('/^\d+$/', $mediaItemId) || $fileName === '') {
            return (object) ['allows' => false, 'path' => $path, 'reason' => 'malformed_local_path'];
        }

        // Exact-file ownership: the real Spatie media row must match model_type,
        // model_id, the EXACT normalized filename and (when the column exists) the
        // current store's disk + store_id. This proves the exact referenced file —
        // /storage/media/{owned_id}/fake.jpg cannot pass just because the id is owned.
        $row = \Spatie\MediaLibrary\MediaCollections\Models\Media::query()
            ->where('model_type', MediaItem::class)
            ->where('model_id', (int) $mediaItemId)
            ->where('file_name', $fileName)
            ->first();

        if ($row !== null) {
            $owned = false;
            if (Schema::hasColumn('media', 'store_id')) {
                // Only local-serving disks produce /storage URLs (s3/wasabi serve CDN absolute URLs).
                $disk = $row->disk ?? 'public';
                if (in_array($disk, ['public', 'local'], true) && (int) $row->store_id === $storeId) {
                    $owned = true;
                }
            }
            if (!$owned && Schema::hasColumn('media_items', 'store_id')) {
                // Legacy rows may scope store_id on media_items while the media row left it null;
                // the exact file (model_type + model_id + file_name) is still required above.
                $owned = MediaItem::query()->whereKey((int) $mediaItemId)->where('store_id', $storeId)->exists();
            }
            if ($owned) {
                return (object) ['allows' => true, 'path' => $path, 'reason' => 'media_item_owned'];
            }
        }

        // Safe legacy exception: exact path already saved server-side for this store.
        if ($this->pathReferencedInStoredContent($path, $storedContent)) {
            return (object) ['allows' => true, 'path' => $path, 'reason' => 'stored_legacy_exception'];
        }

        return (object) ['allows' => false, 'path' => $path, 'reason' => 'unowned_or_unknown'];
    }

    protected function authorizeStoreAccess(Request $request, Store $store): bool
    {
        $user = $request->user();
        if (!$user) return false;
        if ($user->isSuperAdmin() || $user->isAdmin()) return true;
        if ((int)$store->user_id === (int)$user->id) return true;
        if ((int)$store->id === (int)($user->current_store ?? 0)) {
            try { return $user->hasPermissionTo('settings-stores'); } catch (\Throwable $e) { return false; }
        }
        return false;
    }
}