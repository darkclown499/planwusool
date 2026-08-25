<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CustomerEmailVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $code, public string $storeName) {}

    public function build()
    {
        $code = $this->code;
        $storeName = $this->storeName;
        return $this->subject("رمز تفعيل حسابك في {$storeName}")
            ->html(
                '<div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;">'
                .'<h2 style="margin:0 0 12px;color:#0f172a;">رمز تفعيل حسابك في '.e($storeName).'</h2>'
                .'<p style="margin:0 0 16px;color:#334155;">رمز التحقق الخاص بك هو:</p>'
                .'<div style="display:inline-block;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:12px;padding:12px 20px;font-size:28px;letter-spacing:8px;font-weight:900;color:#0f172a;direction:ltr;">'.e($code).'</div>'
                .'<p style="margin:16px 0 0;color:#64748b;font-size:13px;">ينتهي الرمز خلال 10 دقائق. إذا لم تطلب إنشاء هذا الحساب، تجاهل الرسالة.</p>'
                .'</div>'
            );
    }
}
