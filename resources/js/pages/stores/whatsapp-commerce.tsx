import React, { useEffect, useMemo, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Save, Loader2, Info, MessageCircle, MessageSquareText, ClipboardList, Smartphone, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';

interface TemplateRow {
  key: string;
  locale: string;
  label: string;
  body: string;
}

interface Props {
  store: any;
  settings: {
    enabled: boolean;
    customer_actions_enabled: boolean;
    product_share_enabled: boolean;
    store_phone: string | null;
  };
  templates: TemplateRow[];
  placeholders: string[];
  templateKeys: { key: string; label: { ar: string; en: string } }[];
}

const EXAMPLE_CONTEXT: Record<string, string> = {
  store_name: 'متجري',
  customer_name: 'أحمد',
  order_number: '100234',
  order_total: '250.00',
  order_status: 'مؤكد',
  order_date: '02/09/2026 14:30',
  currency: '₪',
  store_url: 'https://mystore.wusool.com',
  cart_total: '180.00',
  cart_items: '• منتج أ × 2\n• منتج ب × 1',
  recover_url: 'https://mystore.wusool.com/cart/recover/abc',
  product_name: 'منتج تجريبي',
  product_price: '99.00 ₪',
  product_url: 'https://mystore.wusool.com/product/demo',
};

export default function WhatsAppCommercePage({ store, settings, templates, placeholders, templateKeys }: Props) {
  const { t } = useTranslation();

  const [enabled, setEnabled] = useState(settings?.enabled ?? true);
  const [customerActions, setCustomerActions] = useState(settings?.customer_actions_enabled ?? true);
  const [productShare, setProductShare] = useState(settings?.product_share_enabled ?? true);
  const [bodies, setBodies] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    (templates || []).forEach((tpl) => {
      const key = `${tpl.key}__${tpl.locale}`;
      next[key] = tpl.body ?? '';
    });
    return next;
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    (templates || []).forEach((tpl) => {
      next[`${tpl.key}__${tpl.locale}`] = tpl.body ?? '';
    });
    setBodies(next);
    setEnabled(settings?.enabled ?? true);
    setCustomerActions(settings?.customer_actions_enabled ?? true);
    setProductShare(settings?.product_share_enabled ?? true);
    setDirty(false);
  }, [settings?.enabled, settings?.customer_actions_enabled, settings?.product_share_enabled, templates]);

  const preview = (tpl: TemplateRow) => {
    let out = bodies[`${tpl.key}__${tpl.locale}`] ?? tpl.body ?? '';
    (placeholders || []).forEach((ph) => {
      if (ph in EXAMPLE_CONTEXT) {
        out = out.split(`{${ph}}`).join(EXAMPLE_CONTEXT[ph]);
      }
    });
    return out;
  };

  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    const templatePayload = (templates || []).map((tpl) => ({
      key: tpl.key,
      locale: tpl.locale,
      body: bodies[`${tpl.key}__${tpl.locale}`] ?? tpl.body ?? '',
    }));
    router.put(
      route('stores.whatsapp-commerce.update', store.id),
      {
        enabled,
        customer_actions_enabled: customerActions,
        product_share_enabled: productShare,
        templates: templatePayload,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(t('Changes saved successfully'));
          setDirty(false);
        },
        onError: () => {
          toast.error(t('Error saving changes'));
        },
        onFinish: () => setSaving(false),
      },
    );
  };

  const pageActions = [
    {
      label: saving ? t('Saving...') : t('Save Changes'),
      icon: saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: handleSave,
      disabled: saving || !dirty,
    },
  ];

  const orderKeys = templateKeys || [];
  const groupedRows: Record<string, TemplateRow[]> = {};
  (templates || []).forEach((tpl) => {
    if (!groupedRows[tpl.key]) groupedRows[tpl.key] = [];
    groupedRows[tpl.key].push(tpl);
  });

  return (
    <PageTemplate
      title={t('WhatsApp Commerce')}
      description="رسائل واتساب بروابط مباشرة (wa.me) — بدون إرسال تلقائي"
      url={`/stores/${store.id}/whatsapp-commerce`}
      actions={pageActions}
      stickyHeader
      backUrl={route('stores.index')}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'إدارة المتجر', href: route('stores.index') },
        { title: t('WhatsApp Commerce') },
      ]}
    >
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{t('WhatsApp messages your team sends are deep links to the WhatsApp app — nothing is sent automatically, no messaging API is used.')}</p>
      </div>

      <div className="grid gap-4">
        {/* Feature toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="h-4 w-4" />
              {t('Feature')}
            </CardTitle>
            <CardDescription className="leading-relaxed">تفعيل أدوات واتساب التجارية لروابط الدفع والمتابعة.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold">تفعيل واتساب التجاري</p>
                  <p className="text-xs text-muted-foreground">إظهار إجراءات واتساب في الطلبات والعملاء.</p>
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); setDirty(true); }} />
            </div>
            {enabled && (
              <>
                <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
                  <div className="flex items-start gap-3">
                    <ClipboardList className="mt-0.5 h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold">{t('Order Actions')}</p>
                      <p className="text-xs text-muted-foreground">أزرار تحديث حالة الطلب عبر واتساب في صفحة الطلب.</p>
                    </div>
                  </div>
                  <Switch checked={customerActions} onCheckedChange={(v) => { setCustomerActions(v); setDirty(true); }} />
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold">{t('Product Share Button')}</p>
                      <p className="text-xs text-muted-foreground">زر مشاركة المنتج عبر واتساب في واجهات المتجر.</p>
                    </div>
                  </div>
                  <Switch checked={productShare} onCheckedChange={(v) => { setProductShare(v); setDirty(true); }} />
                </div>
              </>
            )}
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{t('Store WhatsApp Number')}:</span>
              {settings?.store_phone ? (
                <Badge variant="secondary" className="font-mono" dir="ltr">+{settings.store_phone}</Badge>
              ) : (
                <span className="text-xs text-amber-700">لم يُحدد الرقم بعد — أضف رقم الواتساب في إعدادات الدفع</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              {t('Message Template')} (8)
            </CardTitle>
            <CardDescription className="leading-relaxed">
              عدّل الرسائل الافتراضية. تُستخدم البدائل فقط عند وجودها في الرسالة، ويترك أي بديل غير مألوف كما هو دون حذف.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={orderKeys[0]?.key || 'order_received'}>
              <TabsList className="flex flex-wrap h-auto">
                {orderKeys.map((k) => (
                  <TabsTrigger key={k.key} value={k.key}>
                    {k.label?.ar || k.key}
                  </TabsTrigger>
                ))}
              </TabsList>
              {orderKeys.map((k) => {
                const rows = groupedRows[k.key] || [];
                return (
                  <TabsContent key={k.key} value={k.key} className="space-y-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(placeholders || []).map((ph) => (
                        <Badge key={ph} variant="outline" className="font-mono text-[11px]">&#123;{ph}&#125;</Badge>
                      ))}
                    </div>
                    {rows.map((row) => (
                      <div key={`${row.key}__${row.locale}`}>
                        <Label htmlFor={`${row.key}__${row.locale}`} className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                          {row.locale === 'ar' ? t('Arabic') : t('English')}
                        </Label>
                        <Textarea
                          id={`${row.key}__${row.locale}`}
                          dir={row.locale === 'ar' ? 'rtl' : 'ltr'}
                          value={bodies[`${row.key}__${row.locale}`] ?? ''}
                          disabled={saving || !enabled}
                          rows={4}
                          onChange={(e) => {
                            setBodies((prev) => ({ ...prev, [`${row.key}__${row.locale}`]: e.target.value }));
                            setDirty(true);
                          }}
                        />
                        <div className="mt-1.5 rounded-lg border border-emerald-100 bg-emerald-50 p-2.5">
                          <p className="mb-1 text-[11px] font-bold text-emerald-700">{t('Live Preview')}</p>
                          <pre dir={row.locale === 'ar' ? 'rtl' : 'ltr'} className="whitespace-pre-wrap break-words text-xs leading-relaxed text-emerald-900">
                            {preview(row) || '—'}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}