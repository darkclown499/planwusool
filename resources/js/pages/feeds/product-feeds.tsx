import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  CheckCircle2, Copy, ExternalLink, Info, Link2, FileText,
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

const REASON_LABELS: Record<string, string> = {
  not_published: 'غير منشور',
  missing_title: 'العنوان مفقود',
  invalid_price: 'السعر غير صالح',
  missing_image: 'صورة المنتج مفقودة',
};

export default function ProductFeedsPage({
  store,
  googleFeedUrl,
  csvFeedUrl,
  stats,
}: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      toast.success(t('تم نسخ الرابط'));
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error(t('تعذّر نسخ الرابط'));
    }
  };

  const googleSteps = [
    ' افتح Google Merchant Center',
    ' أضف مصدر منتجات جديد',
    ' اختر المصدر عبر رابط URL / scheduled fetch حسب ما يتوفر',
    ' الصق رابط خلاصة وصول',
    ' راجع المنتجات والأخطاء داخل Google',
  ];

  return (
    <PageTemplate
      title="خلاصات المنتجات"
      description="اربط خلاصات منتجات متجرك مع Google Merchant Center لفهرسة منتجاتك"
      url="/product-feeds"
      actions={[]}
      stickyHeader
      backUrl={route('dashboard')}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'التسويق', href: route('coupon-system.index') },
        { title: 'خلاصات المنتجات' },
      ]}
    >
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{t('انسخ رابط الخلاصة وأضفه كمصدر بيانات في Google Merchant Center.')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base">Google Merchant Center</CardTitle>
            </div>
            <CardDescription className="leading-relaxed">
              خلاصة منتجات بتنسيق XML متوافقة مع Google Merchant Center.
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
                  <Copy className="h-4 w-4" /> نسخ الرابط
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-base">خلاصة CSV عامة</CardTitle>
            </div>
            <CardDescription className="leading-relaxed">
              نسخة CSV من نفس الخلاصة لعمليات التكامل العامة.
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
                  <Copy className="h-4 w-4" /> نسخ الرابط
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">التحقق من الخلاصة</CardTitle>
            <CardDescription>
              التحقق من أهلية المنتج في Wusool — وليس اعتماد Google.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
              <span className="text-emerald-800">المنتجات المؤهلة</span>
              <span className="text-lg font-bold text-emerald-700">{stats.eligible_items}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-gray-700">المنتجات المستبعدة</span>
              <span className="text-lg font-bold text-gray-600">{stats.excluded_products}</span>
            </div>
            {stats.excluded_products > 0 && (
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {Object.entries(stats.reasons)
                  .filter(([, n]) => (n as number) > 0)
                  .map(([key, n]) => (
                    <li key={key} className="flex items-center justify-between">
                      <span>{REASON_LABELS[key] || key}</span>
                      <span className="font-semibold">{n}</span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">خطوات ربط Google Merchant Center</CardTitle>
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
            <a
              href="https://support.google.com/merchants/answer/3255924"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> دليل Google Merchant Center
            </a>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
