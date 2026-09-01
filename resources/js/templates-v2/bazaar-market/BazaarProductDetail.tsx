import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Gift, Heart, Minus, Plus, X } from 'lucide-react';
import { getImageUrl, getOptimizedImageUrl } from '@/utils/image-helper';
import { createSafeHtml } from '@/utils/xss-protection';
import { calcEarnedPoints, getLoyaltySettingsFromPage } from '@/utils/loyalty';
import { discountPercent, isVariableProduct, lowStockRemaining, usePriceFormatter, useStorefrontCore } from '../shared/hooks';
import { ensureBazaarInteractionsStyle } from './bazaarInteractions';

interface BazaarProductDetailProps {
  product: any;
  selectedImageIndex?: number;
  onClose: () => void;
  onImageSelect?: (index: number) => void;
}

/**
 * Bazaar mobile product detail — bottom sheet with drag-to-dismiss
 * Reuses proven Wusool gesture physics from Souq/Atelier:
 *  - Pointer Events, 1:1 translateY
 *  - threshold 27% + velocity 0.6 px/ms
 *  - scroll arbitration (content scrollTop > 0 wins)
 *  - direction lock (horizontal > vertical ignored)
 *  - snap back 180-300ms
 *  - backdrop fade, body scroll lock, reduced-motion
 */
export const BazaarProductDetail: React.FC<BazaarProductDetailProps> = ({ product, onClose }) => {
  const { cart, wishlist, auth } = useStorefrontCore() as any;
  const formatPrice = usePriceFormatter();

  const images: string[] = useMemo(() => {
    const list = [product?.image, ...(product?.images || [])].filter(Boolean);
    return Array.from(new Set(list as string[]));
  }, [product]);

  const [active, setActive] = useState(0);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => { ensureBazaarInteractionsStyle(); }, []);

  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const reducedMotion = useMemo(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }, []);
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

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  // Gesture arbitration — same constants as Souq/Atelier
  const gesture = useRef<{ mode: 'none' | 'pending' | 'sheet' | 'scroll'; startX: number; startY: number; startT: number; startScroll: number }>({
    mode: 'none', startX: 0, startY: 0, startT: 0, startScroll: 0,
  });

  const onDragPointerDown = (e: React.PointerEvent) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) return;
    const target = e.target as HTMLElement;
    // Allow buttons/links to be interactive; only handle drag when handle/media/scroll area
    if (target.closest('button, a, input, select, textarea')) {
      if (!target.closest('[data-bazaar-drag-handle]') && !target.closest('[data-bazaar-product-media]') && !target.closest('[data-bazaar-product-scroll]')) return;
    }
    gesture.current = {
      mode: 'pending', startX: e.clientX, startY: e.clientY, startT: Date.now(), startScroll: scrollRef.current?.scrollTop ?? 0,
    };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  };
  const onDragPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (g.mode === 'none') return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (g.mode === 'pending') {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        g.mode = 'none'; // horizontal wins — preserve gallery swipe future
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
      // Prevent page scroll during sheet drag
      try { e.preventDefault(); } catch {}
      setDragY(Math.max(0, dy));
    } else if (g.mode === 'scroll') {
      const sc = scrollRef.current;
      if (sc) sc.scrollTop = Math.max(0, g.startScroll - dy);
    }
  };
  const endSheetDrag = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (g.mode === 'none') return;
    if (g.mode === 'pending') { gesture.current.mode = 'none'; return; }
    if (g.mode === 'sheet') {
      setIsDragging(false);
      const dy = e.clientY - g.startY;
      const elapsed = Date.now() - g.startT;
      const velocity = elapsed > 0 ? dy / elapsed : 0;
      const h = sheetRef.current?.offsetHeight || 600;
      setDragY(0);
      if (dy > h * 0.27 || velocity > 0.60) requestClose();
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
      const ok = await cart.addToCart({ ...product, quantity: qty, selectedVariants: variable ? selection : undefined });
      if (ok !== false) handleClose();
    } finally { setAdding(false); }
  };
  const handleWishlist = async () => {
    if (!auth?.isLoggedIn) { auth?.setShowLoginModal?.(true); return; }
    await wishlist.toggle(product.id);
  };

  const backdropOpacity = exiting ? 0 : Math.max(0, Math.min(1, 1 - dragY / 520));
  const sheetTransform = exiting ? 'translateY(110%)' : dragY ? `translateY(${dragY}px)` : undefined;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center sm:p-6"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      data-testid="bazaar-product-detail"
    >
      <div
        className="absolute inset-0 bg-black/50"
        data-testid="bazaar-product-backdrop"
        onClick={handleClose}
        style={{ opacity: backdropOpacity, transition: isDragging ? 'none' : `opacity ${ANIM_MS}ms ease-out` } as any}
      />
      <div
        ref={sheetRef}
        data-testid="bazaar-product-sheet"
        className="bazaar-product-sheet relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
        style={{ transform: sheetTransform, transition: isDragging ? 'none' : `transform ${ANIM_MS}ms cubic-bezier(0.22,0.9,0.3,1)` } as any}
      >
        {/* Drag handle — mobile only, communicates affordance */}
        <div
          data-bazaar-drag-handle
          data-testid="bazaar-drag-handle"
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerCancel}
          className="flex shrink-0 touch-none select-none items-center justify-center bg-white pt-2.5 pb-1.5 sm:hidden"
          aria-hidden
        >
          <span className="h-1.5 w-9 rounded-full bg-slate-300" />
        </div>

        {/* Media hero — compact, supports drag */}
        <div
          data-bazaar-product-media
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerCancel}
          className="relative flex w-full shrink-0 touch-none select-none items-center justify-center overflow-hidden bg-slate-50 sm:h-60"
          style={{ height: 'clamp(148px, 30dvh, 220px)' } as any}
        >
          <style>{`@media(min-width:640px){[data-bazaar-product-media]{height:240px !important}} @media(prefers-reduced-motion:reduce){[data-bazaar-drag-handle] *{transition:none!important}}`}</style>
          {images[active] ? (
            <img src={getOptimizedImageUrl(images[active] || '', 'medium')} alt={product.name} className="h-full w-full object-contain p-3" draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImageUrl(images[active] || ''); }} />
          ) : (
            <span className="text-4xl">🛍️</span>
          )}
          {discount > 0 && <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-black text-white shadow">-{discount}%</span>}
          {outOfStock && <span className="pointer-events-none absolute top-3 left-3 rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-xs font-bold text-slate-600">نفذت</span>}
          <button type="button" onClick={handleClose} aria-label="إغلاق" data-testid="bazaar-product-close" className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow ring-1 ring-black/5 hover:text-slate-900 active:scale-95">
            <X className="h-5 w-5" />
          </button>
        </div>
        {images.length > 1 && (
          <div className="flex shrink-0 items-center justify-center gap-1.5 border-b border-slate-100 bg-white py-2 sm:py-2.5">
            {images.map((_, i) => (
              <button key={i} type="button" onClick={() => setActive(i)} aria-label={`صورة ${i + 1}`} data-testid={`bazaar-product-thumb-${i}`} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5' : 'w-1.5 bg-slate-300'}`} style={i === active ? ({ background: 'var(--store-primary, #0d9488)' } as any) : undefined} />
            ))}
          </div>
        )}

        {/* Scrollable details */}
        <div
          ref={scrollRef}
          data-bazaar-product-scroll
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerCancel}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 touch-pan-y"
          data-testid="bazaar-product-scroll"
        >
          <h2 className="text-lg font-black leading-snug text-slate-900" dir="auto">{product.name}</h2>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-black" style={{ color: 'var(--store-primary, #0d9488)' } as any}>{formatPrice(displayPrice)}</span>
            {discount > 0 && !!product.originalPrice && !selectedCombo && (
              <span className="text-sm text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
            )}
            {isSelectedOOS && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600">غير متوفر</span>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {outOfStock ? <span className="text-xs font-bold text-red-600">نفذت الكمية</span> : !!remaining ? <span className="text-xs font-medium text-amber-700">باقي {remaining} فقط</span> : null}
            {(() => {
              const ls = getLoyaltySettingsFromPage();
              if (!ls?.is_enabled) return null;
              const pts = calcEarnedPoints(Number(displayPrice) || 0, ls);
              return pts > 0 ? <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600"><Gift className="h-3 w-3" /> كسب {pts} نقطة</span> : null;
            })()}
          </div>

          {product.description && (
            <div className="prose prose-sm mt-3 max-w-none text-sm leading-relaxed text-slate-600" dir="auto" dangerouslySetInnerHTML={createSafeHtml(product.description || '')} />
          )}

          {(product.variants || []).map((group: any) => (
            <div key={group.name} className="mt-4">
              <p className="mb-1.5 text-xs font-black text-slate-500">{group.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {(group.values || group.options || []).map((val: string) => {
                  const activeVal = selection[group.name] === val;
                  const combos: any[] = product.variantCombinations || product.variant_combinations || [];
                  const isUnavailable = (() => {
                    if (!combos.length || product.allowBackorder) return false;
                    const testSel = { ...selection, [group.name]: val };
                    // If selection incomplete, allow; only disable when no combo can satisfy partial selection
                    const keys = Object.keys(testSel);
                    const matching = combos.filter((c: any) => {
                      const vals: string[] = (c.values || []).map((v: any) => String(v).trim());
                      return keys.every((k) => vals.includes(String(testSel[k]).trim()));
                    });
                    if (matching.length === 0) return false;
                    // If all matching combos are OOS, disable this value
                    return matching.every((c: any) => {
                      const st = c.stock !== undefined ? Number(c.stock) : NaN;
                      return Number.isFinite(st) && st <= 0;
                    });
                  })();
                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => { if (!isUnavailable) setSelection((s) => ({ ...s, [group.name]: val })); }}
                      className={`bazaar-variant rounded-full border px-3 py-1.5 text-[13px] font-bold transition ${activeVal ? 'text-white' : isUnavailable ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through opacity-60' : 'border-slate-200 text-slate-700 hover:border-teal-300'}`}
                      style={activeVal ? ({ background: 'var(--store-primary, #0d9488)', borderColor: 'var(--store-primary, #0d9488)' } as any) : undefined}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Purchase bar */}
        <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-slate-50 p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center rounded-full border-2 bg-white" style={{ borderColor: 'color-mix(in srgb, var(--store-primary, #0d9488) 30%, transparent)' } as any}>
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="bazaar-qty-btn px-3 py-2.5 text-slate-700" aria-label="تقليل"><Minus className="h-4 w-4" /></button>
            <span className="w-8 text-center text-sm font-black text-slate-900">{qty}</span>
            <button type="button" onClick={() => setQty((q) => q + 1)} className="bazaar-qty-btn px-3 py-2.5 text-slate-700" aria-label="زيادة"><Plus className="h-4 w-4" /></button>
          </div>
          <button type="button" onClick={handleWishlist} aria-label={wished ? 'في المفضلة' : 'أضف للمفضلة'} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm transition ${wished ? 'border-rose-300 bg-rose-500 !text-white' : 'border-slate-200 text-slate-500 hover:border-rose-200 hover:text-rose-500'}`}>
            <Heart className="h-4 w-4" fill={wished ? 'currentColor' : 'none'} />
          </button>
          <button type="button" onClick={handleAdd} disabled={missingGroups.length > 0 || outOfStock || isSelectedOOS} className="bazaar-btn flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-black text-white shadow disabled:bg-slate-200 disabled:text-slate-400" style={{ background: 'var(--store-primary, #0d9488)' } as any} data-testid="bazaar-add-to-cart">
            {outOfStock || isSelectedOOS ? 'غير متوفر' : missingGroups.length > 0 ? `اختر ${missingGroups.map((g: any) => g.name).join(' و')}` : adding ? 'جارٍ الإضافة…' : `أضف للسلة · ${formatPrice((Number(displayPrice) || 0) * qty)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BazaarProductDetail;
