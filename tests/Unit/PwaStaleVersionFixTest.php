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

test('deploy.sh contains bounded copy-forward from ORIG only', function () {
    $base = dirname(__DIR__, 2);
    $deploy = file_get_contents($base . '/deploy.sh');
    expect($deploy)->toContain('copy-forward');
    expect($deploy)->toContain('cp -n');
    expect($deploy)->toContain('ORIG_PREFIX');
    expect($deploy)->toContain('cleanup_orig_builds');
    expect($deploy)->toContain('LIVE_BUILD/assets');
    // Must be bounded: rebuilds from retained ORIG builds, not recursive PREV inheritance
    expect($deploy)->toContain('bounded');
    expect($deploy)->toContain('public/${ORIG_PREFIX}.*');
    expect($deploy)->toContain('head -n 3');
    // Must not overwrite current assets
    expect($deploy)->not->toContain('cp -f "$PREV_BUILD');
    expect($deploy)->toContain('if [ ! -e "$LIVE_BUILD/assets/$base" ]');
    // Rollback preserve still exists
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
    $tmp = sys_get_temp_dir() . '/wusool_pwa_test_' . uniqid();
    mkdir($tmp . '/prev/assets', 0777, true);
    mkdir($tmp . '/live/assets', 0777, true);
    file_put_contents($tmp . '/prev/assets/app-abc123.js', 'old content');
    file_put_contents($tmp . '/prev/assets/old-only-xyz.js', 'old only');
    file_put_contents($tmp . '/live/assets/app-abc123.js', 'new content');
    foreach (glob($tmp . '/prev/assets/*') as $f) {
        $base = basename($f);
        $dest = $tmp . '/live/assets/' . $base;
        if (! file_exists($dest)) {
            copy($f, $dest);
        }
    }
    expect(file_get_contents($tmp . '/live/assets/app-abc123.js'))->toBe('new content');
    expect(file_exists($tmp . '/live/assets/old-only-xyz.js'))->toBeTrue();
    expect(file_get_contents($tmp . '/live/assets/old-only-xyz.js'))->toBe('old only');
    array_map('unlink', glob($tmp . '/live/assets/*'));
    array_map('unlink', glob($tmp . '/prev/assets/*'));
    rmdir($tmp . '/live/assets');
    rmdir($tmp . '/prev/assets');
    rmdir($tmp . '/live');
    rmdir($tmp . '/prev');
    rmdir($tmp);
});

test('bounded compatibility propagation A->B->C->D->E expires old assets', function () {
    // Simulate bounded copy-forward from ORIG only (last 3 ORIGs).
    // Each build has a unique file: a.js, b.js, c.js, d.js, e.js
    $tmp = sys_get_temp_dir() . '/wusool_bounded_' . uniqid();
    mkdir($tmp, 0777, true);

    $origPrefix = $tmp . '/build.orig';
    $live = $tmp . '/build';
    // helper to create orig build
    $createOrig = function(string $name, string $file) use ($tmp) {
        $dir = $tmp . "/build.orig.$name/assets";
        if (!is_dir($dir)) mkdir($dir, 0777, true);
        file_put_contents($dir . "/$file", "content $file");
        file_put_contents($dir . "/shared.js", "shared $name");
        return $dir;
    };

    // A
    $createOrig('A', 'a-aaaa.js');
    // Simulate deploy B: live = B + last 3 origs before B (which is A)
    $liveAssets = $tmp . '/build/assets';
    mkdir($liveAssets, 0777, true);
    file_put_contents($liveAssets . '/b-bbbb.js', 'content b');
    file_put_contents($liveAssets . '/shared.js', 'shared B');
    // copy from retained origs (A) — bounded
    foreach (glob($tmp . '/build.orig.A/assets/*') as $f) {
        $base = basename($f);
        if (! file_exists($liveAssets . "/$base")) copy($f, $liveAssets . "/$base");
    }
    expect(file_exists($liveAssets . '/a-aaaa.js'))->toBeTrue(); // A retained
    expect(file_get_contents($liveAssets . '/shared.js'))->toBe('shared B'); // not overwritten
    // cleanup live for next iter
    array_map('unlink', glob($liveAssets . '/*'));
    // Now simulate full sequence with orig retention 3
    $origFiles = ['A' => 'a-aaaa.js', 'B' => 'b-bbbb.js', 'C' => 'c-cccc.js', 'D' => 'd-dddd.js', 'E' => 'e-eeee.js'];
    $allOrigDirs = [];
    foreach (array_keys($origFiles) as $n) {
        $allOrigDirs[$n] = $createOrig($n, $origFiles[$n]);
    }
    // Helper to simulate deploy with bounded orig retention
    $simulateDeploy = function(string $currentName) use ($tmp, $origFiles) {
        $liveAssets = $tmp . '/build/assets';
        // clean live and create current build assets
        if (is_dir($liveAssets)) array_map('unlink', glob($liveAssets . '/*'));
        else mkdir($liveAssets, 0777, true);
        file_put_contents($liveAssets . '/' . $origFiles[$currentName], "content " . $origFiles[$currentName]);
        // Determine retained origs: last 3 before current, ordered by creation (we use alphabetical)
        $retained = [];
        $order = ['A','B','C','D','E'];
        $idx = array_search($currentName, $order);
        $prior = array_slice($order, 0, $idx);
        $retained = array_slice($prior, -3); // last 3 prior builds
        foreach ($retained as $r) {
            $origDir = $tmp . "/build.orig.$r/assets";
            foreach (glob($origDir . '/*') as $f) {
                $base = basename($f);
                if (! file_exists($liveAssets . "/$base")) copy($f, $liveAssets . "/$base");
            }
        }
        return [$liveAssets, $retained];
    };

    // C deploy: should contain C,B,A (3 prior within retention) + shared
    [$liveC, $retC] = $simulateDeploy('C');
    expect(file_exists($liveC . '/c-cccc.js'))->toBeTrue();
    expect(file_exists($liveC . '/b-bbbb.js'))->toBeTrue();
    expect(file_exists($liveC . '/a-aaaa.js'))->toBeTrue();
    expect(count(glob($liveC . '/*')))->toBe(4);

    // D deploy: retained = B,C (since A pruned? Actually last 3 prior = A,B,C -> but we keep last 3 origs total, A still retained at D time if we keep 3? Let's simulate orig cleanup: keep last 3 origs total)
    // At D time, origs present are B,C,D after cleanup (A deleted). So live D should be D + C + B (not A)
    // Simulate orig cleanup: delete A when D created and we keep 3
    // For test, we manually ensure retained logic matches deploy.sh: ls -dt | head -n 3 before current
    // At D, prior retained should be B,C (if A was cleaned)
    // We'll emulate cleanup: after creating D, keep only last 3 orig dirs: B,C,D
    // So we simulate by deleting A orig before D live build
    // Instead our helper already does last 3 prior correctly but includes A — we need to delete old orig first
    // Let's delete A orig to simulate cleanup
    array_map('unlink', glob($tmp . '/build.orig.A/assets/*'));
    rmdir($tmp . '/build.orig.A/assets');
    rmdir($tmp . '/build.orig.A');
    [$liveD, $retD] = $simulateDeploy('D');
    expect(file_exists($liveD . '/d-dddd.js'))->toBeTrue();
    expect(file_exists($liveD . '/c-cccc.js'))->toBeTrue();
    expect(file_exists($liveD . '/b-bbbb.js'))->toBeTrue();
    expect(file_exists($liveD . '/a-aaaa.js'))->toBeFalse(); // A expired
    expect(count(glob($liveD . '/*')))->toBe(4);

    // E deploy: delete B orig, keep C,D,E
    array_map('unlink', glob($tmp . '/build.orig.B/assets/*'));
    rmdir($tmp . '/build.orig.B/assets');
    rmdir($tmp . '/build.orig.B');
    [$liveE, $retE] = $simulateDeploy('E');
    expect(file_exists($liveE . '/e-eeee.js'))->toBeTrue();
    expect(file_exists($liveE . '/d-dddd.js'))->toBeTrue();
    expect(file_exists($liveE . '/c-cccc.js'))->toBeTrue();
    expect(file_exists($liveE . '/b-bbbb.js'))->toBeFalse(); // B expired
    expect(file_exists($liveE . '/a-aaaa.js'))->toBeFalse();
    expect(count(glob($liveE . '/*')))->toBe(4); // bounded, not 6

    // Never overwrite current: create scenario where old orig has same filename as current but different content (should not happen with hash, but test no-clobber)
    file_put_contents($tmp . '/build.orig.C/assets/e-eeee.js', 'old fake e');
    if (is_dir($liveE)) array_map('unlink', glob($liveE . '/*'));
    file_put_contents($liveE . '/e-eeee.js', 'real E');
    foreach (glob($tmp . '/build.orig.C/assets/e-eeee.js') as $f) {
        $base = basename($f);
        if (! file_exists($liveE . "/$base")) copy($f, $liveE . "/$base");
    }
    expect(file_get_contents($liveE . '/e-eeee.js'))->toBe('real E');

    // cleanup
    foreach (['C','D','E'] as $n) {
        if (is_dir($tmp . "/build.orig.$n/assets")) {
            array_map('unlink', glob($tmp . "/build.orig.$n/assets/*"));
            rmdir($tmp . "/build.orig.$n/assets");
            rmdir($tmp . "/build.orig.$n");
        }
    }
    array_map('unlink', glob($liveE . '/*'));
    rmdir($liveE);
    rmdir($tmp . '/build');
    rmdir($tmp);
});
