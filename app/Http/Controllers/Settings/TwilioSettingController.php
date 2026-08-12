<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Notification;
use App\Services\HotsmsService;
use App\Services\TwilioService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TwilioSettingController extends Controller
{
    protected const MASKED_TOKEN = '*************';

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'sms_provider' => 'required|in:twilio,hotsms',
            'is_twilio_enabled' => 'required|boolean',
            'twilio_sid' => 'required_if:sms_provider,twilio|required_if:is_twilio_enabled,true,is_twilio_enabled,1|string|max:255',
            'twilio_token' => 'string|max:255',
            'twilio_from' => 'required_if:sms_provider,twilio|required_if:is_twilio_enabled,true,is_twilio_enabled,1|string|max:255',
            'is_hotsms_enabled' => 'required|boolean',
            'hotsms_user_name' => 'required_if:sms_provider,hotsms|required_if:is_hotsms_enabled,true,is_hotsms_enabled,1|string|max:255',
            'hotsms_password' => 'string|max:255',
            'hotsms_sender' => 'nullable|string|max:30',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->with('error', __('Validation failed'));
        }

        $user = auth()->user();
        $storeId = $user->type === 'company' ? getCurrentStoreId($user) : null;

        try {
            // المزوّد النشط (اختيار الزبون)
            Setting::setSetting('sms_provider', $request->sms_provider, $user->id, $storeId);

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

            // Store all HotSMS settings in settings table
            Setting::setSetting('is_hotsms_enabled', $request->boolean('is_hotsms_enabled') ? 'on' : 'off', $user->id, $storeId);

            if ($request->boolean('is_hotsms_enabled')) {
                Setting::setSetting('hotsms_user_name', $request->hotsms_user_name, $user->id, $storeId);

                $submittedPassword = (string) $request->input('hotsms_password');
                if (!empty($submittedPassword) && $submittedPassword !== self::MASKED_TOKEN) {
                    Setting::setSetting('hotsms_password', $submittedPassword, $user->id, $storeId);
                } elseif (empty(Setting::getSetting('hotsms_password', $user->id, $storeId))) {
                    return back()->withErrors(['hotsms_password' => __('HotSMS password is required')])->with('error', __('Validation failed'));
                }

                Setting::setSetting('hotsms_sender', $request->hotsms_sender ?? '', $user->id, $storeId);
            }

            // Save template settings and per-store content overrides (مشتركة بين المزودين)
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

            // Owner notification settings (Twilio)
            if ($request->has('twilio_notify_owner')) {
                Setting::setSetting('twilio_notify_owner', $request->boolean('twilio_notify_owner') ? 'on' : 'off', $user->id, $storeId);
            }
            if ($request->has('twilio_owner_phone')) {
                Setting::setSetting('twilio_owner_phone', $request->input('twilio_owner_phone'), $user->id, $storeId);
            }

            // Owner notification settings (HotSMS)
            if ($request->has('hotsms_notify_owner')) {
                Setting::setSetting('hotsms_notify_owner', $request->boolean('hotsms_notify_owner') ? 'on' : 'off', $user->id, $storeId);
            }
            if ($request->has('hotsms_owner_phone')) {
                Setting::setSetting('hotsms_owner_phone', $request->input('hotsms_owner_phone'), $user->id, $storeId);
            }

            return back()->with('success', __('SMS settings updated successfully'));
        } catch (\Exception $e) {
            return back()->with('error', __('Failed to update SMS settings: ') . $e->getMessage());
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

    public function testHotsms(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'hotsms_user_name' => 'nullable|string|max:255',
            'hotsms_password' => 'nullable|string|max:255',
            'hotsms_sender' => 'nullable|string|max:30',
            'phone' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return back()->with('error', __('Validation failed'));
        }

        $user = auth()->user();
        $storeId = $user->type === 'company' ? getCurrentStoreId($user) : null;
        $settings = Setting::getUserSettings($user->id, $storeId);

        $userName = $request->hotsms_user_name ?: ($settings['hotsms_user_name'] ?? null);
        $password = (string) $request->input('hotsms_password');
        if ($password === '' || $password === self::MASKED_TOKEN) {
            $password = $settings['hotsms_password'] ?? null;
        }
        $sender = $request->hotsms_sender ?: ($settings['hotsms_sender'] ?? null);

        $success = HotsmsService::sendTestSMS($userName, $password, $sender, $request->phone);

        if ($success) {
            return back()->with('success', __('Test SMS sent successfully'));
        }

        return back()->with('error', __('Failed to send test SMS. Please check your HotSMS credentials.'));
    }
}
