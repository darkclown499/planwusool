<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use App\Models\Setting;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
        
        // Add reCAPTCHA validation if enabled
        $recaptchaEnabled = Setting::where('key', 'recaptchaEnabled')->value('value');
        if ($recaptchaEnabled === 'true' || $recaptchaEnabled === true || $recaptchaEnabled === 1 || $recaptchaEnabled === '1') {
            $rules['recaptcha_token'] = 'required|string';
        }
        
        return $rules;
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $recaptchaEnabled = Setting::where('key', 'recaptchaEnabled')->value('value');
            
            if ($recaptchaEnabled === 'true' || $recaptchaEnabled === true || $recaptchaEnabled === 1 || $recaptchaEnabled === '1') {
                $token = $this->input('recaptcha_token');
                
                if (empty($token)) {
                    $validator->errors()->add('recaptcha_token', 'Please complete the reCAPTCHA verification.');
                    return;
                }
                
                $secretKey = Setting::where('key', 'recaptchaSecretKey')->value('value');
                if (empty($secretKey)) {
                    $validator->errors()->add('recaptcha_token', 'reCAPTCHA is not properly configured.');
                    return;
                }
                
                try {
                    $response = \Illuminate\Support\Facades\Http::asForm()->post('https://www.google.com/recaptcha/api/siteverify', [
                        'secret' => $secretKey,
                        'response' => $token,
                        'remoteip' => request()->ip(),
                    ]);
                    
                    $result = $response->json();
                    
                    if (!$result['success']) {
                        $validator->errors()->add('recaptcha_token', 'reCAPTCHA verification failed. Please try again.');
                    }
                } catch (\Exception $e) {
                    $validator->errors()->add('recaptcha_token', 'reCAPTCHA verification service is unavailable.');
                }
            }
        });
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => __('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}
