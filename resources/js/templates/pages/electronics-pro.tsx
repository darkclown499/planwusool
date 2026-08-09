import React, { useMemo, useState } from 'react';
import { useStorefrontCore, AccountButton, CartButton } from '@/templates/storefront';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';
import { Check, Cpu, ShieldCheck, Zap } from 'lucide-react';

/**
 * ElectronicsPro — professional electronics storefront with spec tables,
 * comparison section, and badge-heavy product cards.
 */
const ElectronicsProPage: React.FC<TemplatePageProps> = ({ storeData }) => {
  const { product, config } = useStorefrontCore();
  const identity = storeIdentity(config, storeData);
  const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
  const [cat, setCat] = useState('all');

  const products = useMemo(() => {
    const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
    return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
  }, [product?.filteredProducts, storeData?.products, cat]);

  const blue = getVar('--twc-primary-500', '#2563eb');
  const blueDeep = getVar('--twc-primary-600', '#1d4ed8');

  return (
    <div className="min-h-screen bg-white" style={{ color: '#0f172a' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 hidden border-b border-slate-200 bg-white/95 backdrop-blur-md md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: blueDeep }}>
              <Cpu className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-black leading-none" style={{ color: '#0f172a' }}>{identity.name}</p>
              <p className="text-[11px] text-slate-500">متجر الإلكترونيات الاحترافي</p>
            </div>
          </div>
          <nav className="flex items-center gap-7 text-sm font-bold text-slate-600">
            <a href="#specs" className="hover:text-blue-700">المواصفات</a>
            <a href="#compare" className="hover:text-blue-700">المقارنة</a>
            <a href="#store" className="hover:text-blue-700">المنتجات</a>
          </nav>
          <div className="flex items-center gap-2">
            <AccountButton />
            <CartButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, #0f172a 0%, #1e293b 70%)' }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, #fff 25%, #fff 26%, transparent 27%, transparent 74%, #fff 75%, #fff 76%, transparent 77%)', backgroundSize: '48px 48px' }} />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold" style={{ background: `${blue}22`, color: '#60a5fa' }}>
                <ShieldCheck className="h-3.5 w-3.5" /> وكيل معتمد وضمان حقيقي
              </span>
              <h1 className="mt-4 text-3xl font-black leading-tight text-white md:text-5xl">
                مواصفات
                <br />
                تستحق الثقة
              </h1>
              <p className="mt-3 max-w-md text-slate-400">
                أحدث الأجهزة من {identity.name} بمواصفات كاملة وأسعار شفافة، مع دعم فني متخصص.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#store" className="rounded-lg px-8 py-3 text-sm font-black text-white transition hover:opacity-90" style={{ background: blue }}>
                  تسوق الآن
                </a>
                <a href="#compare" className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  <Zap className="h-4 w-4" /> قارن الموديلات
                </a>
              </div>
            </div>
            <div className="hidden grid-cols-3 gap-4 lg:grid">
              {products.slice(0, 3).map((p: any, i: number) => (
                <div key={p.id || i} className={`overflow-hidden rounded-2xl border border-white/10 ${i === 1 ? 'mt-10' : i === 2 ? 'mt-20' : ''}`} style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <ProductImage product={p} className="aspect-[3/4]" />
                  <div className="p-2 text-center">
                    <p className="truncate text-[10px] font-bold text-slate-300">{p.name}</p>
                    <p className="text-xs font-black" style={{ color: '#60a5fa' }}>{p.price} {identity.currency}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Spec strip */}
      <section id="specs" className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4">
          {[
            { label: 'ضمان حقيقي', desc: 'حتى سنتين' },
            { label: 'دعم فني', desc: 'على مدار الساعة' },
            { label: 'مواصفات كاملة', desc: 'لكل منتج' },
            { label: 'أسعار شفافة', desc: 'بدون رسوم خفية' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${blue}1a`, color: blueDeep }}>
                <Check className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: '#0f172a' }}>{s.label}</p>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Store */}
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCat('all')}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white' : 'border border-slate-200 hover:bg-slate-50'}`}
            style={cat === 'all' ? { background: blue } : { color: '#0f172a' }}
          >
            الكل
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(cat === c.id ? 'all' : c.id)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white' : 'border border-slate-200 hover:bg-slate-50'}`}
              style={cat === c.id ? { background: blue } : { color: '#0f172a' }}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div id="store" className="grid scroll-mt-24 grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.length === 0 ? (
            <p className="col-span-full py-16 text-center text-sm font-semibold text-slate-500">لا توجد منتجات بعد — أضف منتجاتك من لوحة التحكم</p>
          ) : (
            products.map((p: any, i: number) => (
              <article key={p.id || i} className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg" onClick={() => product.handleProductClick(p)}>
                <div className="relative">
                  <ProductImage product={p} className="aspect-square" imgClassName="transition duration-500 group-hover:scale-105" />
                  {p.originalPrice && Number(p.originalPrice) > Number(p.price) && (
                    <span className="absolute start-2 top-2 rounded-md px-2 py-1 text-[10px] font-black text-white" style={{ background: '#ef4444' }}>
                      -{Math.round((1 - Number(p.price) / Number(p.originalPrice)) * 100)}%
                    </span>
                  )}
                  <span className="absolute end-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">PRO</span>
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-black" style={{ color: '#0f172a' }}>{p.name}</h3>
                  <div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: 'var(--twc-border,#f1f5f9)' }}>
                    <div>
                      <p className="text-sm font-black" style={{ color: blueDeep }}>{p.price} {identity.currency}</p>
                      {p.originalPrice && Number(p.originalPrice) > Number(p.price) && (
                        <p className="text-xs line-through text-slate-400">{p.originalPrice} {identity.currency}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); product.handleProductClick(p); }}
                      className="rounded-lg px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                      style={{ background: blue }}
                    >
                      عرض
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </main>

      {/* Compare */}
      <section id="compare" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-14">
        <SectionHeading title="قارن الموديلات" subtitle="مقارنة سريعة لأفضل ثلاث خيارات" />
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="p-4 text-start font-bold">المواصفة</th>
                {products.slice(0, 3).map((p: any) => (
                  <th key={p.id} className="p-4 text-center font-black" style={{ color: '#0f172a' }}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'السعر', get: (p: any) => `${p.price} ${identity.currency}` },
                { label: 'التوفر', get: () => 'متوفر' },
                { label: 'الضمان', get: () => 'سنتان' },
                { label: 'التقييم', get: () => '4.7 / 5' },
              ].map((row) => (
                <tr key={row.label} className="border-b border-slate-100">
                  <td className="p-4 font-bold text-slate-600">{row.label}</td>
                  {products.slice(0, 3).map((p: any) => (
                    <td key={p.id} className="p-4 text-center font-semibold" style={{ color: '#334155' }}>{row.get(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 md:flex-row">
          <p className="font-black" style={{ color: '#0f172a' }}>{identity.name}</p>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} — إلكترونيات احترافية بأسعار شفافة</p>
        </div>
      </footer>
    </div>
  );
};

export default ElectronicsProPage;
