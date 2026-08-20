import React, { useCallback, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/custom-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';
import {
  Boxes, Calculator, Webhook, Loader2, Plug, RefreshCw, Trash2, ExternalLink, CheckCircle2, XCircle, Clock3,
} from 'lucide-react';

type Provider = 'odoo' | 'al_shamel' | 'custom';
type Status = 'never' | 'success' | 'failed';

interface ErpConfig {
  id: number;
  provider: Provider;
  name: string | null;
  api_endpoint: string | null;
  api_key?: string | null;
  api_username?: string | null;
  api_password?: string | null;
  sync_settings?: Record<string, boolean>;
  auto_sync_interval: string;
  is_active: boolean;
  last_sync_at?: string | null;
  last_sync_status: Status;
  last_sync_error?: string | null;
}

interface SyncLog {
  id: number;
  provider: string;
  entity_type: string;
  reference: string | null;
  status: string;
  message: string | null;
  synced_at?: string | null;
}

interface Props {
  store: { id: number; name: string; slug: string };
  configs?: ErpConfig[];
  logs?: SyncLog[];
}

const PROVIDER_META: Record<Provider, { name: string; desc: string; icon: React.ComponentType<{ className?: string }>; placeholder: string }> = {
  odoo: {
    name: 'Odoo',
    desc: 'نظام إدارة الأعمال ERP مفتوح المصدر عبر REST / XML-RPC.',
    icon: Boxes,
    placeholder: 'https://your-company.odoo.com',
  },
  al_shamel: {
    name: 'الشامل (Al-Shamel)',
    desc: 'برنامج المحاسبة والمخزون المحلي عبر Webhook و Sync Agent.',
    icon: Calculator,
    placeholder: 'https://agent.al-shamel.com/api/v1',
  },
  custom: {
    name: 'Webhook / JSON API',
    desc: 'أي نظام POS أو نظام جرد مخصص يتحدث JSON عبر Webhook.',
    icon: Webhook,
    placeholder: 'https://api.your-pos.com/hooks',
  },
};

const INTERVALS: Record<string, string> = {
  realtime: 'فوري (Webhook)',
  hourly: 'كل ساعة',
  daily: 'يومياً (Cron)',
};

const EMPTY_FORM = {
  provider: 'custom' as Provider,
  name: '',
  api_endpoint: '',
  api_key: '',
  api_username: '',
  api_password: '',
  auto_sync_interval: 'realtime',
  is_active: true,
  sync_quantity: true,
  sync_prices: true,
  sync_images: true,
  sync_product_details: true,
  sync_orders: false,
};

export default function StoreErp({ store, configs: initialConfigs = [], logs: initialLogs = [] }: Props) {
  const [configs, setConfigs] = useState<ErpConfig[]>(initialConfigs);
  const [logs, setLogs] = useState<SyncLog[]>(initialLogs);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ErpConfig | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const apiUrl = `/api/stores/${store.id}/erp`;

  const refresh = useCallback(async () => {
    const data = await apiGet(apiUrl);
    if (data.configs) setConfigs(data.configs);
    if (data.logs) setLogs(data.logs);
  }, [apiUrl]);

  const openNew = (provider: Provider = 'custom') => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, provider });
    setDialogOpen(true);
  };

  const openEdit = (config: ErpConfig) => {
    setEditing(config);
    setForm({
      provider: config.provider,
      name: config.name || '',
      api_endpoint: config.api_endpoint || '',
      api_key: '',
      api_username: config.api_username || '',
      api_password: '',
      auto_sync_interval: config.auto_sync_interval,
      is_active: config.is_active,
      sync_quantity: config.sync_settings?.sync_quantity ?? true,
      sync_prices: config.sync_settings?.sync_prices ?? true,
      sync_images: config.sync_settings?.sync_images ?? true,
      sync_product_details: config.sync_settings?.sync_product_details ?? true,
      sync_orders: config.sync_settings?.sync_orders ?? false,
    });
    setDialogOpen(true);
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        provider: form.provider,
        name: form.name || null,
        api_endpoint: form.api_endpoint,
        api_key: form.api_key || null,
        api_username: form.api_username || null,
        api_password: form.api_password || null,
        auto_sync_interval: form.auto_sync_interval,
        is_active: form.is_active,
        sync_settings: {
          sync_quantity: form.sync_quantity,
          sync_prices: form.sync_prices,
          sync_images: form.sync_images,
          sync_product_details: form.sync_product_details,
          sync_orders: form.sync_orders,
        },
      };
      if (editing) {
        await apiPut(`${apiUrl}/${editing.id}`, payload);
        toast.success('تم تحديث إعدادات التكامل.');
      } else {
        await apiPost(apiUrl, payload);
        toast.success('تم إضافة التكامل بنجاح.');
      }
      setDialogOpen(false);
      await refresh();
    } catch (err: any) {
      toast.error(err?.data?.error || 'تعذر حفظ التكامل.');
    } finally {
      setBusy(false);
    }
  };

  const testConnection = async (config: ErpConfig) => {
    setTestingId(config.id);
    try {
      const res = await apiPost(`${apiUrl}/${config.id}/test`);
      const r = res.result || {};
      if (r.success) toast.success(r.message || 'تم الاتصال بنجاح');
      else toast.error(r.message || 'فشل الاتصال');
    } catch (e: any) {
      toast.error(e?.data?.message || 'تعذر اختبار الاتصال.');
    } finally {
      setTestingId(null);
    }
  };

  const runSync = async (config: ErpConfig) => {
    setSyncingId(config.id);
    try {
      const res = await apiPost(`${apiUrl}/${config.id}/sync`);
      const r = res.result || {};
      if (r.success) toast.success(`تمت المزامنة: إضافة ${r.imported ?? 0}، تحديث ${r.updated ?? 0}`);
      else toast.error(r.message || 'فشلت المزامنة');
      await refresh();
    } catch (e: any) {
      toast.error(e?.data?.message || 'تعذر تشغيل المزامنة.');
    } finally {
      setSyncingId(null);
    }
  };

  const removeConfig = async (config: ErpConfig) => {
    if (!window.confirm(`حذف تكامل «${PROVIDER_META[config.provider].name}»؟`)) return;
    try {
      await apiDelete(`${apiUrl}/${config.id}`);
      toast.success('تم حذف التكامل.');
      await refresh();
    } catch {
      toast.error('تعذر حذف التكامل.');
    }
  };

  const toggleActive = async (config: ErpConfig, active: boolean) => {
    try {
      await apiPut(`${apiUrl}/${config.id}`, { ...config, is_active: active });
      await refresh();
      toast.success(active ? 'تم تفعيل التكامل' : 'تم إيقاف التكامل');
    } catch {
      toast.error('تعذر تحديث حالة التكامل.');
    }
  };

  const set = (key: keyof typeof form, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <PageTemplate
      title="التكاملات — المحاسبة والمخزون"
      description="اربط متجرك بأنظمة المحاسبة والمخزون وزامن المنتجات والكميات تلقائياً"
      url={`/stores/${store.id}/integrations/erp`}
      backUrl={`/stores/${store.id}/features`}
      action={
        <Button type="button" size="sm" onClick={() => openNew('custom')}>
          <Plug className="h-4 w-4 me-1.5" />
          إضافة تكامل
        </Button>
      }
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Provider cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(PROVIDER_META) as Provider[]).map((provider) => {
            const Icon = PROVIDER_META[provider].icon;
            const cfg = configs.find((c) => c.provider === provider);
            return (
              <Card key={provider} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <Switch checked={!!cfg?.is_active} onCheckedChange={(v) => cfg && toggleActive(cfg, v)} />
                  </div>
                  <CardTitle className="mt-3 text-base">{PROVIDER_META[provider].name}</CardTitle>
                  <CardDescription>{PROVIDER_META[provider].desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex items-center gap-2 text-xs">
                    {cfg ? (
                      cfg.last_sync_status === 'success' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> متصل
                        </span>
                      ) : cfg.last_sync_status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-600">
                          <XCircle className="h-3 w-3" /> فشل المزامنة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-500">
                          <Clock3 className="h-3 w-3" /> لم تتم المزامنة بعد
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">لم يتم الإعداد بعد</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cfg ? (
                      <>
                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(cfg)}>
                          <Plug className="h-3.5 w-3.5" /> إعداد
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => testConnection(cfg)} disabled={testingId === cfg.id}>
                          {testingId === cfg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          اختبار الاتصال
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => runSync(cfg)} disabled={syncingId === cfg.id}>
                          {syncingId === cfg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          مزامنة الآن
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-red-500" onClick={() => removeConfig(cfg)}>
                          <Trash2 className="h-3.5 w-3.5" /> حذف
                        </Button>
                      </>
                    ) : (
                      <Button type="button" size="sm" className="gap-1.5" onClick={() => openNew(provider)}>
                        <Plug className="h-3.5 w-3.5" /> إعداد
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sync log table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">سجل المزامنة</CardTitle>
            <CardDescription>آخر عمليات المزامنة بين المتجر وأنظمة المحاسبة.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">لا توجد عمليات مزامنة بعد.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-start text-xs text-slate-400">
                    <th className="px-3 py-2 text-start font-bold">الوقت</th>
                    <th className="px-3 py-2 text-start font-bold">النظام</th>
                    <th className="px-3 py-2 text-start font-bold">النوع</th>
                    <th className="px-3 py-2 text-start font-bold">المرجع</th>
                    <th className="px-3 py-2 text-start font-bold">الحالة</th>
                    <th className="px-3 py-2 text-start font-bold">الرسالة</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">
                        {log.synced_at ? new Date(log.synced_at).toLocaleString('ar') : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-semibold capitalize">{log.provider}</td>
                      <td className="px-3 py-2.5">{log.entity_type === 'stock' ? 'كمية' : 'منتج'}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{log.reference || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {log.status === 'success' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {log.status === 'success' ? 'نجاح' : 'فشل'}
                        </span>
                      </td>
                      <td className="max-w-[260px] truncate px-3 py-2.5 text-xs text-slate-500">{log.message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Webhook example card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">نقاط الالتقاط (Endpoints)</CardTitle>
            <CardDescription>استخدم هذه الروابط من نظامك الخارجي لإرسال البيانات.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700">إرسال المنتجات:</span>
              <code className="rounded bg-slate-100 px-2 py-1 text-xs" dir="ltr">POST {window.location.origin}/api/v1/store/sync/products</code>
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700">تحديث الكميات:</span>
              <code className="rounded bg-slate-100 px-2 py-1 text-xs" dir="ltr">POST {window.location.origin}/api/v1/store/sync/stock</code>
            </p>
            <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              أضف الهيدر <code className="rounded bg-white px-1.5 py-0.5 font-bold" dir="ltr">X-Store-Id</code> و
              <code className="rounded bg-white px-1.5 py-0.5 font-bold" dir="ltr">X-API-Key</code> (مفتاح التكامل) مع كل طلب.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Config dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل التكامل' : 'إضافة تكامل'}</DialogTitle>
            <DialogDescription>{editing ? PROVIDER_META[editing.provider].name : 'اختر النظام الذي تريد ربطه.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveConfig} className="space-y-4">
            <div className="space-y-2">
              <Label>النظام</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PROVIDER_META) as Provider[]).map((p) => {
                  const Icon = PROVIDER_META[p].icon;
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => set('provider', p)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${form.provider === p ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}
                    >
                      <Icon className="h-5 w-5 text-indigo-600" />
                      <span className="text-[11px] font-bold text-slate-700">{PROVIDER_META[p].name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>اسم التكامل (اختياري)</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="مثال: مخزون الفرع الرئيسي" />
            </div>

            <div className="space-y-2">
              <Label>الرابط (API Endpoint) *</Label>
              <Input dir="ltr" required value={form.api_endpoint} onChange={(e) => set('api_endpoint', e.target.value)} placeholder={PROVIDER_META[form.provider].placeholder} />
            </div>

            <div className="space-y-2">
              <Label>{editing ? 'مفتاح API (اتركه فارغاً للإبقاء على الحالي)' : 'مفتاح API / Token *'}</Label>
              <Input dir="ltr" required={!editing} value={form.api_key} onChange={(e) => set('api_key', e.target.value)} placeholder="••••••••••••" />
            </div>

            {form.provider === 'odoo' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>اسم المستخدم (اختياري)</Label>
                  <Input value={form.api_username} onChange={(e) => set('api_username', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور (اختياري)</Label>
                  <Input type="password" value={form.api_password} onChange={(e) => set('api_password', e.target.value)} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>فاصل المزامنة التلقائية</Label>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(INTERVALS).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set('auto_sync_interval', k)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${form.auto_sync_interval === k ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}
                  >
                    {INTERVALS[k]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <Label className="mb-1 block">ماذا تتم مزامنته</Label>
              {(
                [
                  ['sync_quantity', 'الكميات (المخزون)'],
                  ['sync_prices', 'الأسعار'],
                  ['sync_images', 'الصور'],
                  ['sync_product_details', 'تفاصيل المنتجات'],
                  ['sync_orders', 'الطلبات (تصدير إلى النظام الخارجي)'],
                ] as Array<[keyof typeof form, string]>
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-xs font-semibold text-slate-600">{label}</span>
                  <Switch checked={!!form[key]} onCheckedChange={(v) => set(key, v)} />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
              <div>
                <p className="text-sm font-bold text-slate-700">تفعيل التكامل</p>
                <p className="text-xs text-slate-400">يستقبل البيانات من النظام الخارجي فوراً.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
                إلغاء
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
                {editing ? 'حفظ التغييرات' : 'إضافة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}