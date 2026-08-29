import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Check, Gift, Heart, Minus, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { createSafeHtml } from '@/utils/xss-protection';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { discountPercent, isVariableProduct, lowStockRemaining, usePriceFormatter, useStorefrontCore } from '../../shared/hooks';
import { calcEarnedPoints, getLoyaltySettingsFromPage } from '@/utils/loyalty';
import { ProductReviews } from '@/components/storefront/ProductReviews';

interface AtelierProductDetailProps {
  product: any;
  selectedImageIndex?: number;
  onClose: () => void;
  onImageSelect?: (index: number) => void;
}

const COLOR_HINTS = ['لون', 'اللون', 'color'];

export const AtelierProductDetail: React.FC<AtelierProductDetailProps> = ({ product, onClose }) => {
  const { cart, wishlist, config, behavior } = useStorefrontCore();
  const formatPrice = usePriceFormatter();

  const images: string[] = useMemo(() => {
    const list = [product?.image, ...(product?.images || [])].filter(Boolean);
    return Array.from(new Set(list as string[]));
  }, [product]);

  const [active, setActive] = useState(0);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Description overflow detection
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    const check = () => {
      if (!descExpanded) {
        setDescOverflows(el.scrollHeight > el.clientHeight + 4);
      }
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    return () => { ro.disconnect(); window.removeEventListener('resize', check); };
  }, [product?.description, descExpanded]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Sticky bar observer — must track against actual sheet scroll viewport, not browser viewport
  useEffect(() => {
    const el = ctaRef.current;
    const root = scrollContainerRef.current;
    if (!el || !root) return;
    const obs = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting), { root, threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!product) return null;

  const outOfStock = product.availability === 'out_of_stock';
  const discount = discountPercent(product);
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);
  const wished = wishlist?.isInWishlist ? wishlist.isInWishlist(product.id) : false;
  const missingGroups = (product.variants || []).filter((g: any) => !selection[g.name]);

  const selectedCombo = (() => {
    if (!variable || missingGroups.length > 0) return null;
    const combos: any[] = product.variantCombinations || product.variant_combinations || [];
    if (!combos.length) return null;
    const selVals = Object.values(selection).map((v) => String(v).trim());
    return combos.find((c: any) => {
      const vals: string[] = (c.values || []).map((v: any) => String(v).trim());
      if (vals.length !== selVals.length) return false;
      return selVals.every((sv) => vals.includes(sv));
    }) || null;
  })();
  const displayPrice = selectedCombo && selectedCombo.price && String(selectedCombo.price).trim() !== '' ? Number(selectedCombo.price) : Number(product.price);
  const isSelectedOOS = (() => {
    if (!selectedCombo) return false;
    if (product.allowBackorder) return false;
    const stock = selectedCombo.stock !== undefined ? Number(selectedCombo.stock) : NaN;
    if (Number.isFinite(stock)) return stock <= 0;
    return false;
  })();

  const handleAdd = async () => {
    if (outOfStock || isSelectedOOS || adding) return;
    if (variable && missingGroups.length > 0) return;
    setAdding(true);
    try {
      await cart.addToCart({ ...product, quantity: qty, selectedVariants: variable ? selection : undefined });
      onClose();
    } finally { setAdding(false); }
  };

  const waPhone = String((config as any)?.socialMedia?.whatsapp || '').replace(/[^0-9]/g, '');
  const askUrl = createWhatsAppUrl(waPhone, `مرحباً، لدي استفسار عن المنتج: ${product.name}${variable ? ` (${Object.values(selection).join(' / ')})` : ''}`);

  // Audit truthful service claims: hide unsupported hardcoded benefits
  // COD only if store behavior enables COD (checked via behavior config if available)
  const hasCOD = (() => {
    // Try to detect COD from behavior or store config; if unavailable, hide rather than lie
    const b: any = behavior || {};
    // common keys: cod_enabled, enable_cod, payment_cod
    if (typeof b.cod_enabled === 'boolean') return b.cod_enabled;
    if (typeof b.enable_cod === 'boolean') return b.enable_cod;
    if (typeof b.paymentMethods === 'object' && b.paymentMethods?.cod) return true;
    // no reliable data -> hide
    return false;
  })();

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[rgba(30,25,22,0.22)] backdrop-blur-[8px] atelier-focus-backdrop" onClick={onClose} style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any} />
      <style>{`@keyframes atelierFadeIn{from{opacity:0}to{opacity:1}}@keyframes atelierImageIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}@keyframes atelierSheetIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.atelier-focus-backdrop{animation:atelierFadeIn 220ms ease-out}.atelier-product-image{animation:atelierImageIn 260ms cubic-bezier(.2,.8,.2,1)} .atelier-info-sheet{animation:atelierSheetIn 260ms cubic-bezier(.2,.8,.2,1) 60ms both}@media(prefers-reduced-motion:reduce){.atelier-focus-backdrop,.atelier-product-image,.atelier-info-sheet{animation:none!important}}`}</style>
      <div className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[26px] bg-transparent sm:bg-[#faf7f2] shadow-2xl sm:max-h-[88vh] sm:rounded-2xl">
        {/* Close */}
        <button type="button" onClick={onClose} aria-label="إغلاق"
          className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow ring-1 ring-stone-200 transition hover:text-stone-900">
          <X className="h-5 w-5" />
        </button>

        {/* Mobile product focus zone — raised 16px, floating over blurred storefront */}
        <div className="flex h-[clamp(300px,44dvh,500px)] shrink-0 items-center justify-center px-6 pt-10 pb-6 sm:hidden">
          <div className="atelier-product-image relative flex h-full w-full max-w-[86%] -translate-y-3 items-center justify-center">
            <img src={getImageUrl(images[active])} alt={product.name} className="max-h-[88%] max-w-full object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.12)]" />
            {discount > 0 && <span className="absolute top-2 right-2 inline-flex w-fit rounded-full bg-[#9d7463] px-2.5 py-1 text-[11px] font-bold leading-none text-white shadow">-{discount}%</span>}
            {outOfStock && <span className="absolute top-2 left-2 rounded-full border border-stone-300 bg-white/90 px-3 py-1 text-xs font-bold text-stone-600">نفذت</span>}
          </div>
        </div>
        {images.length > 1 && <div className="flex justify-center gap-2 pb-2 sm:hidden">{images.map((_, i) => <button key={i} type="button" onClick={() => setActive(i)} aria-label={`صورة ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-stone-800' : 'w-1.5 bg-stone-300'}`} />)}</div>}

        <div ref={scrollContainerRef} className="atelier-info-sheet flex-1 overflow-y-auto overscroll-contain bg-[#faf7f2] rounded-t-[26px] shadow-[0_-2px_8px_rgba(40,30,20,0.04),0_-12px_28px_rgba(40,30,20,0.06)] -mt-5 pt-1 pb-[env(safe-area-inset-bottom)] sm:mt-0 sm:rounded-none sm:shadow-none">
          <div className="grid gap-0 sm:gap-8 sm:p-6 md:grid-cols-2 md:gap-8">
            {/* Gallery — desktop floating transparent (no white rectangle) */}
            <div className="hidden sm:block px-4 pt-4 sm:px-0 sm:pt-0">
              <div className="relative overflow-hidden rounded-2xl bg-transparent aspect-[3/4]">
                <img src={getImageUrl(images[active])} alt={product.name} className="h-full w-full object-contain p-2" />
                {discount > 0 && (
                  <span className="absolute top-3 right-3 inline-flex w-fit rounded-full bg-[#9d7463] px-2.5 py-1 text-[11px] font-bold leading-none text-white shadow">-{discount}%</span>
                )}
                {outOfStock && (
                  <span className="absolute top-3 left-3 rounded-full border border-stone-300 bg-white/90 px-3 py-1 text-xs font-bold text-stone-600">نفذت</span>
                )}
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.map((img, i) => (
                    <button key={i} type="button" onClick={() => setActive(i)} aria-label={`صورة ${i + 1}`}
                      className={`h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-white ring-1 transition ${i === active ? 'ring-2 ring-[#9d7463]' : 'ring-stone-200 opacity-70 hover:opacity-100'}`}>
                      <img src={getImageUrl(img)} alt="" className="h-full w-full object-contain p-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Story — RTL right-aligned, purchase before description */}
            <div className="flex flex-col px-4 pb-6 pt-4 sm:px-0 sm:py-0">
              <h1 className="text-right font-serif text-[22px] font-bold leading-snug text-stone-900 sm:text-2xl" dir="auto">{product.name}</h1>

              <div className="mt-3 flex flex-wrap items-baseline justify-start gap-2 text-right">
                <span className="text-[22px] font-bold leading-none text-stone-900">{formatPrice(displayPrice)}</span>
                {discount > 0 && !!product.originalPrice && !selectedCombo && (
                  <>
                    <span className="text-sm text-stone-400 line-through">{formatPrice(product.originalPrice)}</span>
                    <span className="inline-flex w-fit rounded-full bg-[#f3ece4] px-2 py-1 text-[11px] font-bold leading-none text-[#9d7463]">-{discount}%</span>
                  </>
                )}
                {isSelectedOOS && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600">غير متوفر</span>}
              </div>

              {/* Stock subtle */}
              {outOfStock ? (
                <p className="mt-2 text-right text-sm font-semibold text-red-600">نفذت الكمية</p>
              ) : !!remaining && (
                <p className="mt-2 text-right text-xs font-medium text-amber-700">باقي {remaining} فقط</p>
              )}
              {(() => {
                const loyalty = getLoyaltySettingsFromPage();
                if (!loyalty || !loyalty.is_enabled) return null;
                const pts = calcEarnedPoints(Number(displayPrice) || 0, loyalty);
                return pts > 0 ? (
                  <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                    <Gift className="h-3.5 w-3.5" /> كسب {pts} نقطة
                  </span>
                ) : null;
              })()}

              {/* Variants */}
              {(product.variants || []).length > 0 && (
                <div className="mt-5 space-y-4">
                  {(product.variants || []).map((group: any) => {
                    const isColor = COLOR_HINTS.some((h) => group.name.includes(h));
                    const combos: any[] = product.variantCombinations || product.variant_combinations || [];
                    return (
                      <div key={group.name}>
                        <p className="mb-2 text-right text-xs font-bold tracking-wide text-stone-500">
                          {group.name}: <span className="font-semibold text-stone-800">{selection[group.name] || `اختر ${group.name}`}</span>
                        </p>
                        <div className="flex flex-wrap justify-start gap-2">
                          {(group.values || group.options || []).map((val: string) => {
                            const isActive = selection[group.name] === val;
                            const isUnavailable = (() => {
                              if (!combos.length || product.allowBackorder) return false;
                              const testSel = { ...selection, [group.name]: val };
                              const hasCompleteCombo = combos.some((c: any) => {
                                const vals: string[] = (c.values || []).map((v: any) => String(v).trim());
                                return Object.values(testSel).every((sv) => vals.includes(String(sv).trim()));
                              });
                              if (!hasCompleteCombo && Object.keys(testSel).length < (product.variants || []).length) return false;
                              const match = combos.find((c: any) => {
                                const vals: string[] = (c.values || []).map((v: any) => String(v).trim());
                                return vals.includes(String(val).trim()) && Object.entries(testSel).every(([k, vv]) => vals.includes(String(vv).trim()));
                              });
                              if (!match) return false;
                              const st = match.stock !== undefined ? Number(match.stock) : NaN;
                              return Number.isFinite(st) && st <= 0;
                            })();
                            return (
                              <button key={val} type="button" title={val} disabled={isUnavailable}
                                onClick={() => !isUnavailable && setSelection((s) => ({ ...s, [group.name]: val }))}
                                className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-[13px] font-medium transition-all ${
                                  isUnavailable ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 line-through' : isActive ? 'border-[#9d7463] bg-[#9d7463] text-white shadow' : 'border-stone-300 bg-white text-stone-700 hover:border-[#9d7463]'
                                }`}>
                                {isColor ? (
                                  <span className={`block h-5 w-5 rounded-full border ${isActive ? 'ring-2 ring-white' : 'border-black/10'}`} style={{ background: colorDot(val) }} />
                                ) : val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Purchase controls — before description */}
              <div ref={ctaRef} className="mt-5 flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-stone-300 bg-white">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center text-stone-500 hover:text-[#9d7463]" aria-label="تقليل الكمية"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-7 text-center text-sm font-bold" aria-live="polite">{qty}</span>
                  <button type="button" onClick={() => setQty((q) => q + 1)} className="flex h-9 w-9 items-center justify-center text-stone-500 hover:text-[#9d7463]" aria-label="زيادة الكمية"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={outOfStock || isSelectedOOS || adding || (variable && missingGroups.length > 0)}
                  className="flex h-[46px] flex-[1.35] items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#9d7463] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  {outOfStock || isSelectedOOS ? 'غير متوفر' : variable && missingGroups.length > 0 ? `اختر ${missingGroups.map((g: any) => g.name).join(' و')}` : adding ? 'جارٍ الإضافة…' : 'أضف إلى السلة'}
                </button>
                <button
                  type="button"
                  onClick={() => wishlist.toggle(product.id)}
                  aria-label={wished ? 'في المفضلة' : 'أضف إلى المفضلة'}
                  className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border transition ${wished ? 'border-[#9d7463] bg-[#9d7463] text-white' : 'border-stone-300 bg-white text-stone-500 hover:border-[#9d7463] hover:text-[#9d7463]'}`}
                >
                  <Heart className="h-5 w-5" fill={wished ? 'currentColor' : 'none'} />
                </button>
              </div>

              {adding && (
                <p className="mt-2 flex items-center gap-1.5 text-right text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> أُضيف إلى السلة
                </p>
              )}

              {/* Description — after purchase */}
              {product.description && (
                <div className="mt-6 border-t border-stone-200 pt-5">
                  <div className="flex items-center justify-end gap-2">
                    <h3 className="text-right text-[13px] font-bold tracking-wide text-stone-900">وصف المنتج</h3>
                    <span className="h-px w-6 bg-[#b08d57] shrink-0" aria-hidden />
                  </div>
                  <div
                    ref={descRef}
                    id="atelier-desc"
                    dir="auto"
                    className={`mt-3 break-words text-[14px] leading-[1.85] text-stone-600 [overflow-wrap:anywhere] ${!descExpanded ? 'line-clamp-4' : ''}`}
                    dangerouslySetInnerHTML={createSafeHtml(product.description || '')}
                  />
                  {descOverflows && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      aria-expanded={descExpanded}
                      aria-controls="atelier-desc"
                      className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-stone-600 hover:text-[#9d7463]"
                    >
                      {descExpanded ? (
                        <>عرض أقل <ChevronUp className="h-4 w-4" /></>
                      ) : (
                        <>عرض المزيد <ChevronDown className="h-4 w-4" /></>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Truthful benefits — only show COD if actually enabled, otherwise hide hardcoded claims */}
              {hasCOD && (
                <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-center text-xs font-medium text-stone-600 ring-1 ring-stone-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> الدفع عند الاستلام متاح
                </div>
              )}

              {waPhone && (
                <a href={askUrl} target="_blank" rel="noreferrer" className="mt-4 block text-center text-[13px] font-medium text-[#128C4B] hover:underline">
                  لديك استفسار؟ تواصل عبر واتساب
                </a>
              )}

              {/* Reviews */}
              <div className="mt-7 border-t border-stone-200 pt-5">
                <ProductReviews productId={product.id} />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky purchase bar — mobile only, safe-area, respects sheet scroll */}
        {showSticky && (
          <div className="flex shrink-0 items-center gap-3 border-t border-stone-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_16px_rgba(0,0,0,0.06)] sm:hidden">
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate text-xs text-stone-500" dir="auto">{product.name}</p>
              <p className="text-sm font-bold text-stone-900">{formatPrice(displayPrice)}</p>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={outOfStock || isSelectedOOS || adding || (variable && missingGroups.length > 0)}
              className="shrink-0 rounded-xl bg-stone-900 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#9d7463] disabled:bg-stone-300"
            >
              أضف إلى السلة
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function colorDot(val: string): string {
  const map: Record<string, string> = {
    أسود: '#111111', ابيض: '#ffffff', أبيض: '#ffffff', بيج: '#d9c9b6', رمادي: '#8a8a8a',
    زيتي: '#6b6b3a', أحمر: '#b91c1c', احمر: '#b91c1c', وردي: '#ec4899', زهري: '#f9a8d4',
    أزرق: '#1d4ed8', ازرق: '#1d4ed8', أخضر: '#15803d', اخضر: '#15803d', بني: '#78350f',
    ذهبي: '#d4af37', فضي: '#c0c0c0', كحلي: '#1e3a5f', موف: '#9333ea', نبيتي: '#7f1d1d',
  };
  return map[String(val).trim()] || '#cbd5e1';
}
