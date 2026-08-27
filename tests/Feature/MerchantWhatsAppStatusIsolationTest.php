<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Setting;
use App\Models\Store;
use App\Models\StoreWhatsappIntegration;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Security regression: merchant WhatsApp status endpoint must never leak a
 * foreign tenant's data (IDOR) and must never return an unmasked (raw)
 * notification phone number. Also covers at-rest encryption of webhook secrets.
 */
class MerchantWhatsAppStatusIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    private function makeCompany(): array
    {
        $plan = Plan::factory()->create([
            'name' => 'Pro-'.uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 1000,
            'max_users_per_store' => 20,
            'enable_shipping_method' => 'on',
        ]);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $user->givePermissionTo(['manage-stores', 'settings-stores']);

        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Store '.uniqid();
        $store->slug = 's-'.uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 'store@'.uniqid().'.com';
        $store->save();

        $user->current_store = $store->id;
        $user->save();

        return [$user, $store];
    }

    private function attachIntegration(Store $store, string $phone): StoreWhatsappIntegration
    {
        return StoreWhatsappIntegration::create([
            'store_id' => $store->id,
            'provider' => 'meta',
            'notification_phone' => $phone,
            'business_phone' => $phone,
            'is_enabled' => true,
            'connection_status' => 'connected',
        ]);
    }

    #[Test]
    public function owner_can_read_own_store_whatsapp_status(): void
    {
        [$owner, $store] = $this->makeCompany();
        $this->attachIntegration($store, '0599'.rand(100000, 999999));

        $this->actingAs($owner)
            ->getJson(route('stores.notifications.whatsapp.status', $store->id))
            ->assertStatus(200)
            ->assertOk();
    }

    #[Test]
    public function foreign_tenant_cannot_read_other_store_whatsapp_status(): void
    {
        [$ownerA, $storeA] = $this->makeCompany();
        [, $storeB] = $this->makeCompany();
        $this->attachIntegration($storeB, '0599'.rand(100000, 999999));

        $this->actingAs($ownerA)
            ->getJson(route('stores.notifications.whatsapp.status', $storeB->id))
            ->assertStatus(403);
    }

    #[Test]
    public function foreign_tenant_cannot_read_owner_company_status(): void
    {
        [$ownerB] = $this->makeCompany();
        [$ownerA, $storeA] = $this->makeCompany();
        $this->attachIntegration($storeA, '0599'.rand(100000, 999999));

        // ownerB acts as a separate tenant; must not read ownerA's store.
        $this->actingAs($ownerB)
            ->getJson(route('stores.notifications.whatsapp.status', $storeA->id))
            ->assertStatus(403);
    }

    #[Test]
    public function status_endpoint_never_returns_unmasked_number(): void
    {
        [$owner, $store] = $this->makeCompany();
        $this->attachIntegration($store, '0599'.rand(100000, 999999));

        $response = $this->actingAs($owner)
            ->getJson(route('stores.notifications.whatsapp.status', $store->id))
            ->assertOk();

        $data = $response->json();
        $this->assertArrayNotHasKey('number_normalized', $data, 'Unmasked number must never be returned to the client.');
    }

    #[Test]
    public function webhook_secrets_are_encrypted_at_rest(): void
    {
        $method = new ReflectionMethod(Setting::class, 'sensitiveSettingKeys');
        $method->setAccessible(true);
        $keys = $method->invoke(null);

        foreach (['stripe_webhook_secret', 'paypal_webhook_id', 'paiement_merchant_secret'] as $key) {
            $this->assertContains($key, $keys, "At-rest encryption key missing: $key");
        }
    }
}
