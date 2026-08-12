<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Notification;
use App\Services\TwilioService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TwilioSettingController extends Controller
{
    protected const MASKED_TOKEN = '*************';

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'is_twilio_enabled' => 'required|boolean',
            'twilio_sid' => 'required_if:is_twilio_enabled,true,is_twilio_enabled,1|string|max:255',
            'twilio_token' => 'string|max:255',
            'twilio_from' => 'required_if:is_twilio_enabled,true,is_twilio_enabled,1|string|max:255',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->with('error', __('Validation failed'));
        }

        $user = auth()->user();
        $storeId = $user->type === 'company' ? getCurrentStoreId($user) : null;
        
        try {
            // Store all Twilio settings in settings table
            Setting::setSetting('is_twilio_enabled', $request->boolean('is_twilio_enabled') ? 'on' : 'off', $user->id, $storeId);
            
            if ($request->boolean('is_twilio_enabled')) {
                Setting::setSetting('twilio_sid', $request->twilio_sid, $user->id, $storeId);

                // Only update the token if a new value was provided (not the masked placeholder)
                $submittedToken = (string) $request->input('twilio_token');
                if (!empty($submittedToken) && $submittedToken !== self::MASKED_TOKEN) {
                    Setting::setSetting('twilio_token', $submittedToken, $user->id, $storeId);
                } elseif (empty(Setting::getSetting('twilio_token', $user->id, $storeId))) {
                    return back()->withErrors(['twilio_token' => __('Twilio Auth Token is required')])->with('error', __('Validation failed'));
                }

                Setting::setSetting('twilio_from', $request->twilio_from, $user->id, $storeId);
            }

            // Save template settings and per-store content overrides
            $templates = Notification::all();
            foreach ($templates as $template) {
                $templateKey = "twilio_" . strtolower(str_replace(' ', '_', $template->action)) . "_enabled";
                if ($request->has($templateKey)) {
                    $value = $request->boolean($templateKey) ? 'on' : 'off';
                    Setting::setSetting($templateKey, $value, $user->id, $storeId);
                }

                $contentKey = "twilio_content_" . strtolower(str_replace(' ', '_', $template->action));
                if ($request->has($contentKey)) {
                    Setting::setSetting($contentKey, $request->input($contentKey), $user->id, $storeId);
                }
            }

            // Owner notification settings
            if ($request->has('twilio_notify_owner')) {
                Setting::setSetting('twilio_notify_owner', $request->boolean('twilio_notify_owner') ? 'on' : 'off', $user->id, $storeId);
            }
            if ($request->has('twilio_owner_phone')) {
                Setting::setSetting('twilio_owner_phone', $request->input('twilio_owner_phone'), $user->id, $storeId);
            }

            return back()->with('success', __('Twilio settings updated successfully'));
        } catch (\Exception $e) {
            return back()->with('error', __('Failed to update Twilio settings: ') . $e->getMessage());
        }
    }

    public function test(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'twilio_sid' => 'nullable|string|max:255',
            'twilio_token' => 'nullable|string|max:255',
            'twilio_from' => 'nullable|string|max:255',
            'phone' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return back()->with('error', __('Validation failed'));
        }

        // Use stored settings as fallback when fields are masked/empty
        $user = auth()->user();
        $storeId = $user->type === 'company' ? getCurrentStoreId($user) : null;
        $settings = Setting::getUserSettings($user->id, $storeId);

        $sid = $request->twilio_sid ?: ($settings['twilio_sid'] ?? null);
        $token = (string) $request->input('twilio_token');
        if ($token === '' || $token === self::MASKED_TOKEN) {
            $token = $settings['twilio_token'] ?? null;
        }
        $from = $request->twilio_from ?: ($settings['twilio_from'] ?? null);

        $success = TwilioService::sendTestSMS($sid, $token, $from, $request->phone);

        if ($success) {
            return back()->with('success', __('Test SMS sent successfully'));
        }

        return back()->with('error', __('Failed to send test SMS. Please check your Twilio credentials.'));
    }
}