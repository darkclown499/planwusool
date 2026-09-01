import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Search, ShoppingBasket, Trash2, X } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { createSafeHtml } from '@/utils/xss-protection';
import { computeCartTotals, discountPercent, isVariableProduct, resolveFreeShippingThreshold, usePriceFormatter, useStorefrontCore } from '../shared/hooks';
import { SearchSheet } from '../shared/SearchSheet';

/* ===================================================================== */
/* Souq overlays — a working cart drawer and a quick product sheet, both  */
/* built for weekly-grocery runs: big quantity steppers, running totals   */
/* and WhatsApp checkout for the neighborhood souq.                       */
/* ===================================================================== */

const FALLBACK_FREE_SHIPPING: number | null = null;
const BIDDI_YELLOW = 'var(--store-primary, #FFC20E)';
const BIDDI_BLACK = '#0F1620';

export function SouqCartDrawer({ onClose, onCheckout, onProductClick }: any) {
  const { cart, config, content, behavior } = useStorefrontCore() as any;
  const formatPrice = usePriceFormatter();
  const items = cart.cartItems || [];
  const totals = computeCartTotals(items);
  const effectiveThreshold = resolveFreeShippingThreshold(content, FALLBACK_FREE_SHIPPING, behavior);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const remainingForShipping = effectiveThreshold !== null ? Math.max(0, effectiveThreshold - totals.subtotal) : 0;
  const showFreeShipping = effectiveThreshold !== null;
  const waPhone = String(config?.socialMedia?.whatsapp || config?.whatsapp_widget_phone || '').replace(/[^0-9]/g, '');

  const orderWhatsapp = () => {
    onClose();
    setTimeout(() => onCheckout(), 120);
  };

  return (
    <div className="fixed inset-0 z-[60]" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#0F1620] px-5 py-4 text-white">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <ShoppingBasket className="h-5 w-5" /> سلة المشتريات ({totals.count})
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-1.5 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length > 0 && showFreeShipping && (
          <div className="px-5 py-2.5 text-center text-xs font-bold text-[#0F1620] ring-1" style={{ background: 'color-mix(in srgb, var(--store-primary, #FFC20E) 15%, white)', borderColor: 'color-mix(in srgb, var(--store-primary, #FFC20E) 20%, transparent)' }}>
            {remainingForShipping > 0 ? `أضف ${formatPrice(remainingForShipping)} واحصل على توصيل مجاني 🚚` : '🎉 مبروك! التوصيل مجاني لهذا الطلب'}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl">🧺</span>
              <p className="font-bold text-stone-600">سلّتك فارغة</p>
              <p className="text-sm text-stone-400">ابدأ بإضافة خضار وفواكه طازجة</p>
              <button type="button" onClick={onClose} className="mt-1 rounded-full bg-[#0F1620] px-6 py-2 text-sm font-black text-white hover:bg-black">
                تسوّق الآن
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item: any, index: number) => (
                <li key={`${item.id}-${index}`} className="flex items-center gap-3 rounded-[18px] border border-black/5 bg-white p-2.5 shadow-sm">
                  <img src={getImageUrl(item.image)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-black/5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-stone-800">{item.name}</p>
                    {!!item.selectedVariants && Object.values(item.selectedVariants).length > 0 && (
                      <p className="text-xs text-stone-500">{Object.values(item.selectedVariants).join(' · ')}</p>
                    )}
                    <p className="text-sm font-black text-[#0F1620]">{formatPrice((Number(item.price) || 0) * item.quantity)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center rounded-full border" style={{ borderColor: 'color-mix(in srgb, var(--store-primary, #FFC20E) 40%, transparent)', background: 'color-mix(in srgb, var(--store-primary, #FFC20E) 10%, white)' }}>
                      <button type="button" onClick={() => cart.updateQuantity(index, -1)} className="px-2 py-1 text-[#0F1620]" aria-label="تقليل"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-7 text-center text-sm font-black text-stone-800">{item.quantity}</span>
                      <button type="button" onClick={() => cart.updateQuantity(index, 1)} className="px-2 py-1 text-[#0F1620]" aria-label="زيادة"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button type="button" onClick={() => cart.removeFromCart(index)} className="flex items-center gap-1 text-[11px] text-stone-400 transition hover:text-red-500" aria-label="حذف">
                      <Trash2 className="h-3 w-3" /> حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-black/5 bg-stone-50 p-4">
            <div className="mb-1 flex justify-between text-sm font-bold text-stone-700"><span>الإجمالي</span><span className="text-lg font-black text-[#0F1620]">{formatPrice(totals.total)}</span></div>
            {totals.tax > 0 && <div className="mb-2 flex justify-between text-xs text-stone-500"><span>يشمل ضريبة</span><span>{formatPrice(totals.tax)}</span></div>}
            <button type="button" onClick={onCheckout} className="w-full rounded-full py-3 text-base font-black text-black shadow-md transition hover:brightness-[0.92]" style={{ background: 'var(--store-primary, #FFC20E)' }}>
              إتمام الطلب
            </button>
            {waPhone && (
              <button type="button" onClick={orderWhatsapp} className="mt-2 w-full rounded-full border border-[#25D366]/40 py-2.5 text-sm font-bold text-[#128C4B] transition hover:bg-[#25D366]/10">
                اطلب عبر واتساب <span className="block text-[11px] font-normal opacity-70">أنشئ طلبك ثم تابع عبر واتساب</span>
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

/* ------------------------ Product quick sheet — mobile bottom-sheet (balanced media + drag dismiss) ------------------------ */
/* Reuses Fashion Atelier proven drag physics/threshold/scroll arbitration; keeps Souq white card identity. */

export function SouqProductSheet({ product, onClose }: any) {
  const { cart, ui } = useStorefrontCore();
  const formatPrice = usePriceFormatter();
  const [qty, setQty] = useState(1);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const variable = product ? isVariableProduct(product) : false;
  const missing = variable ? (product.variants || []).filter((g: any) => !selection[g.name]) : [];

  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const ANIM_MS = reducedMotion ? 90 : 280;
  const [exiting, setExiting] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestClose = () => {
    if (exiting) return;
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      onClose();
      return;
    }
    setExiting(true);
    exitTimer.current = setTimeout(onClose, ANIM_MS);
  };
  const handleClose = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) onClose();
    else requestClose();
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const gesture = useRef<{ mode: 'none' | 'pending' | 'sheet' | 'scroll'; startX: number; startY: number; startT: number; startScroll: number }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startT: 0,
    startScroll: 0,
  });

  const onDragPointerDown = (e: React.PointerEvent) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea')) {
      if (!target.closest('[data-souq-drag-handle]') && !target.closest('[data-souq-media]')) return;
    }
    gesture.current = {
      mode: 'pending',
      startX: e.clientX,
      startY: e.clientY,
      startT: Date.now(),
      startScroll: scrollRef.current?.scrollTop ?? 0,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };
  const onDragPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (g.mode === 'none') return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (g.mode === 'pending') {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        g.mode = 'none';
        return;
      }
      if (dy > 0) {
        const atTop = (scrollRef.current?.scrollTop ?? g.startScroll) <= 4;
        if (atTop) {
          g.mode = 'sheet';
          setIsDragging(true);
        } else {
          g.mode = 'scroll';
        }
      } else {
        g.mode = 'scroll';
      }
    }
    if (g.mode === 'sheet') {
      e.preventDefault();
      setDragY(Math.max(0, dy));
    } else if (g.mode === 'scroll') {
      const sc = scrollRef.current;
      if (sc) sc.scrollTop = Math.max(0, g.startScroll - dy);
    }
  };
  const endSheetDrag = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (g.mode === 'none') return;
    if (g.mode === 'pending') {
      gesture.current.mode = 'none';
      return;
    }
    if (g.mode === 'sheet') {
      setIsDragging(false);
      const dy = e.clientY - g.startY;
      const elapsed = Date.now() - g.startT;
      const velocity = elapsed > 0 ? dy / elapsed : 0;
      const h = sheetRef.current?.offsetHeight || 600;
      setDragY(0);
      if (dy > h * 0.27 || velocity > 0.62) requestClose();
    }
    gesture.current.mode = 'none';
  };
  const onDragPointerUp = (e: React.PointerEvent) => {
    const wasSheet = gesture.current.mode === 'sheet';
    endSheetDrag(e);
    if (wasSheet) setDragY(0);
    else if (gesture.current.mode === 'scroll') gesture.current.mode = 'none';
  };
  const onDragPointerCancel = (e: React.PointerEvent) => {
    if (gesture.current.mode === 'sheet') setIsDragging(false);
    setDragY(0);
    gesture.current.mode = 'none';
  };

  if (!product) return null;
  const discount = discountPercent(product);

  const add = async () => {
    await cart.addToCart({ ...product, quantity: qty, selectedVariants: variable ? selection : undefined });
    onClose();
    ui.setShowCart(true);
  };

  const backdropOpacity = exiting ? 0 : Math.max(0, Math.min(1, 1 - dragY / 520));
  const sheetTransform = exiting ? 'translateY(110%)' : dragY ? `translateY(${dragY}px)` : undefined;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center sm:p-6" dir="rtl" role="dialog" aria-modal="true" aria-label={product.name}>
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        style={{ opacity: backdropOpacity, transition: isDragging ? 'none' : `opacity ${ANIM_MS}ms ease-out` } as any}
      />
      <div
        ref={sheetRef}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        style={
          {
            transform: sheetTransform,
            transition: isDragging ? 'none' : `transform ${ANIM_MS}ms cubic-bezier(0.22,0.9,0.3,1)`,
          } as any
        }
      >
        <div
          data-souq-drag-handle
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerCancel}
          className="flex shrink-0 touch-none select-none items-center justify-center bg-white pt-2 pb-1 sm:hidden"
          aria-hidden
        >
          <span className="h-1.5 w-9 rounded-full bg-stone-300" />
        </div>
        <div
          data-souq-media
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerCancel}
          className="relative flex w-full shrink-0 touch-none select-none items-center justify-center overflow-hidden bg-white p-3 sm:h-60 sm:p-2"
          style={{ height: 'clamp(136px, 32dvh, 210px)' } as any}
        >
          <style>{`@media(min-width:640px){[data-souq-media]{height:240px !important}} @media(prefers-reduced-motion:reduce){[data-souq-drag-handle] *{transition:none!important}}`}</style>
          <img src={getImageUrl(product.image || '')} alt={product.name} className="h-full w-full object-contain" draggable={false} />
          {discount > 0 && (
            <span className="pointer-events-none absolute top-3 right-3 rounded-lg bg-red-600 px-2 py-1 text-xs font-black text-white">خصم {discount}%</span>
          )}
          <button type="button" onClick={handleClose} aria-label="إغلاق" className="absolute left-3 top-3 rounded-full bg-white/90 p-1.5 text-stone-600 shadow ring-1 ring-black/5 hover:text-stone-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={scrollRef}
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerCancel}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 touch-pan-y"
        >
          <h2 className="text-lg font-black leading-snug text-stone-900">{product.name}</h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0F1620]">{formatPrice(product.price)}</span>
            {discount > 0 && !!product.originalPrice && (
              <span className="text-sm text-stone-400 line-through">{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          {product.description && (
            <div
              className="mt-3 text-sm leading-relaxed text-stone-600 line-clamp-4 whitespace-pre-line"
              dangerouslySetInnerHTML={createSafeHtml(product.description || '')}
            />
          )}

          {(product.variants || []).map((group: any) => (
            <div key={group.name} className="mt-4">
              <p className="mb-1.5 text-xs font-black text-stone-500">{group.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {(group.values || group.options || []).map((val: string) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSelection((s) => ({ ...s, [group.name]: val }))}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-bold transition ${selection[group.name] === val ? 'text-black' : 'border-stone-300 text-stone-600 hover:border-[var(--store-primary)]'}`}
                    style={selection[group.name] === val ? { background: 'var(--store-primary, #FFC20E)', borderColor: 'var(--store-primary, #FFC20E)' } : undefined}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-black/5 bg-stone-50 p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center rounded-full border-2 bg-white" style={{ borderColor: 'color-mix(in srgb, var(--store-primary, #FFC20E) 40%, transparent)' }}>
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-[#0F1620]" aria-label="أقل"><Minus className="h-4 w-4" /></button>
            <span className="w-9 text-center text-base font-black">{qty}</span>
            <button type="button" onClick={() => setQty((q) => q + 1)} className="px-3 py-2.5 text-[#0F1620]" aria-label="أكثر"><Plus className="h-4 w-4" /></button>
          </div>
          <button type="button" onClick={add} disabled={missing.length > 0 || product.availability === 'out_of_stock'} className="flex-1 rounded-full py-3 text-base font-black text-black shadow transition hover:brightness-[0.92] disabled:bg-stone-200 disabled:text-stone-400" style={{ background: 'var(--store-primary, #FFC20E)' }}>
            {missing.length > 0 ? `اختار ${missing.map((g: any) => g.name).join(' و')}` : `أضف للسلة · ${formatPrice((Number(product.price) || 0) * qty)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Search overlay — grocery dense/fast-shopping --------------------------- */
// grocery search overlay delegates to shared SearchSheet which uses useServerSearch (api/storefront/search) contract
export function SouqSearchOverlay({ onClose, onProductClick }: any) {
  return <SearchSheet onClose={onClose} onProductClick={onProductClick} accent="var(--store-primary, #FFC20E)" placeholder="شنو تدور عليه؟" variant="grocery" />;
}

export const souqOverlays = {
  cart: SouqCartDrawer,
  product_detail: SouqProductSheet,
  search: SouqSearchOverlay,
};
