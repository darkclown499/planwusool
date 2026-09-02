import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  CheckCircle2, Copy, ExternalLink, Info, Link2, FileText, ShieldAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';

interface Props {
  store: any;
  googleFeedUrl: string;
  csvFeedUrl: string;
  stats: {
    eligible_items: number;
    excluded_products: number;
    reasons: Record<string, number>;
  };
}

// Merchant-friendly labels for Wusool feed-eligibility diagnostics. Only the
// reason codes the backend actually exposes are mapped here. These are Wusool's
// own readiness checks — NOT Google approval/rejection feedback.
const REASON_LABELS: Record<string, string> = {
  missing_image: 'الصورة غير موجودة',
  invalid_price: 'السعر غير صالح',
  missing_title: 'اسم المنتج غير مكتمل',
  not_published: 'المنتج غير متاح',
};

const GOOGLE_MERCHANT_CENTER_URL = 'https://merchants.google.com/';

export default function ProductFeedsPage({
  store,
  googleFeedUrl,
  csvFeedUrl,
  stats,
}: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);

  // Wrap the modern Clipboard API with a graceful fallback so copy still works
  // in browsers/contexts where navigator.clipboard is unavailable (e.g. non-secure
  // contexts). Always surfaces visible Arabic feedback.
  const copy = async (url: string, key: string) => {
    const handleSuccess = () => {
      setCopied(key);
      toast.success(t('تم نسخ الرابط'));
      setTimeout(() => setCopied(null), 2000);
    };
    const handleFailure = () => toast.error(t('تعذّر نسخ الرابط'));

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        handleSuccess();
        return;
      }
      // Fallback for non-secure contexts / older browsers.
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) {
        handleSuccess();
      } else {
        handleFailure();
      }
    } catch {
      handleFailure();
    }
  };

  const googleSteps = [
    ' افتح Google Merchant Center',
    ' أضف مصدر منتجات جديد',
    ' اختر الربط باستخدام رابط / URL إذا كان متاحًا',
    ' انسخ رابط المنتجات من وصول',
    ' الصق الرابط داخل Google Merchant Center',
    ' تابع حالة المنتجات من حسابك في Google',
  ];

  const hasNotReady = stats.excluded_products > 0;
  const visibleReasons = Object.entries(stats.reasons).filter(([, n]) => (n as number) > 0);

  return (
    <PageTemplate
      title="ربط منتجات متجرك مع Google"
      description="أرسل بيانات منتجات متجرك إلى Google Merchant Center لتعرضها في خدماته"
      url="/product-feeds"
      actions={[]}
      stickyHeader
      backUrl={route('dashboard')}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'التسويق', href: route('coupon-system.index') },
        { title: 'ربط المنتجات مع Google' },
      ]}
    >
      {/* Simple merchant introduction */}
      <div className="mb-4 space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-800">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            تساعدك هذه الصفحة على إرسال منتجات متجرك إلى Google Merchant Center
            حتى يتمكن Google من قراءة معلومات المنتجات مثل الاسم والسعر والمخزون والصورة.
          </p>
        </div>
        <p className="ps-6 text-xs text-blue-700">
          القبول النهائي للمنتجات يتم من Google، وليس من وصول.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Google feed card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base">رابط المنتجات لـ Google</CardTitle>
            </div>
            <CardDescription className="leading-relaxed">
              انسخ هذا الرابط وأضفه كمصدر منتجات داخل Google Merchant Center.
              <span className="mt-1 block text-xs text-muted-foreground">الصيغة: XML</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div dir="ltr" className="break-all rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800">
              {googleFeedUrl}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => copy(googleFeedUrl, 'google')}
              className="w-full"
            >
              {copied === 'google' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> {t('تم النسخ')}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> نسخ رابط Google
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* CSV card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-base">رابط المنتجات بصيغة CSV</CardTitle>
            </div>
            <CardDescription className="leading-relaxed">
              يمكن استخدام هذا الرابط لتصدير بيانات المنتجات أو ربطها مع أدوات أخرى تدعم CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div dir="ltr" className="break-all rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800">
              {csvFeedUrl}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => copy(csvFeedUrl, 'csv')}
              className="w-full"
            >
              {copied === 'csv' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> {t('تم النسخ')}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> نسخ رابط CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Readiness */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">حالة جاهزية المنتجات</CardTitle>
            <CardDescription className="leading-relaxed">
              هذه النتيجة تعني أن وصول وجد البيانات الأساسية المطلوبة.
              Google قد يطلب شروطًا إضافية عند المراجعة.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
              <span className="text-emerald-800">المنتجات الجاهزة للإرسال إلى Google</span>
              <span className="text-lg font-bold text-emerald-700">{stats.eligible_items}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-gray-700">منتجات تحتاج إلى تعديل</span>
              <span className="text-lg font-bold text-gray-600">{stats.excluded_products}</span>
            </div>

            {hasNotReady ? (
              visibleReasons.length > 0 ? (
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {visibleReasons.map(([key, n]) => (
                    <li key={key} className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                        {REASON_LABELS[key] || key}
                      </span>
                      <span className="font-semibold">{n}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pt-2 text-xs text-muted-foreground">
                  بعض المنتجات تحتاج إلى مراجعة قبل إرسالها إلى Google.
                </p>
              )
            ) : null}
          </CardContent>
        </Card>

        {/* Setup steps */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">كيف تربط متجرك مع Google؟</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {googleSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">
              يمكنك اختيار أن يقوم Google بقراءة الرابط بشكل دوري.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => window.open(GOOGLE_MERCHANT_CENTER_URL, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4" /> فتح Google Merchant Center
            </Button>
            <a
              href="https://support.google.com/merchants/answer/3255924"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            >
              دليل Google Merchant Center
            </a>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
