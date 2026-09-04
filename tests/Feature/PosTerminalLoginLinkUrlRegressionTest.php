<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * WUSOL POS TERMINAL - Login link URL regression.
 *
 * The live bug: the POS terminal management page built the "Login link" by
 * prepending `window.location.origin` to the value returned by Ziggy's
 * `route('pos.terminal.login', ...)`. Ziggy returns an ABSOLUTE URL by default
 * (https://<host>/pos/terminal/login?store=64&username=cashier-test), so the
 * concatenation duplicated the origin and produced a malformed host like
 * `wusool.pshttps`, which the browser rejected with DNS_PROBE_FINISHED_NXDOMAIN.
 *
 * This test pins the route contract the frontend builds against:
 *   - the named route `pos.terminal.login` exists and points at /pos/terminal/login
 *   - it takes exactly the non-secret bootstrap params `store` and `username`
 *   - a generated login URL is a valid absolute URL with a single scheme/origin
 *   - the URL contains NO PIN (PIN is never a query/route param)
 */
class PosTerminalLoginLinkUrlRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_terminal_login_route_contract_and_url_shape(): void
    {
        $route = \Illuminate\Support\Facades\Route::getRoutes()->getByName('pos.terminal.login');

        $this->assertNotNull($route, 'pos.terminal.login route must exist (the frontend login link depends on it)');

        $uri = $route->uri();
        $this->assertSame('pos/terminal/login', $uri, 'login route must resolve to /pos/terminal/login');

        // The frontend builds the link as: route('pos.terminal.login', { store, username })
        $url = route('pos.terminal.login', ['store' => 64, 'username' => 'cashier-test']);

        // Must be an absolute URL with exactly one scheme/origin (never wusool.pshttps).
        $this->assertMatchesRegularExpression('#^https?://[^/]+/pos/terminal/login#', $url, 'login URL must be a single-origin absolute URL');
        $this->assertStringNotContainsString('https://https', $url, 'scheme must never be duplicated');
        $this->assertDoesNotMatchRegularExpression('#^https?://[^/]+https?://#', $url, 'origin must never be duplicated/concatenated');

        // Must not carry a PIN anywhere in the URL.
        $this->assertStringNotContainsString('pin', strtolower($url), 'PIN must never appear in the login URL');

        // Must carry only the intended bootstrap params.
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $this->assertSame(['store' => '64', 'username' => 'cashier-test'], $query, 'login URL must carry only store + username bootstrap params');
    }

    public function test_terminal_login_route_has_no_pin_parameter(): void
    {
        $route = \Illuminate\Support\Facades\Route::getRoutes()->getByName('pos.terminal.login');
        $this->assertNotNull($route);

        $parameters = $route->parameterNames();
        $this->assertNotContains('pin', $parameters, 'pin must never be a route/query parameter of the login link');
    }
}
