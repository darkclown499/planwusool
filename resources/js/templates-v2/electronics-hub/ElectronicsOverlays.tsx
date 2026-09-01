import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Gift, Minus, PackageSearch, Plus, ShieldCheck, ShoppingCart, Trash2, X } from 'lucide-react';
import { getImageUrl, getOptimizedImageUrl } from '@/utils/image-helper';
import { createSafeHtml } from '@/utils/xss-protection';
import { SearchSheet } from '../shared/SearchSheet';
import { computeCartTotals, isVariableProduct, usePriceFormatter, useStorefrontCore } from '../shared/hooks';
import { calcEarnedPoints, getLoyaltySettingsFromPage } from '@/utils/loyalty';
import { ProductReviews } from '@/components/storefront/ProductReviews';

/* ===================================================================== */
/* Electronics Hub overlays — mobile-first premium.                       */
/* Quick View = bottom sheet on phone, split dialog on desktop.           */
/* Cart = full-width phone sheet, right drawer on desktop.                */
/* Light surfaces, navy text, controlled blue CTA.                        */
/* ===================================================================== */

const EASE = 'cubic-bezier(0.22,1,0.36,1)';
const DUR = { micro: 140, normal: 200, overlay: 300 };

/* ------------------------------------------------------------------ */
/* Shared dialog helpers                                               */
/* ------------------------------------------------------------------ */

function useLockScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
}

function useEsc(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

/* Stable product image stage: single coherent neutral plinth so transparent
   PNGs and white-embedded rasters sit on the same surface. */
export function HubProductStage({ src, alt, className, sizes, fit }: { src?: string; alt?: string; className?: string; sizes?: string; fit?: 'cover' | 'contain' }) {
  const [noImg, setNoImg] = useState(!src);
  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';
  if (noImg || !src) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-[#f1f4f8] text-[#b6bfcc] ${className || ''}`}>
        <PackageSearch className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.3} />
        <span className="text-[11px] font-bold text-[#8a93a2] sm:text-xs">لا توجد صورة</span>
      </div>
    );
  }
  return (
    <img
      src={getOptimizedImageUrl(src, 'medium')}
      alt={alt || ''}
      loading="lazy"
      decoding="async"
      className={`h-full w-full ${fitClass} ${className || ''}`}
      sizes={sizes}
      onError={(e) => { const el = e.currentTarget; if (el.src !== getImageUrl(src)) { el.src = getImageUrl(src); } else { setNoImg(true); } }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* CART DRAWER — full-width phone sheet, right drawer on desktop       */
/* ------------------------------------------------------------------ */

export function HubCartDrawer({ onClose, onCheckout }: any) {
  const { cart, config } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const items = cart.cartItems || [];
  const totals = computeCartTotals(items);
  const [entering, setEntering] = useState(true);
  useLockScroll();
  useEsc(onClose);

  useEffect(() => {
    const t = setTimeout(() => setEntering(false), DUR.overlay);
    return () => clearTimeout(t);
  }, []);

  const waPhone = String(config?.socialMedia?.whatsapp || config?.whatsapp_widget_phone || '').replace(/[^0-9]/g, '');
  const orderWhatsapp = () => { onClose(); setTimeout(() => onCheckout(), 120); };

  return (
    <div className="fixed inset-0 z-[60]" dir="rtl" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose}
        style={{ opacity: entering ? 0 : 1, transition: `opacity ${DUR.overlay}ms ${EASE}` }} />

      {/* Drawer — full on phone, 420px right drawer on desktop */}
      <aside className="absolute inset-y-0 right-0 left-auto flex w-full max-w-md flex-col bg-white shadow-2xl"
        style={{
          transform: entering ? 'translateX(100%)' : 'translateX(0)',
          transition: `transform ${DUR.overlay}ms ${EASE}`,
        }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 sm:px-5 sm:py-4">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
            <ShoppingCart className="h-5 w-5 text-blue-600" /> سلة الأجهزة ({totals.count})
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 pb-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <ShoppingCart className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <p className="font-bold text-gray-800">السلة فاضية</p>
                <p className="mt-1 text-sm text-gray-400">اختر جهازك القادم من عروضنا</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98]">
                تصفح الأجهزة
              </button>
            </div>
          ) : (
            <ul className="space-y-2.5 pt-1">
              {items.map((item: any, index: number) => (
                <li key={`${item.id}-${index}`} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    <HubProductStage src={item.image} alt={item.name} className="h-14 w-14" fit="contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-800">{item.name}</p>
                    {!!item.selectedVariants && Object.values(item.selectedVariants).length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">{Object.values(item.selectedVariants).join(' · ')}</p>
                    )}
                    <p className="mt-1 text-sm font-extrabold text-gray-900">{formatPrice((Number(item.price) || 0) * item.quantity)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50">
                      <button type="button" onClick={() => cart.updateQuantity(index, -1)} aria-label="أقل"
                        className="flex h-8 w-8 items-center justify-center text-gray-500 transition-colors hover:text-blue-600">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-extrabold text-gray-900">{item.quantity}</span>
                      <button type="button" onClick={() => cart.updateQuantity(index, 1)} aria-label="أكثر"
                        className="flex h-8 w-8 items-center justify-center text-gray-500 transition-colors hover:text-blue-600">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button type="button" onClick={() => cart.removeFromCart(index)} aria-label="حذف"
                      className="text-gray-300 transition-colors hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Summary — thumb-friendly CTA, safe-area aware */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500">الإجمالي</span>
              <span className="text-xl font-extrabold text-gray-900">{formatPrice(totals.total)}</span>
            </div>
            <button type="button" onClick={onCheckout}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-[0.98]">
              إتمام الشراء
            </button>
            {waPhone && (
              <button type="button" onClick={orderWhatsapp}
                className="mt-2 w-full rounded-xl border border-green-200 bg-green-50 py-3 text-sm font-bold text-green-700 transition-all hover:bg-green-100">
                اطلب عبر واتساب
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* QUICK VIEW — mobile bottom sheet / desktop split dialog             */
/* ------------------------------------------------------------------ */

export function HubProductModal({ product, onClose }: any) {
  const { cart, ui: { setShowCart } } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const [qty, setQty] = useState(1);
  const [pick, setPick] = useState<Record<string, string>>({});
  const variable = isVariableProduct(product);
  const missing = variable ? (product.variants || []).filter((g: any) => !pick[g.name]) : [];
  const [entering, setEntering] = useState(true);
  useLockScroll();
  useEsc(onClose);

  useEffect(() => {
    const t = setTimeout(() => setEntering(false), DUR.overlay);
    return () => clearTimeout(t);
  }, []);

  if (!product) return null;

  const add = async () => {
    await cart.addToCart({ ...product, quantity: qty, selectedVariants: variable ? pick : undefined });
    onClose();
    setShowCart(true);
  };

  const discount = product.originalPrice && Number(product.originalPrice) > Number(product.price)
    ? Math.round(((Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)) * 100)
    : 0;

  /* Safe description HTML — reuse project sanitizer; preserve XSS safety */
  const descriptionHtml = useMemo(() => {
    const raw = String(product.description || '').trim();
    if (!raw) return '';
    // If merchant stored plain text with line breaks but no tags, preserve breaks
    const hasTags = /<[a-z][\s\S]*>/i.test(raw);
    const html = hasTags ? raw : raw.replace(/\n/g, '<br />');
    return html;
  }, [product.description]);

  const loyaltyPoints = useMemo(() => {
    const ls = getLoyaltySettingsFromPage();
    if (!ls?.is_enabled) return 0;
    return calcEarnedPoints(Number(product.price) || 0, ls);
  }, [product.price]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4 md:p-6" dir="rtl" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0a1220]/55 backdrop-blur-[2px]" onClick={onClose}
        style={{ opacity: entering ? 0 : 1, transition: `opacity ${DUR.overlay}ms ${EASE}` }} />

      {/* Premium retail panel — balanced media + info, no giant dead canvas */}
      <div className="relative flex max-h-[92dvh] w-full max-w-[900px] flex-col overflow-hidden bg-white shadow-2xl rounded-t-2xl sm:rounded-2xl border border-[#e6ebf1]"
        style={{
          transform: entering ? 'translateY(24px)' : 'translateY(0)',
          opacity: entering ? 0 : 1,
          transition: `transform ${DUR.overlay}ms ${EASE}, opacity ${DUR.overlay}ms ${EASE}`,
        }}>
        {/* Close */}
        <button type="button" onClick={onClose} aria-label="إغلاق"
          className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#5b6472] shadow-md ring-1 ring-[#e6ebf1] backdrop-blur transition-all hover:bg-white hover:text-[#0a1220]"
          style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
          <X className="h-5 w-5" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row">
          {/* MEDIA — meaningful weight, same neutral plinth as cards */}
          <div className="relative flex shrink-0 items-center justify-center bg-[#f1f4f8] p-5 sm:p-7 lg:w-[52%] xl:w-[54%] lg:p-8">
            <div className="aspect-square w-full max-w-[360px] lg:max-w-[420px] xl:max-w-[440px]">
              <HubProductStage src={product.image} alt={product.name} className="aspect-square p-2 sm:p-3" fit="contain" />
            </div>
            {discount > 0 && (
              <span className="absolute right-3 top-3 rounded-md bg-[#e11d48] px-2.5 py-1 text-xs font-extrabold text-white shadow-sm sm:right-4 sm:top-4">-{discount}%</span>
            )}
            {product.availability === 'out_of_stock' && (
              <span className="absolute inset-0 flex items-center justify-center bg-[#0a1220]/55 text-sm font-bold text-white">غير متوفر</span>
            )}
          </div>

          {/* INFO — clear hierarchy, not cramped */}
          <div className="flex flex-1 flex-col p-5 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 lg:p-7 lg:pb-7">
            {/* Title row */}
            <div className="flex items-start justify-between gap-3 pe-8">
              <h2 className="text-[18px] font-extrabold leading-snug text-[#0a1220] sm:text-xl lg:text-[22px]">{product.name}</h2>
              {product.availability !== 'out_of_stock' ? (
                <span className="shrink-0 rounded-md bg-[#ecfdf5] px-2 py-1 text-[11px] font-extrabold text-[#059669] ring-1 ring-[#a7f3d0]">متوفر</span>
              ) : null}
            </div>

            {/* Price hierarchy */}
            <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
              <span className="text-[26px] font-extrabold tracking-tight text-[#0a1220] sm:text-[30px]">{formatPrice(product.price)}</span>
              {discount > 0 && !!product.originalPrice && (
                <span className="text-sm font-semibold text-[#8a93a2] line-through">{formatPrice(product.originalPrice)}</span>
              )}
              {discount > 0 && (
                <span className="rounded-md bg-[#fef2f2] px-2 py-0.5 text-xs font-extrabold text-[#e11d48] ring-1 ring-[#fecaca]">خصم {discount}%</span>
              )}
            </div>
            {loyaltyPoints > 0 && (
              <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-[#fffbeb] px-2.5 py-1 text-xs font-bold text-[#b45309] ring-1 ring-[#fde68a]"><Gift className="h-3 w-3" /> +{loyaltyPoints} نقطة</span>
            )}

            {/* Description — sanitized rich HTML, never raw tags */}
            {descriptionHtml ? (
              <div className="mt-5 overflow-hidden rounded-xl border border-[#e6ebf1]">
                <p className="border-b border-[#e6ebf1] bg-[#f1f4f8] px-4 py-2 text-xs font-extrabold tracking-wide text-[#0a1220]">الوصف والمواصفات</p>
                <div
                  className="max-w-none p-4 text-[13px] leading-7 text-[#2d3748] prose prose-sm prose-p:my-2 prose-p:leading-7 prose-strong:text-[#0a1220] prose-strong:font-extrabold prose-headings:font-extrabold prose-headings:text-[#0a1220] prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-a:text-[#2563eb] prose-a:font-bold prose-ul:my-2 prose-ol:my-2 prose-li:marker:text-[#8a93a2] prose-img:rounded-lg prose-img:border prose-img:border-[#e6ebf1]"
                  dangerouslySetInnerHTML={createSafeHtml(descriptionHtml)}
                />
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-[#8a93a2]">لا يتوفر وصف مفصل لهذا الجهاز حالياً.</p>
            )}

            {/* Variants */}
            {(product.variants || []).map((group: any) => (
              <div key={group.name} className="mt-5">
                <p className="mb-2 text-xs font-extrabold tracking-wide text-[#0a1220]">{group.name}</p>
                <div className="flex flex-wrap gap-2">
                  {(group.values || group.options || []).map((val: string) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPick((s) => ({ ...s, [group.name]: val }))}
                      className={`rounded-lg border px-4 py-2 text-sm font-bold transition-all ${
                        pick[group.name] === val
                          ? 'border-[#2563eb] bg-[#2563eb] text-white shadow-sm'
                          : 'border-[#e6ebf1] bg-white text-[#5b6472] hover:border-[#2563eb]/40 hover:text-[#2563eb]'
                      }`}
                      style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-5 border-t border-[#e6ebf1] pt-4">
              <ProductReviews productId={product.id} />
            </div>

            {/* Quantity + CTA — pinned to bottom of info column */}
            <div className="mt-6 pt-2">
              <div className="flex items-stretch gap-3">
                <div className="flex items-center rounded-xl border border-[#e6ebf1] bg-[#f8fafc]">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="أقل"
                    className="flex h-12 w-11 items-center justify-center text-[#5b6472] transition-colors hover:text-[#2563eb]">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-[15px] font-extrabold text-[#0a1220]">{qty}</span>
                  <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="أكثر"
                    className="flex h-11 w-11 items-center justify-center text-[#5b6472] transition-colors hover:text-[#2563eb]">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={add}
                  disabled={missing.length > 0 || product.availability === 'out_of_stock'}
                  className="flex flex-1 items-center justify-center rounded-xl bg-[var(--store-primary,#0a1220)] px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#0a1220]/15 transition-all hover:brightness-90 active:scale-[0.98] disabled:bg-[#e6ebf1] disabled:text-[#8a93a2] disabled:shadow-none"
                  style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}
                >
                  {product.availability === 'out_of_stock' ? 'غير متوفر' : missing.length > 0 ? `اختار ${missing.map((g: any) => g.name).join(' و')}` : `أضف للسلة · ${formatPrice((Number(product.price) || 0) * qty)}`}
                </button>
              </div>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#8a93a2]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#059669]" /> ضمان رسمي سنة كاملة • فاتورة معتمدة
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SEARCH OVERLAY — Thin wrapper over shared SearchSheet               */
/* ------------------------------------------------------------------ */

export function HubSearchOverlay({ onClose, onProductClick }: any) {
  return <SearchSheet onClose={onClose} onProductClick={onProductClick} accent="#2563eb" placeholder="ابحث عن جهاز… آيفون، لابتوب، سماعات" variant="electronics" />;
}

export const hubOverlays = {
  cart: HubCartDrawer,
  product_detail: HubProductModal,
  search: HubSearchOverlay,
};
