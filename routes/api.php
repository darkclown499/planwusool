<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (Versioned)
|--------------------------------------------------------------------------
|
| Versioned API endpoints for external consumers and the storefront.
| All routes are prefixed with /api/v1 by the api middleware group in
| bootstrap/app.php.
|
| Versioning strategy:
|   - v1 targets the existing storefront API surface (cart, wishlist,
|     orders, shipping, payments, locations, notifications, etc.)
|   - New breaking changes MUST be introduced under /api/v2, never by
|     modifying an existing version.
|
| The legacy /api/* routes remain registered in routes/web.php to keep
| existing storefronts working during the migration window.
*/

Route::prefix('v1')->group(function () {

    // Public storefront cart API
    Route::prefix('cart')->name('api.v1.cart.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\CartController::class, 'index'])->name('index');
        Route::post('/add', [\App\Http\Controllers\Api\CartController::class, 'add'])->name('add');
        Route::post('/sync', [\App\Http\Controllers\Api\CartController::class, 'sync'])->name('sync');
        Route::put('{id}', [\App\Http\Controllers\Api\CartController::class, 'update'])->name('update');
        Route::delete('{id}', [\App\Http\Controllers\Api\CartController::class, 'remove'])->name('remove');
    });

    // Wishlist API
    Route::prefix('wishlist')->name('api.v1.wishlist.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\WishlistController::class, 'index'])->name('index');
        Route::post('/add', [\App\Http\Controllers\Api\WishlistController::class, 'add'])->name('add');
        Route::post('/toggle', [\App\Http\Controllers\Api\WishlistController::class, 'toggle'])->name('toggle');
        Route::delete('{id}', [\App\Http\Controllers\Api\WishlistController::class, 'remove'])->name('remove');
    });

    // Orders API
    Route::prefix('orders')->name('api.v1.orders.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\OrderController::class, 'index'])->name('index');
        Route::get('{orderNumber}', [\App\Http\Controllers\Api\OrderController::class, 'show'])->name('show');
    });

    // Shipping methods
    Route::get('shipping-methods', [\App\Http\Controllers\Api\ShippingController::class, 'getMethods'])
        ->name('api.v1.shipping.methods');

    // Payment methods
    Route::get('payment-methods', [\App\Http\Controllers\Api\PaymentController::class, 'getMethods'])
        ->name('api.v1.payment.methods');

    // Coupon validation
    Route::post('coupon/validate', [\App\Http\Controllers\Api\CouponController::class, 'validate'])
        ->name('api.v1.coupon.validate');

    // Locations
    Route::prefix('locations')->name('api.v1.locations.')->group(function () {
        Route::get('countries', [\App\Http\Controllers\Api\LocationController::class, 'getCountries'])->name('countries');
        Route::get('states/{countryId}', [\App\Http\Controllers\Api\LocationController::class, 'getStatesByCountry'])->name('states');
        Route::get('cities/{stateId}', [\App\Http\Controllers\Api\LocationController::class, 'getCitiesByState'])->name('cities');
    });

    // Product reviews
    Route::prefix('reviews')->name('api.v1.reviews.')->group(function () {
        Route::get('product/{productId}', [\App\Http\Controllers\ProductReviewController::class, 'productReviews'])->name('product');
        Route::post('/', [\App\Http\Controllers\ProductReviewController::class, 'store'])->name('store');
    });

    // Notifications (customer storefront)
    Route::prefix('notifications')->name('api.v1.notifications.')->group(function () {
        Route::get('/', [\App\Http\Controllers\NotificationController::class, 'indexApi'])->name('index');
        Route::get('unread-count', [\App\Http\Controllers\NotificationController::class, 'unreadCount'])->name('unread-count');
        Route::get('preferences', [\App\Http\Controllers\NotificationController::class, 'getPreferences'])->name('preferences');
        Route::put('preferences', [\App\Http\Controllers\NotificationController::class, 'updatePreferences'])->name('preferences.update');
        Route::post('{id}/read', [\App\Http\Controllers\NotificationController::class, 'markRead'])->name('mark-read');
        Route::post('read-all', [\App\Http\Controllers\NotificationController::class, 'markAllRead'])->name('mark-all-read');
        Route::delete('{id}', [\App\Http\Controllers\NotificationController::class, 'destroyApi'])->name('destroy');
    });

    // Push subscriptions
    Route::prefix('push-subscriptions')->name('api.v1.push-subscriptions.')->group(function () {
        Route::post('subscribe', [\App\Http\Controllers\PushSubscriptionController::class, 'subscribe'])->name('subscribe');
        Route::post('unsubscribe', [\App\Http\Controllers\PushSubscriptionController::class, 'unsubscribe'])->name('unsubscribe');
        Route::get('status', [\App\Http\Controllers\PushSubscriptionController::class, 'status'])->name('status');
        Route::get('vapid-public-key', [\App\Http\Controllers\PushSubscriptionController::class, 'vapidPublicKey'])->name('vapid-public-key');
    });

    // Advanced coupon validation
    Route::post('advanced-coupon/validate', [\App\Http\Controllers\AdvancedCouponController::class, 'validateCoupon'])
        ->name('api.v1.advanced-coupon.validate');

});
