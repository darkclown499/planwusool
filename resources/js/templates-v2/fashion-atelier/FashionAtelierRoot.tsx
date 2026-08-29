import React, { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronLeft, MessageCircle, PackageSearch, Search, User, X } from 'lucide-react';
import { Facebook, Globe, Instagram, Music, Send, Youtube, Twitter } from 'lucide-react';
import type { TemplateRootProps } from '../types';
import { createSafeHtml } from '@/utils/xss-protection';
import { useStorefrontCore } from '../shared/hooks';
import { useHomepageSettings } from '../shared/CategorySections';
import { getImageUrl } from '@/utils/image-helper';
import { AnnouncementBar } from './components/AnnouncementBar';
import { AtelierHeader } from './components/AtelierHeader';
import { AtelierHero } from './components/AtelierHero';
import { AtelierRail } from './components/AtelierRail';
import { AtelierProductCard } from './components/AtelierProductCard';
import { AtelierCategoryCircles, AtelierLookbook } from './components/AtelierSections';

/* ===================================================================== */
/* Fashion Atelier — أتيليه الموضة                                        */
/*                                                                        */
/* An editorial boutique storefront for fashion/hijab/clothing stores.    */
/* Warm ivory palette, serif display type, portrait photography with      */
/* hover angle-swap and April-style inline quick-add. Every pixel here is */
/* owned by this template — nothing renders through a generic pipeline.   */
/* ===================================================================== */

const AtelierMobileSearch: React.FC = () => {
  const { ui } = useStorefrontCore() as any;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-2 pb-1 md:hidden" dir="rtl">
      <button
        type="button"
        onClick={() => ui.setShowSearch(true)}
        className="flex w-full items-center gap-2.5 rounded-full border border-stone-200 bg-white px-4 py-3 text-start shadow-sm transition hover:bg-stone-50"
      >
        <Search className="h-4 w-4 text-stone-400" />
        <span className="text-sm text-stone-500">ابحث عن منتج...</span>
      </button>
    </div>
  );
};

const AtelierWhatsAppFloating: React.FC = () => {
  const { config, content, store } = useStorefrontCore() as any;
  const rawContent: any = content ?? {};
  const waCfg: any = rawContent.fashion_whatsapp ?? rawContent.fashion_wa ?? {};
  const enabled = waCfg.enabled ?? waCfg.show ?? rawContent.fashion_whatsapp_enabled ?? false;
  if (!enabled) return null;
  const rawNumber = String(waCfg.number ?? waCfg.phone ?? rawContent.fashion_whatsapp_number ?? config?.socialMedia?.whatsapp ?? config?.whatsapp_widget_phone ?? (store as any)?.phone ?? '').replace(/[^0-9]/g, '');
  if (!rawNumber) return null;
  const rawMessage = String(waCfg.message ?? rawContent.fashion_whatsapp_message ?? 'مرحباً، أريد الاستفسار عن أحد المنتجات');
  const href = `https://wa.me/${rawNumber}?text=${encodeURIComponent(rawMessage)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="تواصل واتساب"
      className="fixed bottom-4 left-4 z-40 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_2px_10px_rgba(0,0,0,0.12),0_6px_18px_rgba(0,0,0,0.08)] ring-1 ring-black/5 transition hover:scale-[1.04] active:scale-[0.97] md:hidden"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' } as any}
    >
      <MessageCircle className="h-[22px] w-[22px]" fill="white" />
    </a>
  );
};

const SOCIAL_PLATFORMS = [
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'tiktok', label: 'TikTok', icon: Music },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'snapchat', label: 'Snapchat', icon: MessageCircle },
  { value: 'telegram', label: 'Telegram', icon: Send },
  { value: 'x', label: 'X / Twitter', icon: Twitter },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'website', label: 'Website', icon: Globe },
] as const;
function getSocialIcon(platform: string) {
  const f = SOCIAL_PLATFORMS.find((p) => p.value === String(platform).toLowerCase());
  return f ? f.icon : Globe;
}
function isSafeUrl(url: string): boolean {
  try { const u = new URL(String(url).trim()); return ['https:', 'http:'].includes(u.protocol) && u.hostname.includes('.'); } catch { return false; }
}
function LayoutGridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
const AtelierMobileMenuView: React.FC<{ onClose: () => void; onProfile: () => void; onCategories: () => void }> = ({ onClose, onProfile, onCategories }) => {
  const { config, store, content } = useStorefrontCore() as any;
  const socialSlots = [1, 2, 3].map((idx) => {
    const base = (content as any)?.fashion_mobile_nav ?? {};
    const enabled = !!base[`social_${idx}_enabled`];
    const platform = String(base[`social_${idx}_platform`] ?? 'instagram').toLowerCase();
    const url = String(base[`social_${idx}_url`] ?? '').trim();
    const safe = enabled && url && isSafeUrl(url);
    return { idx, platform, url, safe };
  });
  const hasSocial = socialSlots.some((s) => s.safe);
  return (
    <div className="min-h-screen w-full bg-[#faf7f2] md:hidden" dir="rtl">
      <div className="flex items-center justify-between gap-3 border-b border-stone-200/70 bg-white px-4 py-3.5">
        <a href="/" className="flex min-w-0 flex-1 items-center gap-2" onClick={() => onClose()}>
          {(config?.logo || store?.logo) ? (
            <img src={getImageUrl(config.logo || store.logo)} alt="" className="h-7 w-auto object-contain" />
          ) : (
            <span className="font-serif text-[17px] font-bold tracking-wide text-stone-900">{config?.storeName || store?.name}</span>
          )}
        </a>
        <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600 ring-1 ring-stone-200/60 transition hover:bg-stone-200 active:scale-95">
          <X className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>
      <div className="px-4 pt-5 pb-6">
        <h1 className="font-serif text-[22px] font-bold leading-none text-stone-900">القائمة</h1>
        <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">اكتشفي أقسام المتجر وتابعي جديدنا</p>
        <nav className="mt-5 space-y-2.5">
          <button type="button" onClick={onProfile} className="flex h-[64px] w-full items-center gap-3 rounded-2xl bg-white/80 px-4 text-start shadow-[0_1px_8px_rgba(0,0,0,0.04)] ring-1 ring-stone-200/60 backdrop-blur-sm transition hover:bg-white active:scale-[0.98]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white"><User className="h-[18px] w-[18px]" /></span>
            <span className="flex-1 text-[13px] font-bold text-stone-800">حسابي</span>
            <ChevronLeft className="h-4 w-4 text-stone-300" />
          </button>
          <button type="button" onClick={onCategories} className="flex h-[64px] w-full items-center gap-3 rounded-2xl bg-white/80 px-4 text-start shadow-[0_1px_8px_rgba(0,0,0,0.04)] ring-1 ring-stone-200/60 backdrop-blur-sm transition hover:bg-white active:scale-[0.98]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9d7463] text-white"><LayoutGridIcon /></span>
            <span className="flex-1 text-[13px] font-bold text-stone-800">الأقسام</span>
            <ChevronLeft className="h-4 w-4 text-stone-300" />
          </button>
        </nav>
        {hasSocial && (
          <>
            <div className="my-5 h-px bg-stone-200/70" />
            <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-stone-500">تابعنا</p>
            <div className="flex items-start justify-start gap-5">
              {socialSlots.filter((s) => s.safe).map((slot) => {
                const Icon = getSocialIcon(slot.platform);
                return (
                  <a key={slot.idx} href={slot.url} target="_blank" rel="noreferrer" aria-label={slot.platform} className="flex flex-col items-center gap-1.5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-800 shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-50 active:scale-95"><Icon className="h-5 w-5" /></span>
                    <span className="max-w-[64px] truncate text-[11px] font-medium capitalize text-stone-600">{slot.platform}</span>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const SORTS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: من الأقل للأعلى' },
  { value: 'price_desc', label: 'السعر: من الأعلى للأقل' },
  { value: 'name', label: 'أبجدياً' },
];

const byNewest = (a: any, b: any) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
const byPriceAsc = (a: any, b: any) => Number(a.price) - Number(b.price);
const byPriceDesc = (a: any, b: any) => Number(b.price) - Number(a.price);
const byName = (a: any, b: any) => String(a.name).localeCompare(String(b.name), 'ar');

export const FashionAtelierRoot: React.FC<TemplateRootProps> = ({ storeData, mode, page, categoryData }) => {
  if (mode === 'category') {
    return <AtelierCategoryMode storeData={storeData} categoryData={categoryData} />;
  }
  if (mode === 'page') {
    return <AtelierPageMode storeData={storeData} page={page} />;
  }
  return <AtelierHome storeData={storeData} />;
};

/* ------------------------------ Home ------------------------------ */

const AtelierHome: React.FC<{ storeData: any }> = ({ storeData }) => {
  const { product, auth } = useStorefrontCore() as any;
  const products: any[] = product?.products || storeData?.products || [];
  const categories: any[] = product?.categories || storeData?.categories || [];
  const banners: any[] = storeData?.content?.banners || [];

  const { showLatest, showBest, homepageCategories, productsPerCategory } = useHomepageSettings(storeData);

  const newest = useMemo(() => [...products].sort(byNewest).slice(0, 14), [products]);
  const bestsellers = useMemo(() => {
    const discounted = products.filter((p) => p.originalPrice && Number(p.originalPrice) > Number(p.price));
    return (discounted.length >= 4 ? discounted : [...products].sort(byNewest).reverse()).slice(0, 10);
  }, [products]);

  // Lookbook panels must be distinct editorial images, not duplicated hero fallback.
  // If merchant has only one hero slide (banners.length===1), showing two identical panels would appear as duplicate hero side-by-side.
  // Contract: desktop+mobile = ONE responsive hero. Lookbook only shows when distinct images exist.
  const lookbookA = banners[1] ?? null;
  const lookbookB = banners[2] ?? null;
  const hasDistinctLookbook = !!(lookbookA && lookbookB && lookbookA.image && lookbookB.image && lookbookA.image !== lookbookB.image);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen && pendingScroll) {
      requestAnimationFrame(() => {
        const el = document.getElementById(pendingScroll);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setPendingScroll(null);
      });
    }
  }, [mobileMenuOpen, pendingScroll]);

  const handleProfile = () => {
    setMobileMenuOpen(false);
    if (auth?.isLoggedIn) auth.setShowProfileModal(true);
    else auth?.setShowLoginModal?.(true);
  };
  const handleCategories = () => {
    setMobileMenuOpen(false);
    setPendingScroll('atelier-categories');
  };

  const normalMain = (
    <main>
      <AtelierMobileSearch />

      <AtelierHero
        slides={(banners.length > 0 ? banners : []).map((b) => ({
          title: b.title,
          subtitle: b.subtitle,
          image: b.image,
          button_text: b.button_text,
          button_link: b.button_link,
        }))}
      />

      <div id="atelier-categories">
        <AtelierCategoryCircles categories={categories} />
      </div>

      {showLatest && (
        <div id="atelier-new">
          <AtelierRail title="وصل حديثاً" subtitle="أحدث القطع التي انضمت للأتيليه" products={newest} viewAllHref="/products" />
        </div>
      )}

      {hasDistinctLookbook && (
        <AtelierLookbook
          panels={[
            { eyebrow: 'كولكشن', title: lookbookA!.title || 'الموسم الجديد', cta_text: 'شاهدي التشكيلة', cta_link: '#atelier-new', image: lookbookA!.image },
            { eyebrow: 'مختارات', title: lookbookB!.title || 'قطع لا تُقاوم', cta_text: 'تسوقي الآن', cta_link: '#atelier-best', image: lookupImage(lookbookB!) },
          ]}
        />
      )}

      {showBest && (
        <div id="atelier-best">
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <span className="mb-2 block h-px w-10 bg-[#b08d57]" />
                <h2 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">الأكثر مبيعاً</h2>
              </div>
            </div>
            <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-5">
              {bestsellers.map((p) => (
                <AtelierProductCard key={p.id} product={p} className="h-full" />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Dynamic category sections */}
      {homepageCategories.length > 0 && (
        <div>
          <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
            {homepageCategories.map((catId: string) => {
              const cat = categories.find((c: any) => String(c.id) === String(catId));
              if (!cat) return null;
              const catProducts = products.filter((p: any) => String(p.categoryId ?? p.category_id) === String(cat.id)).slice(0, productsPerCategory);
              if (!catProducts.length) return null;
              return (
                <section key={cat.id}>
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-serif text-2xl font-bold text-stone-900">{cat.name}</h2>
                    <a href={`/category/${cat.slug || cat.id}`} className="text-sm font-bold text-[#9d7463] hover:text-[#85604f]">عرض الكل ←</a>
                  </div>
                  <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
                    {catProducts.map((p: any) => (
                      <AtelierProductCard key={p.id} product={p} className="h-full" />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );

  if (mobileMenuOpen) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#faf7f2] text-stone-800 antialiased">
        <AnnouncementBar />
        {/* Mobile menu view — normal DOM, no overlay */}
        <div className="md:hidden">
          <AtelierMobileMenuView onClose={() => setMobileMenuOpen(false)} onProfile={handleProfile} onCategories={handleCategories} />
        </div>
        {/* Desktop always shows normal storefront even while mobile menu open */}
        <div className="hidden md:block">
          <AtelierHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />
          {normalMain}
          <AtelierWhatsAppFloating />
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] text-stone-800 antialiased">
      <AnnouncementBar />
      <AtelierHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />
      {normalMain}
      <AtelierWhatsAppFloating />
    </div>
  );
};

function lookupImage(banner: any): string | undefined {
  return banner?.image;
}

/* ---------------------------- Category ---------------------------- */

const AtelierCategoryMode: React.FC<{ storeData: any; categoryData?: any | null }> = ({ categoryData }) => {
  const { product } = useStorefrontCore();
  const products = useMemo(() => {
    const list: any[] = product?.products || [];
    return categoryData ? [...list].sort(sortFor(categoryData.sort)) : list;
  }, [product?.products, categoryData?.sort]);

  const cat = categoryData?.category;
  if (!cat) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(`شاهدي قسم "${cat.name}" في المتجر: ${shareUrl}`)}`;

  const navigate = (next: Record<string, any>) => {
    router.get(window.location.pathname, next, { preserveScroll: true, preserveState: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] text-stone-800 antialiased">
      <AnnouncementBar />
      <AtelierHeader homeHref="/" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-[13px] text-stone-500" aria-label="مسار التنقل">
          <a href="/" className="transition hover:text-[#9d7463]">الرئيسية</a>
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="font-semibold text-stone-800">{cat.name}</span>
        </nav>

        {/* Heading */}
        <header className="mb-8 border-b border-stone-200 pb-6 text-center">
          <h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">{cat.name}</h1>
          {!!cat.description && <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-stone-500">{cat.description}</p>}
          <p className="mt-2 text-xs tracking-wide text-stone-400">
            {categoryData.total} قطعة متوفرة ·{' '}
            <a href={whatsappShare} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-[#9d7463]">
              شاركي القسم عبر واتساب
            </a>
          </p>
        </header>

        {/* Sort */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-stone-700">ترتيب حسب:</span>
          <select
            value={categoryData.sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 focus:border-[#9d7463] focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <PackageSearch className="h-12 w-12 text-stone-300" />
            <p className="text-lg font-semibold text-stone-600">لا توجد قطع في هذا القسم بعد</p>
            <a href="/" className="rounded-full bg-[#9d7463] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#85604f]">
              تصفحي بقية الأتيليه
            </a>
          </div>
        ) : (
          <>
            <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((p: any) => (
                <AtelierProductCard key={p.id} product={p} className="h-full" />
              ))}
            </div>

            {categoryData.lastPage > 1 && (
              <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label="ترقيم الصفحات">
                {Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => navigate({ page: n })}
                    aria-current={n === categoryData.currentPage ? 'page' : undefined}
                    className={`h-9 min-w-9 rounded-full px-2 text-sm font-semibold transition ${
                      n === categoryData.currentPage
                        ? 'bg-stone-900 text-white'
                        : 'border border-stone-300 text-stone-600 hover:border-[#9d7463] hover:text-[#9d7463]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}
      </main>
      <AtelierWhatsAppFloating />
    </div>
  );
};

function sortFor(sort: string): (a: any, b: any) => number {
  switch (sort) {
    case 'price_asc': return byPriceAsc;
    case 'price_desc': return byPriceDesc;
    case 'name': return byName;
    default: return (a, b) => 0; // server order (newest/paginated)
  }
}

/* --------------------------- Custom page --------------------------- */

const AtelierPageMode: React.FC<{ storeData: any; page?: any | null }> = ({ page }) => (
  <div dir="rtl" className="min-h-screen bg-[#faf7f2] text-stone-800 antialiased">
    <AnnouncementBar />
    <AtelierHeader homeHref="/" />
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {page?.title && (
        <h1 className="mb-6 border-b border-stone-200 pb-4 font-serif text-3xl font-bold text-stone-900">{page.title}</h1>
      )}
      <article className="prose-custom2" dangerouslySetInnerHTML={createSafeHtml(page?.content || '')} />
    </main>
    <AtelierWhatsAppFloating />
  </div>
);

export default FashionAtelierRoot;
