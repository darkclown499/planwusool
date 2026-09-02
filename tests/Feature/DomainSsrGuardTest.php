<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreDomain;
use App\Models\User;
use App\Services\Domain\PublicIpGuard;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Guards the Step 7 Domains security gate: the SSL probe and A-record hint
 * must never target a merchant-controlled host that resolves to a private /
 * reserved / internal address, and the server IP discovery must never call a
 * public third-party service.
 */
class DomainSsrGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    private function makeCompanyWithStore(string $name = 'Test Store', bool $domainEnabled = true): array
    {
        $plan = Plan::factory()->create([
            'price' => 0,
            'is_default' => true,
            'max_stores' => 5,
            'max_products_per_store' => 1000,
            'enable_custdomain' => $domainEnabled ? 'on' : 'off',
            'enable_custsubdomain' => 'on',
            'enable_shipping_method' => 'on',
        ]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = Store::factory()->create(['user_id' => $user->id, 'name' => $name]);
        \Illuminate\Support\Facades\DB::table('users')->where('id', $user->id)->update(['current_store' => $store->id]);
        $user = $user->fresh();
        $user->givePermissionTo(['settings-stores', 'manage-stores', 'manage-orders']);
        return [$user, $store];
    }

    public function test_public_ipv4_addresses_are_allowed(): void
    {
        foreach (['8.8.8.8', '1.1.1.1', '9.9.9.9', '172.217.0.0'] as $ip) {
            $this->assertTrue(PublicIpGuard::isPublic($ip), "[$ip] should be treated as public");
        }
    }

    public function test_private_and_reserved_ipv4_are_blocked(): void
    {
        foreach ([
            '10.0.0.1',        // RFC1918 10/8
            '172.16.0.1',      // RFC1918 172.16/12
            '172.31.255.255',  // RFC1918 172.16/12 upper
            '192.168.1.1',     // RFC1918 192.168/16
            '127.0.0.1',       // loopback
            '127.8.8.8',       // loopback /8
            '169.254.169.254', // cloud metadata
            '169.254.1.1',     // link-local
            '100.64.0.1',      // CGNAT
            '0.0.0.0',
            '192.0.2.1',       // TEST-NET-1
            '198.51.100.1',    // TEST-NET-2
            '203.0.113.1',     // TEST-NET-3
            '224.0.0.1',       // multicast
            '240.0.0.1',       // reserved
            '255.255.255.255', // broadcast
        ] as $ip) {
            $this->assertFalse(PublicIpGuard::isPublic($ip), "[$ip] must be blocked as non-public");
        }
    }

    public function test_ipv6_private_reserved_and_metadata_are_blocked(): void
    {
        foreach ([
            '::',
            '::1',           // loopback
            'fe80::1',       // link-local
            'fc00::1',       // ULA
            'fd00::1',       // ULA
            '2001:db8::1',   // documentation
            'ff02::1',       // multicast
            '::ffff:127.0.0.1',
            '::ffff:10.0.0.1',
            '::ffff:192.168.1.1',
        ] as $ip) {
            $this->assertFalse(PublicIpGuard::isPublic($ip), "[$ip] must be blocked as non-public");
        }
    }

    public function test_public_ipv6_and_ipv4_mapped_are_allowed(): void
    {
        $this->assertTrue(PublicIpGuard::isPublic('2606:4700:4700::1111'));
        $this->assertTrue(PublicIpGuard::isPublic('2001:4860:4860::8888'));
        $this->assertTrue(PublicIpGuard::isPublic('::ffff:8.8.8.8'));
    }

    public function test_public_ip_guard_rejects_non_ip_and_empty(): void
    {
        $this->assertFalse(PublicIpGuard::isPublic(null));
        $this->assertFalse(PublicIpGuard::isPublic(''));
        $this->assertFalse(PublicIpGuard::isPublic('not-an-ip'));
        $this->assertFalse(PublicIpGuard::isPublic('example.com'));
    }

    public function test_recheck_never_marks_ssl_active_via_private_resolution(): void
    {
        [$owner, $store] = $this->makeCompanyWithStore('SSRF Store');

        StoreDomain::create([
            'store_id' => $store->id,
            'domain_name' => 'internal.example.com',
            'is_verified' => false,
            'ssl_status' => 'pending',
            'verification_token' => 'wa-verify-token',
            'is_primary' => true,
        ]);

        // In the test environment dns_get_record does not resolve a live public
        // address, so the SSRF guard (correctly) returns no public IP and the
        // probe is skipped — SSL must degrade honestly (never "active").
        $this->actingAs($owner)
            ->postJson(route('stores.domains.recheck', $store->id))
            ->assertStatus(200);

        $domain = $store->storeDomains()->first()->fresh();
        $this->assertNotSame('active', $domain->ssl_status, 'SSL must never be reported active without a validated public TLS endpoint');
    }
}
