<?php

use App\Models\User;
use App\Models\VerificationCode;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    Cache::flush();
});

test('passwordless login send always reports success and does not reveal existing accounts', function () {
    Mail::fake();

    $this->postJson('/login/otp/send', ['email' => 'ghost@example.com'])
        ->assertOk()
        ->assertJson(['success' => true]);

    Mail::assertNothingSent();
});

test('passwordless login send is capped per email', function () {
    Mail::fake();
    $user = User::factory()->create();

    foreach (range(1, 3) as $i) {
        $this->postJson('/login/otp/send', ['email' => $user->email])->assertOk();
    }

    $this->postJson('/login/otp/send', ['email' => $user->email])
        ->assertStatus(429);
});

test('passwordless login cannot be verified without a pending request', function () {
    $user = User::factory()->create();

    $this->postJson('/login/otp/verify', ['email' => $user->email, 'code' => '123456'])
        ->assertStatus(422);

    $this->assertGuest();
});

test('passwordless login rejects an invalid code', function () {
    Mail::fake();
    $user = User::factory()->create();

    $this->postJson('/login/otp/send', ['email' => $user->email])->assertOk();

    $this->postJson('/login/otp/verify', ['email' => $user->email, 'code' => '000000'])
        ->assertStatus(422);

    $this->assertGuest();
});

test('passwordless login locks out after repeated failed attempts', function () {
    Mail::fake();
    $user = User::factory()->create();

    $this->postJson('/login/otp/send', ['email' => $user->email])->assertOk();

    // 3 failed attempts are allowed, the 4th trips the per-email lockout
    // (before the shared 5/min route throttle is exhausted).
    foreach (range(1, 3) as $i) {
        $this->postJson('/login/otp/verify', ['email' => $user->email, 'code' => '000000'])
            ->assertStatus(422);
    }

    $this->postJson('/login/otp/verify', ['email' => $user->email, 'code' => '000000'])
        ->assertStatus(429);

    $this->assertGuest();
});

test('user can authenticate with a valid passwordless login code', function () {
    Mail::fake();
    $user = User::factory()->create();

    $this->postJson('/login/otp/send', ['email' => $user->email])
        ->assertOk()
        ->assertJson(['success' => true]);

    $record = VerificationCode::where('email', $user->email)
        ->where('type', 'login')
        ->latest()
        ->first();

    $this->assertNotNull($record);

    $response = $this->postJson('/login/otp/verify', [
        'email' => $user->email,
        'code' => $record->code,
    ]);

    $response->assertOk();
    $response->assertJson(['success' => true]);
    $response->assertJsonStructure(['success', 'redirect']);
    $this->assertAuthenticatedAs($user);
});

test('passwordless login fails for a disabled login account', function () {
    Mail::fake();
    $user = User::factory()->create(['is_enable_login' => 0]);

    $this->postJson('/login/otp/send', ['email' => $user->email])
        ->assertOk()
        ->assertJson(['success' => true]);

    $this->postJson('/login/otp/verify', ['email' => $user->email, 'code' => '000000'])
        ->assertStatus(422);

    $this->assertGuest();
});
