<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Notification;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\Currency;
use App\Models\PaymentSetting;
use App\Models\Webhook;

class SettingsController extends Controller
{
    /**
     * Display the main settings page.
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        $user = auth()->user();
        
        // Determine the correct user_id and store_id for settings
        if ($user->type === 'superadmin') {
            $settingsUserId = $user->id;
            $storeId = null;
        } elseif ($user->type === 'company') {
            $settingsUserId = $user->id;
            $storeId = getCurrentStoreId($user);
        } else {
            // For sub-users, get settings from their company (created_by)
            $settingsUserId = $user->created_by;
            $companyUser = \App\Models\User::find($user->created_by);
            $storeId = $companyUser ? getCurrentStoreId($companyUser) : null;
        }
        
        // Get system settings - store-specific for company users and sub-users
        if ($storeId) {
            // For company users and sub-users, get store-specific settings with fallback to global
            $systemSettings = Setting::getUserSettings($settingsUserId, $storeId);
            
            // If no store-specific settings exist, fall back to global settings
            if (empty($systemSettings)) {
                $globalSettings = settings();
                $systemSettings = $globalSettings;
            } else {
                // Merge with global settings for missing keys
                $globalSettings = settings();
                $systemSettings = array_merge($globalSettings, $systemSettings);
            }
        } else {
            // For superadmin, use global settings
            $systemSettings = settings();
        }
        
        $currencies = Currency::all();
        $paymentSettings = PaymentSetting::getUserSettings($settingsUserId, $storeId);
        $webhooks = Webhook::where('user_id', $settingsUserId)->get();
        $templates = Notification::all();
        
        // Get messaging variables
        $orderVars = isset($paymentSettings['messaging_order_variables']) ? json_decode($paymentSettings['messaging_order_variables'], true) : [];
        $itemVars = isset($paymentSettings['messaging_item_variables']) ? json_decode($paymentSettings['messaging_item_variables'], true) : [];
        
        $messagingVariables = [
            'orderVariables' => $orderVars,
            'itemVariables' => $itemVars
        ];
        
        return Inertia::render('settings/index', [
            'systemSettings' => $systemSettings,
            'settings' => $systemSettings, // For helper functions
            'cacheSize' => getCacheSize(),
            'currencies' => $currencies,
            'timezones' => config('timezones'),
            'dateFormats' => config('dateformat'),
            'timeFormats' => config('timeformat'),
            'paymentSettings' => $paymentSettings,
            'messagingVariables' => $messagingVariables,
            'webhooks' => $webhooks,
            'availableModules' => Webhook::modules(),
            'templates' => $templates,
        ]);
    }
}