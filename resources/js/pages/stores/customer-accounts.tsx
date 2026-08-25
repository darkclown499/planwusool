import React, { useState, useRef, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/custom-toast';
import { apiPut, apiGet } from '@/utils/api';
import { Loader2, Users, LogIn, UserPlus, ShoppingBag, ShieldCheck } from 'lucide-react';

interface FeatureItem {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  locked: boolean;
  lockReason: string;
}

interface Props {
  store: { id: number; name: string; slug: string };
}

const CUSTOMER_KEYS = ['customer_accounts_enabled', 'show_auth_button', 'guest_checkout'];

const KEY_META: Record<string, { icon: any; label: string; desc: string }> = {
  customer_accounts_enabled: { icon: Users, label: 'حسابات العملاء', desc: 'تفعيل نظام حسابات العملاء بالكامل — عند الإيقاف يختفي زر الدخول ويمنع التسجيل.' },
  show_auth_button: { icon: LogIn, label: 'زر تسجيل الدخول', desc: 'إظهار زر تسجيل الدخول/الحساب في واجهة المتجر.' },
  guest_checkout: { icon: ShoppingBag, label: 'الدفع كزائر', desc: 'السماح بإتمام الطلب دون الحاجة لإنشاء حساب.' },
};

export default function CustomerAccounts({ store }: Props) {
  const [items, setItems] = useState<FeatureItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = async () => {
    try {
      const res = await apiGet(`/api/stores/${store.id}/features`);
      const all: FeatureItem[] = (res.groups || []).flatMap((g: any) => g.features);
      const filtered = all.filter((f) => CUSTOMER_KEYS.includes(f.key));
      // also catch from any group
      // Fallback if not found, create stubs
      const map = new Map(filtered.map((f) => [f.key, f]));
      const finalItems = CUSTOMER_KEYS.map((k) => {
        if (map.has(k)) return map.get(k)!;
        const meta = KEY_META[k];
        return { key: k, label: meta?.label || k, description: meta?.desc || '', enabled: false, locked: false, lockReason: '' };
      });
      setItems(finalItems);
    } catch {
      toast.error('تعذر تحميل إعدادات حسابات العملاء');
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
    return () => Object.values(timers.current).forEach((t) => clearTimeout(t));
  }, []);

  const toggle = (key: string, enabled: boolean) => {
    setItems((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
    setSavingKey(key);
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      try {
        const res = await apiPut(`/api/stores/${store.id}/features`, { key, enabled });
        if (res.groups) {
          const all: FeatureItem[] = (res.groups || []).flatMap((g: any) => g.features);
          const filtered = all.filter((f: FeatureItem) => CUSTOMER_KEYS.includes(f.key));
          const map = new Map(filtered.map((f) => [f.key, f]));
          setItems((prev) => prev.map((f) => map.get(f.key) || f));
        }
        toast.success('تم الحفظ بنجاح');
      } catch {
        toast.error('تعذر حفظ التغيير');
        load();
      } finally {
        setSavingKey(null);
      }
    }, 400);
  };

  return (
    <PageTemplate
      title="حسابات العملاء"
      description="تحكم في تسجيل العملاء وتسجيل الدخول والدفع كزائر"
      url={`/stores/${store.id}/customer-accounts`}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'إدارة المتجر', href: route('stores.index') },
        { title: 'حسابات العملاء' },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {!loaded ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Users className="h-4 w-4" />
                  </span>
                  حسابات العملاء
                </CardTitle>
                <CardDescription>إعدادات تسجيل الدخول والتسجيل والدفع كزائر — مكان واحد واضح بدون تكرار.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {items.map((item) => {
                  const meta = KEY_META[item.key];
                  const Icon = meta?.icon || Users;
                  return (
                    <div key={item.key} className={`flex items-center justify-between gap-4 rounded-xl px-3 py-3.5 transition ${item.locked ? 'bg-slate-50 opacity-75' : 'hover:bg-slate-50'}`}>
                      <div className="flex gap-3 min-w-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-800">{item.label}</p>
                            {savingKey === item.key && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">{item.description}</p>
                        </div>
                      </div>
                      <Switch checked={item.enabled} disabled={item.locked || savingKey === item.key} onCheckedChange={(v) => toggle(item.key, v)} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-emerald-100 bg-emerald-50/40">
              <CardContent className="flex gap-3 p-4">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-800">ملاحظة</p>
                  <p className="text-xs leading-relaxed text-slate-500">
                    هذه هي الصفحة الوحيدة لإعدادات حسابات العملاء. لا يتم تكرار نفس الخيار في أي تبويب آخر داخل إعدادات المتجر.
                    التغييرات تظهر فوراً في واجهة المتجر.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTemplate>
  );
}
