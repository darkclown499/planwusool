<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules;

class SendOtpRequest extends FormRequest
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
        return [
            'name'            => 'required|string|max:255',
            'email'           => 'required|string|lowercase|email|max:255',
            'password'        => ['required', 'confirmed', (new Rules\Password(8))->letters()->mixedCase()->numbers()],
            'terms'           => 'accepted',
            'recaptcha_token' => 'nullable|string',
            'plan_id'         => 'nullable|integer',
            'referral_code'   => 'nullable|string|max:255',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required'            => __('The name field is required.'),
            'email.required'           => __('The email field is required.'),
            'email.email'              => __('Please provide a valid email address.'),
            'password.required'        => __('The password field is required.'),
            'password.confirmed'       => __('The password confirmation does not match.'),
            'terms.accepted'           => __('You must accept the terms and conditions.'),
        ];
    }
}
