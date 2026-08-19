import React from 'react';
import { ShoppingBag, MessageCircle, DollarSign, Package, Users, TrendingUp, Star } from 'lucide-react';

interface ProductShowcaseProps {
  brandColor?: string;
  appName?: string;
}

const DEMO_PRODUCTS = [
  { name: 'سماعات لاسلكية Pro', price: '199 ₪', sales: '1.2K' },
  { name: 'ساعة ذكية Sport', price: '350 ₪', sales: '860' },
  { name: 'حقيبة ظهر Urban', price: '120 ₪', sales: '540' },
];

const DASHBOARD_KPIS = [
  { icon: DollarSign, label: 'الإيرادات اليوم', value: '₪ 2,450' },
  { icon: Package, label: 'الطلبات الجديدة', value: '48' },
  { icon: Users, label: 'العملاء الجدد', value: '31' },
  { icon: TrendingUp, label: 'نمو المبيعات', value: '+18%' },
];

const CHART_BARS = [35, 55, 42, 70, 60, 85, 75, 95];

export default function ProductShowcase({ brandColor = '#22c55e', appName = 'وصول' }: ProductShowcaseProps) {
  return (
    <div className="relative w-full">
      {/* Subtle background radial gradients */}
      <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-emerald-900/30 via-zinc-950 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-72 w-[42rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[130px]" />

      {/* Framed device container */}
      <div className="relative mx-auto w-full max-w-5xl transition-transform duration-700 [transform:perspective(1400px)_rotateX(6deg)] hover:[transform:perspective(1400px)_rotateX(2deg)_rotateY(-2deg)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 rounded-t-2xl border border-b-0 border-zinc-800 bg-zinc-900/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <div className="mx-auto flex max-w-xs flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-800/80 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span dir="ltr" className="truncate font-mono text-[11px] text-zinc-400">
              my-store.wusool.ps
            </span>
          </div>
          <MessageCircle size={15} style={{ color: brandColor }} className="flex-shrink-0" />
        </div>

        {/* Split content: WhatsApp store + dashboard preview */}
        <div className="grid grid-cols-1 overflow-hidden rounded-b-2xl border border-zinc-800 bg-zinc-950 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] md:grid-cols-5">
          {/* WhatsApp store preview */}
          <div className="border-b border-zinc-800 md:col-span-3 md:border-b-0 md:border-l">
            <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/70 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-zinc-950" style={{ backgroundColor: brandColor }} dir="ltr">
                  {appName.slice(0, 1)}
                </div>
                <div className="text-start">
                  <p className="text-[13px] font-bold text-white">متجر {appName}</p>
                  <p className="text-[10px] text-emerald-400">متصل · يرد خلال دقائق</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                اضافة طلب
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
              {DEMO_PRODUCTS.map((product) => (
                <div key={product.name} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <div className="flex h-16 items-center justify-center bg-zinc-800/60">
                    <ShoppingBag size={22} className="text-zinc-500" />
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-[11px] font-semibold text-white">{product.name}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span dir="ltr" className="text-[11px] font-bold" style={{ color: brandColor }}>{product.price}</span>
                      <span className="flex items-center gap-1 text-[9px] text-zinc-400">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        {product.sales}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/70 px-4 py-3">
              <p className="text-[12px] font-bold text-white">لوحة التحكم</p>
              <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                مباشر
              </span>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2">
                {DASHBOARD_KPIS.map((kpi) => (
                  <div key={kpi.label} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 text-start">
                    <kpi.icon size={13} style={{ color: brandColor }} />
                    <p className="mt-1.5 text-[9px] text-zinc-400">{kpi.label}</p>
                    <p dir="ltr" className="text-[12px] font-bold text-white">{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Mini chart */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold text-zinc-400">المبيعات آخر 7 أيام</p>
                <div className="flex h-20 items-end gap-1.5">
                  {CHART_BARS.map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-sm transition-all duration-500"
                      style={{
                        height: `${height}%`,
                        backgroundColor: index === CHART_BARS.length - 1 ? brandColor : `${brandColor}55`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                <span className="text-[10px] font-semibold text-emerald-300">طلب جديد وصل عبر الواتساب</span>
                <MessageCircle size={13} className="text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}