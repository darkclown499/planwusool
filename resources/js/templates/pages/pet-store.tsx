import React, { useMemo, useState } from 'react';
import { useStorefrontCore, AccountButton, CartButton } from '@/templates/storefront';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';
import { Bone, PawPrint, Plus } from 'lucide-react';
import { toast } from '@/components/custom-toast';

/**
 * PetStore — friendly, warm and rounded. Cute category tiles and
 * playful product cards for pet supplies.
 */
const PetStorePage: React.FC<TemplatePageProps> = ({ storeData }) => {
  const { product, config, cart } = useStorefrontCore();
  const identity = storeIdentity(config, storeData);
  const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
  const [cat, setCat] = useState('all');

  const products = useMemo(() => {
    const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
    return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
  }, [product?.filteredProducts, storeData?.products, cat]);

  const green = getVar('--twc-primary-500', '#22c55e');
  const greenDeep = getVar('--twc-primary-600', '#16a34a');

  const tileBg = ['#fecaca', '#fed7aa', '#fde68a', '#bbf7d0', '#bae6fd', '#e9d5ff'];

  return (
    <div className="min-h-screen" style={{ background: '#fffdf5', color: '#3f372e' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 hidden border-b border-green-100 bg-[#fffdf5]/95 backdrop-blur-md md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 rotate-6 items-center justify-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${greenDeep}, ${green})` }}>
              <PawPrint className="h-5 w-5" />
            </span>
            <span className="text-lg font-black" style={{ color: '#3f372e' }}>{identity.name}</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-black text-stone-600">
            <a href="#shop" className="hover:text-green-600">المتجر</a>
            <a href="#love" className="hover:text-green-600">لماذا نحن</a>
          </nav>
          <div className="flex items-center gap-2">
            <AccountButton />
            <CartButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #fef3c7, #bbf7d0 60%, #a7f3d0)' }} />
        <div className="pointer-events-none absolute start-16 top-8 h-14 w-14 -rotate-12 rounded-3xl bg-white/50" />
        <div className="pointer-events-none absolute end-12 top-20 h-10 w-10 rotate-12 rounded-full bg-orange-200/60" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center md:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-1.5 text-xs font-black text-green-700 shadow-sm backdrop-blur">
            <PawPrint className="h-3.5 w-3.5" /> أهلاً بك، رفيقك الجديد بانتظارك
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl" style={{ color: '#3f372e' }}>
            كل ما يحتاجه
            <br />
            صديقك <span className="inline-block -rotate-2 rounded-2xl px-3 text-white" style={{ background: `linear-gradient(135deg, ${greenDeep}, ${green})` }}>الأليف</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm md:text-base" style={{ color: '#57534e' }}>
            طعام، مستلزمات، وألعاب لحيواناتك الأليفة من {identity.name} — جودة تحبها حيواناتك
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <a href="#shop" className="inline-flex items-center gap-2 rounded-full px-9 py-3.5 text-sm font-black text-white shadow-xl transition hover:scale-105" style={{ background: `linear-gradient(135deg, ${greenDeep}, ${green})` }}>
              <Bone className="h-4 w-4" /> تسوق الآن
            </a>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <SectionHeading title="اختر القسم" subtitle="لكل صديق احتياجاته" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => setCat('all')}
            className="rounded-3xl p-5 text-center shadow transition hover:-translate-y-1 hover:shadow-lg"
            style={{ background: cat === 'all' ? `linear-gradient(135deg, ${greenDeep}, ${green})` : '#f0fdf4' }}
          >
            <span className="text-3xl">🐾</span>
            <p className={`mt-2 text-sm font-black ${cat === 'all' ? 'text-white' : ''}`} style={cat === 'all' ? {} : { color: '#3f372e' }}>الكل</p>
          </button>
          {categories.slice(0, 8).map((c: any, i: number) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(cat === c.id ? 'all' : c.id)}
              className="rounded-3xl p-5 text-center shadow transition hover:-translate-y-1 hover:shadow-lg"
              style={{ background: cat === c.id ? `linear-gradient(135deg, ${greenDeep}, ${green})` : tileBg[i % tileBg.length] }}
            >
              <span className="text-3xl">🐶</span>
              <p className={`mt-2 text-sm font-black ${cat === c.id ? 'text-white' : ''}`} style={cat === c.id ? {} : { color: '#3f372e' }}>{c.name}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Shop */}
      <section id="shop" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8">
        <SectionHeading title="منتجات لرفيقك" subtitle={cat === 'all' ? 'أفضل الاختيارات' : 'من قسمك المختار'} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.length === 0 ? (
            <p className="col-span-full py-16 text-center text-sm font-semibold text-stone-500">لا توجد منتجات بعد — أضف منتجاتك من لوحة التحكم</p>
          ) : (
            products.map((p: any, i: number) => (
              <article key={p.id || i} className="group cursor-pointer overflow-hidden rounded-[1.75rem] border-2 border-green-100 bg-white transition hover:-translate-y-1 hover:shadow-xl" onClick={() => product.handleProductClick(p)}>
                <div className="relative">
                  <ProductImage product={p} className="aspect-square" imgClassName="transition duration-500 group-hover:scale-110" />
                  <span className="absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-lg transition group-hover:rotate-12" style={{ background: `linear-gradient(135deg, ${greenDeep}, ${green})` }}>
                    <PawPrint className="h-4 w-4" />
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-black" style={{ color: '#3f372e' }}>{p.name}</h3>
                  <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{p.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-black" style={{ color: greenDeep }}>{p.price} {identity.currency}</span>
                    <button
                      type="button"
                      aria-label="أضف للسلة"
                      onClick={(e) => {
                        e.stopPropagation();
                        cart.addToCart(p).then(() => toast.success('تمت الإضافة ✓'));
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:scale-110"
                      style={{ background: green }}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Love */}
      <section id="love" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8">
        <div className="grid gap-3 rounded-[2rem] p-8 md:grid-cols-3" style={{ background: 'linear-gradient(120deg, #fef3c7, #d1fae5)' }}>
          {[
            { icon: '🍖', title: 'طعام آمن', desc: 'مكونات صحية معتمدة' },
            { icon: '🪀', title: 'ألعاب ممتعة', desc: 'لطاقة وسعادة حيوانك' },
            { icon: '🏥', title: 'عناية كاملة', desc: 'منتجات نظافة وصحة' },
          ].map((f) => (
            <div key={f.title} className="text-center">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-2 font-black" style={{ color: '#3f372e' }}>{f.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-4 border-t border-green-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 md:flex-row">
          <p className="font-black" style={{ color: '#3f372e' }}>{identity.name}</p>
          <p className="text-xs text-stone-500">© {new Date().getFullYear()} — صديقك يستحق الأفضل</p>
        </div>
      </footer>
    </div>
  );
};

export default PetStorePage;
