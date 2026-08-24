<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\PlanOrderController;
use App\Http\Controllers\PlanRequestController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CompanyController;



use App\Http\Controllers\CouponController;

use App\Http\Controllers\CurrencyController;
use App\Http\Controllers\ImpersonateController;
use App\Http\Controllers\TranslationController;
use App\Http\Controllers\LandingPageController;

use App\Http\Controllers\LandingPage\CustomPageController;
use App\Http\Controllers\LandingPage\ContactController;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\RazorpayController;
use App\Http\Controllers\MercadoPagoController;
use App\Http\Controllers\Store\MercadoPagoController as StoreMercadoPagoController;
use App\Http\Controllers\StripePaymentController;
use App\Http\Controllers\PayPalPaymentController;
use App\Http\Controllers\BankPaymentController;
use App\Http\Controllers\PaystackPaymentController;
use App\Http\Controllers\Store\PaystackController as StorePaystackController;
use App\Http\Controllers\FlutterwavePaymentController;
use App\Http\Controllers\PayTabsPaymentController;
use App\Http\Controllers\SkrillPaymentController;
use App\Http\Controllers\CoinGatePaymentController;
use App\Http\Controllers\PayfastPaymentController;
use App\Http\Controllers\TapPaymentController;
use App\Http\Controllers\XenditPaymentController;
use App\Http\Controllers\PayTRPaymentController;
use App\Http\Controllers\MolliePaymentController;
use App\Http\Controllers\ToyyibPayPaymentController;
use App\Http\Controllers\CashfreeController;
use App\Http\Controllers\IyzipayPaymentController;
use App\Http\Controllers\BenefitPaymentController;
use App\Http\Controllers\OzowPaymentController;
use App\Http\Controllers\EasebuzzPaymentController;
use App\Http\Controllers\KhaltiPaymentController;
use App\Http\Controllers\AuthorizeNetPaymentController;
use App\Http\Controllers\FedaPayPaymentController;
use App\Http\Controllers\PayHerePaymentController;
use App\Http\Controllers\CinetPayPaymentController;
use App\Http\Controllers\PaiementPaymentController;
use App\Http\Controllers\NepalstePaymentController;
use App\Http\Controllers\YooKassaPaymentController;
use App\Http\Controllers\AamarpayPaymentController;
use App\Http\Controllers\MidtransPaymentController;
use App\Http\Controllers\ThemeController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\LoyaltyController;
use App\Http\Controllers\ProductReviewController;
use App\Http\Controllers\AbandonedCartController;
use App\Http\Controllers\DigitalDownloadController;
use App\Http\Controllers\CodPaymentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\MerchantNotificationController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\Store\CartTrackingController;


use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ===========================================================================
// Storage fallback — serve uploaded files through PHP when the
// public/storage symlink is missing or broken (some hosts do not allow
// symlinks). Fixes 404s on uploaded images (e.g. /storage/media/...).
// ===========================================================================
if (! file_exists(public_path('storage'))) {
    Route::get('storage/{path}', function (string $path) {
        $disk = \Illuminate\Support\Facades\Storage::disk('public');
        if ($disk->exists($path)) {
            return $disk->response($path);
        }
        abort(404);
    })->where('path', '.*');
}

// ===========================================================================
// Store frontend routes — every store is served on its own subdomain:
// {storeSlug}.{APP_DOMAIN} (e.g. techvibe.wusool.ps, techvibe.localhost).
// Registered before the landing page route so the subdomain root ("/")
// resolves to the store instead of the app landing page.
// ===========================================================================
Route::domain('{storeSlug}.' . config('app.store_domain'))->middleware('store.status')->group(function () {
    // PWA routes
    Route::get('manifest.json', [\App\Http\Controllers\PWAController::class, 'manifest'])->name('store.pwa.manifest');
    Route::get('service-worker', [\App\Http\Controllers\PWAController::class, 'serviceWorker'])->name('store.pwa.sw');
    Route::get('pwa-icon/{size}', [\App\Http\Controllers\PWAController::class, 'icon'])->name('store.pwa.icon');

    // Main store routes
    Route::get('/', [ThemeController::class, 'home'])->name('store.home');
    Route::get('/order/{orderNumber}', [ThemeController::class, 'orderDetail'])->name('store.order-detail');

    // Auth routes
    Route::post('/login', [\App\Http\Controllers\Store\AuthController::class, 'login'])->middleware('throttle:5,1')->name('store.login');
    Route::post('/register', [\App\Http\Controllers\Store\AuthController::class, 'register'])->middleware('throttle:10,1')->name('store.register');
    Route::post('/logout', [\App\Http\Controllers\Store\AuthController::class, 'logout'])->name('store.logout');

    // Profile routes
    Route::post('/profile/update', [\App\Http\Controllers\Store\ProfileController::class, 'updateProfile'])->name('store.profile.update');
    Route::post('/profile/password', [\App\Http\Controllers\Store\ProfileController::class, 'updatePassword'])->name('store.profile.password');

    // Storefront phone OTP (HotSMS/Twilio SMS gateway) for checkout verification
    Route::post('/otp/send', [\App\Http\Controllers\StorefrontOtpController::class, 'send'])->middleware('throttle:6,1')->name('store.otp.send');
    Route::post('/otp/verify', [\App\Http\Controllers\StorefrontOtpController::class, 'verify'])->middleware('throttle:10,1')->name('store.otp.verify');
    Route::post('/otp/resend', [\App\Http\Controllers\StorefrontOtpController::class, 'resend'])->middleware('throttle:6,1')->name('store.otp.resend');

    // Password reset routes
    Route::post('/forgot-password', [\App\Http\Controllers\Store\AuthController::class, 'forgotPassword'])->middleware('throttle:5,1')->name('store.forgot-password');
    Route::get('/reset-password/{token}', [\App\Http\Controllers\Store\AuthController::class, 'showResetForm'])->name('store.reset-password');
    Route::post('/reset-password', [\App\Http\Controllers\Store\AuthController::class, 'resetPassword'])->middleware('throttle:5,1')->name('store.reset-password.update');

    // Order routes
    Route::post('/order/place', [\App\Http\Controllers\Store\OrderController::class, 'placeOrder'])->name('store.order.place');
    Route::get('/order/{orderNumber}/pdf', [\App\Http\Controllers\ThemeController::class, 'downloadOrderPdf'])->name('store.order.pdf');
    Route::get('/stripe/success/{orderNumber}', [\App\Http\Controllers\Store\StripeController::class, 'success'])->name('store.stripe.success');
    Route::get('/paypal/success/{orderNumber}', [\App\Http\Controllers\Store\PayPalController::class, 'success'])->name('store.paypal.success');
    Route::get('/xendit/success/{orderNumber}', [\App\Http\Controllers\Store\XenditController::class, 'success'])->name('store.xendit.success');
    Route::match(['GET', 'POST'], '/toyyibpay/success/{orderNumber}', [\App\Http\Controllers\Store\ToyyibPayController::class, 'success'])->name('store.toyyibpay.success');
    Route::get('/cashfree/success/{orderNumber}', [\App\Http\Controllers\Store\CashfreeController::class, 'success'])->name('store.cashfree.success');
    Route::match(['GET', 'POST'], '/flutterwave/success/{orderNumber}', [\App\Http\Controllers\Store\FlutterwaveController::class, 'success'])->name('store.flutterwave.success');
    Route::get('/paytabs/success/{orderNumber}', [\App\Http\Controllers\Store\PayTabsController::class, 'success'])->name('store.paytabs.success');
    Route::match(['GET', 'POST'], '/paytabs/callback/{orderNumber}', [\App\Http\Controllers\Store\PayTabsController::class, 'callback'])->middleware('webhook.signature:paytabs')->name('store.paytabs.callback');
    Route::post('/cashfree/verify-payment', [\App\Http\Controllers\Store\CashfreeController::class, 'verifyPayment'])->name('store.cashfree.verify-payment');
    Route::post('store-cashfree/webhook', [\App\Http\Controllers\Store\CashfreeController::class, 'webhook'])->middleware('webhook.signature:cashfree')->name('store.cashfree.webhook');
    Route::post('/razorpay/verify-payment', [\App\Http\Controllers\Store\RazorpayController::class, 'verifyPayment'])->name('store.razorpay.verify-payment');

    // Store-side Paystack routes
    Route::get('/paystack/success/{orderNumber}', [StorePaystackController::class, 'success'])->name('store.paystack.success');

    // Store-side MercadoPago routes
    Route::get('/mercadopago/success/{orderNumber}', [StoreMercadoPagoController::class, 'success'])->name('store.mercadopago.success');
    Route::get('/mercadopago/failure', [StoreMercadoPagoController::class, 'failure'])->name('store.mercadopago.failure');
    Route::get('/mercadopago/pending', [StoreMercadoPagoController::class, 'pending'])->name('store.mercadopago.pending');

    // Checkout routes
    Route::get('/order-confirmation/{orderNumber?}', [ThemeController::class, 'orderConfirmation'])->name('store.order-confirmation');

    // Skrill
    Route::get('/skrill/success/{orderNumber}', [\App\Http\Controllers\Store\SkrillController::class, 'success'])->name('store.skrill.success');
    Route::post('/skrill/callback', [\App\Http\Controllers\Store\SkrillController::class, 'callback'])->middleware('webhook.signature:skrill')->name('store.skrill.callback');

    // CoinGate
    Route::get('/coingate/success/{orderNumber}', [\App\Http\Controllers\Store\CoinGateController::class, 'success'])->name('store.coingate.success');
    Route::post('/coingate/callback', [\App\Http\Controllers\Store\CoinGateController::class, 'callback'])->middleware('webhook.signature:coingate')->name('store.coingate.callback');

    // Midtrans
    Route::get('/midtrans/success/{orderNumber}', [\App\Http\Controllers\Store\MidtransController::class, 'success'])->name('store.midtrans.success');
    Route::post('/midtrans/callback', [\App\Http\Controllers\Store\MidtransController::class, 'callback'])->middleware('webhook.signature:midtrans')->name('store.midtrans.callback');

    // Mollie
    Route::get('/mollie/success/{orderNumber}', [\App\Http\Controllers\Store\MollieController::class, 'success'])->name('store.mollie.success');
    Route::post('/mollie/callback', [\App\Http\Controllers\Store\MollieController::class, 'callback'])->middleware('webhook.signature:mollie')->name('store.mollie.callback');

    // Benefit
    Route::get('/benefit/success/{orderNumber}', [\App\Http\Controllers\Store\BenefitController::class, 'success'])->name('store.benefit.success');
    Route::post('/benefit/callback', [\App\Http\Controllers\Store\BenefitController::class, 'callback'])->middleware('webhook.signature:benefit')->name('store.benefit.callback');

    // YooKassa
    Route::get('/yookassa/success/{orderNumber}', [\App\Http\Controllers\Store\YooKassaController::class, 'success'])->name('store.yookassa.success');
    Route::post('/yookassa/callback', [\App\Http\Controllers\Store\YooKassaController::class, 'callback'])->middleware('webhook.signature:yookassa')->name('store.yookassa.callback');

    // ── Universal gateway adapters (success returns + server-side callbacks) ──
    Route::get('/tap/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'tapSuccess'])->name('store.tap.success');
    Route::post('/tap/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'tapCallback'])->name('store.tap.callback');
    Route::get('/payfast/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'payfastSuccess'])->name('store.payfast.success');
    Route::post('/payfast/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'payfastCallback'])->name('store.payfast.callback');
    Route::get('/paytr/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'paytrSuccess'])->name('store.paytr.success');
    Route::post('/paytr/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'paytrCallback'])->name('store.paytr.callback');
    Route::get('/iyzipay/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'iyzipaySuccess'])->name('store.iyzipay.success');
    Route::post('/iyzipay/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'iyzipayCallback'])->name('store.iyzipay.callback');
    Route::get('/khalti/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'khaltiSuccess'])->name('store.khalti.success');
    Route::post('/khalti/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'khaltiCallback'])->name('store.khalti.callback');
    Route::get('/easebuzz/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'easebuzzSuccess'])->name('store.easebuzz.success');
    Route::post('/easebuzz/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'easebuzzCallback'])->name('store.easebuzz.callback');
    Route::get('/ozow/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'ozowSuccess'])->name('store.ozow.success');
    Route::post('/ozow/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'ozowCallback'])->name('store.ozow.callback');
    Route::get('/authorizenet/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'authorizenetSuccess'])->name('store.authorizenet.success');
    Route::get('/fedapay/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'fedapaySuccess'])->name('store.fedapay.success');
    Route::post('/fedapay/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'fedapayCallback'])->name('store.fedapay.callback');
    Route::match(['GET', 'POST'], '/payhere/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'payhereSuccess'])->name('store.payhere.success');
    Route::post('/payhere/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'payhereCallback'])->name('store.payhere.callback');
    Route::get('/cinetpay/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'cinetpaySuccess'])->name('store.cinetpay.success');
    Route::post('/cinetpay/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'cinetpayCallback'])->name('store.cinetpay.callback');
    Route::get('/nepalste/success/{orderNumber}/{orderId}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'nepalsteSuccess'])->name('store.nepalste.success');
    Route::post('/nepalste/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'nepalsteCallback'])->name('store.nepalste.callback');
    Route::get('/paiement/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'paiementSuccess'])->name('store.paiement.success');
    Route::post('/paiement/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'paiementCallback'])->name('store.paiement.callback');
    Route::get('/aamarpay/success/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'aamarpaySuccess'])->name('store.aamarpay.success');
    Route::post('/aamarpay/callback/{orderNumber}', [\App\Http\Controllers\Store\GatewayReturnController::class, 'aamarpayCallback'])->name('store.aamarpay.callback');

    // On-demand product details (keeps heavy fields out of the storefront payload)
    Route::get('/product/{product}', [ThemeController::class, 'productDetail'])->name('store.product-detail');

    // Dedicated category listing page with server-side pagination
    Route::get('/category/{slug}', [ThemeController::class, 'category'])->name('store.category');

    // Custom store pages (Professional plan feature): /page/{slug}
    Route::get('/page/{slug}', [ThemeController::class, 'page'])->name('store.page');

    // Schema-driven theme engine: runtime `theme.config.json` for a niche theme
    Route::get('/theme-configs/{theme}.json', [ThemeController::class, 'themeConfig'])->name('store.theme-config');

    // Catch-all: any unmatched GET on a store subdomain renders the store homepage
    // (mirrors the previous "unknown route -> home" behaviour for custom domains).
    // IMPORTANT: api/* paths must NOT be swallowed here — the storefront calls
    // GET /api/cart, /api/wishlist, /api/orders, /api/shipping-methods, etc. as
    // well as the versioned /api/v1/* endpoints. Both are registered outside the
    // subdomain group, so they must never hit this fallback.
    Route::get('{any}', [ThemeController::class, 'home'])->where('any', '^(?!api(?:/|$|/v1/)).*');
});

// ---------------------------------------------------------------------------
// Public store webhooks — reachable without authentication so gateway servers
// can notify us even after the customer closes the browser tab post-payment.
// ---------------------------------------------------------------------------
Route::post('store/stripe/webhook', [\App\Http\Controllers\Store\GatewayWebhookController::class, 'stripe'])->name('store.stripe.webhook');
Route::post('store/paypal/webhook', [\App\Http\Controllers\Store\GatewayWebhookController::class, 'paypal'])->name('store.paypal.webhook');
Route::post('store/paystack/webhook', [StorePaystackController::class, 'webhook'])->middleware('webhook.signature:paystack')->name('store.paystack.webhook');
Route::post('store/mercadopago/webhook', [StoreMercadoPagoController::class, 'webhook'])->middleware('webhook.signature:mercadopago')->name('store.mercadopago.webhook');

// Legacy redirects: keep old /store/{slug} links working after the move to subdomains
Route::get('store/{storeSlug}', function ($storeSlug) {
    return redirect()->route('store.home', ['storeSlug' => $storeSlug]);
})->name('store.legacy.home');

Route::get('store/{storeSlug}/{any}', function ($storeSlug, $any) {
    $query = request()->getQueryString();
    return redirect(route('store.home', ['storeSlug' => $storeSlug]) . '/' . $any . ($query ? '?' . $query : ''));
})->where('any', '.*')->name('store.legacy.any');

// Main landing page
Route::get('/', [LandingPageController::class, 'show'])->name('home');

// Encrypt plan ID for secure registration links
Route::post('/api/plan/encrypt', [LandingPageController::class, 'encryptPlanId'])->name('api.plan.encrypt');

// Sitemap
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');

// Static pages
Route::get('/about', [LandingPageController::class, 'about'])->name('page.about');
Route::get('/features', [LandingPageController::class, 'features'])->name('page.features');
Route::get('/terms', [LandingPageController::class, 'terms'])->name('page.terms');
Route::get('/privacy', [LandingPageController::class, 'privacy'])->name('page.privacy');

// Cart API routes
Route::middleware('api.throttle')->group(function () {
    Route::get('api/cart', [\App\Http\Controllers\Api\CartController::class, 'index'])->name('api.cart.index');
    Route::post('api/cart/add', [\App\Http\Controllers\Api\CartController::class, 'add'])->name('api.cart.add');
    Route::put('api/cart/{id}', [\App\Http\Controllers\Api\CartController::class, 'update'])->name('api.cart.update');
    Route::delete('api/cart/{id}', [\App\Http\Controllers\Api\CartController::class, 'remove'])->name('api.cart.remove');
    Route::post('api/cart/sync', [\App\Http\Controllers\Api\CartController::class, 'sync'])->name('api.cart.sync');
    
    // Abandoned cart tracking API (storefront)
    Route::post('api/cart/track', [CartTrackingController::class, 'track'])->name('api.cart.track');
    
    // Store content/banners API (authenticated, store owner only)
    Route::middleware(['auth', 'store.owner'])->prefix('api/stores/{store}/content')->name('api.store-content.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\StoreContentController::class, 'show'])->name('show');
        Route::put('/', [\App\Http\Controllers\Api\StoreContentController::class, 'update'])->name('update');
    });

    // Store template state API (theme, design tokens, overrides, content, behavior)
    Route::middleware(['auth', 'store.owner'])->prefix('api/stores/{store}/template')->name('api.store-template.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\TemplateEditorController::class, 'show'])->name('show');
        Route::put('/', [\App\Http\Controllers\Api\TemplateEditorController::class, 'update'])->name('update');
    });

    // Visual designer API (drag & drop store builder)
    Route::middleware(['auth', 'store.owner'])->prefix('api/stores/{store}/designer')->name('api.store-designer.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\DesignerController::class, 'show'])->name('show');
        Route::put('/', [\App\Http\Controllers\Api\DesignerController::class, 'update'])->name('update');
    });

    // Features hub API (unified on/off toggles)
    Route::middleware(['auth', 'store.owner'])->prefix('api/stores/{store}/features')->name('api.store-features.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\FeatureController::class, 'show'])->name('show');
        Route::put('/', [\App\Http\Controllers\Api\FeatureController::class, 'update'])->name('update');
    });

    // ERP & inventory integration API
    Route::middleware(['auth', 'store.owner'])->prefix('api/stores/{store}/erp')->name('api.store-erp.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\StoreErpController::class, 'index'])->name('index');
        Route::get('logs', [\App\Http\Controllers\Api\StoreErpController::class, 'logs'])->name('logs');
        Route::post('/', [\App\Http\Controllers\Api\StoreErpController::class, 'store'])->name('store');
        Route::put('{config}', [\App\Http\Controllers\Api\StoreErpController::class, 'update'])->name('update');
        Route::delete('{config}', [\App\Http\Controllers\Api\StoreErpController::class, 'destroy'])->name('destroy');
        Route::post('{config}/test', [\App\Http\Controllers\Api\StoreErpController::class, 'test'])->name('test');
        Route::post('{config}/sync', [\App\Http\Controllers\Api\StoreErpController::class, 'sync'])->name('sync');
    });

    // Store payments API (enable toggle + credentials, one place)
    Route::middleware(['auth', 'store.owner'])->prefix('api/stores/{store}/payments')->name('api.store-payments.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\StorePaymentController::class, 'index'])->name('index');
        Route::put('/', [\App\Http\Controllers\Api\StorePaymentController::class, 'update'])->name('update');
    });

    // Store offers API
    Route::middleware(['auth', 'store.owner'])->prefix('api/stores/{store}/offers')->name('api.store-offers.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\StoreOfferController::class, 'index'])->name('index');
        Route::post('/', [\App\Http\Controllers\Api\StoreOfferController::class, 'store'])->name('store');
        Route::post('reorder', [\App\Http\Controllers\Api\StoreOfferController::class, 'reorder'])->name('reorder');
        Route::put('{offer}', [\App\Http\Controllers\Api\StoreOfferController::class, 'update'])->name('update');
        Route::delete('{offer}', [\App\Http\Controllers\Api\StoreOfferController::class, 'destroy'])->name('destroy');
    });

    // Store pages API
    Route::middleware(['auth', 'store.owner'])->prefix('api/stores/{store}/pages')->name('api.store-pages.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\StorePageController::class, 'index'])->name('index');
        Route::post('/', [\App\Http\Controllers\Api\StorePageController::class, 'store'])->name('store');
        Route::post('reorder', [\App\Http\Controllers\Api\StorePageController::class, 'reorder'])->name('reorder');
        Route::put('{page}', [\App\Http\Controllers\Api\StorePageController::class, 'update'])->name('update');
        Route::delete('{page}', [\App\Http\Controllers\Api\StorePageController::class, 'destroy'])->name('destroy');
    });
    
    // Product reviews API (storefront)
    Route::prefix('api/reviews')->name('api.reviews.')->group(function () {
        Route::get('product/{productId}', [ProductReviewController::class, 'productReviews'])->name('product');
        Route::post('/', [ProductReviewController::class, 'store'])->name('store');
    });
    
    // Loyalty points API (storefront)
    Route::prefix('api/loyalty')->name('api.loyalty.')->group(function () {
        Route::get('balance', [LoyaltyController::class, 'getBalance'])->name('balance');
        Route::get('history', [LoyaltyController::class, 'history'])->name('history');
    });
    
    // Digital downloads API (storefront)
    Route::prefix('api/digital-downloads')->name('api.digital-downloads.')->group(function () {
        Route::get('/', [DigitalDownloadController::class, 'customerDownloads'])->name('index');
        Route::get('order/{orderNumber}', [DigitalDownloadController::class, 'orderDownloads'])->name('order');
        Route::get('download/{token}', [DigitalDownloadController::class, 'download'])->name('download');
    });
    
    // Customer notifications API (storefront)
    Route::prefix('api/notifications')->name('api.notifications.')->group(function () {
        Route::get('/', [NotificationController::class, 'indexApi'])->name('index');
        Route::get('unread-count', [NotificationController::class, 'unreadCount'])->name('unread-count');
        Route::post('{id}/read', [NotificationController::class, 'markRead'])->name('mark-read');
        Route::post('read-all', [NotificationController::class, 'markAllRead'])->name('mark-all-read');
        Route::post('{id}/click', [NotificationController::class, 'markClicked'])->name('mark-clicked');
        Route::delete('{id}', [NotificationController::class, 'destroyApi'])->name('destroy');
        Route::get('preferences', [NotificationController::class, 'getPreferences'])->name('preferences');
        Route::put('preferences', [NotificationController::class, 'updatePreferences'])->name('preferences.update');
        Route::post('unsubscribe-all', [NotificationController::class, 'unsubscribeAll'])->name('unsubscribe-all');
    });
    
    // Web Push subscription API (storefront)
    Route::prefix('api/push-subscriptions')->name('api.push-subscriptions.')->group(function () {
        Route::post('subscribe', [PushSubscriptionController::class, 'subscribe'])->name('subscribe');
        Route::post('unsubscribe', [PushSubscriptionController::class, 'unsubscribe'])->name('unsubscribe');
Route::get('status', [PushSubscriptionController::class, 'status'])->name('status');
        Route::get('vapid-public-key', [PushSubscriptionController::class, 'vapidPublicKey'])->name('vapid-public-key');
    });
});

 
// Merchant notifications API (admin panel)
Route::middleware('auth')->prefix('api/merchant-notifications')->name('api.merchant-notifications.')->group(function () {
    Route::get('/', [MerchantNotificationController::class, 'apiIndex'])->name('index');
    Route::get('unread-count', [MerchantNotificationController::class, 'unreadCount'])->name('unread-count');
    Route::post('{id}/read', [MerchantNotificationController::class, 'markRead'])->name('mark-read');
    Route::post('read-all', [MerchantNotificationController::class, 'markAllRead'])->name('mark-all-read');
});

// Coupon API routes
Route::prefix('api/coupon')->name('api.coupon.')->group(function () {
    Route::post('/validate', [\App\Http\Controllers\Api\CouponController::class, 'validate'])->name('validate');
});

// Advanced Coupon validation API (storefront checkout)
Route::post('api/advanced-coupon/validate', [\App\Http\Controllers\AdvancedCouponController::class, 'validateCoupon'])->name('api.advanced-coupon.validate');

// Shipping API routes
Route::get('api/shipping-methods', [\App\Http\Controllers\Api\ShippingController::class, 'getMethods'])->name('api.shipping.methods');

// Payment API routes
Route::get('api/payment-methods', [\App\Http\Controllers\Api\PaymentController::class, 'getMethods'])->name('api.payment.methods');

// Orders API routes
Route::prefix('api/orders')->name('api.orders.')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\OrderController::class, 'index'])->name('index');
    Route::get('/{orderNumber}', [\App\Http\Controllers\Api\OrderController::class, 'show'])->name('show');
});

// Wishlist API routes
Route::prefix('api/wishlist')->name('api.wishlist.')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\WishlistController::class, 'index'])->name('index');
    Route::post('/add', [\App\Http\Controllers\Api\WishlistController::class, 'add'])->name('add');
    Route::delete('/{id}', [\App\Http\Controllers\Api\WishlistController::class, 'remove'])->name('remove');
    Route::post('/toggle', [\App\Http\Controllers\Api\WishlistController::class, 'toggle'])->name('toggle');
});


Route::prefix('api/locations')->group(function () {
    Route::get('countries', [\App\Http\Controllers\Api\LocationController::class, 'getCountries'])->name('api.locations.countries');
    Route::get('states/{countryId}', [\App\Http\Controllers\Api\LocationController::class, 'getStatesByCountry'])->name('api.locations.states');
    Route::get('cities/{stateId}', [\App\Http\Controllers\Api\LocationController::class, 'getCitiesByState'])->name('api.locations.cities');
});

// Store frontend routes now live in the subdomain group at the top of this file.
// Legacy /store/{storeSlug} redirects are also defined there.


// Order invoice demo route
Route::get('/demo-order/{orderNumber}', function($orderNumber) {
    return Inertia::render('store/order-invoice', [
        'orderNumber' => $orderNumber,
        'order' => [
            'id' => $orderNumber,
            'date' => now()->toISOString(),
            'status' => 'confirmed',
            'total' => 299.99,
            'subtotal' => 249.99,
            'tax' => 25.00,
            'shipping' => 25.00,
            'discount' => 25.00,
            'coupon' => 'SAVE10',
            'payment_method' => 'Credit Card',
            'currency' => '$',
            'shipping_address' => [
                'name' => 'John Doe',
                'address' => '123 Main Street',
                'city' => 'New York',
                'state' => 'NY',
                'postal_code' => '10001',
                'country' => 'United States'
            ],
            'customer' => [
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'phone' => '+1234567890'
            ],
            'items' => [
                [
                    'name' => 'iPhone 15 Pro Max 256GB',
                    'quantity' => 1,
                    'price' => 249.99,
                    'image' => 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=100&h=100&fit=crop'
                ],
                [
                    'name' => 'Samsung Pro Max',
                    'quantity' => 1,
                    'price' => 99.99,
                    'image' => 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop'
                ]
            ]
        ]
    ]);
})->name('order.invoice');



// Public form submission routes


// Cashfree webhook (public route)
Route::post('cashfree/webhook', [CashfreeController::class, 'webhook'])->middleware('webhook.signature:cashfree')->name('cashfree.webhook');

// Accounting integration webhook (public route - secured via API key in request)
Route::post('webhook/accounting/{store}', [\App\Http\Controllers\AccountingWebhookController::class, 'handle'])->name('accounting.webhook');

// Benefit webhook (public route)
Route::post('benefit/webhook', [BenefitPaymentController::class, 'webhook'])->middleware('webhook.signature:benefit')->name('benefit.webhook');
Route::get('payments/benefit/success', [BenefitPaymentController::class, 'success'])->name('benefit.success');
Route::post('payments/benefit/callback', [BenefitPaymentController::class, 'callback'])->middleware('webhook.signature:benefit')->name('benefit.callback');

// FedaPay callback (public route)
Route::match(['GET', 'POST'], 'payments/fedapay/callback', [FedaPayPaymentController::class, 'callback'])->middleware('webhook.signature:fedapay')->name('fedapay.callback');

// YooKassa success/callback (public routes)
Route::get('payments/yookassa/success', [YooKassaPaymentController::class, 'success'])->name('yookassa.success');
Route::post('payments/yookassa/callback', [YooKassaPaymentController::class, 'callback'])->middleware('webhook.signature:yookassa')->name('yookassa.callback');

// Nepalste success/callback (public routes)
Route::get('payments/nepalste/success', [NepalstePaymentController::class, 'success'])->name('nepalste.success');
Route::post('payments/nepalste/callback', [NepalstePaymentController::class, 'callback'])->middleware('webhook.signature:nepalste')->name('nepalste.callback');



// PayTR callback (public route)
Route::post('payments/paytr/callback', [PayTRPaymentController::class, 'callback'])->middleware('webhook.signature:paytr')->name('paytr.callback');

// PayTabs callback (public route)
Route::match(['GET', 'POST'], 'payments/paytabs/callback', [PayTabsPaymentController::class, 'callback'])->middleware('webhook.signature:paytabs')->name('paytabs.callback');
Route::get('payments/paytabs/success', [PayTabsPaymentController::class, 'success'])->name('paytabs.success');

// Tap payment routes (public routes)
Route::get('payments/tap/success', [TapPaymentController::class, 'success'])->name('tap.success');
Route::post('payments/tap/callback', [TapPaymentController::class, 'callback'])->middleware('webhook.signature:tap')->name('tap.callback');

// Aamarpay payment routes (public routes)
Route::match(['GET', 'POST'], 'payments/aamarpay/success', [AamarpayPaymentController::class, 'success'])->name('aamarpay.success');
Route::post('payments/aamarpay/callback', [AamarpayPaymentController::class, 'callback'])->middleware('webhook.signature:aamarpay')->name('aamarpay.callback');


// PayFast payment routes (public routes)
Route::get('payments/payfast/success', [PayfastPaymentController::class, 'success'])->name('payfast.success');
Route::post('payments/payfast/callback', [PayfastPaymentController::class, 'callback'])->middleware('webhook.signature:payfast')->name('payfast.callback');

// CoinGate callback (public route)
Route::match(['GET', 'POST'], 'payments/coingate/callback', [CoinGatePaymentController::class, 'callback'])->middleware('webhook.signature:coingate')->name('coingate.callback');

// MercadoPago webhook (public route - called by MercadoPago servers)
Route::post('mercadopago/webhook', [MercadoPagoController::class, 'webhook'])->middleware('webhook.signature:mercadopago')->name('mercadopago.webhook');

// Xendit payment routes (public routes)
Route::get('payments/xendit/success', [XenditPaymentController::class, 'success'])->name('xendit.success');
Route::post('payments/xendit/callback', [XenditPaymentController::class, 'callback'])->middleware('webhook.signature:xendit')->name('xendit.callback');





Route::get('/landing-page', [LandingPageController::class, 'settings'])->middleware(['auth', 'App\Http\Middleware\SuperAdminMiddleware'])->name('landing-page');

Route::post('/landing-page/subscribe', [LandingPageController::class, 'subscribe'])->middleware('throttle:5,10')->name('landing-page.subscribe');
Route::post('/landing-page/contact', [LandingPageController::class, 'submitContact'])->middleware('throttle:5,10')->name('landing-page.contact');
Route::get('/page/{slug}', [CustomPageController::class, 'show'])->name('custom-page.show');

// Cookie consent routes
Route::post('/cookie-consent/store', [\App\Http\Controllers\CookieConsentController::class, 'store'])->name('cookie.consent.store');
Route::get('/cookie-consent/download', [\App\Http\Controllers\CookieConsentController::class, 'download'])->name('cookie.consent.download');

Route::get('/translations/{locale}', [TranslationController::class, 'getTranslations'])->where('locale', '[A-Za-z0-9_-]+')->name('translations');



    // Email Templates routes - moved inside authenticated middleware
    Route::middleware(['auth'])->group(function () {
        Route::get('email-templates', [\App\Http\Controllers\EmailTemplateController::class, 'index'])->name('email-templates.index');
        Route::get('email-templates/{emailTemplate}', [\App\Http\Controllers\EmailTemplateController::class, 'show'])->name('email-templates.show');
        Route::put('email-templates/{emailTemplate}/settings', [\App\Http\Controllers\EmailTemplateController::class, 'updateSettings'])->name('email-templates.update-settings');
        Route::put('email-templates/{emailTemplate}/content', [\App\Http\Controllers\EmailTemplateController::class, 'updateContent'])->name('email-templates.update-content');
        Route::get('email-templates/{emailTemplate}/preview', [\App\Http\Controllers\EmailTemplateController::class, 'preview'])->name('email-templates.preview');
        Route::get('email-templates/{emailTemplate}/variables', [\App\Http\Controllers\EmailTemplateController::class, 'getVariables'])->name('email-templates.variables');
    });

// Notification Templates routes
Route::middleware(['auth'])->group(function () {
    Route::get('notification-templates', [\App\Http\Controllers\NotificationTemplateController::class, 'index'])->name('notification-templates.index');
    Route::get('notification-templates/{id}', [\App\Http\Controllers\NotificationTemplateController::class, 'show'])->name('notification-templates.show');
    Route::put('notification-templates/{id}', [\App\Http\Controllers\NotificationTemplateController::class, 'update'])->name('notification-templates.update');
});

// Trial route with only auth middleware
Route::middleware(['auth'])->group(function () {
    Route::post('plans/trial', [PlanController::class, 'startTrial'])->name('plans.trial');
});

// Onboarding wizard - new company users must complete it before using the app
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('onboarding', [OnboardingController::class, 'index'])->name('onboarding');
    Route::post('onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
    Route::post('onboarding/progress', [OnboardingController::class, 'progress'])->name('onboarding.progress');
    Route::get('onboarding/check-subdomain', [OnboardingController::class, 'checkSubdomain'])->name('onboarding.check-subdomain');
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Plans routes - accessible without plan check
    Route::get('plans', [PlanController::class, 'index'])->middleware('permission:manage-plans')->name('plans.index');
    Route::post('plans/request', [PlanController::class, 'requestPlan'])->middleware('permission:request-plans')->name('plans.request');
    Route::post('plans/subscribe', [PlanController::class, 'subscribe'])->middleware('permission:subscribe-plans')->name('plans.subscribe');
    Route::post('plans/coupons/validate', [CouponController::class, 'validate'])->name('coupons.validate');
    
    // Payment routes - accessible without plan check
    Route::post('payments/stripe', [StripePaymentController::class, 'processPayment'])->name('stripe.payment');
    Route::match(['GET', 'POST'], 'payments/stripe/return', [StripePaymentController::class, 'paymentReturn'])->name('stripe.return');
    Route::post('payments/paypal', [PayPalPaymentController::class, 'processPayment'])->name('paypal.payment');
    Route::post('payments/bank', [BankPaymentController::class, 'processPayment'])->name('bank.payment');
    Route::post('payments/paystack', [PaystackPaymentController::class, 'processPayment'])->name('paystack.payment');
    
    Route::post('payments/flutterwave', [FlutterwavePaymentController::class, 'processPayment'])->name('flutterwave.payment');
    Route::post('payments/paytabs', [PayTabsPaymentController::class, 'processPayment'])->name('paytabs.payment');
    Route::post('payments/skrill', [SkrillPaymentController::class, 'processPayment'])->name('skrill.payment');
    Route::post('payments/coingate', [CoinGatePaymentController::class, 'processPayment'])->name('coingate.payment');
    Route::post('payments/payfast', [PayfastPaymentController::class, 'processPayment'])->name('payfast.payment');
    Route::post('payments/mollie', [MolliePaymentController::class, 'processPayment'])->name('mollie.payment');
    Route::post('payments/toyyibpay', [ToyyibPayPaymentController::class, 'processPayment'])->name('toyyibpay.payment');
    Route::post('payments/iyzipay', [IyzipayPaymentController::class, 'processPayment'])->name('iyzipay.payment');
    Route::post('payments/benefit', [BenefitPaymentController::class, 'processPayment'])->name('benefit.payment');
    Route::post('payments/ozow', [OzowPaymentController::class, 'processPayment'])->name('ozow.payment');
    Route::post('payments/easebuzz', [EasebuzzPaymentController::class, 'processPayment'])->name('easebuzz.payment');
    Route::post('payments/khalti', [KhaltiPaymentController::class, 'processPayment'])->name('khalti.payment');
    Route::post('payments/authorizenet', [AuthorizeNetPaymentController::class, 'processPayment'])->name('authorizenet.payment');
    Route::post('payments/fedapay', [FedaPayPaymentController::class, 'processPayment'])->name('fedapay.payment');
    Route::post('payments/payhere', [PayHerePaymentController::class, 'processPayment'])->name('payhere.payment');
    Route::post('payments/cinetpay', [CinetPayPaymentController::class, 'processPayment'])->name('cinetpay.payment');
    Route::post('payments/paiement', [PaiementPaymentController::class, 'processPayment'])->name('paiement.payment');
    Route::post('payments/nepalste', [NepalstePaymentController::class, 'processPayment'])->name('nepalste.payment');
    Route::post('payments/yookassa', [YooKassaPaymentController::class, 'processPayment'])->name('yookassa.payment');
    Route::post('payments/aamarpay', [AamarpayPaymentController::class, 'processPayment'])->name('aamarpay.payment');
    Route::post('payments/midtrans', [MidtransPaymentController::class, 'processPayment'])->name('midtrans.payment');
    
    // Payment gateway specific routes
    Route::post('payments/razorpay/create-order', [RazorpayController::class, 'createOrder'])->name('razorpay.create-order');
    Route::post('payments/razorpay/verify-payment', [RazorpayController::class, 'verifyPayment'])->name('razorpay.verify-payment');
    Route::post('cashfree/create-session', [CashfreeController::class, 'createPaymentSession'])->name('cashfree.create-session');
    Route::post('cashfree/verify-payment', [CashfreeController::class, 'verifyPayment'])->name('cashfree.verify-payment');
    Route::post('mercadopago/create-preference', [MercadoPagoController::class, 'createPreference'])->name('mercadopago.create-preference');
    Route::post('mercadopago/process-payment', [MercadoPagoController::class, 'processPayment'])->name('mercadopago.process-payment');
    
    // Other payment creation routes
    Route::post('tap/create-payment', [TapPaymentController::class, 'createPayment'])->name('tap.create-payment');
    Route::post('xendit/create-payment', [XenditPaymentController::class, 'createPayment'])->name('xendit.create-payment');
    Route::post('payments/paytr/create-token', [PayTRPaymentController::class, 'createPaymentToken'])->name('paytr.create-token');
    Route::post('iyzipay/create-form', [IyzipayPaymentController::class, 'createPaymentForm'])->name('iyzipay.create-form');
    Route::post('benefit/create-session', [BenefitPaymentController::class, 'createPaymentSession'])->name('benefit.create-session');
    Route::post('ozow/create-payment', [OzowPaymentController::class, 'createPayment'])->name('ozow.create-payment');
    Route::post('easebuzz/create-payment', [EasebuzzPaymentController::class, 'createPayment'])->name('easebuzz.create-payment');
    Route::post('khalti/create-payment', [KhaltiPaymentController::class, 'createPayment'])->name('khalti.create-payment');
    Route::post('authorizenet/create-form', [AuthorizeNetPaymentController::class, 'createPaymentForm'])->name('authorizenet.create-form');
    Route::post('fedapay/create-payment', [FedaPayPaymentController::class, 'createPayment'])->name('fedapay.create-payment');
    Route::post('payhere/create-payment', [PayHerePaymentController::class, 'createPayment'])->name('payhere.create-payment');
    Route::post('cinetpay/create-payment', [CinetPayPaymentController::class, 'createPayment'])->name('cinetpay.create-payment');
    Route::post('paiement/create-payment', [PaiementPaymentController::class, 'createPayment'])->name('paiement.create-payment');
    Route::post('nepalste/create-payment', [NepalstePaymentController::class, 'createPayment'])->name('nepalste.create-payment');
    Route::post('yookassa/create-payment', [YooKassaPaymentController::class, 'createPayment'])->name('yookassa.create-payment');
    Route::post('aamarpay/create-payment', [AamarpayPaymentController::class, 'createPayment'])->name('aamarpay.create-payment');
    Route::post('midtrans/create-payment', [MidtransPaymentController::class, 'createPayment'])->name('midtrans.create-payment');
    
    // Payment success/callback routes
    Route::post('payments/skrill/callback', [SkrillPaymentController::class, 'callback'])->middleware('webhook.signature:skrill')->name('skrill.callback');
    Route::get('payments/paytr/success', [PayTRPaymentController::class, 'success'])->name('paytr.success');
    Route::get('payments/paytr/failure', [PayTRPaymentController::class, 'failure'])->name('paytr.failure');
    Route::get('payments/mollie/success', [MolliePaymentController::class, 'success'])->name('mollie.success');
    Route::post('payments/mollie/callback', [MolliePaymentController::class, 'callback'])->middleware('webhook.signature:mollie')->name('mollie.callback');
    Route::match(['GET', 'POST'], 'payments/toyyibpay/success', [ToyyibPayPaymentController::class, 'success'])->name('toyyibpay.success');
    Route::post('payments/toyyibpay/callback', [ToyyibPayPaymentController::class, 'callback'])->middleware('webhook.signature:toyyibpay')->name('toyyibpay.callback');
    Route::post('payments/iyzipay/callback', [IyzipayPaymentController::class, 'callback'])->middleware('webhook.signature:iyzipay')->name('iyzipay.callback');
    Route::get('payments/ozow/success', [OzowPaymentController::class, 'success'])->name('ozow.success');
    Route::post('payments/ozow/callback', [OzowPaymentController::class, 'callback'])->middleware('webhook.signature:ozow')->name('ozow.callback');
    Route::get('payments/payhere/success', [PayHerePaymentController::class, 'success'])->name('payhere.success');
    Route::post('payments/payhere/callback', [PayHerePaymentController::class, 'callback'])->middleware('webhook.signature:payhere')->name('payhere.callback');
    Route::get('payments/cinetpay/success', [CinetPayPaymentController::class, 'success'])->name('cinetpay.success');
    Route::post('payments/cinetpay/callback', [CinetPayPaymentController::class, 'callback'])->middleware('webhook.signature:cinetpay')->name('cinetpay.callback');
    Route::get('payments/paiement/success', [PaiementPaymentController::class, 'success'])->name('paiement.success');
    Route::post('payments/paiement/callback', [PaiementPaymentController::class, 'callback'])->middleware('webhook.signature:paiement')->name('paiement.callback');
    Route::post('payments/midtrans/callback', [MidtransPaymentController::class, 'callback'])->middleware('webhook.signature:midtrans')->name('midtrans.callback');
    Route::get('mercadopago/success', [MercadoPagoController::class, 'success'])->name('mercadopago.success');
    Route::get('mercadopago/failure', [MercadoPagoController::class, 'failure'])->name('mercadopago.failure');
    Route::get('mercadopago/pending', [MercadoPagoController::class, 'pending'])->name('mercadopago.pending');
    
    Route::post('authorizenet/test-connection', [AuthorizeNetPaymentController::class, 'testConnection'])->name('authorizenet.test-connection');

    
    // Plan Requests and Orders - accessible to company users
    Route::get('plan-requests', [PlanRequestController::class, 'index'])->name('plan-requests.index');
    Route::get('plan-orders', [PlanOrderController::class, 'index'])->name('plan-orders.index');
    
    // All other routes require plan access check (and completed onboarding)
    Route::middleware(['plan.access', 'onboarded'])->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('search', [\App\Http\Controllers\SearchController::class, 'search'])->name('search');
        Route::get('dashboard/redirect', [DashboardController::class, 'redirectToFirstAvailablePage'])->name('dashboard.redirect');
        Route::get('dashboard/export', [DashboardController::class, 'export'])->name('dashboard.export');

        // Merchant notifications page (admin panel)
        Route::get('merchant-notifications', [MerchantNotificationController::class, 'index'])->name('merchant-notifications.index');
        
        // Store Management routes with permissions
        Route::get('stores', [\App\Http\Controllers\StoreController::class, 'index'])->middleware('permission:manage-stores')->name('stores.index');
        Route::get('stores/export', [\App\Http\Controllers\StoreController::class, 'export'])->middleware('permission:export-stores')->name('stores.export');
        Route::get('stores/create', [\App\Http\Controllers\StoreController::class, 'create'])->middleware('permission:create-stores')->name('stores.create');
        Route::post('stores', [\App\Http\Controllers\StoreController::class, 'store'])->middleware('permission:create-stores')->name('stores.store');
        Route::get('stores/{id}/edit', [\App\Http\Controllers\StoreController::class, 'edit'])->middleware('permission:edit-stores')->name('stores.edit');
        Route::put('stores/{id}', [\App\Http\Controllers\StoreController::class, 'update'])->middleware('permission:edit-stores')->name('stores.update');
        Route::delete('stores/{id}', [\App\Http\Controllers\StoreController::class, 'destroy'])->middleware('permission:delete-stores')->name('stores.destroy');
        Route::get('stores/{id}', [\App\Http\Controllers\StoreController::class, 'show'])->middleware('permission:view-stores')->name('stores.show');
        Route::post('stores/{id}/toggle-status', [\App\Http\Controllers\StoreController::class, 'toggleStatus'])->middleware('permission:edit-stores')->name('stores.toggle-status');
        Route::get('stores/{id}/settings', [\App\Http\Controllers\StoreSettingsController::class, 'show'])->middleware('permission:settings-stores')->name('stores.settings');
        Route::get('stores/{id}/designer', [\App\Http\Controllers\StoreDesignerController::class, 'show'])->middleware('permission:settings-stores')->name('stores.designer');
        Route::get('stores/{id}/templates', [\App\Http\Controllers\StoreDesignerController::class, 'templates'])->middleware('permission:settings-stores')->name('stores.templates');
        Route::get('stores/{id}/templates/{slug}/preview', [\App\Http\Controllers\StoreDesignerController::class, 'previewTemplate'])->middleware('permission:settings-stores')->name('stores.templates.preview');
        Route::get('stores/{id}/themes', fn ($id) => redirect()->route('stores.templates', ['id' => $id]))->middleware('permission:settings-stores')->name('stores.themes');
        Route::get('stores/{id}/features', [\App\Http\Controllers\StoreFeaturesController::class, 'show'])->middleware('permission:settings-stores')->name('stores.features');
        Route::get('stores/{id}/integrations/erp', [\App\Http\Controllers\StoreErpPageController::class, 'show'])->middleware('permission:settings-stores')->name('stores.erp');
        Route::get('stores/{id}/payments', [\App\Http\Controllers\StorePaymentsController::class, 'show'])->middleware('permission:settings-stores')->name('stores.payments');
        Route::put('stores/{id}/settings', [\App\Http\Controllers\StoreSettingsController::class, 'update'])->middleware('permission:settings-stores')->name('stores.settings.update');
        Route::put('stores/{id}/settings/autosave', [\App\Http\Controllers\StoreSettingsController::class, 'autosave'])->middleware('permission:settings-stores')->name('stores.settings.autosave');
        Route::post('stores/{id}/settings/reset-section', [\App\Http\Controllers\StoreSettingsController::class, 'resetSection'])->middleware('permission:settings-stores')->name('stores.settings.reset-section');
        Route::put('stores/{id}/settings/theme', [\App\Http\Controllers\StoreSettingsController::class, 'updateTheme'])->middleware('permission:settings-stores')->name('stores.settings.theme');
        
        // Store custom domains routes
        Route::get('stores/{id}/domains', [\App\Http\Controllers\StoreDomainController::class, 'index'])->middleware('permission:settings-stores')->name('stores.domains');
        Route::post('stores/{id}/domains', [\App\Http\Controllers\StoreDomainController::class, 'store'])->middleware('permission:settings-stores')->name('stores.domains.store');
        Route::post('stores/{id}/domains/{domain}/verify', [\App\Http\Controllers\StoreDomainController::class, 'verify'])->middleware('permission:settings-stores')->name('stores.domains.verify');
        Route::post('stores/{id}/domains/{domain}/check-ssl', [\App\Http\Controllers\StoreDomainController::class, 'checkSsl'])->middleware('permission:settings-stores')->name('stores.domains.check-ssl');
        Route::post('stores/{id}/domains/{domain}/make-primary', [\App\Http\Controllers\StoreDomainController::class, 'makePrimary'])->middleware('permission:settings-stores')->name('stores.domains.primary');
        Route::delete('stores/{id}/domains/{domain}', [\App\Http\Controllers\StoreDomainController::class, 'destroy'])->middleware('permission:settings-stores')->name('stores.domains.destroy');
        
        // Product Management routes with permissions
        Route::get('products', [\App\Http\Controllers\ProductController::class, 'index'])->middleware('permission:manage-products')->name('products.index');
        Route::get('products/export', [\App\Http\Controllers\ProductController::class, 'export'])->middleware('permission:export-products')->name('products.export');
        Route::get('products/create', [\App\Http\Controllers\ProductController::class, 'create'])->middleware('permission:create-products')->name('products.create');
        Route::post('products', [\App\Http\Controllers\ProductController::class, 'store'])->middleware('permission:create-products')->name('products.store');
        Route::get('products/{id}/edit', [\App\Http\Controllers\ProductController::class, 'edit'])->middleware('permission:edit-products')->name('products.edit');
        Route::put('products/{id}', [\App\Http\Controllers\ProductController::class, 'update'])->middleware('permission:edit-products')->name('products.update');
         Route::delete('products/{id}', [\App\Http\Controllers\ProductController::class, 'destroy'])->middleware('permission:delete-products')->name('products.destroy');
         Route::delete('products', [\App\Http\Controllers\ProductController::class, 'destroyBulk'])->middleware('permission:delete-products')->name('products.bulk-destroy');
         Route::post('products/bulk-status', [\App\Http\Controllers\ProductController::class, 'bulkStatus'])->middleware('permission:edit-products')->name('products.bulk-status');
         Route::get('products/{id}', [\App\Http\Controllers\ProductController::class, 'show'])->middleware('permission:view-products')->name('products.show');
        
        // Categories Management routes with permissions
        Route::get('categories', [\App\Http\Controllers\CategoryController::class, 'index'])->middleware('permission:manage-categories')->name('categories.index');
        Route::get('categories/export', [\App\Http\Controllers\CategoryController::class, 'export'])->middleware('permission:export-categories')->name('categories.export');
        Route::get('categories/create', [\App\Http\Controllers\CategoryController::class, 'create'])->middleware('permission:create-categories')->name('categories.create');
        Route::post('categories', [\App\Http\Controllers\CategoryController::class, 'store'])->middleware('permission:create-categories')->name('categories.store');
    Route::post('categories/inline', [\App\Http\Controllers\CategoryController::class, 'inlineStore'])->middleware('permission:create-categories')->name('categories.inline');
        Route::get('categories/{id}/edit', [\App\Http\Controllers\CategoryController::class, 'edit'])->middleware('permission:edit-categories')->name('categories.edit');
        Route::put('categories/{id}', [\App\Http\Controllers\CategoryController::class, 'update'])->middleware('permission:edit-categories')->name('categories.update');
        Route::delete('categories/{id}', [\App\Http\Controllers\CategoryController::class, 'destroy'])->middleware('permission:delete-categories')->name('categories.destroy');
        Route::get('categories/{id}', [\App\Http\Controllers\CategoryController::class, 'show'])->middleware('permission:view-categories')->name('categories.show');
        
        // Tax Management routes with permissions
        Route::get('tax', [\App\Http\Controllers\TaxController::class, 'index'])->middleware('permission:manage-tax')->name('tax.index');
        Route::post('tax/toggle-tax-included', [\App\Http\Controllers\TaxController::class, 'toggleTaxIncluded'])->middleware('permission:manage-tax')->name('tax.toggle-tax-included');
        Route::get('tax/export', [\App\Http\Controllers\TaxController::class, 'export'])->middleware('permission:export-tax')->name('tax.export');
        Route::get('tax/create', [\App\Http\Controllers\TaxController::class, 'create'])->middleware('permission:create-tax')->name('tax.create');
        Route::post('tax', [\App\Http\Controllers\TaxController::class, 'store'])->middleware('permission:create-tax')->name('tax.store');
        Route::get('tax/{id}/edit', [\App\Http\Controllers\TaxController::class, 'edit'])->middleware('permission:edit-tax')->name('tax.edit');
        Route::put('tax/{id}', [\App\Http\Controllers\TaxController::class, 'update'])->middleware('permission:edit-tax')->name('tax.update');
        Route::delete('tax/{id}', [\App\Http\Controllers\TaxController::class, 'destroy'])->middleware('permission:delete-tax')->name('tax.destroy');
        Route::get('tax/{id}', [\App\Http\Controllers\TaxController::class, 'show'])->middleware('permission:view-tax')->name('tax.show');
        
        // Coupon System routes with permissions
            Route::get('coupon-system', [\App\Http\Controllers\StoreCouponController::class, 'index'])->middleware('permission:manage-coupon-system')->name('coupon-system.index');
            Route::get('coupon-system/export', [\App\Http\Controllers\StoreCouponController::class, 'export'])->middleware('permission:export-coupon-system')->name('coupon-system.export');
            Route::get('coupon-system/create', [\App\Http\Controllers\StoreCouponController::class, 'create'])->middleware('permission:create-coupon-system')->name('coupon-system.create');
            Route::get('coupon-system/{id}/edit', [\App\Http\Controllers\StoreCouponController::class, 'edit'])->middleware('permission:edit-coupon-system')->name('coupon-system.edit');
            // Route::get('coupon-system/{id}', function ($id) {
            //     $user = Auth::user();
            //     $currentStoreId = $user->current_store;
            //     $coupon = \App\Models\StoreCoupon::where('store_id', $currentStoreId)->findOrFail($id);
            //     return Inertia::render('coupon-system/show', [
            //         'coupon' => $coupon
            //     ]);
            // })->middleware('permission:view-coupon-system')->name('coupon-system.show');
            Route::post('coupon-system', [\App\Http\Controllers\StoreCouponController::class, 'store'])->middleware('permission:create-coupon-system')->name('coupon-system.store');
            Route::get('coupon-system/{storeCoupon}', [\App\Http\Controllers\StoreCouponController::class, 'show'])->middleware('permission:view-coupon-system')->name('coupon-system.show');
            Route::put('coupon-system/{storeCoupon}', [\App\Http\Controllers\StoreCouponController::class, 'update'])->middleware('permission:edit-coupon-system')->name('coupon-system.update');
            Route::delete('store-coupons/{storeCoupon}', [\App\Http\Controllers\StoreCouponController::class, 'destroy'])->middleware('permission:delete-coupon-system')->name('store-coupons.destroy');
            Route::post('store-coupons/{storeCoupon}/toggle-status', [\App\Http\Controllers\StoreCouponController::class, 'toggleStatus'])->middleware('permission:toggle-status-coupon-system')->name('store-coupons.toggle-status');
            Route::post('store-coupons/validate', [\App\Http\Controllers\StoreCouponController::class, 'validate'])->name('store-coupons.validate');
        
        // Shipping Management routes with permissions
            Route::get('shipping', [\App\Http\Controllers\ShippingController::class, 'index'])->middleware('permission:manage-shipping')->name('shipping.index');
            Route::get('shipping/export', [\App\Http\Controllers\ShippingController::class, 'export'])->middleware('permission:export-shipping')->name('shipping.export');
            Route::get('shipping/create', [\App\Http\Controllers\ShippingController::class, 'create'])->middleware('permission:create-shipping')->name('shipping.create');
            Route::post('shipping', [\App\Http\Controllers\ShippingController::class, 'store'])->middleware('permission:create-shipping')->name('shipping.store');
            Route::get('shipping/{id}/edit', [\App\Http\Controllers\ShippingController::class, 'edit'])->middleware('permission:edit-shipping')->name('shipping.edit');
            Route::put('shipping/{id}', [\App\Http\Controllers\ShippingController::class, 'update'])->middleware('permission:edit-shipping')->name('shipping.update');
            Route::delete('shipping/{id}', [\App\Http\Controllers\ShippingController::class, 'destroy'])->middleware('permission:delete-shipping')->name('shipping.destroy');
            Route::get('shipping/{id}', [\App\Http\Controllers\ShippingController::class, 'show'])->middleware('permission:view-shipping')->name('shipping.show');
        
        // Customer Management routes with permissions
            Route::get('customers', [\App\Http\Controllers\CustomerController::class, 'index'])->middleware('permission:manage-customers')->name('customers.index');
            Route::get('customers/export', [\App\Http\Controllers\CustomerController::class, 'export'])->middleware('permission:export-customers')->name('customers.export');
            Route::get('customers/create', [\App\Http\Controllers\CustomerController::class, 'create'])->middleware('permission:create-customers')->name('customers.create');
            Route::post('customers', [\App\Http\Controllers\CustomerController::class, 'store'])->middleware('permission:create-customers')->name('customers.store');
            Route::get('customers/{id}/edit', [\App\Http\Controllers\CustomerController::class, 'edit'])->middleware('permission:edit-customers')->name('customers.edit');
            Route::put('customers/{id}', [\App\Http\Controllers\CustomerController::class, 'update'])->middleware('permission:edit-customers')->name('customers.update');
            Route::delete('customers/{id}', [\App\Http\Controllers\CustomerController::class, 'destroy'])->middleware('permission:delete-customers')->name('customers.destroy');
            Route::get('customers/{id}', [\App\Http\Controllers\CustomerController::class, 'show'])->middleware('permission:view-customers')->name('customers.show');
        
        // Order Management routes with permissions
            Route::get('orders', [\App\Http\Controllers\OrderController::class, 'index'])->middleware('permission:manage-orders')->name('orders.index');
            Route::get('orders/export', [\App\Http\Controllers\OrderController::class, 'export'])->middleware('permission:export-orders')->name('orders.export');
            Route::get('orders/create', [\App\Http\Controllers\OrderController::class, 'create'])->middleware('permission:create-orders')->name('orders.create');
            Route::get('orders/{id}/edit', [\App\Http\Controllers\OrderController::class, 'edit'])->middleware('permission:edit-orders')->name('orders.edit');
            Route::put('orders/{id}', [\App\Http\Controllers\OrderController::class, 'update'])->middleware('permission:edit-orders')->name('orders.update');
            Route::delete('orders/{id}', [\App\Http\Controllers\OrderController::class, 'destroy'])->middleware('permission:delete-orders')->name('orders.destroy');
            Route::get('orders/{id}', [\App\Http\Controllers\OrderController::class, 'show'])->middleware('permission:view-orders')->name('orders.show');

        

        

        // Loyalty Points routes
        Route::middleware('permission:manage-loyalty')->group(function () {
            Route::get('loyalty/settings', [LoyaltyController::class, 'settings'])->middleware('permission:manage-loyalty-settings')->name('loyalty.settings');
            Route::post('loyalty/settings', [LoyaltyController::class, 'updateSettings'])->middleware('permission:manage-loyalty-settings')->name('loyalty.settings.update');
            Route::get('loyalty/transactions', [LoyaltyController::class, 'transactions'])->middleware('permission:view-loyalty-transactions')->name('loyalty.transactions');
        });

        // Product Reviews routes
        Route::middleware('permission:manage-product-reviews')->group(function () {
            Route::get('product-reviews', [ProductReviewController::class, 'index'])->name('product-reviews.index');
            Route::get('product-reviews/export', [ProductReviewController::class, 'export'])->middleware('permission:export-product-reviews')->name('product-reviews.export');
            Route::post('product-reviews/{review}/approve', [ProductReviewController::class, 'approve'])->middleware('permission:approve-product-reviews')->name('product-reviews.approve');
            Route::post('product-reviews/{review}/reject', [ProductReviewController::class, 'reject'])->middleware('permission:approve-product-reviews')->name('product-reviews.reject');
            Route::post('product-reviews/{review}/reply', [ProductReviewController::class, 'reply'])->middleware('permission:reply-product-reviews')->name('product-reviews.reply');
            Route::delete('product-reviews/{review}', [ProductReviewController::class, 'destroy'])->middleware('permission:delete-product-reviews')->name('product-reviews.destroy');
        });

        // Digital Downloads management (web page, authenticated)
        Route::middleware(['auth', 'permission:manage-digital-downloads'])->group(function () {
            Route::get('digital-downloads', [DigitalDownloadController::class, 'index'])->name('digital-downloads.index');
        });

        // Abandoned Cart Recovery routes
        Route::middleware('permission:manage-abandoned-carts')->group(function () {
            Route::get('abandoned-carts', [AbandonedCartController::class, 'index'])->name('abandoned-carts.index');
            Route::get('abandoned-carts/export', [AbandonedCartController::class, 'export'])->middleware('permission:export-abandoned-carts')->name('abandoned-carts.export');
            Route::post('abandoned-carts/{abandonedCart}/send-reminder', [AbandonedCartController::class, 'sendReminder'])->middleware('permission:send-abandoned-cart-reminders')->name('abandoned-carts.send-reminder');
            Route::post('abandoned-carts/{abandonedCart}/mark-recovered', [AbandonedCartController::class, 'markRecovered'])->name('abandoned-carts.mark-recovered');
            Route::delete('abandoned-carts/{abandonedCart}', [AbandonedCartController::class, 'destroy'])->middleware('permission:delete-abandoned-carts')->name('abandoned-carts.destroy');
        });

        // Advanced Coupons routes (dedicated advanced-coupon permissions)
        Route::middleware('permission:manage-advanced-coupons')->group(function () {
            Route::get('advanced-coupons', [\App\Http\Controllers\AdvancedCouponController::class, 'index'])->name('advanced-coupons.index');
            Route::get('advanced-coupons/export', [\App\Http\Controllers\AdvancedCouponController::class, 'export'])->middleware('permission:export-advanced-coupons')->name('advanced-coupons.export');
            Route::get('advanced-coupons/create', [\App\Http\Controllers\AdvancedCouponController::class, 'create'])->middleware('permission:create-advanced-coupons')->name('advanced-coupons.create');
            Route::post('advanced-coupons', [\App\Http\Controllers\AdvancedCouponController::class, 'store'])->middleware('permission:create-advanced-coupons')->name('advanced-coupons.store');
            Route::get('advanced-coupons/{advancedCoupon}/edit', [\App\Http\Controllers\AdvancedCouponController::class, 'edit'])->middleware('permission:edit-advanced-coupons')->name('advanced-coupons.edit');
            Route::put('advanced-coupons/{advancedCoupon}', [\App\Http\Controllers\AdvancedCouponController::class, 'update'])->middleware('permission:edit-advanced-coupons')->name('advanced-coupons.update');
            Route::post('advanced-coupons/{advancedCoupon}/toggle-status', [\App\Http\Controllers\AdvancedCouponController::class, 'toggleStatus'])->middleware('permission:toggle-status-advanced-coupons')->name('advanced-coupons.toggle-status');
            Route::delete('advanced-coupons/{advancedCoupon}', [\App\Http\Controllers\AdvancedCouponController::class, 'destroy'])->middleware('permission:delete-advanced-coupons')->name('advanced-coupons.destroy');
        });

        // Advanced COD Payment routes (cash on delivery tracking & collection)
        Route::middleware('permission:manage-cod-payments')->group(function () {
            Route::get('cod-payments', [CodPaymentController::class, 'index'])->name('cod-payments.index');
            Route::get('cod-payments/export', [CodPaymentController::class, 'export'])->middleware('permission:export-cod-payments')->name('cod-payments.export');
            Route::get('cod-payments/{codPayment}', [CodPaymentController::class, 'show'])->name('cod-payments.show');
            Route::post('cod-payments/{codPayment}/collect', [CodPaymentController::class, 'recordCollection'])->middleware('permission:collect-cod-payments')->name('cod-payments.collect');
            Route::post('cod-payments/{codPayment}/delivery-info', [CodPaymentController::class, 'updateDeliveryInfo'])->middleware('permission:manage-cod-payments')->name('cod-payments.delivery-info');
            Route::post('cod-payments/{codPayment}/status', [CodPaymentController::class, 'changeStatus'])->middleware('permission:manage-cod-payments')->name('cod-payments.status');
        });

        // Smart Notifications routes (admin panel)
        Route::middleware('permission:manage-notifications')->group(function () {
            Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
            Route::get('notifications/create', [NotificationController::class, 'create'])->middleware('permission:send-notifications')->name('notifications.create');
            Route::get('notifications/{notification}', [NotificationController::class, 'show'])->name('notifications.show');
            Route::post('notifications/send', [NotificationController::class, 'send'])->middleware('permission:send-notifications')->name('notifications.send');
            Route::delete('notifications/{notification}', [NotificationController::class, 'destroy'])->middleware('permission:delete-notifications')->name('notifications.destroy');
        });

        // Express Checkout routes with permissions
        Route::get('express-checkout', [\App\Http\Controllers\ExpressCheckoutController::class, 'index'])->middleware('permission:manage-express-checkout')->name('express-checkout.index');
        Route::get('express-checkout/create', [\App\Http\Controllers\ExpressCheckoutController::class, 'create'])->middleware('permission:create-express-checkout')->name('express-checkout.create');
        Route::post('express-checkout', [\App\Http\Controllers\ExpressCheckoutController::class, 'store'])->middleware('permission:create-express-checkout')->name('express-checkout.store');
        Route::get('express-checkout/{id}/edit', [\App\Http\Controllers\ExpressCheckoutController::class, 'edit'])->middleware('permission:edit-express-checkout')->name('express-checkout.edit');
        Route::put('express-checkout/{id}', [\App\Http\Controllers\ExpressCheckoutController::class, 'update'])->middleware('permission:edit-express-checkout')->name('express-checkout.update');
        Route::delete('express-checkout/{id}', [\App\Http\Controllers\ExpressCheckoutController::class, 'destroy'])->middleware('permission:delete-express-checkout')->name('express-checkout.destroy');
        Route::get('express-checkout/{id}', [\App\Http\Controllers\ExpressCheckoutController::class, 'show'])->middleware('permission:view-express-checkout')->name('express-checkout.show');
        
        // Analytics & Reporting routes
        Route::get('analytics', [\App\Http\Controllers\AnalyticsController::class, 'index'])->middleware('permission:manage-analytics')->name('analytics.index');
        Route::get('analytics/export', [\App\Http\Controllers\AnalyticsController::class, 'export'])->middleware('permission:export-analytics')->name('analytics.export');
        Route::get('analytics/export/pdf', [\App\Http\Controllers\AnalyticsController::class, 'exportPdf'])->middleware('permission:export-analytics')->name('analytics.export.pdf');
        
        // Payment Gateway routes
        Route::get('payment-gateways', [\App\Http\Controllers\PageController::class, 'paymentGateways'])->name('payment-gateways.index');

        // AI Templates routes
        Route::get('ai-templates', [\App\Http\Controllers\PageController::class, 'aiTemplates'])->name('ai-templates.index');

        // Webhook System routes
        Route::get('webhooks', [\App\Http\Controllers\PageController::class, 'webhooks'])->name('webhooks.index');

        Route::get('media-library', [\App\Http\Controllers\PageController::class, 'mediaLibrary'])->middleware('permission:manage-media')->name('media-library');

        Route::get('examples/chatgpt-demo', [\App\Http\Controllers\PageController::class, 'chatGptDemo'])->name('examples.chatgpt-demo');

    // Media Library API routes
    Route::get('api/media', [MediaController::class, 'index'])->middleware('permission:manage-media')->name('api.media.index');
    Route::post('api/media/batch', [MediaController::class, 'batchStore'])->middleware('permission:upload-media')->name('api.media.batch');
    Route::get('api/media/{id}/download', [MediaController::class, 'download'])->middleware('permission:download-media')->name('api.media.download');
    Route::delete('api/media/{id}', [MediaController::class, 'destroy'])->middleware('permission:delete-media')->name('api.media.destroy');

    // Permissions routes with granular permissions
    Route::middleware('permission:manage-permissions')->group(function () {
        Route::get('permissions', [PermissionController::class, 'index'])->middleware('permission:manage-permissions')->name('permissions.index');
        Route::get('permissions/create', [PermissionController::class, 'create'])->middleware('permission:create-permissions')->name('permissions.create');
        Route::post('permissions', [PermissionController::class, 'store'])->middleware('permission:create-permissions')->name('permissions.store');
        Route::get('permissions/{permission}', [PermissionController::class, 'show'])->middleware('permission:view-permissions')->name('permissions.show');
        Route::get('permissions/{permission}/edit', [PermissionController::class, 'edit'])->middleware('permission:edit-permissions')->name('permissions.edit');
        Route::put('permissions/{permission}', [PermissionController::class, 'update'])->middleware('permission:edit-permissions')->name('permissions.update');
        Route::patch('permissions/{permission}', [PermissionController::class, 'update'])->middleware('permission:edit-permissions');
        Route::delete('permissions/{permission}', [PermissionController::class, 'destroy'])->middleware('permission:delete-permissions')->name('permissions.destroy');
    });

    // Roles routes with granular permissions
    Route::middleware('permission:manage-roles')->group(function () {
        Route::get('roles', [RoleController::class, 'index'])->middleware('permission:manage-roles')->name('roles.index');
        Route::get('roles/create', [RoleController::class, 'create'])->middleware('permission:create-roles')->name('roles.create');
        Route::post('roles', [RoleController::class, 'store'])->middleware('permission:create-roles')->name('roles.store');
        Route::get('roles/{role}', [RoleController::class, 'show'])->middleware('permission:view-roles')->name('roles.show');
        Route::get('roles/{role}/edit', [RoleController::class, 'edit'])->middleware('permission:edit-roles')->name('roles.edit');
        Route::put('roles/{role}', [RoleController::class, 'update'])->middleware('permission:edit-roles')->name('roles.update');
        Route::patch('roles/{role}', [RoleController::class, 'update'])->middleware('permission:edit-roles');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:delete-roles')->name('roles.destroy');
    });

    // Users routes with granular permissions
    Route::middleware('permission:manage-users')->group(function () {
        Route::get('users', [UserController::class, 'index'])->middleware('permission:manage-users')->name('users.index');
        Route::post('users', [UserController::class, 'store'])->middleware('permission:create-users')->name('users.store');
        Route::put('users/{user}', [UserController::class, 'update'])->middleware('permission:edit-users')->name('users.update');
        Route::patch('users/{user}', [UserController::class, 'update'])->middleware('permission:edit-users');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('permission:delete-users')->name('users.destroy');

        // Additional user routes
        Route::put('users/{user}/reset-password', [UserController::class, 'resetPassword'])->middleware('permission:reset-password-users')->name('users.reset-password');
        Route::put('users/{user}/toggle-status', [UserController::class, 'toggleStatus'])->middleware('permission:toggle-status-users')->name('users.toggle-status');
    });

    // Plans management routes (admin only)
    Route::middleware('permission:manage-plans')->group(function () {
        Route::get('plans/create', [PlanController::class, 'create'])->middleware('permission:create-plans')->name('plans.create');
        Route::post('plans', [PlanController::class, 'store'])->middleware('permission:create-plans')->name('plans.store');
        Route::get('plans/{plan}/edit', [PlanController::class, 'edit'])->middleware('permission:edit-plans')->name('plans.edit');
        Route::put('plans/{plan}', [PlanController::class, 'update'])->middleware('permission:edit-plans')->name('plans.update');
        Route::delete('plans/{plan}', [PlanController::class, 'destroy'])->middleware('permission:delete-plans')->name('plans.destroy');
        Route::post('plans/{plan}/toggle-status', [PlanController::class, 'toggleStatus'])->name('plans.toggle-status');
    });

    // Plan Orders routes
    Route::get('plan-orders', [PlanOrderController::class, 'index'])->middleware('permission:manage-plan-orders')->name('plan-orders.index');
    Route::post('plan-orders/{planOrder}/approve', [PlanOrderController::class, 'approve'])->middleware('permission:approve-plan-orders')->name('plan-orders.approve');
    Route::post('plan-orders/{planOrder}/reject', [PlanOrderController::class, 'reject'])->middleware('permission:reject-plan-orders')->name('plan-orders.reject');



    // Companies routes
    Route::middleware('permission:manage-companies')->group(function () {
        Route::get('companies', [CompanyController::class, 'index'])->middleware('permission:manage-companies')->name('companies.index');
        Route::post('companies', [CompanyController::class, 'store'])->middleware('permission:create-companies')->name('companies.store');
        Route::put('companies/{company}', [CompanyController::class, 'update'])->middleware('permission:edit-companies')->name('companies.update');
        Route::delete('companies/{company}', [CompanyController::class, 'destroy'])->middleware('permission:delete-companies')->name('companies.destroy');
        Route::put('companies/{company}/reset-password', [CompanyController::class, 'resetPassword'])->middleware('permission:reset-password-companies')->name('companies.reset-password');
        Route::put('companies/{company}/toggle-status', [CompanyController::class, 'toggleStatus'])->middleware('permission:toggle-status-companies')->name('companies.toggle-status');
        Route::get('companies/{company}/plans', [CompanyController::class, 'getPlans'])->middleware('permission:manage-plans-companies')->name('companies.plans');
        Route::put('companies/{company}/upgrade-plan', [CompanyController::class, 'upgradePlan'])->middleware('permission:upgrade-plan-companies')->name('companies.upgrade-plan');
    });







    // Coupons routes
    Route::middleware('permission:manage-coupons')->group(function () {
        Route::get('coupons', [CouponController::class, 'index'])->middleware('permission:manage-coupons')->name('coupons.index');
        Route::post('coupons', [CouponController::class, 'store'])->middleware('permission:create-coupons')->name('coupons.store');
        Route::put('coupons/{coupon}', [CouponController::class, 'update'])->middleware('permission:edit-coupons')->name('coupons.update');
        Route::put('coupons/{coupon}/toggle-status', [CouponController::class, 'toggleStatus'])->middleware('permission:toggle-status-coupons')->name('coupons.toggle-status');
        Route::delete('coupons/{coupon}', [CouponController::class, 'destroy'])->middleware('permission:delete-coupons')->name('coupons.destroy');
    });

    // Plan Requests routes
    Route::get('plan-requests', [PlanRequestController::class, 'index'])->middleware('permission:manage-plan-requests')->name('plan-requests.index');
    Route::post('plan-requests/{planRequest}/approve', [PlanRequestController::class, 'approve'])->middleware('permission:approve-plan-requests')->name('plan-requests.approve');
    Route::post('plan-requests/{planRequest}/reject', [PlanRequestController::class, 'reject'])->middleware('permission:reject-plan-requests')->name('plan-requests.reject');



    // Referral routes
    Route::middleware('permission:manage-referral')->group(function () {
        Route::get('referral', [ReferralController::class, 'index'])->middleware('permission:manage-referral')->name('referral.index');
        Route::get('referral/referred-users', [ReferralController::class, 'getReferredUsers'])->middleware('permission:manage-referral')->name('referral.referred-users');
        Route::post('referral/settings', [ReferralController::class, 'updateSettings'])->middleware('permission:manage-setting-referral')->name('referral.settings.update');
        Route::post('referral/payout-request', [ReferralController::class, 'createPayoutRequest'])->middleware('permission:manage-payout-referral')->name('referral.payout-request.create');
        Route::post('referral/payout-request/{payoutRequest}/approve', [ReferralController::class, 'approvePayoutRequest'])->middleware('permission:approve-payout-referral')->name('referral.payout-request.approve');
        Route::post('referral/payout-request/{payoutRequest}/reject', [ReferralController::class, 'rejectPayoutRequest'])->middleware('permission:reject-payout-referral')->name('referral.payout-request.reject');
    });



    // Currencies routes
    Route::middleware('permission:manage-currencies')->group(function () {
        Route::get('currencies', [CurrencyController::class, 'index'])->middleware('permission:manage-currencies')->name('currencies.index');
        Route::post('currencies', [CurrencyController::class, 'store'])->middleware('permission:create-currencies')->name('currencies.store');
        Route::put('currencies/{currency}', [CurrencyController::class, 'update'])->middleware('permission:edit-currencies')->name('currencies.update');
        Route::delete('currencies/{currency}', [CurrencyController::class, 'destroy'])->middleware('permission:delete-currencies')->name('currencies.destroy');
    });

    // ChatGPT routes
    Route::post('api/chatgpt/generate', [\App\Http\Controllers\ChatGptController::class, 'generate'])->name('chatgpt.generate');
    Route::post('api/ai-chat', [\App\Http\Controllers\AIChatController::class, 'chat'])->name('api.ai-chat');
    

    
    // Language management
    Route::get('manage-language/{lang?}', [LanguageController::class, 'managePage'])->middleware('permission:manage-language')->name('manage-language');
    Route::get('language/load', [LanguageController::class, 'load'])->name('language.load');
    Route::match(['POST', 'PATCH'], 'language/save', [LanguageController::class, 'save'])->middleware('permission:edit-language')->name('language.save');

    // Landing Page content management (Super Admin only)
    Route::middleware('App\Http\Middleware\SuperAdminMiddleware')->group(function () {
        Route::get('landing-page/settings', [LandingPageController::class, 'settings'])->name('landing-page.settings');
        Route::post('landing-page/settings', [LandingPageController::class, 'updateSettings'])->name('landing-page.settings.update');
        
        Route::resource('landing-custom-pages', CustomPageController::class)->names([
            'index' => 'landing-page.custom-pages.index',
            'create' => 'landing-page.custom-pages.create',
            'store' => 'landing-page.custom-pages.store',
            'show' => 'landing-page.custom-pages.show',
            'edit' => 'landing-page.custom-pages.edit',
            'update' => 'landing-page.custom-pages.update',
            'destroy' => 'landing-page.custom-pages.destroy'
        ]);
        
        // Custom Pages API routes
        Route::post('api/custom-pages/generate-slug', [CustomPageController::class, 'generateSlug'])->name('api.custom-pages.generate-slug');
        Route::post('api/custom-pages/check-slug', [CustomPageController::class, 'checkSlug'])->name('api.custom-pages.check-slug');
        
        // Newsletter Management
        Route::get('landing-subscribers', [\App\Http\Controllers\LandingPage\NewsletterController::class, 'index'])->name('landing-page.subscribers.index');
        Route::get('landing-subscribers/export', [\App\Http\Controllers\LandingPage\NewsletterController::class, 'export'])->name('landing-page.subscribers.export');
        Route::delete('landing-subscribers/{newsletter}', [\App\Http\Controllers\LandingPage\NewsletterController::class, 'destroy'])->name('landing-page.subscribers.destroy');
        Route::put('landing-subscribers/{newsletter}', [\App\Http\Controllers\LandingPage\NewsletterController::class, 'update'])->name('landing-page.subscribers.update');
        
        // Contact Management
        Route::get('landing-contacts', [\App\Http\Controllers\LandingPage\ContactController::class, 'index'])->name('landing-page.contacts.index');
        Route::get('landing-contacts/export', [\App\Http\Controllers\LandingPage\ContactController::class, 'export'])->name('landing-page.contacts.export');
        Route::delete('landing-contacts/{contact}', [\App\Http\Controllers\LandingPage\ContactController::class, 'destroy'])->name('landing-page.contacts.destroy');
        
        // Location Management (Countries, States, Cities)
        Route::resource('countries', \App\Http\Controllers\CountryController::class);
        Route::resource('states', \App\Http\Controllers\StateController::class);
        Route::resource('cities', \App\Http\Controllers\CityController::class);
    });
    
    // Impersonation routes
    Route::middleware('App\Http\Middleware\SuperAdminMiddleware')->group(function () {
        Route::get('impersonate/{userId}', [ImpersonateController::class, 'start'])->name('impersonate.start');
    });

    // Leaving impersonation is requested while still logged in as the
    // impersonated company user (who is NOT a super admin), so it must not be
    // behind SuperAdminMiddleware. It only reverts to the original user stored
    // in the session, so it is inherently safe.
    Route::post('impersonate/leave', [ImpersonateController::class, 'leave'])->name('impersonate.leave');


    

    
    // Store switching route
    Route::post('switch-store', [\App\Http\Controllers\StoreSwitcherController::class, 'switchStore'])->name('switch-store');
    
    // User language update route
    Route::post('user/language', [\App\Http\Controllers\UserLanguageController::class, 'update'])->name('user.language.update');
    
    }); // End plan.access middleware group
});


require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';

Route::match(['GET', 'POST'], 'payments/easebuzz/success', [EasebuzzPaymentController::class, 'success'])->name('easebuzz.success');
Route::post('payments/easebuzz/callback', [EasebuzzPaymentController::class, 'callback'])->middleware('webhook.signature:easebuzz')->name('easebuzz.callback');

// GDPR Routes
Route::middleware(['auth'])->prefix('gdpr')->name('gdpr.')->group(function () {
    Route::get('export', [\App\Http\Controllers\GDPR\GdprController::class, 'requestExport'])->name('export.request');
    Route::get('export/{exportId}', [\App\Http\Controllers\GDPR\GdprController::class, 'downloadExport'])->name('export.download');
    Route::get('export/status', [\App\Http\Controllers\GDPR\GdprController::class, 'exportStatus'])->name('export.status');

    Route::post('deletion', [\App\Http\Controllers\GDPR\GdprController::class, 'requestDeletion'])->name('deletion.request');
    Route::get('deletion/status', [\App\Http\Controllers\GDPR\GdprController::class, 'deletionStatus'])->name('deletion.status');
    Route::post('deletion/{requestId}/cancel', [\App\Http\Controllers\GDPR\GdprController::class, 'cancelDeletion'])->name('deletion.cancel');
});

// Protected update route (super admin only) - runs pending migrations after deployment
Route::middleware(['auth', 'App\Http\Middleware\SuperAdminMiddleware'])->group(function () {
    Route::get('update', [\App\Http\Controllers\UpdateController::class, 'show'])->name('update.show');
    Route::post('update', [\App\Http\Controllers\UpdateController::class, 'run'])->name('update.run');
});

// Catch-all route for custom domains/subdomains
// This ensures that any request not matched above still enters the 'web' middleware group,
// where DomainResolver resolves the host against verified store custom domains
// (store_domains table) / legacy custom domain columns and renders the matching store
// through ThemeController. Anything unresolved falls through to a 404 here.
Route::any('{any}', function () {
    abort(404);
})->where('any', '.*');
