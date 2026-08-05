<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http as HttpClient;
use Illuminate\Support\Str;

// Socialite is optional; project may need `composer require laravel/socialite`
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    public function redirect(Request $request, $provider)
    {
        $provider = strtolower($provider);
        if (in_array($provider, ['google', 'facebook', 'github', 'apple'])) {
            if (empty(config("services.$provider.client_id")) || empty(config("services.$provider.client_secret"))) {
                return redirect()->route('login')->with('error', __('Social login via :provider is not configured.', ['provider' => $provider]));
            }

            $driver = Socialite::driver($provider)->stateless();

            // Always show the Google account chooser/consent screen
            if ($provider === 'google') {
                $driver->with(['prompt' => 'select_account']);
            }

            return $driver->redirect();
        }

        if ($provider === 'plankton') {
            $params = [
                'client_id' => config('services.plankton.client_id'),
                'redirect_uri' => route('social.callback', ['provider' => 'plankton']),
                'response_type' => 'code',
                'scope' => config('services.plankton.scope', 'openid email profile'),
                'state' => Str::random(40),
            ];

            $url = rtrim(config('services.plankton.authorize_url', ''), '/') . '?' . http_build_query($params);
            return redirect()->away($url);
        }

        abort(404);
    }

    public function callback(Request $request, $provider)
    {
        $provider = strtolower($provider);

        if (in_array($provider, ['google', 'facebook', 'github', 'apple'])) {
            $socialUser = Socialite::driver($provider)->stateless()->user();
            // Try multiple places for email (providers differ)
            $email = $socialUser->getEmail()
                ?? ($socialUser->user['email'] ?? null)
                ?? ($socialUser->user['emailAddress'] ?? null)
                ?? ($socialUser->user['email_address'] ?? null);

            $name = $socialUser->getName()
                ?? ($socialUser->user['name'] ?? null)
                ?? ($socialUser->getNickname() ?? 'User');

            $providerId = $socialUser->getId() ?? ($socialUser->user['sub'] ?? null);
        } elseif ($provider === 'plankton') {
            $code = $request->get('code');
            if (!$code) {
                return redirect()->route('login')->with('status', 'Authorization failed');
            }

            $tokenResp = HttpClient::asForm()->post(config('services.plankton.token_url'), [
                'grant_type' => 'authorization_code',
                'client_id' => config('services.plankton.client_id'),
                'client_secret' => config('services.plankton.client_secret'),
                'redirect_uri' => route('social.callback', ['provider' => 'plankton']),
                'code' => $code,
            ]);

            if (!$tokenResp->ok()) {
                return redirect()->route('login')->with('status', 'Token exchange failed');
            }

            $tokenData = $tokenResp->json();
            $accessToken = $tokenData['access_token'] ?? null;
            if (!$accessToken) {
                return redirect()->route('login')->with('status', 'Token not returned');
            }

            $userResp = HttpClient::withToken($accessToken)->get(config('services.plankton.userinfo_url'));
            if (!$userResp->ok()) {
                return redirect()->route('login')->with('status', 'Failed to fetch user info');
            }

            $userData = $userResp->json();
            $email = $userData['email'] ?? null;
            $name = $userData['name'] ?? ($userData['username'] ?? 'PlanktonUser');
            $providerId = $userData['id'] ?? null;
        } else {
            abort(404);
        }

        $emailMissing = false;
        if (!$email) {
            // Special-case: Apple may not return email (private relay or withheld)
            // Generate a placeholder email using provider id and app host so we can create an account.
            $host = getBaseDomain() ?: 'localhost';
            $generated = ($provider ? $provider : 'social') . '_' . ($providerId ?? Str::random(8));
            $email = $generated . '@' . $host;
            $emailMissing = true;
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'email_verified_at' => $emailMissing ? null : now(),
                'password' => null,
                'type' => 'company',
                'status' => 'active',
            ]);
        }

        Auth::login($user, true);

        if ($emailMissing) {
            // Notify user that email must be completed/verified
            $request->session()->flash('social_email_missing', true);
            $request->session()->flash('social_email_missing_provider', $provider);
            $request->session()->flash('social_email_missing_message', 'Your provider did not return an email address. Please update your email in your profile.');
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
