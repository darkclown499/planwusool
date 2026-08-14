<?php

use App\Models\Setting;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

/**
 * Persist the dynamic mail settings consumed by MailConfigService so the
 * password reset flow can send its notification in the test environment.
 */
function configureMailService(): void
{
    $superadmin = User::factory()->create(['type' => 'superadmin']);

    foreach ([
        'email_driver' => 'smtp',
        'email_host' => 'smtp.test.local',
        'email_port' => '1025',
        'email_username' => 'noreply@wusool.test',
        'email_password' => 'secret',
        'email_encryption' => 'tls',
        'email_from_address' => 'noreply@wusool.test',
        'email_from_name' => 'Wusool Test',
    ] as $key => $value) {
        Setting::setSetting($key, $value, $superadmin->id);
    }
}

test('reset password link screen can be rendered', function () {
    $response = $this->get('/forgot-password');

    $response->assertStatus(200);
});

test('reset password link can be requested', function () {
    configureMailService();
    Mail::fake();
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class);
});

test('reset password screen can be rendered', function () {
    configureMailService();
    Mail::fake();
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function ($notification) {
        $response = $this->get('/reset-password/'.$notification->token);

        $response->assertStatus(200);

        return true;
    });
});

test('password can be reset with valid token', function () {
    configureMailService();
    Mail::fake();
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
        $response = $this->post('/reset-password', [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('login'));

        return true;
    });
});
