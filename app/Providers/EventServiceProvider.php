<?php

namespace App\Providers;

use App\Events\UserCreated;
use App\Events\OrderCreated;
use App\Events\StoreCreated;
use App\Events\OrderStatusChanged;
use App\Events\CustomerCreated;
use App\Events\ProductCreated;
use App\Listeners\SendUserCreatedEmail;
use App\Listeners\SendOrderCreatedMessaging;
use App\Listeners\SendStoreCreatedEmail;
use App\Listeners\SendOrderStatusChangedEmail;
use App\Listeners\SendUniversalNotification;
use App\Listeners\HandleWebhooks;
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
            SendOrderCreatedMessaging::class,
            SendUniversalNotification::class . '@handleOrderCreated',
            HandleWebhooks::class . '@handleOrderCreated',
        ],
        StoreCreated::class => [
            SendStoreCreatedEmail::class,
        ],
        OrderStatusChanged::class => [
            SendOrderStatusChangedEmail::class,
            SendUniversalNotification::class . '@handleOrderStatusChanged',
            HandleWebhooks::class . '@handleOrderStatusChanged',
        ],
        CustomerCreated::class => [
            SendUniversalNotification::class . '@handleCustomerCreated',
            HandleWebhooks::class . '@handleCustomerCreated',
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