<?php

namespace App\Services;

use App\Models\VerificationCode;
use Illuminate\Support\Facades\Mail;

class OtpService
{
    public function generate(string $email, string $type = 'register'): string
    {
        $code = str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        VerificationCode::updateOrCreate(
            ['email' => $email, 'type' => $type, 'used' => false],
            [
                'code' => $code,
                'expires_at' => now()->addMinutes(10),
                'used' => false,
            ]
        );

        return $code;
    }

    public function send(string $email, string $code, string $type = 'register'): void
    {
        Mail::raw($this->buildBody($code, $type), function ($message) use ($email, $code, $type) {
            $subject = $type === 'register'
                ? 'Wusool - رمز التحقق لتسجيل حساب جديد'
                : 'Wusool - رمز التحقق';
            $message->to($email)
                ->subject($subject)
                ->html($this->buildBody($code, $type));
        });
    }

    public function verify(string $email, string $code, string $type = 'register'): bool
    {
        $record = VerificationCode::where('email', $email)
            ->where('type', $type)
            ->where('used', false)
            ->latest()
            ->first();

        if (!$record || !$record->isValid()) {
            return false;
        }

        if (!hash_equals($record->code, $code)) {
            return false;
        }

        $record->update(['used' => true]);
        return true;
    }

    private function buildBody(string $code, string $type): string
    {
        $greeting = $type === 'register'
            ? 'مرحباً بك في وصول'
            : 'مرحباً بك في وصول';

        return <<<HTML
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,sans-serif;">
<div style="max-width:480px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
  <div style="background:linear-gradient(135deg,#10b981,#0d9668);padding:28px 20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">{$greeting}</h1>
  </div>
  <div style="padding:30px 24px;text-align:center;">
    <p style="color:#555;font-size:15px;margin:0 0 8px;">رمز التحقق الخاص بك</p>
    <p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#10b981;margin:16px 0;">{$code}</p>
    <p style="color:#999;font-size:13px;margin:0;">صالح لمدة 10 دقائق فقط</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="color:#999;font-size:12px;margin:0;">إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.</p>
  </div>
</div>
</body>
</html>
HTML;
    }
}
