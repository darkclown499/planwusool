import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/custom-toast';
import { apiGet, apiPut } from '@/utils/api';
import {
  Loader2, ChevronDown, CreditCard, Save, ExternalLink, KeyRound, CheckCircle2,
  Globe2, MapPin, Coins,
} from 'lucide-react';

interface CredentialField {
  key: string;
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
}

interface PaymentMethod {
  method: string;
  label: string;
  enabled: boolean;
  fields: CredentialField[];
}

interface PaymentGroup {
  id: string;
  label: string;
  methods: PaymentMethod[];
}

interface Props {
  store: { id: number; name: string; slug: string };
}

const GROUP_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  palestine: MapPin,
  jordan: MapPin,
  israel: MapPin,
  crypto: Coins,
  global: Globe2,
};

export default function StorePayments({ store }: Props) {
  const [list, setList] = useState<PaymentMethod[]>([]);
  const [groups, setGroups] = useState<PaymentGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>('all');
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
      if (res.groups) setGroups(res.groups);
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

  /* Phase 5: regional group tabs — "الكل" plus every backend group. */
  const visibleList = activeGroup === 'all' ? list : (groups.find((g) => g.id === activeGroup)?.methods || []);
  const enabledCount = list.filter((m) => m.enabled).length;

  const groupTabs = [
    { id: 'all', label: 'الكل' },
    ...groups.map((g) => ({ id: g.id, label: g.label })),
  ];

  return (
    <PageTemplate
      title="طرق الدفع"
      description="اختر طرق الدفع التي تريد قبولها في متجرك"
      url={`/stores/${store.id}/payments`}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'إدارة المتجر', href: route('stores.index') },
        { title: 'طرق الدفع' },
      ]}
    >
      <div className="mx-auto max-w-5xl space-y-4">
        {!loaded ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* Group tabs */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
              {groupTabs.map((t) => {
                const Icon = t.id === 'all' ? CreditCard : GROUP_ICON[t.id] || Globe2;
                const count = t.id === 'all' ? list.length : (groups.find((g) => g.id === t.id)?.methods.length || 0);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveGroup(t.id)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                      activeGroup === t.id
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeGroup === t.id ? 'bg-white/20' : 'bg-white'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
              <span className="mr-auto flex items-center gap-1.5 pl-3 text-[11px] font-bold text-emerald-600">
                {enabledCount > 0 && (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    {enabledCount} مفعلة
                  </>
                )}
              </span>
            </div>

            {visibleList.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                لا توجد طرق دفع في هذه المجموعة.
              </p>
            ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleList.map((m) => {
                const isOpen = !!expanded[m.method];
                const pending = !!pendingToggles[m.method];
                return (
                  <Card
                    key={m.method}
                    className={`transition-all duration-300 ${m.enabled ? 'border-emerald-400 ring-1 ring-emerald-300/60' : ''}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600'}`}>
                            <CreditCard className="h-5 w-5" />
                          </span>
                          <div>
                            <CardTitle className="flex items-center gap-2 text-sm">
                              {m.label}
                              {/* Active badge — green dot + "مفعل" */}
                              {m.enabled && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 ring-1 ring-emerald-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  مفعل
                                </span>
                              )}
                            </CardTitle>
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
                            الإعدادات والتعليمات {m.fields.length > 0 ? `(${m.fields.length})` : ''}
                          </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="space-y-2.5 rounded-xl border border-slate-100 p-3">
                          {m.fields.length === 0 ? (
                            <p className="text-xs text-slate-400">هذه الطريقة لا تتطلب مفاتيح ربط.</p>
                          ) : (
                            m.fields.map((c) => (
                              <div key={c.key}>
                                <label className="mb-1 block text-[11px] font-bold text-slate-500" dir="auto">
                                  {c.label}
                                </label>
                                {c.type === 'textarea' ? (
                                  <Textarea
                                    rows={3}
                                    placeholder={c.value ? 'محفوظ — اكتب للاستبدال' : (c.placeholder || 'اكتب التعليمات التي ستظهر للعميل...')}
                                    value={drafts[m.method]?.[c.key] ?? ''}
                                    onChange={(e) => setDraft(m.method, c.key, e.target.value)}
                                  />
                                ) : (
                                  <Input
                                    dir="ltr"
                                    type={c.type === 'password' ? 'password' : 'text'}
                                    placeholder={c.value ? `المحفوظ: ${c.value}` : (c.placeholder || 'المفتاح')}
                                    value={drafts[m.method]?.[c.key] ?? ''}
                                    onChange={(e) => setDraft(m.method, c.key, e.target.value)}
                                  />
                                )}
                              </div>
                            ))
                          )}
                          <Button
                            type="button"
                            size="sm"
                            className="mt-1 w-full gap-1.5"
                            onClick={() => saveCredentials(m.method)}
                            disabled={savingCreds === m.method}
                          >
                            {savingCreds === m.method ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            حفظ الإعدادات
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            )}

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
                <a href={`/stores/${store.id}/settings`} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-sky-700 hover:underline">
                  إعدادات عامة المتجر
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