import React, { useMemo, useState } from 'react';
import { useStorefrontCore, AccountButton, CartButton } from '@/templates/storefront';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';
import { Hammer, HeartHandshake, Leaf } from 'lucide-react';

/**
 * Handcrafted — earthy, artisanal warmth with textured surfaces,
 * story sections and a workshop vibe.
 */
const HandcraftedPage: React.FC<TemplatePageProps> = ({ storeData }) => {
  const { product, config } = useStorefrontCore();
  const identity = storeIdentity(config, storeData);
  const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
  const [cat, setCat] = useState('all');

  const products = useMemo(() => {
    const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
    return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
  }, [product?.filteredProducts, storeData?.products, cat]);

  const clay = getVar('--twc-primary-600', '#8d6e63');

  return (
    <div className="min-h-screen" style={{ background: '#f6f1e9', color: '#3f372e' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 hidden border-b border-stone-200 bg-[#f6f1e9]/95 backdrop-blur-md md:block">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: clay }}>
              <Hammer className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-tight" style={{ color: '#3f372e' }}>{identity.name}</span>
          </div>
          <nav className="flex items-center gap-8 text-sm font-semibold text-stone-600">
            <a href="#story" className="hover:text-stone-900">قصتنا</a>
            <a href="#shop" className="hover:text-stone-900">الورشة</a>
            <a href="#craft" className="hover:text-stone-900">حرفتنا</a>
          </nav>
          <div className="flex items-center gap-2">
            <AccountButton />
            <CartButton />
          </div>
        </div>
      </header>

      {/* Story hero */}
      <section id="story" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-14 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: clay }}>
              Handmade with love
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl" style={{ color: '#3f372e' }}>
              كل قطعة تحكي
              <br />
              <span style={{ color: clay }}>حكاية صانعها</span>
            </h1>
            <p className="mt-4 max-w-md leading-relaxed text-stone-600">
              من ورشة {identity.name} إلى بيتك — منتجات حرفية مصنوعة يدوياً بمواد طبيعية، كل قطعة فريدة من نوعها.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#shop" className="rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90" style={{ background: clay }}>
                تصفح الورشة
              </a>
              <a href="#craft" className="rounded-full border border-stone-300 px-8 py-3 text-sm font-bold transition hover:bg-white" style={{ color: '#3f372e' }}>
                تعرف على حرفتنا
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {products.slice(0, 4).map((p: any, i: number) => (
              <div key={p.id || i} className={`overflow-hidden rounded-3xl ${i % 2 ? 'translate-y-6' : ''}`} style={{ background: 'linear-gradient(135deg, #e7ddcf, #d6c5b1)' }}>
                <div className="flex aspect-square items-center justify-center text-3xl text-white/70">{p.name?.charAt(0)}</div>
                <ProductImage product={p} className="absolute inset-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Craft values */}
      <section id="craft" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-8">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-stone-200 bg-stone-200 md:grid-cols-3">
          {[
            { icon: <HeartHandshake className="h-5 w-5" />, title: 'صناعة إنسانية', desc: 'يدوية 100% بدعم الحرفيين المحليين' },
            { icon: <Leaf className="h-5 w-5" />, title: 'مواد طبيعية', desc: 'خامات صديقة للبيئة وعالية الجودة' },
            { icon: <Hammer className="h-5 w-5" />, title: 'قيمة تدوم', desc: 'كل قطعة صُممت لترافقك لسنوات' },
          ].map((v) => (
            <div key={v.title} className="bg-[#f6f1e9] p-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: clay }}>
                {v.icon}
              </span>
              <h3 className="mt-3 font-black" style={{ color: '#3f372e' }}>{v.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Shop */}
      <section id="shop" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-10">
        <SectionHeading title="منتجات الورشة" subtitle="اختر قطعتك المميزة قبل نفادها" />
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setCat('all')}
            className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white' : 'border border-stone-300 bg-white'}`}
            style={cat === 'all' ? { background: clay } : { color: '#3f372e' }}
          >
            الكل
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(cat === c.id ? 'all' : c.id)}
              className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white' : 'border border-stone-300 bg-white'}`}
              style={cat === c.id ? { background: clay } : { color: '#3f372e' }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.length === 0 ? (
            <p className="col-span-full py-16 text-center text-sm font-semibold text-stone-500">لا توجد منتجات بعد — أضف منتجاتك من لوحة التحكم</p>
          ) : (
            products.map((p: any, i: number) => (
              <article key={p.id || i} className="group cursor-pointer rounded-3xl border border-stone-200 bg-white p-3 transition hover:-translate-y-1 hover:shadow-lg" onClick={() => product.handleProductClick(p)}>
                <div className="overflow-hidden rounded-2xl">
                  <ProductImage product={p} className="aspect-square" imgClassName="transition duration-500 group-hover:scale-105" />
                </div>
                <h3 className="mt-3 truncate text-sm font-black" style={{ color: '#3f372e' }}>{p.name}</h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{p.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-black" style={{ color: clay }}>{p.price} {identity.currency}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); product.handleProductClick(p); }}
                    className="rounded-full border px-4 py-1.5 text-xs font-bold transition hover:bg-stone-100"
                    style={{ borderColor: 'var(--twc-border,#e5e7eb)', color: '#3f372e' }}
                  >
                    عرض القطعة
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-4 border-t border-stone-200" style={{ background: '#efe7da' }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 md:flex-row">
          <p className="font-black" style={{ color: '#3f372e' }}>{identity.name}</p>
          <p className="text-xs text-stone-600">© {new Date().getFullYear()} — صُنع بيدٍ محبة</p>
        </div>
      </footer>
    </div>
  );
};

export default HandcraftedPage;
