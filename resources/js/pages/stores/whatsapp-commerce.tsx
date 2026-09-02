import React, { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Save, Loader2, Info, MessageCircle, MessageSquareText, ClipboardList, Smartphone, Users, CheckCircle2, AlertTriangle, ExternalLink, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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

interface StoreMeta {
  id: number;
}

interface Props {
  store: StoreMeta;
  settings: {
    enabled: boolean;
    customer_actions_enabled: boolean;
    product_share_enabled: boolean;
    store_phone: string | null;
    store_phone_raw: string | null;
    store_phone_configured: boolean;
    store_name: string | null;
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

// Merchant-friendly descriptions for the common placeholders.
const PLACEHOLDER_HELP: Record<string, string> = {
  customer_name: 'اسم العميل',
  order_number: 'رقم الطلب',
  order_total: 'إجمالي الطلب',
  currency: 'العملة',
  store_name: 'اسم المتجر',
  product_name: 'اسم المنتج',
  product_url: 'رابط المنتج',
  order_status: 'حالة الطلب',
  order_date: 'تاريخ الطلب',
  store_url: 'رابط المتجر',
  cart_total: 'إجمالي السلة المتروكة',
  cart_items: 'منتجات السلة المتروكة',
  recover_url: 'رابط إكمال الطلب',
  product_price: 'سعر المنتج',
};

const SETUP_STEPS = [
  'أضف رقم واتساب المتجر.',
  'اختر أين تريد ظهور زر واتساب.',
  'عدّل الرسائل إذا أردت.',
  'جرّب الميزة للتأكد أن الرقم يعمل.',
];

export default function WhatsAppCommercePage({ store, settings, templates, placeholders, templateKeys }: Props) {
  const { t } = useTranslation();

  const [enabled, setEnabled] = useState(settings?.enabled ?? true);
  const [customerActions, setCustomerActions] = useState(settings?.customer_actions_enabled ?? true);
  const [productShare, setProductShare] = useState(settings?.product_share_enabled ?? true);
  const [phoneInput, setPhoneInput] = useState(settings?.store_phone_raw ?? '');
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
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const configured = !!settings?.store_phone_configured;

  useEffect(() => {
    const next: Record<string, string> = {};
    (templates || []).forEach((tpl) => {
      next[`${tpl.key}__${tpl.locale}`] = tpl.body ?? '';
    });
    setBodies(next);
    setEnabled(settings?.enabled ?? true);
    setCustomerActions(settings?.customer_actions_enabled ?? true);
    setProductShare(settings?.product_share_enabled ?? true);
    setPhoneInput(settings?.store_phone_raw ?? '');
    setDirty(false);
  }, [settings?.enabled, settings?.customer_actions_enabled, settings?.product_share_enabled, settings?.store_phone_raw, templates]);

  const preview = (tpl: TemplateRow) => {
    let out = bodies[`${tpl.key}__${tpl.locale}`] ?? tpl.body ?? '';
    (placeholders || []).forEach((ph) => {
      if (ph in EXAMPLE_CONTEXT) {
        out = out.split(`{${ph}}`).join(EXAMPLE_CONTEXT[ph]);
      }
    });
    return out;
  };

  // Build the wa.me test link using the canonical store number (digits only).
  // Only a normal deep link — no automatic sending, no API.
  const openTestLink = () => {
    if (!configured || !settings?.store_phone) {
      setTestMsg('أضف رقم واتساب أولاً.');
      return;
    }
    const storeName = settings?.store_name || store?.name || '';
    const message = storeName
      ? `مرحبًا، هذه رسالة تجريبية من ${storeName} عبر وصول.`
      : 'مرحبًا، هذه رسالة تجريبية عبر وصول.';
    const url = `https://wa.me/${settings.store_phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setTestMsg(null);
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
        store_phone: phoneInput,
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
      title="التواصل مع العملاء عبر واتساب"
      description="WhatsApp Commerce — رسائل واتساب بروابط مباشرة (wa.me) — بدون إرسال تلقائي"
      url={`/stores/${store.id}/whatsapp-commerce`}
      actions={pageActions}
      stickyHeader
      backUrl={route('stores.index')}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'إدارة المتجر', href: route('stores.index') },
        { title: 'التواصل مع العملاء عبر واتساب' },
      ]}
    >
      <div dir="rtl" className="space-y-4">
        {/* Explanatory alert — honest, no automatic sending */}
        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            عند استخدام زر واتساب، يفتح وصول محادثة واتساب برسالة جاهزة.
            لن يتم إرسال أي رسالة تلقائيًا.
          </p>
        </div>

        {/* Setup guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              كيف تعمل الميزة؟
            </CardTitle>
            <CardDescription className="leading-relaxed">
              استخدم واتساب للتواصل مع العملاء برسائل جاهزة من الطلبات والمنتجات.
              لا يتم إرسال الرسائل تلقائيًا.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="mb-2 flex flex-col gap-2 text-sm text-muted-foreground">
              {SETUP_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* WhatsApp number card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4 text-emerald-600" />
              رقم واتساب المتجر
            </CardTitle>
            <CardDescription className="leading-relaxed">
              الرقم الذي ستُفتح عليه محادثة واتساب. مثال: +970591234567 أو +972591234567.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Configuration status */}
            {configured ? (
              <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                <div className="text-sm">
                  <p className="font-semibold text-green-800">واتساب جاهز للاستخدام</p>
                  <p className="text-xs text-green-700" dir="ltr">
                    +{settings?.store_phone || ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">أضف رقم واتساب لتفعيل الميزة</p>
              </div>
            )}

            <div>
              <Label htmlFor="store-phone" className="mb-1.5 block text-sm font-semibold">
                رقم واتساب المتجر
              </Label>
              <Input
                id="store-phone"
                dir="ltr"
                className="text-left"
                placeholder="+970591234567"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  setDirty(true);
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                يمكنك استخدام الأرقام المحلية مثل 0591234567 أو الدولية +970 / +972.
              </p>
            </div>

            {/* Test WhatsApp action */}
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" onClick={openTestLink} className="gap-2 w-full sm:w-auto">
                <ExternalLink className="h-4 w-4" />
                فتح رسالة تجريبية في واتساب
              </Button>
              {testMsg && <p className="text-sm text-red-600">{testMsg}</p>}
              {configured && (
                <p className="text-xs text-muted-foreground">
                  يفتح واتساب برسالة جاهزة لاختبار الرقم — لن تُرسل الرسالة تلقائيًا.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feature toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="h-4 w-4" />
              تفعيل التواصل عبر واتساب
            </CardTitle>
            <CardDescription className="leading-relaxed">
              تتحكم في الأماكن التي يظهر فيها زر واتساب ضمن متجرك وطلباتك.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold">تفعيل التواصل عبر واتساب</p>
                  <p className="text-xs text-muted-foreground">
                    تشغيل أو إيقاف أزرار واتساب في متجرك.
                  </p>
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
                      <p className="text-sm font-semibold">التواصل مع العميل من الطلبات</p>
                      <p className="text-xs text-muted-foreground">
                        يظهر زر واتساب في الطلب لتتمكن من التواصل مع العميل برسالة جاهزة.
                      </p>
                    </div>
                  </div>
                  <Switch checked={customerActions} onCheckedChange={(v) => { setCustomerActions(v); setDirty(true); }} />
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold">مشاركة المنتجات عبر واتساب</p>
                      <p className="text-xs text-muted-foreground">
                        يظهر زر لمشاركة رابط المنتج عبر واتساب.
                      </p>
                    </div>
                  </div>
                  <Switch checked={productShare} onCheckedChange={(v) => { setProductShare(v); setDirty(true); }} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Message templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              رسائل واتساب الجاهزة ({orderKeys.length})
            </CardTitle>
            <CardDescription className="leading-relaxed">
              عدّل الرسائل الجاهزة التي تظهر للعميل عند فتح واتساب. لا تُرسل تلقائيًا.
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
                    {/* Placeholder help */}
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="mb-2 text-xs font-bold text-muted-foreground">
                        متغيرات الرسالة (معلومات تلقائية)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(placeholders || []).map((ph) => (
                          <span
                            key={ph}
                            dir="rtl"
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-1.5 py-0.5 text-[11px]"
                          >
                            <code className="font-mono text-emerald-700">&#123;{ph}&#125;</code>
                            {PLACEHOLDER_HELP[ph] && (
                              <span className="text-muted-foreground">= {PLACEHOLDER_HELP[ph]}</span>
                            )}
                          </span>
                        ))}
                      </div>
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
                          <p className="mb-1 text-[11px] font-bold text-emerald-700">معاينة الرسالة</p>
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
