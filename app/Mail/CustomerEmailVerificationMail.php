<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CustomerEmailVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $code, public string $storeName, public ?string $storeLogo = null) {}

    public function build()
    {
        $code = $this->code;
        $storeName = $this->storeName;
        $logoHtml = '';
        if ($this->storeLogo) {
            $logoUrl = e($this->storeLogo);
            $logoHtml = '<div style="text-align:center;margin-bottom:16px;"><img src="'.$logoUrl.'" alt="'.e($storeName).'" style="max-height:48px;max-width:160px;object-fit:contain;" /></div>';
        }
        return $this->subject("رمز تأكيد البريد الإلكتروني - {$storeName}")
            ->html(
                '<div dir="rtl" style="font-family:Tajawal,Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">'
                .$logoHtml
                .'<h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:800;">رمز تأكيد البريد الإلكتروني</h2>'
                .'<p style="margin:0 0 16px;color:#475569;font-size:14px;">استخدم الرمز التالي لإكمال إنشاء حسابك في <strong style="color:#0f172a;">'.e($storeName).'</strong></p>'
                .'<div style="text-align:center;margin:20px 0;">'
                .'<div style="display:inline-block;background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:14px 24px;font-size:32px;letter-spacing:10px;font-weight:900;color:#0f172a;direction:ltr;">'.e($code).'</div>'
                .'</div>'
                .'<p style="margin:16px 0 0;color:#64748b;font-size:13px;text-align:center;">ينتهي هذا الرمز خلال 10 دقائق.</p>'
                .'<p style="margin:8px 0 0;color:#94a3b8;font-size:12px;text-align:center;">إذا لم تطلب إنشاء هذا الحساب، تجاهل الرسالة.</p>'
                .'<div style="margin-top:20px;padding-top:16px;border-top:1px solid #f1f5f9;text-align:center;">'
                .'<p style="margin:0;color:#94a3b8;font-size:11px;">'.e($storeName).'</p>'
                .'</div>'
                .'</div>'
            );
    }
}
