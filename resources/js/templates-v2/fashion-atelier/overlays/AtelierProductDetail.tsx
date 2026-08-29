import React, { useEffect, useLayoutEffect, useMemo, useState, useRef } from 'react';
import { Check, Gift, Heart, Minus, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getImageUrl, getOptimizedImageUrl } from '@/utils/image-helper';
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

/**
 * Mobile quick-view: a focused FLOATING card above the blurred storefront
 * (90–92vw, max 420px) with an image-first hero, pointer swipe-down dismiss,
 * horizontal image carousel, internal scroll and an accordion for
 * description/details/reviews. Desktop keeps the original two-column layout.
 */
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

  // Mobile accordions — description / details / reviews (collapsed by default)
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (key: string) => setOpenSection((prev) => (prev === key ? null : key));

  // Mobile image carousel — pointer-driven horizontal swipe (LTR math, RTL-safe)
  const carouselRef = useRef<HTMLDivElement>(null);
  const [slideW, setSlideW] = useState(0);
  const [imgDx, setImgDx] = useState(0);
  const [imgSnapping, setImgSnapping] = useState(true);
  useLayoutEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const measure = () => setSlideW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Description overflow detection — desktop expandable description only
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) return;
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
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Sticky bar observer — must track against actual sheet scroll viewport, not browser viewport (mobile only)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) return;
    const el = ctaRef.current;
    const root = scrollContainerRef.current;
    if (!el || !root) return;
    const obs = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting), { root, threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  // Exit animation — smooth downward slide (280–360ms) then unmount; reduced
  // motion shortens the duration instead of disabling the close transition.
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const ANIM_MS = reducedMotion ? 90 : 320;
  const [exiting, setExiting] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestClose = () => {
    if (exiting) return;
    setExiting(true);
    exitTimer.current = setTimeout(onClose, ANIM_MS);
  };
  useEffect(() => () => { if (exitTimer.current) clearTimeout(exitTimer.current); }, []);
  const handleClose = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) onClose();
    else requestClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  // Media gesture arbitration: horizontal drag = image carousel,
  // downward drag = dismiss, upward drag = internal scroll (manual).
  const gesture = useRef<{ mode: 'none' | 'pending' | 'image' | 'card' | 'scroll'; startX: number; startY: number; startT: number; startScroll: number }>({ mode: 'none', startX: 0, startY: 0, startT: 0, startScroll: 0 });
  const onMediaPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.innerWidth >= 640) return;
    gesture.current = { mode: 'pending', startX: e.clientX, startY: e.clientY, startT: Date.now(), startScroll: scrollContainerRef.current?.scrollTop ?? 0 };
    setImgSnapping(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMediaPointerMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    const g = gesture.current;
    if (g.mode === 'none') return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (g.mode === 'pending') {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        g.mode = dy < 0 ? 'scroll' : 'card';
        if (g.mode === 'card') setIsDragging(true);
      } else {
        g.mode = 'image';
      }
    }
    if (g.mode === 'image') {
      setImgDx(dx);
    } else if (g.mode === 'card') {
      setDragY(Math.max(0, dy));
    } else if (g.mode === 'scroll') {
      const sc = scrollContainerRef.current;
      if (sc) sc.scrollTop = Math.max(0, g.startScroll - dy);
    }
  };
  const onMediaPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    const g = gesture.current;
    if (g.mode === 'none') return;
    if (g.mode === 'pending') {
      setImgSnapping(true);
    } else if (g.mode === 'image') {
      const W = slideW || carouselRef.current?.clientWidth || 320;
      const dx = e.clientX - g.startX;
      const elapsed = Date.now() - g.startT;
      const velocity = elapsed > 0 ? dx / elapsed : 0;
      setImgSnapping(true);
      setImgDx(0);
      if (dx < -W * 0.18 || velocity < -0.5) setActive((a) => Math.min(images.length - 1, a + 1));
      else if (dx > W * 0.18 || velocity > 0.5) setActive((a) => Math.max(0, a - 1));
    } else if (g.mode === 'card') {
      setIsDragging(false);
      const dy = e.clientY - g.startY;
      const elapsed = Date.now() - g.startT;
      const velocity = elapsed > 0 ? dy / elapsed : 0;
      const h = sheetRef.current?.offsetHeight || 620;
      setDragY(0);
      if (dy > h * 0.27 || velocity > 0.62) requestClose();
    }
    gesture.current.mode = 'none';
  };
  const onMediaPointerCancel = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (gesture.current.mode === 'card') setIsDragging(false);
    setDragY(0);
    setImgDx(0);
    setImgSnapping(true);
    gesture.current.mode = 'none';
  };

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
      handleClose();
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

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 640;
  const backdropOpacity = exiting ? 0 : Math.max(0, Math.min(1, 1 - dragY / 520));
  const blurBase = isDesktop ? 8 : 12;
  const backdropBlur = exiting ? 0 : Math.max(0, blurBase * (1 - dragY / 520));
  const trackX = (imgSnapping ? 0 : imgDx) - active * slideW;

  return (
    <div dir="rtl" role="dialog" aria-modal="true" aria-label={product.name} className="fixed inset-0 z-[70] flex items-center justify-center sm:items-center sm:p-4">
      {/* Backdrop — storefront stays visible, dimmed + blurred; tap closes */}
      <div className="absolute inset-0 bg-[rgba(30,25,22,0.22)] atelier-focus-backdrop" onClick={handleClose} style={{ backdropFilter: `blur(${backdropBlur}px)`, WebkitBackdropFilter: `blur(${backdropBlur}px)`, opacity: backdropOpacity, transition: `opacity ${ANIM_MS}ms ease-out` } as any} />

      <style>{`@keyframes atelierFadeIn{from{opacity:0}to{opacity:1}}@keyframes atelierCardIn{from{opacity:0;transform:translateY(18px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes atelierSheetIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes atelierImageIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}.atelier-focus-backdrop{animation:atelierFadeIn 300ms ease-out}.atelier-product-card{animation:atelierCardIn 300ms cubic-bezier(.22,.9,.3,1)}.atelier-product-image{animation:atelierImageIn 300ms cubic-bezier(.2,.8,.2,1)}.atelier-info-sheet{animation:atelierSheetIn 320ms cubic-bezier(.22,.9,.3,1) 40ms both}@media(max-width:639px){.atelier-info-sheet{animation:none!important}}@media(min-width:640px){.atelier-focus-backdrop{animation:atelierFadeIn 220ms ease-out}.atelier-product-image{animation:atelierImageIn 260ms cubic-bezier(.2,.8,.2,1)}.atelier-info-sheet{animation:atelierSheetIn 260ms cubic-bezier(.2,.8,.2,1) 60ms both}}@media(prefers-reduced-motion:reduce){.atelier-focus-backdrop,.atelier-product-card,.atelier-product-image,.atelier-info-sheet{animation-duration:90ms!important;animation-delay:0ms!important}}@media(min-width:640px) and (prefers-reduced-motion:reduce){.atelier-focus-backdrop,.atelier-product-image,.atelier-info-sheet{animation:none!important}}`}</style>

      {/* Mobile close — overlay-level top-left, floats above the card, stays accessible while the card scrolls */}
      <button type="button" onClick={handleClose} aria-label="إغلاق"
        className="absolute left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-[0_6px_18px_rgba(40,30,20,0.18)] ring-1 ring-black/5 transition hover:text-stone-900 active:scale-95 sm:hidden">
        <X className="h-5 w-5" />
      </button>

      {/* Floating card — mobile 92vw / 420px, breathing room around it; desktop unchanged */}
      <div ref={sheetRef} className="atelier-product-card relative flex max-h-[90dvh] w-[92vw] max-w-[420px] flex-col overflow-hidden rounded-[28px] bg-[#faf7f2] shadow-[0_24px_60px_-16px_rgba(40,30,20,0.32),0_10px_24px_-10px_rgba(40,30,20,0.16)] sm:max-h-[88vh] sm:w-full sm:max-w-4xl sm:rounded-2xl sm:shadow-2xl"
        style={{ transform: exiting ? 'translateY(110%)' : dragY ? `translateY(${dragY}px)` : undefined, transition: isDragging ? 'none' : `transform ${ANIM_MS}ms cubic-bezier(0.22,0.9,0.3,1)` } as any}>

        {/* Desktop close — unchanged in-sheet position */}
        <button type="button" onClick={handleClose} aria-label="إغلاق"
          className="absolute left-4 top-4 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/95 text-stone-600 shadow ring-1 ring-stone-200 transition hover:text-stone-900 active:scale-95 sm:flex sm:h-9 sm:w-9 sm:bg-white/90 sm:active:scale-100">
          <X className="h-5 w-5" />
        </button>

        {/* Mobile media hero — product image is the visual focus; horizontal swipe + dots */}
        {images.length > 0 && (
          <div className="shrink-0 sm:hidden">
            <div
              className="relative overflow-hidden aspect-[4/5] [background:radial-gradient(120%_90%_at_50%_18%,#fffdf9_0%,#f6efe7_58%,#efe4d6_100%)]"
            >
              <div
                ref={carouselRef}
                dir="ltr"
                onPointerDown={onMediaPointerDown}
                onPointerMove={onMediaPointerMove}
                onPointerUp={onMediaPointerUp}
                onPointerCancel={onMediaPointerCancel}
                aria-label="صور المنتج"
                className="h-full w-full touch-none select-none overflow-hidden"
              >
                <div className="flex h-full w-max will-change-transform" style={{ transform: `translateX(${trackX}px)`, transition: imgSnapping ? 'transform 240ms cubic-bezier(0.22,0.9,0.3,1)' : 'none' } as any}>
                  {images.map((img, i) => (
                    <img key={i} src={getOptimizedImageUrl(img || '', 'medium')} alt={`${product.name} - ${i + 1}`} decoding="async" loading={i === 0 ? 'eager' : 'lazy'}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImageUrl(img || ''); }}
                      className="h-full w-full shrink-0 object-contain p-4" style={{ width: slideW || undefined } as any} />
                  ))}
                </div>
              </div>
              {discount > 0 && <span className="pointer-events-none absolute top-3 right-3 inline-flex w-fit rounded-full bg-[#9d7463] px-2.5 py-1 text-[11px] font-bold leading-none text-white shadow">-{discount}%</span>}
              {outOfStock && <span className="pointer-events-none absolute top-3 left-3 rounded-full border border-stone-300 bg-white/90 px-3 py-1 text-xs font-bold text-stone-600">نفذت</span>}
            </div>
            {images.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-3">
                {images.map((_, i) => (
                  <button key={i} type="button" onClick={() => setActive(i)} aria-label={`صورة ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-stone-800' : 'w-1.5 bg-stone-400/70'}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Desktop close position note — the desktop X lives inside the sheet above (unchanged) */}

        <div ref={scrollContainerRef} className="atelier-info-sheet flex-1 overflow-y-auto overscroll-contain pt-1 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:mt-0 sm:py-0">
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

            {/* Story — RTL right-aligned, tighter product-summary composition */}
            <div className="flex flex-col px-5 pb-6 pt-4 sm:px-0 sm:py-0">
              <h1 className="text-right font-serif text-[21px] font-semibold leading-snug text-stone-900 sm:text-[22px]" dir="auto">{product.name}</h1>

              <div className="mt-2.5 flex flex-wrap items-baseline justify-start gap-2 text-right">
                <span className="text-[19px] font-bold leading-none text-stone-900 sm:text-[20px]">{formatPrice(displayPrice)}</span>
                {discount > 0 && !!product.originalPrice && !selectedCombo && (
                  <>
                    <span className="text-sm text-stone-400 line-through">{formatPrice(product.originalPrice)}</span>
                    <span className="inline-flex w-fit rounded-full bg-[#f3ece4] px-2 py-1 text-[11px] font-bold leading-none text-[#9d7463]">-{discount}%</span>
                  </>
                )}
                {isSelectedOOS && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600">غير متوفر</span>}
              </div>

              {/* Stock + loyalty — tightly coupled to price, warm accent 12px */}
              <div className="mt-1.5 flex flex-wrap items-center justify-start gap-2">
                {outOfStock ? (
                  <span className="text-[12px] font-semibold text-red-600">نفذت الكمية</span>
                ) : !!remaining ? (
                  <span className="text-[12px] font-medium text-amber-700">باقي {remaining} فقط</span>
                ) : null}
                {(() => {
                  const loyalty = getLoyaltySettingsFromPage();
                  if (!loyalty || !loyalty.is_enabled) return null;
                  const pts = calcEarnedPoints(Number(displayPrice) || 0, loyalty);
                  return pts > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-600">
                      <Gift className="h-3 w-3" /> كسب {pts} نقطة
                    </span>
                  ) : null;
                })()}
              </div>

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

              {/* Purchase controls — desktop inline row unchanged; mobile stacked ≥44px targets */}
              <div className="mt-4">
                {/* Mobile purchase block */}
                <div ref={ctaRef} className="flex flex-col gap-2.5 sm:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-[50px] w-[120px] shrink-0 items-center justify-between rounded-[14px] border border-stone-300 bg-white px-0.5 shadow-sm">
                      <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-[#9d7463]" aria-label="تقليل الكمية"><Minus className="h-4 w-4" /></button>
                      <span className="w-7 text-center text-[14px] font-bold text-stone-800" aria-live="polite">{qty}</span>
                      <button type="button" onClick={() => setQty((q) => q + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-[#9d7463]" aria-label="زيادة الكمية"><Plus className="h-4 w-4" /></button>
                    </div>
                    <button
                      type="button"
                      onClick={() => wishlist.toggle(product.id)}
                      aria-label={wished ? 'في المفضلة' : 'أضف إلى المفضلة'}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border text-stone-500 shadow-sm transition ${wished ? 'border-[#9d7463] bg-[#9d7463] !text-white shadow' : 'border-stone-300 bg-white hover:border-[#9d7463] hover:text-[#9d7463]'}`}
                    >
                      <Heart className="h-[18px] w-[18px]" fill={wished ? 'currentColor' : 'none'} strokeWidth={1.8} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={outOfStock || isSelectedOOS || adding || (variable && missingGroups.length > 0)}
                    className="flex h-[50px] w-full items-center justify-center rounded-[14px] bg-stone-900 px-4 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#9d7463] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    {outOfStock || isSelectedOOS ? 'غير متوفر' : variable && missingGroups.length > 0 ? `اختر ${missingGroups.map((g: any) => g.name).join(' و')}` : adding ? 'جارٍ الإضافة…' : 'أضف إلى السلة'}
                  </button>
                </div>
                {/* Desktop purchase block — unchanged */}
                <div className="hidden sm:flex sm:items-center sm:gap-2.5">
                  <div className="flex h-[42px] w-[88px] shrink-0 items-center justify-between rounded-[12px] border border-stone-300 bg-white px-1 shadow-sm">
                    <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-[#9d7463]" aria-label="تقليل الكمية"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-7 text-center text-[14px] font-bold text-stone-800" aria-live="polite">{qty}</span>
                    <button type="button" onClick={() => setQty((q) => q + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-[#9d7463]" aria-label="زيادة الكمية"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={outOfStock || isSelectedOOS || adding || (variable && missingGroups.length > 0)}
                    className="flex h-[46px] flex-1 items-center justify-center rounded-[12px] bg-stone-900 px-4 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#9d7463] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    {outOfStock || isSelectedOOS ? 'غير متوفر' : variable && missingGroups.length > 0 ? `اختر ${missingGroups.map((g: any) => g.name).join(' و')}` : adding ? 'جارٍ الإضافة…' : 'أضف إلى السلة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => wishlist.toggle(product.id)}
                    aria-label={wished ? 'في المفضلة' : 'أضف إلى المفضلة'}
                    className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] border text-stone-500 shadow-sm transition ${wished ? 'border-[#9d7463] bg-[#9d7463] !text-white shadow' : 'border-stone-300 bg-white hover:border-[#9d7463] hover:text-[#9d7463]'}`}
                  >
                    <Heart className="h-[18px] w-[18px]" fill={wished ? 'currentColor' : 'none'} strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              {adding && (
                <p className="mt-2 flex items-center gap-1.5 text-right text-xs font-semibold text-[#9d7463]">
                  <Check className="h-3.5 w-3.5" /> أُضيف إلى السلة
                </p>
              )}

              {/* Mobile — service notes then collapsible sections */}
              <div className="mt-5 sm:hidden">
                {hasCOD && (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-center text-xs font-medium text-stone-600 ring-1 ring-stone-200">
                    <span className="h-2 w-2 rounded-full bg-[#9d7463]" /> الدفع عند الاستلام متاح
                  </div>
                )}
                {waPhone && (
                  <a href={askUrl} target="_blank" rel="noreferrer" className="mt-3 block text-center text-[13px] font-medium text-[#128C4B] hover:underline">
                    لديك استفسار؟ تواصل عبر واتساب
                  </a>
                )}
              </div>
              <div className="mt-5 border-t border-stone-200 pt-2 sm:hidden">
                {product.description && (
                  <MobileAccordion title="وصف المنتج" open={openSection === 'description'} onToggle={() => toggleSection('description')}>
                    <div dir="auto" className="break-words text-[13.5px] leading-[1.9] text-stone-600 [overflow-wrap:anywhere]" dangerouslySetInnerHTML={createSafeHtml(product.description || '')} />
                  </MobileAccordion>
                )}
                {(product.customFields || []).length > 0 && (
                  <MobileAccordion title="التفاصيل" open={openSection === 'details'} onToggle={() => toggleSection('details')}>
                    <dl className="divide-y divide-stone-100">
                      {(product.customFields || []).map((f: any, i: number) => (
                        <div key={i} className="flex items-start justify-between gap-4 py-2">
                          <dt className="shrink-0 text-[12px] font-medium text-stone-500">{String(f.name ?? '')}</dt>
                          <dd dir="auto" className="text-right text-[12.5px] font-medium text-stone-800">{String(f.value ?? '')}</dd>
                        </div>
                      ))}
                    </dl>
                  </MobileAccordion>
                )}
                <MobileAccordion title="التقييمات" open={openSection === 'reviews'} onToggle={() => toggleSection('reviews')}>
                  <ProductReviews productId={product.id} />
                </MobileAccordion>
              </div>

              {/* Desktop — description + service notes + reviews unchanged */}
              <div className="hidden sm:block">
                {product.description && (
                  <div className="mt-5 border-t border-stone-200 pt-5">
                    <div className="flex items-center justify-end gap-2.5">
                      <h3 className="text-right text-[13px] font-semibold tracking-wide text-stone-900 sm:text-[14px]">وصف المنتج</h3>
                      <span className="h-px w-[26px] bg-[#b08d57] shrink-0" aria-hidden />
                    </div>
                    <div
                      ref={descRef}
                      id="atelier-desc"
                      dir="auto"
                      className={`mt-3 break-words text-[14px] leading-[1.9] text-stone-600 [overflow-wrap:anywhere] ${!descExpanded ? 'line-clamp-4' : ''}`}
                      dangerouslySetInnerHTML={createSafeHtml(product.description || '')}
                    />
                    {descOverflows && (
                      <button
                        type="button"
                        onClick={() => setDescExpanded((v) => !v)}
                        aria-expanded={descExpanded}
                        aria-controls="atelier-desc"
                        className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-medium text-[#9d7463] hover:text-[#85604f]"
                      >
                        {descExpanded ? (
                          <>عرض أقل <ChevronUp className="h-3.5 w-3.5" /></>
                        ) : (
                          <>عرض المزيد <ChevronDown className="h-3.5 w-3.5" /></>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {hasCOD && (
                  <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-center text-xs font-medium text-stone-600 ring-1 ring-stone-200">
                    <span className="h-2 w-2 rounded-full bg-[#9d7463]" /> الدفع عند الاستلام متاح
                  </div>
                )}

                {waPhone && (
                  <a href={askUrl} target="_blank" rel="noreferrer" className="mt-4 block text-center text-[13px] font-medium text-[#128C4B] hover:underline">
                    لديك استفسار؟ تواصل عبر واتساب
                  </a>
                )}

                <div className="mt-7 border-t border-stone-200 pt-5">
                  <ProductReviews productId={product.id} />
                </div>
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

const MobileAccordion: React.FC<{ title: string; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, open, onToggle, children }) => (
  <div className="border-b border-stone-200/70 last:border-b-0">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={`atelier-acc-${title}`}
      className="flex min-h-[48px] w-full items-center justify-between gap-2 py-3 text-right transition hover:text-[#9d7463]"
    >
      <span className="text-[13px] font-semibold text-stone-900">{title}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && (
      <div id={`atelier-acc-${title}`} className="pb-4">
        {children}
      </div>
    )}
  </div>
);

function colorDot(val: string): string {
  const map: Record<string, string> = {
    أسود: '#111111', ابيض: '#ffffff', أبيض: '#ffffff', بيج: '#d9c9b6', رمادي: '#8a8a8a',
    زيتي: '#6b6b3a', أحمر: '#b91c1c', احمر: '#b91c1c', وردي: '#ec4899', زهري: '#f9a8d4',
    أزرق: '#1d4ed8', ازرق: '#1d4ed8', أخضر: '#15803d', اخضر: '#15803d', بني: '#78350f',
    ذهبي: '#d4af37', فضي: '#c0c0c0', كحلي: '#1e3a5f', موف: '#9333ea', نبيتي: '#7f1d1d',
  };
  return map[String(val).trim()] || '#cbd5e1';
}