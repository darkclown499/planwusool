<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Mail\TestMail;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class EmailSettingController extends Controller
{
    /**
     * Get email settings for the authenticated user.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getEmailSettings()
    {
        $user = Auth::user();
        
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
        
        $settings = [
            'provider' => getSetting('email_provider', 'smtp', $settingsUserId, $storeId),
            'driver' => getSetting('email_driver', 'smtp', $settingsUserId, $storeId),
            'host' => getSetting('email_host', 'smtp.example.com', $settingsUserId, $storeId),
            'port' => getSetting('email_port', '587', $settingsUserId, $storeId),
            'username' => getSetting('email_username', 'user@example.com', $settingsUserId, $storeId),
            'password' => getSetting('email_password', '', $settingsUserId, $storeId),
            'encryption' => getSetting('email_encryption', 'tls', $settingsUserId, $storeId),
            'fromAddress' => getSetting('email_from_address', 'noreply@example.com', $settingsUserId, $storeId),
            'fromName' => getSetting('email_from_name', 'WorkDo System', $settingsUserId, $storeId)
        ];

        // Mask password if it exists
        if (!empty($settings['password'])) {
            $settings['password'] = '••••••••••••';
        }

        return response()->json($settings);
    }

    /**
     * Update email settings for the authenticated user.
     *
     * @param  \Illuminate\Http\Request  $request
     */
    public function updateEmailSettings(Request $request)
    {
        $user = Auth::user();
        
        // Permission check
        if (!$user->hasPermissionTo('manage-settings')) {
            return redirect()->back()->with('error', __('You do not have permission to update email settings.'));
        }
        $validated = $request->validate([
            'provider' => 'required|string',
            'driver' => 'required|string',
            'host' => 'required|string',
            'port' => 'required|string',
            'username' => 'required|string',
            'password' => 'nullable|string',
            'encryption' => 'required|string',
            'fromAddress' => 'required|email',
            'fromName' => 'required|string',
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
            $companyUser = \App\Models\User::find($user->created_by);
            $storeId = $companyUser ? getCurrentStoreId($companyUser) : null;
        }

        updateSetting('email_provider', $validated['provider'], $settingsUserId, $storeId);
        updateSetting('email_driver', $validated['driver'], $settingsUserId, $storeId);
        updateSetting('email_host', $validated['host'], $settingsUserId, $storeId);
        updateSetting('email_port', $validated['port'], $settingsUserId, $storeId);
        updateSetting('email_username', $validated['username'], $settingsUserId, $storeId);
        
        // Only update password if provided and not masked
        if (!empty($validated['password']) && $validated['password'] !== '••••••••••••') {
            updateSetting('email_password', $validated['password'], $settingsUserId, $storeId);
        }
        
        updateSetting('email_encryption', $validated['encryption'], $settingsUserId, $storeId);
        updateSetting('email_from_address', $validated['fromAddress'], $settingsUserId, $storeId);
        updateSetting('email_from_name', $validated['fromName'], $settingsUserId, $storeId);

        return redirect()->back()->with('success', __('Email settings updated successfully'));
    }

    /**
     * Send a test email.
     *
     * @param  \Illuminate\Http\Request  $request
     */
    public function sendTestEmail(Request $request)
    {
        $user = Auth::user();
        
        // Permission check
        if (!$user->hasPermissionTo('manage-settings')) {
            return redirect()->back()->with('error', __('You do not have permission to test email settings.'));
        }
        
        $validator = Validator::make(
            $request->all(),
            [
                'email' => 'required|email',
            ]
        );

        if ($validator->fails()) {
            return redirect()->back()->with('error', $validator->errors()->first());
        }
        
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
        
        $settings = [
            'provider' => getSetting('email_provider', 'smtp', $settingsUserId, $storeId),
            'driver' => getSetting('email_driver', 'smtp', $settingsUserId, $storeId),
            'host' => getSetting('email_host', 'smtp.example.com', $settingsUserId, $storeId),
            'port' => getSetting('email_port', '587', $settingsUserId, $storeId),
            'username' => getSetting('email_username', 'user@example.com', $settingsUserId, $storeId),
            'encryption' => getSetting('email_encryption', 'tls', $settingsUserId, $storeId),
            'fromAddress' => getSetting('email_from_address', 'noreply@example.com', $settingsUserId, $storeId),
            'fromName' => getSetting('email_from_name', 'WorkDo System', $settingsUserId, $storeId)
        ];
        
        // Get the actual password (not masked)
        $password = getSetting('email_password', '', $settingsUserId, $storeId);
        
        try {
            // Configure mail settings for this request only
            config([
                'mail.default' => $settings['driver'],
                'mail.mailers.smtp.host' => $settings['host'],
                'mail.mailers.smtp.port' => $settings['port'],
                'mail.mailers.smtp.encryption' => $settings['encryption'] === 'none' ? null : $settings['encryption'],
                'mail.mailers.smtp.username' => $settings['username'],
                'mail.mailers.smtp.password' => $password,
                'mail.from.address' => $settings['fromAddress'],
                'mail.from.name' => $settings['fromName'],
            ]);

            // Send test email
            Mail::to($request->email)->send(new TestMail());

            return redirect()->back()->with('success', __('Test email sent successfully to :email', ["email" =>  $request->email]));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to send test email: :message' , ["message" => $e->getMessage()]));
        }
    }

    /**
     * Get a setting value for a user.
     *
     * @param  int  $userId
     * @param  string  $key
     * @param  mixed  $default
     * @return mixed
     */

}