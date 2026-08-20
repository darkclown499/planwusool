import React, { useEffect, useRef, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/custom-toast';
import { apiPut } from '@/utils/api';
import { router } from '@inertiajs/react';
import { Loader2, Lock, CreditCard, ShoppingCart, LayoutGrid, Plug, ExternalLink, Settings2 } from 'lucide-react';

interface FeatureItem {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  locked: boolean;
  lockReason: string;
}

interface FeatureGroup {
  id: string;
  label: string;
  description: string;
  features: FeatureItem[];
}

interface IntegrationItem {
  key: string;
  label: string;
  enabled: boolean;
  status: string;
}

interface Props {
  store: { id: number; name: string; slug: string };
  groups?: FeatureGroup[];
  integrations?: IntegrationItem[];
}

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  storefront: ShoppingCart,
};

export default function StoreFeatures({ store, groups: initialGroups = [], integrations: initialIntegrations = [] }: Props) {
  const [groups, setGroups] = useState<FeatureGroup[]>(initialGroups);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(initialIntegrations);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const apiUrl = `/api/stores/${store.id}/features`;

  useEffect(() => {
    const timersRef = timers.current;
    return () => Object.values(timersRef).forEach((t) => clearTimeout(t));
  }, []);

  // Debounced toggle: rapid switches only fire the latest value per key.
  const toggle = (group: FeatureGroup, item: FeatureItem, enabled: boolean) => {
    if (item.locked) {
      toast.error(item.lockReason || 'هذه الميزة غير متاحة في باقتك الحالية.');
      return;
    }

    setGroups((gs) =>
      gs.map((g) =>
        g.id === group.id ? { ...g, features: g.features.map((f) => (f.key === item.key ? { ...f, enabled } : f)) } : g
      )
    );

    setSavingKey(item.key);
    if (timers.current[item.key]) clearTimeout(timers.current[item.key]);

    timers.current[item.key] = setTimeout(async () => {
      try {
        const res = await apiPut(apiUrl, { key: item.key, enabled });
        if (res.groups) setGroups(res.groups);
        if (res.integrations) setIntegrations(res.integrations);
        toast.success('تم الحفظ بنجاح');
      } catch {
        toast.error('تعذر حفظ التغيير. حاول مرة أخرى.');
        setGroups(initialGroups);
      } finally {
        setSavingKey(null);
      }
    }, 400);
  };

  return (
    <PageTemplate
      title="الميزات"
      description="فعّل أو أوقف كل نظام في متجرك بضغطة واحدة"
      url={`/stores/${store.id}/features`}
      backUrl={`/stores/${store.id}/settings`}
      action={
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => router.visit(`/stores/${store.id}/payments`)}>
            <CreditCard className="h-4 w-4 me-1.5" />
            طرق الدفع
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => window.open(`https://${store.slug}.${window.location.host.split(':')[0]}`, '_blank')}>
            <ExternalLink className="h-4 w-4 me-1.5" />
            عرض المتجر
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {groups.map((group) => {
          const Icon = GROUP_ICONS[group.id] || LayoutGrid;
          return (
            <Card key={group.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  {group.label}
                </CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {group.features.map((item) => (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition ${
                      item.locked ? 'bg-slate-50 opacity-75' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">{item.label}</p>
                        {savingKey === item.key && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">{item.description}</p>
                      {item.locked && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                          <Lock className="h-3 w-3" />
                          {item.lockReason}
                        </span>
                      )}
                    </div>
                    <Switch
                      checked={item.enabled}
                      disabled={item.locked || savingKey === item.key}
                      onCheckedChange={(v) => toggle(group, item, v)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {/* Integrations */}
        {integrations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Plug className="h-4 w-4" />
                </span>
                التكاملات
              </CardTitle>
              <CardDescription>ربط المتجر بالأنظمة الخارجية (المحاسبة، السحابة، الرسائل).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {integrations.map((item) => {
                const isErp = item.key === 'erp';
                const row = (
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">{item.label}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">{item.status}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isErp && (
                        <Button asChild size="sm" variant="default">
                          <a href={`/stores/${store.id}/integrations/erp`}>
                            <Settings2 className="h-4 w-4 me-1.5" />
                            إعداد / ضبط
                          </a>
                        </Button>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          item.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {item.enabled ? 'مفعّل' : 'غير مفعّل'}
                      </span>
                    </div>
                  </div>
                );
                return <div key={item.key}>{row}</div>;
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </PageTemplate>
  );
}