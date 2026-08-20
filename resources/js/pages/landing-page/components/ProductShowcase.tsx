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

export default function ProductShowcase({ brandColor = '#10b77f', appName = 'وصول' }: ProductShowcaseProps) {
  return (
    <div className="relative w-full">
      {/* Subtle light radial gradients */}
      <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-emerald-100/70 via-slate-50 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-72 w-[42rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/40 blur-[130px]" />

      {/* Backlight glow behind the frame */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-4 -z-10 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Mac browser frame */}
      <div className="group relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-300/50 transition-transform duration-700 [transform:perspective(1400px)_rotateX(6deg)] hover:[transform:perspective(1400px)_rotateX(2deg)_rotateY(-2deg)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <div className="mx-auto flex max-w-xs flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span dir="ltr" className="truncate font-mono text-[11px] text-slate-500">
              https://app.wusool.ps
            </span>
          </div>
          <MessageCircle size={15} style={{ color: brandColor }} className="flex-shrink-0" />
        </div>

        {/* Split content: WhatsApp store + dashboard preview */}
        <div className="mt-2 grid grid-cols-1 overflow-hidden rounded-xl md:grid-cols-5">
          {/* WhatsApp store preview */}
          <div className="border-b border-slate-100 md:col-span-3 md:border-b-0 md:border-l-0 md:border-r-0">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ backgroundColor: brandColor }} dir="ltr">
                  {appName.slice(0, 1)}
                </div>
                <div className="text-start">
                  <p className="text-[13px] font-bold text-slate-900">متجر {appName}</p>
                  <p className="text-[10px] font-medium text-emerald-600">متصل · يرد خلال دقائق</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                اضافة طلب
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
              {DEMO_PRODUCTS.map((product) => (
                <div key={product.name} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex h-16 items-center justify-center bg-slate-100">
                    <ShoppingBag size={22} className="text-slate-400" />
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-[11px] font-semibold text-slate-800">{product.name}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span dir="ltr" className="text-[11px] font-bold text-emerald-600">{product.price}</span>
                      <span className="flex items-center gap-1 text-[9px] text-slate-500">
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
          <div className="md:col-span-2 md:border-l md:border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
              <p className="text-[12px] font-bold text-slate-900">لوحة التحكم</p>
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                مباشر
              </span>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2">
                {DASHBOARD_KPIS.map((kpi) => (
                  <div key={kpi.label} className="rounded-lg border border-slate-200 bg-white p-2.5 text-start shadow-sm">
                    <kpi.icon size={13} style={{ color: brandColor }} />
                    <p className="mt-1.5 text-[9px] font-medium text-slate-500">{kpi.label}</p>
                    <p dir="ltr" className="text-[12px] font-bold text-slate-900">{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Mini chart */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold text-slate-500">المبيعات آخر 7 أيام</p>
                <div className="flex h-20 items-end gap-1.5">
                  {CHART_BARS.map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-sm transition-all duration-500"
                      style={{
                        height: `${height}%`,
                        backgroundColor: index === CHART_BARS.length - 1 ? brandColor : `${brandColor}45`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <span className="text-[10px] font-semibold text-emerald-700">طلب جديد وصل عبر الواتساب</span>
                <MessageCircle size={13} className="text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}