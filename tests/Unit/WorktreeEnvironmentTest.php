<?php

namespace Tests\Unit;

use Tests\TestCase;

/**
 * Guards the fresh-worktree test environment contract:
 *
 *  - Composer autoload must resolve App\, Tests\, Database\Factories\ and
 *    Database\Seeders\ inside THIS checkout (never a cross-worktree vendor
 *    junction targeted at another checkout).
 *  - Required Laravel runtime storage dirs must exist and be writable.
 *  - The test run must happen in the testing environment with the in-memory
 *    sqlite database, never the production .env or a real database.
 */
class WorktreeEnvironmentTest extends TestCase
{
    public function test_app_models_user_resolves_inside_current_checkout(): void
    {
        $file = (new \ReflectionClass(\App\Models\User::class))->getFileName();

        $this->assertNotFalse($file);
        $this->assertStringStartsWith($this->currentRoot(), $this->canonical($file));
        $this->assertStringStartsWith($this->canonical(base_path('app')), $this->canonical($file));
        $this->assertFileExists($file);
    }

    public function test_tests_testcase_resolves_inside_current_checkout(): void
    {
        $file = (new \ReflectionClass(\Tests\TestCase::class))->getFileName();

        $this->assertNotFalse($file);
        $this->assertStringStartsWith($this->currentRoot(), $this->canonical($file));
        $this->assertStringStartsWith($this->canonical(base_path('tests')), $this->canonical($file));
        $this->assertFileExists($file);
    }

    public function test_database_factory_namespace_resolves_inside_current_checkout(): void
    {
        $file = (new \ReflectionClass(\Database\Factories\UserFactory::class))->getFileName();

        $this->assertNotFalse($file);
        $this->assertStringStartsWith($this->currentRoot(), $this->canonical($file));
        $this->assertStringStartsWith($this->canonical(base_path('database')), $this->canonical($file));
        $this->assertFileExists($file);
    }

    public function test_composer_psr4_prefixes_point_at_current_checkout(): void
    {
        $psr4 = require base_path('vendor/composer/autoload_psr4.php');

        $expectations = [
            'App\\' => base_path('app'),
            'Tests\\' => base_path('tests'),
            'Database\\Factories\\' => base_path('database/factories'),
            'Database\\Seeders\\' => base_path('database/seeders'),
        ];

        foreach ($expectations as $prefix => $expectedDir) {
            $this->assertArrayHasKey($prefix, $psr4, "PSR-4 prefix {$prefix} is missing from the autoloader");
            $this->assertSame(
                $this->canonical($expectedDir),
                $this->canonical($psr4[$prefix][0]),
                "PSR-4 prefix {$prefix} must resolve to the CURRENT checkout directory"
            );
        }
    }

    public function test_composer_autoloader_itself_resolves_inside_current_checkout(): void
    {
        // A cross-worktree vendor junction makes the autoloader physically live
        // in an old checkout; the PSR-4 base dir then silently follows it.
        $file = (new \ReflectionClass(\Composer\Autoload\ClassLoader::class))->getFileName();

        $this->assertNotFalse($file);
        $this->assertStringStartsWith($this->canonical(base_path('vendor')), $this->canonical($file));
    }

    public function test_runtime_storage_directories_exist_and_are_writable(): void
    {
        foreach ([
            'storage/framework/cache',
            'storage/framework/cache/data',
            'storage/framework/sessions',
            'storage/framework/views',
            'storage/framework/testing',
            'storage/logs',
            'bootstrap/cache',
        ] as $relative) {
            $absolute = base_path($relative);
            $this->assertDirectoryExists($absolute, "Missing runtime dir: {$relative}");
            $this->assertTrue(is_writable($absolute), "Not writable: {$relative}");
        }
    }

    public function test_test_environment_is_recognized(): void
    {
        $this->assertSame('testing', app()->environment());
        $this->assertSame('testing', config('app.env'));
        $this->assertFileExists(base_path('.env.testing'));
        $this->assertSame('.env.testing', $this->loadedEnvFile());
    }

    public function test_test_database_is_in_memory_sqlite(): void
    {
        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));
    }

    public function test_post_autoload_dump_package_manifest_is_writable(): void
    {
        // composer install runs `artisan package:discover` after autoload dump;
        // it writes bootstrap/cache/packages.php + services.php. Missing
        // storage/framework/views breaks that boot (view compiler boot error),
        // so a green package cache proves the storage-first boot order worked.
        $this->assertDirectoryExists(base_path('bootstrap/cache'));
        $this->assertTrue(is_writable(base_path('bootstrap/cache')));
    }

    private function currentRoot(): string
    {
        return $this->canonical(dirname(__DIR__, 2));
    }

    private function canonical(string $path): string
    {
        $real = realpath($path);

        return $real === false ? rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path), DIRECTORY_SEPARATOR) : str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $real);
    }

    private function loadedEnvFile(): string
    {
        return $this->app->environmentFile() ?? '';
    }
}