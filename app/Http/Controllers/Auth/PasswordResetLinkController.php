<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\Setting;
use App\Services\MailConfigService;
use Illuminate\Support\Facades\RateLimiter;
use PSpell\Config;

class PasswordResetLinkController extends Controller
{
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
            'settings' => settings(),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $rules = ['email' => 'required|email'];
        
        $recaptchaEnabled = Setting::where('key', 'recaptchaEnabled')->value('value');
        if ($recaptchaEnabled === 'true' || $recaptchaEnabled === true || $recaptchaEnabled === 1 || $recaptchaEnabled === '1') {
            $rules['recaptcha_token'] = 'required|string';
        }
        
        $request->validate($rules);

        // P0: per-email rate limit ΓÇö 3 per 15min prevents email bombing (route throttle is IP-only)
        $emailKey = 'pw-reset-email:' . sha1(strtolower(trim($request->email)));
        if (RateLimiter::tooManyAttempts($emailKey, 3)) {
            // Preserve generic response to avoid enumeration even when throttled
            return back()->with('status', __('A reset link will be sent if the account exists.'));
        }
        RateLimiter::hit($emailKey, 900);
        
        // Validate reCAPTCHA if enabled
        if ($recaptchaEnabled === 'true' || $recaptchaEnabled === true || $recaptchaEnabled === 1 || $recaptchaEnabled === '1') {
            $token = $request->input('recaptcha_token');
            $secretKey = Setting::where('key', 'recaptchaSecretKey')->value('value');
            
            if (!empty($token) && !empty($secretKey)) {
                $response = \Illuminate\Support\Facades\Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => $secretKey,
                    'response' => $token,
                    'remoteip' => $request->ip(),
                ]);
                
                $result = $response->json();
                if (!$result['success']) {
                    return back()->withErrors(['recaptcha_token' => 'reCAPTCHA verification failed. Please try again.'])->withInput();
                }
            }
        }

        // Configure dynamic mail settings before sending reset link
        $mailConfigured = MailConfigService::setDynamicConfig();
        
        if (!$mailConfigured) {
            return back()->withErrors([
                'email' => __('Email service not configured. Please contact support.')
            ]);
        }
        
        Password::sendResetLink(
            $request->only('email')
        );

        return back()->with('status', __('A reset link will be sent if the account exists.'));
    }
}
