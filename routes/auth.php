<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\OtpController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\SocialAuthController;

Route::middleware(['guest', 'landing.enabled'])->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
        ->middleware('registration.enabled')
        ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store'])
        ->middleware(['registration.enabled', 'throttle:10,1']);

    // OTP verification for registration
    // Rate-limited to prevent brute-force attacks on the 6-digit code.
    Route::post('otp/send', [OtpController::class, 'send'])
        ->middleware(['registration.enabled', 'throttle:3,1'])
        ->name('otp.send');

    Route::post('otp/verify', [OtpController::class, 'verify'])
        ->middleware('throttle:5,1')
        ->name('otp.verify');

    Route::post('otp/resend', [OtpController::class, 'resend'])
        ->middleware('throttle:5,1')
        ->name('otp.resend');

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:5,1');

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->middleware('throttle:3,1')
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->name('password.store');

    // Social authentication redirects/callbacks
    Route::get('auth/redirect/{provider}', [SocialAuthController::class, 'redirect'])
        ->where('provider', 'google|facebook|github|apple|plankton')
        ->name('social.redirect');

    // Social authentication callbacks — Apple delivers the result as a
    // form_post (POST), the other providers use a GET redirect.
    Route::match(['get', 'post'], 'auth/callback/{provider}', [SocialAuthController::class, 'callback'])
        ->where('provider', 'google|facebook|github|apple|plankton')
        ->name('social.callback');
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});
