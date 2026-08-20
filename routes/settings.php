<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\EmailSettingController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\Settings\SystemSettingsController;
use App\Http\Controllers\Settings\CurrencySettingController;
use App\Http\Controllers\PlanOrderController;
use App\Http\Controllers\Settings\PaymentSettingController;
use App\Http\Controllers\Settings\TwilioSettingController;
use App\Http\Controllers\Settings\WebhookController;
use App\Http\Controllers\Settings\AccountingSettingController;
use App\Http\Controllers\StripePaymentController;
use App\Http\Controllers\PayPalPaymentController;
use App\Http\Controllers\BankPaymentController;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Settings Routes
|--------------------------------------------------------------------------
|
| Here are the routes for settings management
|
*/

// Payment routes accessible without plan check
Route::middleware(['auth', 'verified', 'permission:manage-settings'])->group(function () {
    Route::get('/payment-methods', [PaymentSettingController::class, 'getPaymentMethods'])->name('payment.methods');
    Route::get('/enabled-payment-methods', [PaymentSettingController::class, 'getEnabledMethods'])->name('payment.enabled-methods');
    Route::post('/plan-orders', [PlanOrderController::class, 'create'])->name('plan-orders.create');
    Route::post('/stripe-payment', [StripePaymentController::class, 'processPayment'])->name('settings.stripe.payment');
    Route::post('/paypal-payment', [PayPalPaymentController::class, 'processPayment'])->name('settings.paypal.payment');
    Route::post('/bank-payment', [BankPaymentController::class, 'processPayment'])->name('settings.bank.payment');
});

Route::middleware(['auth', 'verified', 'plan.access'])->group(function () {
    // Payment Settings (admin and company users)
    Route::post('/payment-settings', [PaymentSettingController::class, 'store'])->name('payment.settings');
    Route::post('/payment-settings/test-telegram', [PaymentSettingController::class, 'testTelegram'])->name('payment.settings.test-telegram');
    
    // Twilio Settings
    Route::post('/settings/twilio', [TwilioSettingController::class, 'store'])->name('settings.twilio');
    Route::post('/settings/twilio/test', [TwilioSettingController::class, 'test'])->name('settings.twilio.test');

    // HotSMS Settings
    Route::post('/settings/hotsms/test', [TwilioSettingController::class, 'testHotsms'])->name('settings.hotsms.test');
    
    // Profile settings page with profile and password sections
    Route::get('profile', function () {
        return Inertia::render('settings/profile-settings');
    })->name('profile');

    // Routes for form submissions
    Route::patch('profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('profile', [ProfileController::class, 'update']); // For file uploads with method spoofing
    Route::delete('profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::put('profile/password', [PasswordController::class, 'update'])->name('password.update');

    // Email settings page (global default templates — platform-level)
    Route::get('settings/email', function () {
        return Inertia::render('settings/components/email-settings');
    })->middleware('platform.admin')->name('settings.email');
    
    // Email settings routes
    Route::middleware('platform.admin')->group(function () {
        Route::get('settings/email/get', [EmailSettingController::class, 'getEmailSettings'])->name('settings.email.get');
        Route::post('settings/email/update', [EmailSettingController::class, 'updateEmailSettings'])->name('settings.email.update');
        Route::post('settings/email/test', [EmailSettingController::class, 'sendTestEmail'])->name('settings.email.test');
    });
  
    // General settings page with system and company settings
    // Platform-level ONLY — merchants use /stores/{id}/* pages.
    Route::get('settings', [SettingsController::class, 'index'])->middleware('platform.admin')->name('settings');
    
    // Brand Settings routes
    Route::post('settings/storage', [SystemSettingsController::class, 'updateStorage'])->middleware('platform.admin')->name('settings.storage.update');
    Route::post('settings/recaptcha', [SystemSettingsController::class, 'updateRecaptcha'])->middleware('platform.admin')->name('settings.recaptcha.update');
    Route::post('settings/chatgpt', [SystemSettingsController::class, 'updateChatgpt'])->middleware('platform.admin')->name('settings.chatgpt.update');
    Route::post('settings/cookie', [SystemSettingsController::class, 'updateCookie'])->middleware('platform.admin')->name('settings.cookie.update');
    Route::post('settings/seo', [SystemSettingsController::class, 'updateSeo'])->middleware('platform.admin')->name('settings.seo.update');
    Route::post('settings/cache/clear', [SystemSettingsController::class, 'clearCache'])->middleware('platform.admin')->name('settings.cache.clear');
    
    // Currency Settings routes
    Route::post('settings/currency', [CurrencySettingController::class, 'update'])->middleware('platform.admin')->name('settings.currency.update');
    
    // Email Notification Settings routes
    Route::post('email-notification-settings-save', [SystemSettingsController::class, 'mailNotificationStore'])->middleware('platform.admin')->name('email.notification.setting.store');
    
    // Webhook Settings routes (platform-level)
    Route::middleware('platform.admin')->group(function () {
        Route::get('settings/webhooks', function () {
            return Inertia::render('settings/webhook-settings');
        })->name('settings.webhooks');
        Route::get('settings/webhooks/data', [WebhookController::class, 'index'])->name('settings.webhooks.index');
        Route::post('settings/webhooks', [WebhookController::class, 'store'])->name('settings.webhooks.store');
        Route::put('settings/webhooks/{webhook}', [WebhookController::class, 'update'])->name('settings.webhooks.update');
        Route::delete('settings/webhooks/{webhook}', [WebhookController::class, 'destroy'])->name('settings.webhooks.destroy');
    });
    
    // Accounting Integration routes (platform-level; merchants use /stores/{id}/integrations/erp)
    Route::middleware('platform.admin')->group(function () {
        Route::get('settings/accounting', [AccountingSettingController::class, 'index'])->name('settings.accounting.index');
        Route::post('settings/accounting', [AccountingSettingController::class, 'store'])->name('settings.accounting.store');
        Route::delete('settings/accounting', [AccountingSettingController::class, 'destroy'])->name('settings.accounting.destroy');
        Route::post('settings/accounting/test-connection', [AccountingSettingController::class, 'testConnection'])->name('settings.accounting.test-connection');
        Route::post('settings/accounting/sync-now', [AccountingSettingController::class, 'syncNow'])->name('settings.accounting.sync-now');
    });

});
