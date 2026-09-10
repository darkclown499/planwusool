<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Create the application, pinning the base path to this checkout.
     *
     * The stock createApplication() relies on Composer path inference, which
     * can resolve to a sibling checkout when the vendor directory is shared
     * via a filesystem junction (parallel worktrees). Pinning the base path
     * relative to this file keeps tests booting the correct application.
     */
    public function createApplication()
    {
        $_ENV['APP_BASE_PATH'] = dirname(__DIR__);
        $_SERVER['APP_BASE_PATH'] = dirname(__DIR__);

        return parent::createApplication();
    }
}
