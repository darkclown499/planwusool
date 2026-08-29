import React, { useMemo, useState } from 'react';
import { Check, Gift, Heart, Plus } from 'lucide-react';
import { getImageUrl, getOptimizedImageUrl } from '@/utils/image-helper';
import { discountPercent, isVariableProduct, lowStockRemaining, usePriceFormatter, useStorefrontCore, type V2Product } from '../../shared/hooks';
import { calcEarnedPoints, getLoyaltySettingsFromPage } from '@/utils/loyalty';
import { usePage } from '@inertiajs/react';

interface AtelierProductCardProps {
  product: V2Product;
  className?: string;
}

const COLOR_HINTS = ['لون', 'اللون', 'color'];

/**
 * Premium editorial product card — image-first, calm, 4:5 ratio, no heavy white footer.
 * Discount badge hugs content (w-fit), low-stock is muted text below price, add is a
 * small circular button.
 */
export const AtelierProductCard: React.FC<AtelierProductCardProps> = ({ product, className = '' }) => {
  const { cart, wishlist, product: productCtx } = useStorefrontCore();
  const formatPrice = usePriceFormatter();

  const [quickOpen, setQuickOpen] = useState(false);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  const outOfStock = product.availability === 'out_of_stock';
  const discount = discountPercent(product);
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);

  const mainImage = getOptimizedImageUrl(product.image || product.images?.[0] || '', 'small');
  const hoverImage = useMemo(() => {
    const candidates = [product.images?.[1], product.images?.[2], product.images?.[0]].filter(Boolean);
    const next = candidates.find((c) => c !== product.image);
    return next ? getOptimizedImageUrl(next as string, 'small') : null;
  }, [product.image, product.images]);

  const wished = wishlist?.isInWishlist ? wishlist.isInWishlist(product.id) : false;

  const missingGroups = useMemo(
    () => (product.variants || []).filter((g) => !selection[g.name]),
    [product.variants, selection]
  );

  const openDetail = () => {
    productCtx.handleProductClick(product);
  };

  const handleAdd = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (outOfStock) return;
    if (variable && missingGroups.length > 0) {
      setQuickOpen(true);
      return;
    }
    setAdding(true);
    try {
      await cart.addToCart({ ...product, selectedVariants: variable ? selection : undefined });
      setQuickOpen(false);
      setSelection({});
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={`group flex w-full min-w-0 flex-col rounded-[20px] bg-[#fffdf9] shadow-[0_2px_8px_rgba(40,30,20,0.04),0_10px_24px_rgba(40,30,20,0.07)] ring-1 ring-stone-200/40 transition-all duration-150 hover:shadow-[0_4px_12px_rgba(40,30,20,0.05),0_14px_32px_rgba(40,30,20,0.08)] active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100 ${className}`} dir="rtl">
      {/* Image — 4:5, object-contain preserves perfume, transparent warm inside card */}
      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-t-[20px] bg-transparent">
        <a href="#" onClick={(e) => { e.preventDefault(); openDetail(); }} aria-label={product.name} className="block h-full w-full">
          <img src={mainImage} alt={product.name} loading="lazy" decoding="async" sizes="(max-width:640px) 50vw, 25vw" onError={(e)=>{(e.currentTarget.src=getImageUrl(product.image||product.images?.[0]||''))}} width={400} height={500}
            className="h-full w-full object-contain object-center p-2 transition-all duration-700 group-hover:scale-[1.02]" />
          {hoverImage && (
            <img src={hoverImage} alt="" loading="lazy" decoding="async" aria-hidden sizes="(max-width:640px) 50vw, 25vw"
              className="absolute inset-0 h-full w-full object-contain object-center p-2 opacity-0 transition-opacity duration-700 group-hover:opacity-100" width={400} height={500} />
          )}
        </a>

        {/* Discount — top-right, intrinsic w-fit, no stretched flex */}
        {discount > 0 && (
          <span className="absolute top-2.5 right-2.5 inline-flex w-fit shrink-0 items-center justify-center rounded-full bg-[#9d7463] px-2 py-1 text-[10px] font-bold leading-none text-white shadow-sm">
            -{discount}%
          </span>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
            <span className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-xs font-bold tracking-wide text-stone-600">نفذت</span>
          </div>
        )}

        {/* Wishlist — 32-36px circular, white/90, subtle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); wishlist.toggle(product.id); }}
          aria-label={wished ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
          className={`absolute top-2.5 left-2.5 flex h-8 w-8 items-center justify-center rounded-full border bg-white/90 text-stone-500 shadow-sm backdrop-blur transition-all hover:text-[#9d7463] ${wished ? '!bg-[#9d7463] !text-white !border-[#9d7463]' : 'border-stone-200/60'}`}
        >
          <Heart className="h-4 w-4" fill={wished ? 'currentColor' : 'none'} strokeWidth={1.7} />
        </button>

        {/* Quick add — 36-38px, bridging image → info */}
        {!outOfStock && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            aria-label={variable && missingGroups.length > 0 ? 'اختيار الخيارات' : 'إضافة إلى السلة'}
            className="absolute bottom-3 left-3 flex h-[36px] w-[36px] items-center justify-center rounded-full bg-stone-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] ring-1 ring-white/20 transition hover:bg-[#9d7463] active:scale-95 disabled:opacity-50"
          >
            {adding ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" strokeWidth={2} />}
          </button>
        )}

        {/* Inline variant picker */}
        {quickOpen && variable && !outOfStock && (
          <div className="absolute inset-x-2 bottom-2 rounded-xl border border-stone-200 bg-white/98 p-3 shadow-xl backdrop-blur">
            {(product.variants || []).map((group) => (
              <div key={group.name} className="mb-2 last:mb-0">
                <p className="mb-1.5 text-[10px] font-bold tracking-wide text-stone-500">{group.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(group.values || group.options || []).map((val: string) => {
                    const active = selection[group.name] === val;
                    const isColor = COLOR_HINTS.some((h) => group.name.includes(h));
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelection((s) => ({ ...s, [group.name]: val })); }}
                        title={val}
                        className={`flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] transition-all ${
                          active ? 'border-[#9d7463] bg-[#9d7463] text-white' : 'border-stone-300 text-stone-600 hover:border-[#9d7463]'
                        }`}
                      >
                        {isColor ? <span className="block h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: valToColor(val) }} /> : val}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={(e) => handleAdd(e)}
              disabled={adding || missingGroups.length > 0}
              className="mt-2 w-full rounded-full bg-stone-900 py-2 text-xs font-bold text-white transition hover:bg-[#9d7463] disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {missingGroups.length > 0 ? `اختر ${missingGroups.map((g) => g.name).join(' و')}` : adding ? 'جارٍ الإضافة…' : 'أضف إلى السلة'}
            </button>
          </div>
        )}
      </div>

      {/* Meta — inside same premium card, reserved zones for equal height */}
      <div className="flex w-full min-w-0 flex-1 flex-col px-3 pt-3 pb-3" dir="auto">
        <a href="#" onClick={(e) => { e.preventDefault(); openDetail(); }}
          className="line-clamp-2 min-h-[2.6em] w-full text-[13px] font-medium leading-snug text-stone-800 transition-colors hover:text-[#9d7463] sm:text-[14px]"
          dir="auto">
          {product.name}
        </a>
        <div className="mt-1.5 flex min-h-[20px] items-baseline gap-1.5" dir="rtl">
          <span className="shrink-0 text-[14px] font-bold text-stone-900">{formatPrice(product.price)}</span>
          {discount > 0 && !!product.originalPrice ? (
            <span className="min-w-0 truncate text-xs text-stone-400 line-through">{formatPrice(product.originalPrice)}</span>
          ) : (
            <span className="min-w-0 text-xs text-transparent select-none" aria-hidden>—</span>
          )}
        </div>
        {/* Status reserved — one line, preserves height even when absent */}
        <div className="min-h-[16px] mt-1">
          {!!remaining && !outOfStock ? (
            <span className="text-[11px] font-medium text-amber-700">باقي {remaining} فقط</span>
          ) : null}
        </div>
        {(() => {
          const loyalty = getLoyaltySettingsFromPage();
          if (!loyalty || !loyalty.is_enabled) return null;
          const pts = calcEarnedPoints(Number(product.price) || 0, loyalty);
          return pts > 0 ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <Gift className="h-3 w-3" /> كسب {pts} نقطة
            </span>
          ) : null;
        })()}
      </div>
    </div>
  );
};

/** Best-effort CSS color for Arabic/English color names (chip dot). */
function valToColor(val: string): string {
  const map: Record<string, string> = {
    أسود: '#111111', ابيض: '#ffffff', أبيض: '#ffffff', بيج: '#d9c9b6', رمادي: '#8a8a8a',
    زيتي: '#6b6b3a', أحمر: '#b91c1c', احمر: '#b91c1c', وردي: '#ec4899', زهري: '#f9a8d4',
    أزرق: '#1d4ed8', ازرق: '#1d4ed8', أخضر: '#15803d', اخضر: '#15803d', بني: '#78350f',
    ذهبي: '#d4af37', فضي: '#c0c0c0', كحلي: '#1e3a5f', موف: '#9333ea', نبيتي: '#7f1d1d',
    black: '#111111', white: '#ffffff', beige: '#d9c9b6', gray: '#8a8a8a', grey: '#8a8a8a',
    olive: '#6b6b3a', red: '#b91c1c', pink: '#ec4899', blue: '#1d4ed8', green: '#15803d',
    brown: '#78350f', gold: '#d4af37', silver: '#c0c0c0', navy: '#1e3a5f', purple: '#9333ea',
  };
  const key = String(val).trim().toLowerCase();
  return map[String(val).trim()] || map[key] || '#cbd5e1';
}
