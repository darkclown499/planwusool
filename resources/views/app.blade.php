@php
    $cspNonce = $page['props']['cspNonce'] ?? '';
    $nonceAttr = $cspNonce ? ' nonce="' . $cspNonce . '"' : '';
@endphp
<!DOCTYPE html>
@php
    $appUrl = getSchemeAwareUrl();
    $locale = app()->getLocale();
    // Arabic-first design: the whole interface is rendered right-to-left.
    $dir = 'rtl';
    $ogLocale = match(explode('_', $locale)[0]) {
        'ar' => 'ar_AR',
        'he' => 'he_IL',
        'fr' => 'fr_FR',
        'de' => 'de_DE',
        'es' => 'es_ES',
        'pt' => 'pt_BR',
        'it' => 'it_IT',
        'nl' => 'nl_NL',
        'pl' => 'pl_PL',
        'da' => 'da_DK',
        'tr' => 'tr_TR',
        'ru' => 'ru_RU',
        'zh' => 'zh_CN',
        'ja' => 'ja_JP',
        default => 'en_US',
    };
    $isStoreRoute = request()->routeIs('store.*') || request()->routeIs('storefront.*');
    $isLandingRoute = request()->routeIs('home') || request()->routeIs('custom-page.show');
    $isSitemap = request()->routeIs('sitemap');
@endphp
<html lang="{{ $locale }}" dir="{{ $dir }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        {{-- Force the browser to upgrade any HTTP resource to HTTPS and stop
             Mixed-Content blocking (fixes unresponsive buttons when assets
             are loaded over http:// inside an https:// page). --}}
        <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">

        <style{{ $nonceAttr }}>
            html {
                background-color: oklch(1 0 0);
            }
        </style>

        <script{{ $nonceAttr }}>
            // Arabic-first design: the document must ALWAYS be right-to-left.
            // This inline guard runs before any bundled JS so no cached module,
            // browser extension, saved setting or component can flip it to LTR.
            (function () {
                var root = document.documentElement;
                var forceRtl = function () {
                    if (root.getAttribute('dir') !== 'rtl') {
                        root.setAttribute('dir', 'rtl');
                    }
                    try {
                        localStorage.setItem('layoutDirection', 'rtl');
                        localStorage.setItem('layoutPosition', 'right');
                        var brand = localStorage.getItem('brandSettings');
                        if (brand) {
                            try {
                                var parsed = JSON.parse(brand);
                                if (parsed && parsed.layoutDirection !== 'rtl') {
                                    parsed.layoutDirection = 'rtl';
                                    localStorage.setItem('brandSettings', JSON.stringify(parsed));
                                }
                            } catch (e) {}
                        }
                    } catch (e) {}
                };
                forceRtl();
                if (window.MutationObserver) {
                    var mo = new MutationObserver(function (mutations) {
                        var changed = false;
                        for (var i = 0; i < mutations.length; i++) {
                            if (mutations[i].attributeName === 'dir') { changed = true; break; }
                        }
                        if (changed) forceRtl();
                    });
                    mo.observe(root, { attributes: true, attributeFilter: ['dir'] });
                }
            })();
        </script>

        @if($isLandingRoute)
            @php
                $seoTitle = getSetting('metaTitle', '') ?: getSetting('titleText', config('app.name', 'Wusool'));
                $seoDesc = getSetting('metaDescription', '');
                $seoKeywords = getSetting('metaKeywords', '');
                $seoImage = getSetting('metaImage', '');
                $canonicalUrl = url()->current();
            @endphp
            <title>{{ $seoTitle }}</title>
            <meta name="description" content="{{ $seoDesc }}">
            @if($seoKeywords)
                <meta name="keywords" content="{{ $seoKeywords }}">
            @endif
            <link rel="canonical" href="{{ $canonicalUrl }}">
            {{-- Open Graph --}}
            <meta property="og:site_name" content="{{ config('app.name', 'Wusool') }}">
            <meta property="og:title" content="{{ $seoTitle }}">
            @if($seoDesc)
                <meta property="og:description" content="{{ $seoDesc }}">
            @endif
            <meta property="og:url" content="{{ $canonicalUrl }}">
            <meta property="og:type" content="website">
            <meta property="og:locale" content="{{ $ogLocale }}">
            @if($seoImage)
                <meta property="og:image" content="{{ $seoImage }}">
                <meta property="og:image:width" content="1200">
                <meta property="og:image:height" content="630">
            @endif
            {{-- Twitter Card --}}
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="{{ $seoTitle }}">
            @if($seoDesc)
                <meta name="twitter:description" content="{{ $seoDesc }}">
            @endif
            @if($seoImage)
                <meta name="twitter:image" content="{{ $seoImage }}">
            @endif
            {{-- JSON-LD Organization --}}
            <script type="application/ld+json">
            {!! json_encode([
                '@context' => 'https://schema.org',
                '@type' => 'Organization',
                'name' => config('app.name', 'Wusool'),
                'url' => $appUrl,
                'logo' => getSetting('metaImage', $appUrl . '/images/logos/wusool.png'),
                'description' => $seoDesc,
                'sameAs' => [],
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
            </script>
        @endif

        @if($isStoreRoute)
            @php
                $store = session('currentStore') ?? null;
                if (!$store && request()->route('store')) {
                    $store = request()->route('store');
                }
                $storeTitle = $store ? ($store->seo_title ?: $store->name) : config('app.name', 'Wusool');
                $storeDesc = $store?->seo_description ?? '';
                $storeKeywords = $store?->seo_keywords ?? '';
                $storeImage = $store?->seo_image ?? '';
                $storeCanonical = url()->current();
            @endphp
            <title>{{ $storeTitle }}</title>
            @if($storeDesc)
                <meta name="description" content="{{ $storeDesc }}">
            @endif
            @if($storeKeywords)
                <meta name="keywords" content="{{ $storeKeywords }}">
            @endif
            <link rel="canonical" href="{{ $storeCanonical }}">
            <meta property="og:site_name" content="{{ $store->name ?? config('app.name', 'Wusool') }}">
            <meta property="og:title" content="{{ $storeTitle }}">
            @if($storeDesc)
                <meta property="og:description" content="{{ $storeDesc }}">
            @endif
            <meta property="og:url" content="{{ $storeCanonical }}">
            <meta property="og:type" content="website">
            <meta property="og:locale" content="{{ $ogLocale }}">
            @if($storeImage)
                <meta property="og:image" content="{{ $storeImage }}">
                <meta property="og:image:width" content="1200">
                <meta property="og:image:height" content="630">
            @endif
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="{{ $storeTitle }}">
            @if($storeDesc)
                <meta name="twitter:description" content="{{ $storeDesc }}">
            @endif
            @if($storeImage)
                <meta name="twitter:image" content="{{ $storeImage }}">
            @endif
            @if($store)
            <script type="application/ld+json">
            {!! json_encode([
                '@context' => 'https://schema.org',
                '@type' => 'Store',
                'name' => $store->name,
                'description' => $store->description ?? $storeDesc,
                'url' => $storeCanonical,
                'image' => $storeImage ?: null,
                'merchant' => [
                    '@type' => 'Organization',
                    'name' => config('app.name', 'Wusool'),
                ],
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
            </script>
            @endif
        @endif

        {{-- Fallback title for non-landing/non-store routes --}}
        @if(!$isLandingRoute && !$isStoreRoute)
            <title inertia>{{ getSetting('titleText', config('app.name', 'Wusool')) }}</title>
        @else
            <title inertia>{{ $isStoreRoute ? ($storeTitle ?? config('app.name', 'Wusool')) : getSetting('titleText', config('app.name', 'Wusool')) }}</title>
        @endif

        {{-- Dynamic Favicon --}}
        @php
            $favicon = getSetting('favicon', '/images/logos/favicon.png');
            $faviconUrl = $favicon;
            if (!str_starts_with($favicon, 'http')) {
                $cleanPath = ltrim($favicon, '/');
                $faviconUrl = rtrim($appUrl, '/') . '/' . $cleanPath;
            }
        @endphp
        <link rel="icon" href="{{ $faviconUrl }}">
        <link rel="apple-touch-icon" href="{{ $faviconUrl }}">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600&family=tajawal:400,500,700,800,900&family=cairo:400,500,600,700,800,900&family=ibm-plex-sans-arabic:400,500,600,700" rel="stylesheet" />
        <script src="{{ asset('js/jquery.min.js') }}"></script>

        <script{{ $nonceAttr }}>
            window.appConfig = {
                url: '{{ $appUrl }}'
            };
            
            // Set demo mode flag
            window.isDemo = {{ config('app.is_demo') ? 'true' : 'false' }};
            
            // Set base URL for image helper — dynamic from request
            window.appSettings = {
                baseUrl: '{{ $appUrl }}'
            };
        </script>
        
        @routes('web', $appUrl)
        <script{{ $nonceAttr }}>
            if (typeof window.Ziggy !== 'undefined') {
                window.Ziggy.url = window.location.origin;
                window.Ziggy.port = window.location.port ? parseInt(window.location.port) : undefined;
            }
        </script>
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
        <script{{ $nonceAttr }}>
            // Mark the page when embedded inside a preview iframe (e.g. onboarding
            // device previews) so CSS can remove scrollbars and chrome.
            try {
                if (window.self !== window.top) {
                    document.documentElement.classList.add('in-iframe');
                }
            } catch (e) {}
        </script>
    </head>
    <body class="font-sans antialiased bg-gray-100">
        @inertia
    </body>
</html>
