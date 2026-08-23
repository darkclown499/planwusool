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
    $isStaticRoute = request()->routeIs('page.about') || request()->routeIs('page.features')
        || request()->routeIs('page.terms') || request()->routeIs('page.privacy');
    $isLandingRoute = request()->routeIs('home') || request()->routeIs('custom-page.show');
    $isSitemap = request()->routeIs('sitemap');
    $isPrivateRoute = !$isLandingRoute && !$isStoreRoute && !$isStaticRoute && !$isSitemap;
    $isPreview = request()->has('preview');
@endphp
<html lang="{{ $locale }}" dir="{{ $dir }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="robots" content="{{ $isPrivateRoute || $isPreview ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' }}">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        @php
            $googleVerification = getSetting('googleVerification', '');
            $bingVerification = getSetting('bingVerification', '');
            $gTag = getSetting('googleAnalyticsId', '');
        @endphp
        @if($googleVerification)
            <meta name="google-site-verification" content="{{ $googleVerification }}">
        @endif
        @if($bingVerification)
            <meta name="msvalidate.01" content="{{ $bingVerification }}">
        @endif
        @if($gTag && !config('app.is_demo'))
            <script{!! $nonceAttr !!} async src="https://www.googletagmanager.com/gtag/js?id={{ $gTag }}"></script>
            <script{!! $nonceAttr !!}>
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '{{ $gTag }}');
            </script>
        @endif
        {{-- Force the browser to upgrade any HTTP resource to HTTPS and stop
             Mixed-Content blocking (fixes unresponsive buttons when assets
             are loaded over http:// inside an https:// page). --}}
        <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">

        <style{!! $nonceAttr !!}>
            html {
                background-color: oklch(1 0 0);
            }
        </style>

        <script{!! $nonceAttr !!}>
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

        @if($isStaticRoute)
            @php
                $staticMeta = match(true) {
                    request()->routeIs('page.about') => ['عن وصول - منصة متاجر واتساب', 'تعرف على منصة وصول لإنشاء وإدارة المتاجر على واتساب: إدارة المنتجات والعملاء والطلبات بسهولة وبدون خبرة تقنية.'],
                    request()->routeIs('page.features') => ['مميزات وصول - كل أدوات متجر الواتساب في مكان واحد', 'استعرض مميزات منصة وصول: إدارة المنتجات، الطلبات، العملاء، التقارير، والدفع الإلكتروني — كل ما تحتاجه للمتجر على واتساب.'],
                    request()->routeIs('page.privacy') => ['سياسة الخصوصية - وصول', 'تعرف على سياسة الخصوصية لمنصة وصول وكيفية حماية بياناتك وبيانات عملائك.'],
                    default => ['اتفاقية المستخدم - وصول', 'اطلع على اتفاقية الاستخدام وشروط خدمة منصة وصول لمتاجر الواتساب.'],
                };
                $staticTitle = $staticMeta[0];
                $staticDesc = $staticMeta[1];
            @endphp
            <title>{{ $staticTitle }}</title>
            <meta name="description" content="{{ $staticDesc }}">
            <link rel="canonical" href="{{ url()->current() }}">
            <meta property="og:site_name" content="{{ config('app.name', 'Wusool') }}">
            <meta property="og:title" content="{{ $staticTitle }}">
            <meta property="og:description" content="{{ $staticDesc }}">
            <meta property="og:url" content="{{ url()->current() }}">
            <meta property="og:type" content="website">
            <meta property="og:locale" content="{{ $ogLocale }}">
            <meta name="twitter:card" content="summary">
            <meta name="twitter:title" content="{{ $staticTitle }}">
            <meta name="twitter:description" content="{{ $staticDesc }}">
        @endif

        @if($isLandingRoute || $isStaticRoute)
            {{-- hreflang defaults: site is Arabic-first, English available --}}
            <link rel="alternate" hreflang="ar" href="{{ $appUrl }}">
            <link rel="alternate" hreflang="en" href="{{ $appUrl }}">
            <link rel="alternate" hreflang="x-default" href="{{ $appUrl }}">
            <meta property="og:locale:alternate" content="en_US">
        @endif

        @if($isLandingRoute)
            @php
                // Arabic-first SEO defaults; admin settings override when filled.
                // Brand variations (متجر وصول / متاجر وصول / وصول للمتاجر) are
                // targeted explicitly for search dominance.
                $seoTitle = getSetting('metaTitle', '') ?: 'وصول للمتاجر | منصة إنشاء متاجر إلكترونية ومتجر واتساب';
                $seoDesc = getSetting('metaDescription', '') ?: 'منصة وصول للمتاجر الإلكترونية: انشئ متجر وصول الخاص بك وربطه بالواتساب خلال دقائق. استعرض أفضل متاجر وصول وابدأ البيع أونلاين بسهولة.';
                $seoKeywords = getSetting('metaKeywords', '') ?: 'وصول, متجر وصول, متاجر وصول, وصول للمتاجر, منصة وصول, متاجر, انشاء متجر الكتروني, wusool, wusool.ps';
                $seoImage = getSetting('metaImage', '') ?: '/assets/images/og-cover.png';
                if ($seoImage && !str_starts_with($seoImage, 'http')) {
                    $seoImage = rtrim($appUrl, '/') . '/' . ltrim($seoImage, '/');
                }
                $canonicalUrl = url()->current();
                $orgLogo = $seoImage ?: $appUrl . '/images/logos/wusool.png';
                $orgSameAs = array_values(array_filter([
                    getSetting('social_facebook', ''),
                    getSetting('social_instagram', ''),
                    getSetting('social_twitter', ''),
                    getSetting('social_youtube', ''),
                    getSetting('social_tiktok', ''),
                ]));
            @endphp
            <title>{{ $seoTitle }}</title>
            <meta name="title" content="{{ $seoTitle }}">
            <meta name="description" content="{{ $seoDesc }}">
            <meta name="language" content="Arabic">
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
                <meta property="og:image" content="{{ str_starts_with($seoImage, 'http') ? $seoImage : rtrim($appUrl, '/') . '/' . ltrim($seoImage, '/') }}">
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
                <meta name="twitter:image" content="{{ str_starts_with($seoImage, 'http') ? $seoImage : rtrim($appUrl, '/') . '/' . ltrim($seoImage, '/') }}">
            @endif
            {{-- JSON-LD @graph: Organization + WebSite + FAQPage + SoftwareApplication --}}
            <script type="application/ld+json">
            {!! json_encode([
                '@' . 'context' => 'https://schema.org',
                '@graph' => [
                    [
                        '@type' => 'Organization',
                        '@id' => $appUrl . '/#organization',
                        'name' => 'وصول',
                        'alternateName' => ['متجر وصول', 'متاجر وصول', 'وصول للمتاجر', 'Wusool'],
                        'url' => $appUrl,
                        'logo' => $appUrl . '/images/logos/wusool.png',
                        'image' => $orgLogo,
                        'description' => $seoDesc,
                        'sameAs' => array_values(array_unique(array_filter(array_merge([
                            'https://www.facebook.com/wusool.ps',
                        ], $orgSameAs)))),
                        'contactPoint' => [
                            '@type' => 'ContactPoint',
                            'contactType' => 'customer support',
                            'availableLanguage' => ['Arabic', 'English'],
                        ],
                    ],
                    [
                        '@type' => 'WebSite',
                        '@id' => $appUrl . '/#website',
                        'url' => $appUrl,
                        'name' => 'وصول للمتاجر',
                        'alternateName' => 'متاجر وصول',
                        'inLanguage' => 'ar',
                        'publisher' => ['@id' => $appUrl . '/#organization'],
                    ],
                    [
                        '@type' => 'FAQPage',
                        'mainEntity' => [
                            [
                                '@type' => 'Question',
                                'name' => 'ما هي منصة وصول للمتاجر؟',
                                'acceptedAnswer' => [
                                    '@type' => 'Answer',
                                    'text' => 'وصول هي منصة متخصصة تُتيح لك إنشاء متجر إلكتروني احترافي (متجر وصول) وربطه مباشرة بالواتساب لاستقبال الطلبات وتسهيل عمليات البيع.',
                                ],
                            ],
                            [
                                '@type' => 'Question',
                                'name' => 'كيف يمكنني تصفح متاجر وصول؟',
                                'acceptedAnswer' => [
                                    '@type' => 'Answer',
                                    'text' => 'يمكنك استكشاف جميع متاجر وصول عبر دليل المتاجر المتاح على المنصة واختيار القالب والتصميم المناسب لمتجرك.',
                                ],
                            ],
                        ],
                    ],
                    [
                        '@type' => 'SoftwareApplication',
                        'name' => 'وصول - Wusool',
                        'operatingSystem' => 'All',
                        'applicationCategory' => 'BusinessApplication',
                        'url' => $appUrl,
                        'description' => 'منصة متقدمة متخصصة في إنشاء وإدارة المتاجر الإلكترونية المتعددة وتوفير قوالب احترافية وحلول تجارة متكاملة.',
                        'offers' => [
                            '@type' => 'Offer',
                            'price' => '0',
                            'priceCurrency' => 'ILS',
                        ],
                    ],
                ],
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
                if ($store) {
                    $storeConfig = \App\Models\StoreConfiguration::getConfiguration($store->id);
                    if (!$store->seo_title && !empty($storeConfig['meta_title'])) {
                        $storeTitle = $storeConfig['meta_title'];
                    }
                    if (empty($storeDesc) && !empty($storeConfig['meta_description'])) {
                        $storeDesc = $storeConfig['meta_description'];
                    }
                    if (empty($storeKeywords) && !empty($storeConfig['meta_keywords'])) {
                        $storeKeywords = $storeConfig['meta_keywords'];
                    }
                    if (empty($storeImage) && !empty($storeConfig['og_image'])) {
                        $storeImage = $storeConfig['og_image'];
                    }
                }
                if ($storeImage && !str_starts_with($storeImage, 'http')) {
                    $storeImage = rtrim($appUrl, '/') . '/' . ltrim($storeImage, '/');
                }
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
                '@' . 'context' => 'https://schema.org',
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

        {{-- Merchant custom theme assets (designer "code editor" mode):
             head_inject.html + custom.css are injected server-side so they
             apply on first paint of the public storefront. --}}
        @php
            $storeCustomOverrides = null;
            if ($isStoreRoute && isset($store) && $store) {
                $storeOverridesRaw = $store->template_overrides ?? null;
                $storeCustomOverrides = is_array($storeOverridesRaw)
                    ? $storeOverridesRaw
                    : (is_string($storeOverridesRaw) ? json_decode($storeOverridesRaw, true) : null);
            }
        @endphp
        @if($storeCustomOverrides)
            {!! \App\Support\ThemeAssetSanitizer::html($storeCustomOverrides['head_inject'] ?? '') !!}
            @if(!empty($storeCustomOverrides['custom_css']))
                <style data-store-custom-css>{!! \App\Support\ThemeAssetSanitizer::css($storeCustomOverrides['custom_css']) !!}</style>
            @endif
        @endif

        {{-- Fallback title for non-landing/non-store routes --}}
        @if(!$isLandingRoute && !$isStoreRoute && !$isStaticRoute)
            <title inertia>{{ getSetting('titleText', config('app.name', 'Wusool')) }}</title>
        @elseif($isStoreRoute)
            <title inertia>{{ $storeTitle ?? config('app.name', 'Wusool') }}</title>
        @elseif($isLandingRoute)
            <title inertia>{{ $seoTitle ?? getSetting('titleText', config('app.name', 'Wusool')) }}</title>
        @endif

        {{-- Dynamic Favicon --}}
        @php
            $favicon = getSetting('favicon', '/images/logos/favicon.png');
            $faviconUrl = $favicon;
            if (!str_starts_with($favicon, 'http')) {
                $cleanPath = ltrim($favicon, '/');
                $faviconUrl = rtrim($appUrl, '/') . '/' . $cleanPath;
            }
            $brandBase = rtrim($appUrl, '/') . '/images/logos';
            $themeColorName = getSetting('themeColor', getSetting('primaryColor', 'green'));
            $themeColorsMap = ['blue' => '#3b82f6', 'green' => '#10b77f', 'purple' => '#8b5cf6', 'orange' => '#f97316', 'red' => '#ef4444'];
            $themeColor = $themeColorName === 'custom'
                ? getSetting('customColor', '#10b77f')
                : ($themeColorsMap[$themeColorName] ?? $themeColorName);
        @endphp
        <link rel="icon" type="image/x-icon" href="{{ $faviconUrl }}">
        <link rel="icon" type="image/png" sizes="32x32" href="{{ $faviconUrl }}">
        <link rel="icon" type="image/png" sizes="16x16" href="{{ $brandBase }}/favicon-16x16.png">
        <link rel="apple-touch-icon" sizes="180x180" href="{{ $brandBase }}/apple-touch-icon.png">
        <link rel="manifest" href="{{ $brandBase }}/site.webmanifest">
        <meta name="theme-color" content="{{ $themeColor }}">
        <meta name="theme-color" content="#10b77f" media="(prefers-color-scheme: dark)">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600&family=tajawal:400,500,700,800,900&family=cairo:400,500,600,700,800,900&family=ibm-plex-sans-arabic:400,500,600,700&family=baloo-bhaijaan-2:400,500,600,700,800&family=amiri:400,700&display=swap" rel="stylesheet" />
        <script src="{{ asset('js/jquery.min.js') }}"></script>

        <script{!! $nonceAttr !!}>
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
        
        @routes('web', $cspNonce)
        <script{!! $nonceAttr !!}>
            if (typeof window.Ziggy !== 'undefined') {
                window.Ziggy.url = window.location.origin;
                window.Ziggy.port = window.location.port ? parseInt(window.location.port) : undefined;
            }
        </script>
        @viteReactRefresh
        @vite('resources/js/app.tsx')
        @inertiaHead
        <script{!! $nonceAttr !!}>
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
        @if($isStoreRoute && $storeCustomOverrides && !empty($storeCustomOverrides['custom_js']))
            <script{!! $nonceAttr !!}>{!! \App\Support\ThemeAssetSanitizer::js($storeCustomOverrides['custom_js']) !!}</script>
        @endif
    </body>
</html>
