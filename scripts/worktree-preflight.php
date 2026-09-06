<?php

declare(strict_types=1);

/**
 * Wusool worktree preflight — fast, reusable environment sanity check.
 *
 * Verifies (target < 5s, no app boot):
 *   1. current worktree root resolution
 *   2. Composer autoload correctness for App\, Tests\, Database\Factories\,
 *      Database\Seeders\ and the autoloader itself (FAILS FAST if any of
 *      them resolves OUTSIDE this checkout — the cross-worktree vendor
 *      junction symptom)
 *   3. writable runtime storage dirs + bootstrap/cache
 *   4. test environment (phpunit.xml + .env.testing) present
 *   5. test DB availability (in-memory sqlite)
 *   6. required dependencies (vendor/autoload.php present)
 *   7. Vite manifest status (informational report, never faked)
 *
 * Usage:  php scripts/worktree-preflight.php
 * Wrapper: bash scripts/worktree-preflight.sh
 */

$root = dirname(__DIR__);
chdir($root);

$slashes = static fn (string $p): string => str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $p);

$canonical = static fn (string $p): string => realpath($p) === false
    ? rtrim($slashes($p), DIRECTORY_SEPARATOR)
    : $slashes((string) realpath($p));

$fail = 0;

$report = static function (string $name, bool $ok, string $detail = '') use (&$fail): void {
    $marker = $ok ? 'PASS' : 'FAIL';
    if (! $ok) {
        $fail++;
    }
    echo sprintf("%-42s [%s] %s\n", $name, $marker, $detail);
};

echo "== Wusool worktree preflight\n";
echo "   ROOT: {$root}\n";

// -----------------------------------------------------------------
// 1) Current worktree root
// -----------------------------------------------------------------
$report('wusool checkout structure', is_file($root.DIRECTORY_SEPARATOR.'composer.json')
    && is_file($root.DIRECTORY_SEPARATOR.'artisan')
    && is_file($root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'app.php'));

// -----------------------------------------------------------------
// 2) Composer autoload correctness (inside THIS checkout)
// -----------------------------------------------------------------
$autoload = $root.DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'autoload.php';
if (! is_file($autoload)) {
    $report('composer vendor/autoload.php', false, 'missing - run: bash scripts/setup-worktree.sh');
    echo "\nRESULT: FAIL ($fail)\n";

    exit(1);
}

require $autoload;

$loaderFile = (new ReflectionClass(Composer\Autoload\ClassLoader::class))->getFileName();
$loaderOk = $loaderFile !== false && str_starts_with($canonical($loaderFile), $canonical($root.DIRECTORY_SEPARATOR.'vendor'));
$report('composer autoloader lives in this checkout', $loaderOk);

$psr4 = require $root.DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'composer'.DIRECTORY_SEPARATOR.'autoload_psr4.php';

$expected = [
    'App\\' => 'app',
    'Tests\\' => 'tests',
    'Database\\Factories\\' => 'database/factories',
    'Database\\Seeders\\' => 'database/seeders',
];

foreach ($expected as $prefix => $relative) {
    $mapped = $psr4[$prefix][0] ?? null;
    $ok = $mapped !== null && $canonical($mapped) === $canonical($root.DIRECTORY_SEPARATOR.$relative);
    $detail = $ok ? '' : sprintf('resolves to %s (expected %s under THIS checkout)', var_export($mapped, true), var_export($relative, true));
    $report("psr-4 prefix {$prefix}", $ok, $detail);
}

$probes = [
    'App\Models\User' => 'app/Models/User.php',
    'Tests\TestCase' => 'tests/TestCase.php',
    'Database\Factories\UserFactory' => 'database/factories/UserFactory.php',
];

foreach ($probes as $class => $relative) {
    $file = (new ReflectionClass($class))->getFileName();
    $ok = $file !== false && str_starts_with($canonical($file), $canonical($root.DIRECTORY_SEPARATOR.$relative));
    $detail = $ok ? '' : sprintf('resolves to %s', var_export($file, true));
    $report("reflection {$class}", $ok, $detail);
}

// -----------------------------------------------------------------
// 3) writable runtime storage
// -----------------------------------------------------------------
$storageDirs = [
    'storage/framework/cache',
    'storage/framework/cache/data',
    'storage/framework/sessions',
    'storage/framework/views',
    'storage/framework/testing',
    'storage/logs',
    'bootstrap/cache',
];

foreach ($storageDirs as $relative) {
    $abs = $root.DIRECTORY_SEPARATOR.$relative;
    $report("runtime dir {$relative}", is_dir($abs) && is_writable($abs));
}

// -----------------------------------------------------------------
// 4) test environment
// -----------------------------------------------------------------
$report('phpunit.xml present', is_file($root.DIRECTORY_SEPARATOR.'phpunit.xml'));
$report('.env.testing present', is_file($root.DIRECTORY_SEPARATOR.'.env.testing'));

// -----------------------------------------------------------------
// 5) test DB availability
// -----------------------------------------------------------------
$pdoOk = false;
$pdoDetail = '';
if (extension_loaded('pdo_sqlite')) {
    try {
        $pdo = new PDO('sqlite::memory:');
        $pdo->query('SELECT 1');
        $pdoOk = true;
    } catch (Throwable $e) {
        $pdoDetail = $e->getMessage();
    }
} else {
    $pdoDetail = 'pdo_sqlite extension not loaded';
}
$report('in-memory sqlite test DB', $pdoOk, $pdoDetail);

// -----------------------------------------------------------------
// 6) Vite manifest (informational; never faked)
// -----------------------------------------------------------------
$manifest = $root.DIRECTORY_SEPARATOR.'public'.DIRECTORY_SEPARATOR.'build'.DIRECTORY_SEPARATOR.'manifest.json';
if (is_file($manifest)) {
    $report('vite manifest', true, 'public/build/manifest.json present');
} else {
    $report('vite manifest', true, 'INFO: public/build/manifest.json is MISSING - PHP tests that render full pages / assert the manifest need: npm run build (never faked)');
}

echo "\n";
if ($fail > 0) {
    echo sprintf("RESULT: FAIL (%d)\n", $fail);

    exit(1);
}

echo "RESULT: PASS\n";

exit(0);