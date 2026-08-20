import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/custom-toast';
import { apiGet, apiPut } from '@/utils/api';
import {
  Loader2, ChevronDown, CreditCard, Save, ExternalLink, KeyRound, CheckCircle2,
} from 'lucide-react';

interface Credential {
  key: string;
  label: string;
  value: string;
}

interface PaymentMethod {
  method: string;
  label: string;
  enabled: boolean;
  credentials: Credential[];
}

interface Props {
  store: { id: number; name: string; slug: string };
}

export default function StorePayments({ store }: Props) {
  const [list, setList] = useState<PaymentMethod[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});
  const [savingCreds, setSavingCreds] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const apiUrl = `/api/stores/${store.id}/payments`;

  const load = useCallback(async () => {
    try {
      const res = await apiGet(apiUrl);
      if (res.methods) setList(res.methods);
      setLoaded(true);
    } catch {
      toast.error('تعذر تحميل إعدادات الدفع.');
    }
  }, [apiUrl]);

  useEffect(() => {
    load();
    const timersRef = timers.current;
    return () => {
      Object.values(timersRef).forEach((t) => clearTimeout(t));
    };
  }, [load]);

  const persistToggle = async (method: string, enabled: boolean) => {
    try {
      await apiPut(apiUrl, { method, enabled });
      toast.success('تم الحفظ بنجاح');
    } catch {
      toast.error('تعذر حفظ الحالة. حاول مرة أخرى.');
    } finally {
      setPendingToggles((p) => ({ ...p, [method]: false }));
    }
  };

  // Debounced toggle: rapid switches only fire the latest value.
  const onToggle = (method: string, enabled: boolean) => {
    setList((prev) => prev.map((m) => (m.method === method ? { ...m, enabled } : m)));
    setPendingToggles((p) => ({ ...p, [method]: true }));
    if (timers.current[method]) clearTimeout(timers.current[method]);
    timers.current[method] = setTimeout(() => persistToggle(method, enabled), 400);
  };

  const saveCredentials = async (method: string) => {
    const config = drafts[method] || {};
    const payload: Record<string, string> = {};
    Object.entries(config).forEach(([k, v]) => {
      if (v && v.trim() !== '') payload[k] = v.trim();
    });
    if (Object.keys(payload).length === 0) {
      toast.error('أدخل قيمة واحدة على الأقل لحفظها (القيم الفارغة تُتجاهل).');
      return;
    }
    setSavingCreds(method);
    try {
      const res = await apiPut(apiUrl, { method, config: payload });
      if (res.methods) setList(res.methods);
      setDrafts((d) => ({ ...d, [method]: {} }));
      toast.success('تم الحفظ بنجاح');
    } catch {
      toast.error('تعذر حفظ الإعدادات. حاول مرة أخرى.');
    } finally {
      setSavingCreds(null);
    }
  };

  const setDraft = (method: string, key: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [method]: { ...(prev[method] || {}), [key]: value } }));

  return (
    <PageTemplate
      title="إعدادات الدفع"
      description="بوابات التحصيل ومفاتيح الربط في مكان واحد — فعّل البوابة وضَع مفاتيحها من هنا"
      url={`/stores/${store.id}/payments`}
      backUrl={`/stores/${store.id}/settings`}
    >
      <div className="mx-auto max-w-5xl space-y-4">
        {!loaded ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((m) => {
                const isOpen = !!expanded[m.method];
                const pending = !!pendingToggles[m.method];
                return (
                  <Card key={m.method}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <CreditCard className="h-5 w-5" />
                          </span>
                          <div>
                            <CardTitle className="text-sm">{m.label}</CardTitle>
                            <CardDescription className="capitalize" dir="ltr">{m.method}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pending && <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />}
                          <Switch
                            checked={m.enabled}
                            disabled={pending}
                            onCheckedChange={(v) => onToggle(m.method, v)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setExpanded((e) => ({ ...e, [m.method]: !isOpen }))}
                        className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                      >
                        <span className="flex items-center gap-1.5">
                          <KeyRound className="h-3.5 w-3.5" />
                          مفاتيح الربط {m.credentials.length > 0 ? `(${m.credentials.length})` : ''}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="space-y-2.5 rounded-xl border border-slate-100 p-3">
                          {m.credentials.length === 0 ? (
                            <p className="text-xs text-slate-400">لا توجد مفاتيح محفوظة بعد — أضفها أدناه.</p>
                          ) : (
                            m.credentials.map((c) => (
                              <div key={c.key}>
                                <label className="mb-1 block text-[11px] font-bold text-slate-500" dir="ltr">
                                  {c.label}
                                </label>
                                <Input
                                  dir="ltr"
                                  placeholder={c.value ? `المحفوظ: ${c.value}` : 'المفتاح'}
                                  value={drafts[m.method]?.[c.key] ?? ''}
                                  onChange={(e) => setDraft(m.method, c.key, e.target.value)}
                                />
                              </div>
                            ))
                          )}
                          {m.credentials.length === 0 && (
                            <p className="text-xs text-slate-400">أضف مفتاحاً للبوابة من الشكل أدناه عند توفره.</p>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            className="mt-1 w-full gap-1.5"
                            onClick={() => saveCredentials(m.method)}
                            disabled={savingCreds === m.method}
                          >
                            {savingCreds === m.method ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            حفظ المفاتيح
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-sky-100 bg-sky-50/50">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">ملاحظة</p>
                    <p className="text-xs text-slate-500">
                      هذه هي المكان الوحيد لإعداد بوابات الدفع. اترك حقل المفتاح فارغاً للإبقاء على القيمة الحالية، وستُشفر المفاتيح الحساسة تلقائياً.
                    </p>
                  </div>
                </div>
                <a href="/settings" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-sky-700 hover:underline">
                  إعدادات عامة إضافية
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTemplate>
  );
}