<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Trusted Proxies
    |--------------------------------------------------------------------------
    |
    | Proxies Laravel should trust so that the scheme, host and port are
    | resolved from the X-Forwarded-* headers instead of the raw TCP request.
    |
    | This app is served through Cloudflare (and aaPanel's nginx) which send
    | `X-Forwarded-Proto: https`. If the proxy is not trusted, every generated
    | URL — including OAuth callback URLs — uses http://, which makes Google,
    | Apple and GitHub reject logins with "redirect_uri_mismatch".
    |
    | Set TRUSTED_PROXIES=* to trust every proxy (recommended behind
    | Cloudflare), or paste the Cloudflare IPv4/IPv6 ranges separated by
    | commas. Config is referenced from bootstrap/app.php so it works even
    | when the configuration is cached (env() would not).
    |
    */

    'proxies' => env('TRUSTED_PROXIES', '*'),

];
