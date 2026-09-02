<?php

namespace App\Providers;

use App\Events\UserCreated;
use App\Events\OrderCreated;
use App\Events\StoreCreated;
use App\Events\OrderStatusChanged;
use App\Events\CustomerCreated;
use App\Events\CustomerVerified;
use App\Events\ProductCreated;
use App\Listeners\SendUserCreatedEmail;
use App\Listeners\SendOrderCreatedEmail;
use App\Listeners\SendOrderCreatedMessaging;
use App\Listeners\SendStoreCreatedEmail;
use App\Listeners\SendOrderStatusChangedEmail;
use App\Listeners\SendUniversalNotification;
use App\Listeners\HandleWebhooks;
use App\Listeners\CreateMerchantNotifications;
use App\Listeners\DispatchStoreCustomerEmails;
use App\Listeners\DispatchWelcomeEmail;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        UserCreated::class => [
            SendUserCreatedEmail::class,
            HandleWebhooks::class . '@handleUserCreated',
        ],
        OrderCreated::class => [
            // Merchant-owned transactional email (store isolated, queued, no Wusool fallback)
            \App\Listeners\DispatchStoreCustomerEmails::class . '@handleOrderCreated',
            SendOrderCreatedMessaging::class,
            SendUniversalNotification::class . '@handleOrderCreated',
            HandleWebhooks::class . '@handleOrderCreated',
            CreateMerchantNotifications::class . '@onOrderCreated',
        ],
        StoreCreated::class => [
            SendStoreCreatedEmail::class,
        ],
        OrderStatusChanged::class => [
            \App\Listeners\DispatchStoreCustomerEmails::class . '@handleOrderStatusChanged',
            SendUniversalNotification::class . '@handleOrderStatusChanged',
            HandleWebhooks::class . '@handleOrderStatusChanged',
            CreateMerchantNotifications::class . '@onOrderStatusChanged',
            \App\Listeners\AwardLoyaltyOnDelivery::class,
        ],
        CustomerCreated::class => [
            SendUniversalNotification::class . '@handleCustomerCreated',
            HandleWebhooks::class . '@handleCustomerCreated',
        ],
        CustomerVerified::class => [
            DispatchWelcomeEmail::class,
        ],
        ProductCreated::class => [
            HandleWebhooks::class . '@handleProductCreated',
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}