<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CurrencySettingController extends Controller
{
    /**
     * Update the currency settings.
     */
    public function update(Request $request)
    {
        $user = auth()->user();
        
        // Permission check
        if (!$user->hasPermissionTo('manage-settings')) {
            return redirect()->back()->with('error', __('You do not have permission to update currency settings.'));
        }
        
        try {
            $validated = $request->validate([
                'decimalFormat' => 'required|string|in:0,1,2,3,4',
                'defaultCurrency' => 'required|string|exists:currencies,code',
                'decimalSeparator' => ['required', 'string', Rule::in(['.', ','])],
                'thousandsSeparator' => 'required|string',
                'floatNumber' => 'required|boolean',
                'currencySymbolSpace' => 'required|boolean',
                'currencySymbolPosition' => 'required|string|in:before,after',
            ]);
            
            // Determine the correct user_id and store_id for settings
            if ($user->type === 'superadmin') {
                $settingsUserId = $user->id;
                $storeId = null;
            } elseif ($user->type === 'company') {
                $settingsUserId = $user->id;
                $storeId = getCurrentStoreId($user);
            } else {
                // For sub-users, save settings under their company (created_by)
                $settingsUserId = $user->created_by;
                $companyUser = User::find($user->created_by);
                $storeId = $companyUser ? getCurrentStoreId($companyUser) : null;
            }
            
            // Update settings using helper function with store support
            foreach ($validated as $key => $value) { 
                updateSetting($key, $value, $settingsUserId, $storeId);
            }
            
            return redirect()->back()->with('success', __('Currency settings updated successfully.'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to update currency settings: :error', ['error' => $e->getMessage()]));
        }
    }
}