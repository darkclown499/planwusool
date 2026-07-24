<!DOCTYPE html>
@php
    $locale = app()->getLocale();
    $dir = in_array(explode('_', $locale)[0], ['ar', 'he', 'fa', 'ur']) ? 'rtl' : 'ltr';
@endphp
<html lang="{{ str_replace('_', '-', $locale) }}" dir="{{ $dir }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        @if(request()->routeIs('home') || request()->routeIs('custom-page.show'))
            @php
                $seoTitle = getSetting('metaTitle', getSetting('titleText', config('app.name', 'Wusool')));
                // Fallback to titleText if metaTitle is empty
                $seoTitle = $seoTitle ?: getSetting('titleText', config('app.name', 'Wusool'));
                $seoDesc = getSetting('metaDescription', '');
                $seoKeywords = getSetting('metaKeywords', '');
                $seoImage = getSetting('metaImage', '');
            @endphp
            @if($seoDesc)
                <meta property="og:description" content="{{ $seoDesc }}">
            @endif
            @if($seoKeywords)
                <meta name="keywords" content="{{ $seoKeywords }}">
            @endif
            <meta property="og:title" content="{{ $seoTitle }}">
            <meta property="og:url" content="{{ url()->current() }}">
            <meta property="og:type" content="website">
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="{{ $seoTitle }}">
            @if($seoDesc)
                <meta name="twitter:description" content="{{ $seoDesc }}">
            @endif
            @if($seoImage)
                <meta property="og:image" content="{{ $seoImage }}">
                <meta name="twitter:image" content="{{ $seoImage }}">
            @endif
        @endif
        <title inertia>{{ getSetting('titleText', config('app.name', 'Wusool')) }}</title>

        {{-- Dynamic Favicon --}}
        @php
            $favicon = getSetting('favicon', '/images/logos/favicon.png');
            $faviconUrl = $favicon;
            if (!str_starts_with($favicon, 'http')) {
                // Remove leading slash and construct proper URL
                $cleanPath = ltrim($favicon, '/');
                $faviconUrl = rtrim(config('app.url'), '/') . '/' . $cleanPath;
            }
        @endphp
        <link rel="icon" href="{{ $faviconUrl }}">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
        <script src="{{ asset('js/jquery.min.js') }}"></script>

        <script>
            window.appConfig = {
                url: '{{ config('app.url') }}'
            };
            
            // Set demo mode flag
            window.isDemo = {{ config('app.is_demo') ? 'true' : 'false' }};
            
            // Set base URL for image helper
            window.appSettings = {
                baseUrl: '{{ config('app.url') }}'
            };
        </script>
        
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased bg-gray-100">
        @inertia
    </body>
</html>
