import React, { useMemo, useState } from 'react';
import { useStorefrontCore, AccountButton, CartButton } from '@/templates/storefront';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';
import { Droplets, Sparkles, Wind } from 'lucide-react';

/**
 * Perfumes — elegant, minimal, centered bottle showcase with a
 * fragrance-mood hero and refined product cards.
 */
const PerfumesPage: React.FC<TemplatePageProps> = ({ storeData }) => {
  const { product, config } = useStorefrontCore();
  const identity = storeIdentity(config, storeData);
  const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
  const [cat, setCat] = useState('all');

  const products = useMemo(() => {
    const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
    return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
  }, [product?.filteredProducts, storeData?.products, cat]);

  const amber = getVar('--twc-primary-500', '#b45309');

  const serif = "Georgia, 'Times New Roman', serif";

  return (
    <div className="min-h-screen" style={{ background: '#faf6f0', color: '#292524' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 hidden border-b border-amber-100 bg-[#faf6f0]/95 backdrop-blur-md md:block">
        <div className="mx-auto flex h-18 max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-semibold tracking-[0.2em]" style={{ fontFamily: serif }}>
            {identity.name}
          </span>
          <div className="flex items-center gap-2">
            <AccountButton />
            <CartButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -start-20 top-1/4 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -end-16 bottom-0 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center md:py-28">
          <Droplets className="mx-auto h-8 w-8" style={{ color: amber }} />
          <p className="mt-5 text-xs uppercase tracking-[0.45em]" style={{ color: amber }}>
            Maison de Parfum
          </p>
          <h1 className="mt-4 text-4xl font-light leading-tight md:text-6xl" style={{ fontFamily: serif }}>
            عطرٌ يروي
            <br />
            <em className="not-italic" style={{ color: amber }}>حكايتك</em>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-stone-500">
            تشكيلة فاخرة من العطور الأصلية من {identity.name} — لكل لحظة ولكل شخصية.
          </p>
          <a href="#collection" className="mt-9 inline-block border border-stone-300 px-10 py-3.5 text-xs uppercase tracking-[0.3em] transition hover:border-stone-700 hover:bg-stone-700 hover:text-white" style={{ color: '#292524' }}>
            اكتشف التشكيلة
          </a>
        </div>
      </section>

      {/* Notes strip */}
      <section className="border-y border-amber-100 bg-white/60">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-4 px-6 py-6 text-center">
          {[
            { icon: <Wind className="h-5 w-5" />, label: 'عطور أصلية' },
            { icon: <Sparkles className="h-5 w-5" />, label: 'ثبات عالي' },
            { icon: <Droplets className="h-5 w-5" />, label: 'عبوات فاخرة' },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-1.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: `${amber}1a`, color: amber }}>
                {f.icon}
              </span>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#292524' }}>{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Collection */}
      <section id="collection" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-14">
        <SectionHeading title="التشكيلة" subtitle="اختر العطر الذي يناسبك" />
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setCat('all')}
            className={`px-5 py-1.5 text-xs uppercase tracking-[0.2em] transition ${cat === 'all' ? '' : 'text-stone-400 hover:text-stone-700'}`}
            style={cat === 'all' ? { color: amber, fontWeight: 700 } : {}}
          >
            الكل
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(cat === c.id ? 'all' : c.id)}
              className={`px-5 py-1.5 text-xs uppercase tracking-[0.2em] transition ${cat === c.id ? '' : 'text-stone-400 hover:text-stone-700'}`}
              style={cat === c.id ? { color: amber, fontWeight: 700 } : {}}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
          {products.length === 0 ? (
            <p className="col-span-full py-16 text-center text-sm font-semibold text-stone-500">لا توجد عطور بعد — أضف منتجاتك من لوحة التحكم</p>
          ) : (
            products.map((p: any, i: number) => (
              <article key={p.id || i} className="group cursor-pointer text-center" onClick={() => product.handleProductClick(p)}>
                <div className="relative mx-auto w-full max-w-[200px]">
                  <div className="overflow-hidden rounded-full border border-amber-100" style={{ background: 'linear-gradient(160deg, #fde8c8, #f5d6a8)' }}>
                    <ProductImage product={p} className="aspect-square" imgClassName="transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 rounded-full shadow-inner ring-1 ring-inset ring-amber-900/10" />
                </div>
                <h3 className="mt-4 truncate text-sm font-semibold" style={{ fontFamily: serif }}>{p.name}</h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{p.description}</p>
                <p className="mt-2 text-sm font-bold" style={{ color: amber }}>
                  {p.price} {identity.currency}
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); product.handleProductClick(p); }}
                  className="mt-2 hidden border-b border-transparent pb-0.5 text-[10px] uppercase tracking-[0.25em] transition group-hover:inline-block hover:border-current"
                  style={{ color: amber }}
                >
                  عرض العطر
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-amber-100">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <p className="text-lg tracking-[0.25em]" style={{ fontFamily: serif, fontWeight: 600 }}>{identity.name}</p>
          <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400">© {new Date().getFullYear()} Maison de Parfum</p>
        </div>
      </footer>
    </div>
  );
};

export default PerfumesPage;
