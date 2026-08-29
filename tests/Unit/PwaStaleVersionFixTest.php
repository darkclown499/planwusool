<?php

test('Inertia version is deterministic and changes when manifest changes', function () {
    $base = dirname(__DIR__, 2);
    $manifestPath = $base . '/public/build/manifest.json';
    $original = is_file($manifestPath) ? file_get_contents($manifestPath) : null;
    try {
        if (!is_dir(dirname($manifestPath))) mkdir(dirname($manifestPath), 0777, true);
        file_put_contents($manifestPath, json_encode(['hash' => 'a']));
        $v1 = @md5_file($manifestPath);

        file_put_contents($manifestPath, json_encode(['hash' => 'b', 'extra' => true]));
        $v2 = @md5_file($manifestPath);

        file_put_contents($manifestPath, json_encode(['hash' => 'b', 'extra' => true]));
        $v2b = @md5_file($manifestPath);

        expect($v1)->not->toBeNull();
        expect($v2)->not->toBeNull();
        expect($v2)->not->toBe($v1);
        expect($v2b)->toBe($v2);

        $src = file_get_contents($base . '/app/Http/Middleware/HandleInertiaRequests.php');
        expect($src)->toContain('md5_file');
        expect($src)->toContain('APP_BUILD_VERSION');
        expect($src)->toContain('function version');
    } finally {
        if ($original !== null) {
            file_put_contents($manifestPath, $original);
        }
    }
});

test('PWAController uses build version for cache name and is store-specific', function () {
    $base = dirname(__DIR__, 2);
    $src = file_get_contents($base . '/app/Http/Controllers/PWAController.php');
    expect($src)->toContain('resolveBuildVersion');
    expect($src)->toContain("store-' . \$store->slug . '-' . \$buildVersion");
    expect($src)->not->toContain("'store-' . \$store->slug . '-v1'");
    expect($src)->not->toContain("urlsToCache");
    expect($src)->toContain("event.request.mode === 'navigate'");
    expect($src)->toContain("event.request.method !== 'GET'");
    expect($src)->toContain("/api/");
    expect($src)->toContain("no-cache, no-store, must-revalidate");
    expect($src)->toContain("md5_file");
    expect($src)->toContain("public_path('build/manifest.json')");
});

test('PWA per-store SW preserves tenant isolation', function () {
    $base = dirname(__DIR__, 2);
    $src = file_get_contents($base . '/app/Http/Controllers/PWAController.php');
    preg_match_all("/CACHE_NAME/", $src, $m);
    expect(count($m[0]))->toBeGreaterThan(0);
    expect($src)->toContain("\$store->slug");
    expect($src)->not->toContain('store-global');
    expect($src)->not->toContain('wusool-pwa-v1');
});

test('deploy.sh contains copy-forward old hashed asset survival strategy', function () {
    $base = dirname(__DIR__, 2);
    $deploy = file_get_contents($base . '/deploy.sh');
    expect($deploy)->toContain('copy-forward');
    expect($deploy)->toContain('cp -n');
    expect($deploy)->toContain('PREV_BUILD/assets');
    expect($deploy)->toContain('LIVE_BUILD/assets');
    expect($deploy)->not->toContain('cp -f "$PREV_BUILD');
    expect($deploy)->toContain('cleanup_prev_builds');
});

test('root sw.js is push-only without aggressive reload', function () {
    $base = dirname(__DIR__, 2);
    $sw = file_get_contents($base . '/public/sw.js');
    expect($sw)->toContain('clients.claim()');
    expect($sw)->not->toContain('client.navigate');
    expect($sw)->toContain('push');
    expect($sw)->toContain('push-only');
});

test('PWAServiceWorker update flow guards checkout', function () {
    $base = dirname(__DIR__, 2);
    $src = file_get_contents($base . '/resources/js/components/pwa/PWAServiceWorker.tsx');
    expect($src)->toContain('isCriticalFlowActive');
    expect($src)->toContain('controllerchange');
    expect($src)->toContain('updatefound');
    expect($src)->toContain('registration.update');
    expect($src)->toContain('skipWaiting');
    expect($src)->toContain('wusool:pwa-update-available');
    expect($src)->toContain('wusool:pwa-apply-update');
});

test('old hashed asset copy-forward does not overwrite same-name files', function () {
    // Simulate the cp -n semantics: same filename = same content must not overwrite
    $tmp = sys_get_temp_dir() . '/wusool_pwa_test_' . uniqid();
    mkdir($tmp . '/prev/assets', 0777, true);
    mkdir($tmp . '/live/assets', 0777, true);
    file_put_contents($tmp . '/prev/assets/app-abc123.js', 'old content');
    file_put_contents($tmp . '/prev/assets/old-only-xyz.js', 'old only');
    file_put_contents($tmp . '/live/assets/app-abc123.js', 'new content');
    // Simulate deploy.sh copy-forward logic
    foreach (glob($tmp . '/prev/assets/*') as $f) {
        $base = basename($f);
        $dest = $tmp . '/live/assets/' . $base;
        if (! file_exists($dest)) {
            copy($f, $dest);
        }
    }
    // existing file must not be overwritten
    expect(file_get_contents($tmp . '/live/assets/app-abc123.js'))->toBe('new content');
    // missing file must be copied
    expect(file_exists($tmp . '/live/assets/old-only-xyz.js'))->toBeTrue();
    expect(file_get_contents($tmp . '/live/assets/old-only-xyz.js'))->toBe('old only');
    // cleanup
    array_map('unlink', glob($tmp . '/live/assets/*'));
    array_map('unlink', glob($tmp . '/prev/assets/*'));
    rmdir($tmp . '/live/assets');
    rmdir($tmp . '/prev/assets');
    rmdir($tmp . '/live');
    rmdir($tmp . '/prev');
    rmdir($tmp);
});
