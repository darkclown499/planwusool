import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, PackageSearch, Plus, ShieldCheck, ShoppingCart, Trash2, X } from 'lucide-react';
import { getImageUrl, getOptimizedImageUrl } from '@/utils/image-helper';
import { SearchSheet } from '../shared/SearchSheet';
import { computeCartTotals, isVariableProduct, usePriceFormatter, useStorefrontCore } from '../shared/hooks';

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

/* Stable product image stage: identical aspect for every card, with a
   restrained neutral placeholder when no image exists — never a giant
   blank rectangle. */
export function HubProductStage({ src, alt, className, sizes, fit }: { src?: string; alt?: string; className?: string; sizes?: string; fit?: 'cover' | 'contain' }) {
  const [noImg, setNoImg] = useState(!src);
  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';
  if (noImg || !src) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-gray-50 to-gray-100 text-gray-300 ${className || ''}`}>
        <PackageSearch className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.3} />
        <span className="text-[11px] font-bold text-gray-400 sm:text-xs">لا توجد صورة</span>
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

  const specs = useMemo(() => {
    if (!product) return [] as Array<[string, string]>;
    return String(product.description || '')
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean)
      .slice(0, 8)
      .map((line: string, i: number): [string, string] => {
        const [k, ...rest] = line.split(':');
        return rest.length ? [k.trim(), rest.join(':').trim()] : [`ميزة ${i + 1}`, line];
      });
  }, [product]);

  if (!product) return null;

  const add = async () => {
    await cart.addToCart({ ...product, quantity: qty, selectedVariants: variable ? pick : undefined });
    onClose();
    setShowCart(true);
  };

  const discount = product.originalPrice && Number(product.originalPrice) > Number(product.price)
    ? Math.round(((Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice)) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" dir="rtl" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose}
        style={{ opacity: entering ? 0 : 1, transition: `opacity ${DUR.overlay}ms ${EASE}` }} />

      {/* Sheet / dialog */}
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
        style={{
          transform: entering ? 'translateY(40px)' : 'translateY(0)',
          opacity: entering ? 0 : 1,
          transition: `transform ${DUR.overlay}ms ${EASE}, opacity ${DUR.overlay}ms ${EASE}`,
        }}>
        {/* Drag handle (mobile only) */}
        <div className="mx-auto mt-2.5 hidden h-1.5 w-11 shrink-0 rounded-full bg-gray-200 sm:hidden" />

        {/* Close */}
        <button type="button" onClick={onClose} aria-label="إغلاق"
          className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-md backdrop-blur transition-all hover:bg-white hover:text-gray-700"
          style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}>
          <X className="h-5 w-5" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto sm:flex-row">
          {/* Product media — full-width top on mobile, half on desktop */}
          <div className="relative flex shrink-0 items-center justify-center bg-gray-50 p-6 sm:w-1/2 sm:p-8">
            <div className="aspect-square w-full max-w-[300px] sm:max-w-full">
              <HubProductStage src={product.image} alt={product.name} className="aspect-square" fit="contain" />
            </div>
            {discount > 0 && (
              <span className="absolute top-4 right-4 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm">-{discount}%</span>
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-1 flex-col p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-1/2 sm:p-6 sm:pb-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-extrabold leading-snug text-gray-900 sm:text-xl">{product.name}</h2>
              {product.availability !== 'out_of_stock' && (
                <span className="shrink-0 rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700 ring-1 ring-green-200">متوفر</span>
              )}
            </div>

            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{formatPrice(product.price)}</span>
              {discount > 0 && !!product.originalPrice && (
                <span className="text-sm text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
              )}
            </div>

            {/* Specs */}
            {specs.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
                <p className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500">المواصفات الرئيسية</p>
                <table className="w-full text-sm">
                  <tbody>
                    {specs.map(([k, v], i) => (
                      <tr key={`${k}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="w-24 shrink-0 px-3 py-2 align-top text-[12px] font-bold text-gray-400 sm:w-28 sm:text-[13px]">{k}</td>
                        <td className="px-3 py-2 text-[12px] leading-relaxed text-gray-700 sm:text-[13px]">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Variants */}
            {(product.variants || []).map((group: any) => (
              <div key={group.name} className="mt-4">
                <p className="mb-2 text-xs font-bold text-gray-500">— {group.name}</p>
                <div className="flex flex-wrap gap-2">
                  {(group.values || group.options || []).map((val: string) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPick((s) => ({ ...s, [group.name]: val }))}
                      className={`rounded-lg border px-4 py-1.5 text-sm font-bold transition-all ${
                        pick[group.name] === val
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600'
                      }`}
                      style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Add to cart */}
            <div className="mt-auto pt-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="أقل"
                    className="flex h-11 w-11 items-center justify-center text-gray-500 transition-colors hover:text-blue-600">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-9 text-center text-base font-extrabold text-gray-900">{qty}</span>
                  <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="أكثر"
                    className="flex h-11 w-11 items-center justify-center text-gray-500 transition-colors hover:text-blue-600">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={add}
                  disabled={missing.length > 0}
                  className="flex-1 rounded-xl bg-blue-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                  style={{ transitionDuration: `${DUR.micro}ms`, transitionTimingFunction: EASE }}
                >
                  {missing.length > 0 ? `اختار ${missing.map((g: any) => g.name).join(' و')}` : `أضف للسلة · ${formatPrice((Number(product.price) || 0) * qty)}`}
                </button>
              </div>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-400">
                <ShieldCheck className="h-3.5 w-3.5 text-green-500" /> ضمان رسمي سنة كاملة • فاتورة معتمدة
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
