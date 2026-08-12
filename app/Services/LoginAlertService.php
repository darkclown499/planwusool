<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class LoginAlertService
{
    /**
     * Detect logins from a new device/IP and email the user a security alert.
     * The very first recorded login is stored silently (no alert).
     */
    public static function checkAndAlert(User $user, Request $request): void
    {
        try {
            $ip = (string) $request->ip();
            $ua = substr((string) $request->userAgent(), 0, 500);

            $previousAt = $user->last_login_at;
            $previousIp = $user->last_login_ip;
            $previousUa = $user->last_login_ua;

            $isNewDevice = $previousAt !== null
                && ($previousIp !== $ip || $previousUa !== $ua);

            // Persist the current login context regardless of alerting.
            $user->forceFill([
                'last_login_at' => now(),
                'last_login_ip' => $ip,
                'last_login_ua' => $ua,
            ])->save();

            if (! $isNewDevice) {
                return;
            }

            // In-app notification (bell icon) in addition to the email.
            try {
                MerchantNotificationService::newDeviceLogin($user, $ip, $ua);
            } catch (\Throwable $e) {
                Log::warning('Failed to create new-device login notification: ' . $e->getMessage());
            }

            $host = parse_url(config('app.url'), PHP_URL_HOST) ?: config('app.url');

            MailConfigService::setDynamicConfig();

            Mail::html(self::buildBody($user, $host, $ip, $ua, $previousAt), function ($message) use ($user, $host) {
                $message->to($user->email)
                    ->subject('Wusool - تسجيل دخول جديد من جهاز جديد');
            });
        } catch (\Throwable $e) {
            Log::warning('Failed to send new-device login alert: ' . $e->getMessage());
        }
    }

    private static function buildBody(User $user, string $host, string $ip, string $ua, ?string $previousAt): string
    {
        $name = $user->name ?? $user->email;
        $time = now()->format('Y-m-d H:i:s');
        $prev = $previousAt ? \Illuminate\Support\Carbon::parse($previousAt)->format('Y-m-d H:i:s') : '—';

        return <<<HTML
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,sans-serif;">
<div style="max-width:480px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
  <div style="background:linear-gradient(135deg,#10b981,#0d9668);padding:28px 20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">تنبيه أمني — تسجيل دخول جديد</h1>
  </div>
  <div style="padding:30px 24px;text-align:center;color:#555;font-size:14px;line-height:1.8;">
    <p>مرحباً {$name}،</p>
    <p>تم تسجيل الدخول إلى حسابك على <strong>{$host}</strong> من جهاز جديد.</p>
    <table style="width:100%;margin:16px 0;border-collapse:collapse;text-align:right;font-size:13px;">
      <tr><td style="padding:6px;border:1px solid #eee;color:#888;">الوقت</td><td style="padding:6px;border:1px solid #eee;" dir="ltr">{$time}</td></tr>
      <tr><td style="padding:6px;border:1px solid #eee;color:#888;">عنوان IP</td><td style="padding:6px;border:1px solid #eee;" dir="ltr">{$ip}</td></tr>
      <tr><td style="padding:6px;border:1px solid #eee;color:#888;">المتصفح</td><td style="padding:6px;border:1px solid #eee;" dir="ltr" style="word-break:break-all;">{$ua}</td></tr>
      <tr><td style="padding:6px;border:1px solid #eee;color:#888;">آخر دخول سابق</td><td style="padding:6px;border:1px solid #eee;" dir="ltr">{$prev}</td></tr>
    </table>
    <p style="color:#999;font-size:12px;">إذا كان هذا أنت، يمكنك تجاهل هذه الرسالة. إذا لم تتعرف على هذا الدخول، غيّر كلمة مرورك فوراً.</p>
  </div>
</div>
</body>
</html>
HTML;
    }
}