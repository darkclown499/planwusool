import React, { useMemo, useState } from 'react';
import { Check, Heart, Plus } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { toast } from '@/components/custom-toast';
import { discountPercent, isVariableProduct, lowStockRemaining, usePriceFormatter, useStorefrontCore, type V2Product } from '../../shared/hooks';

interface AtelierProductCardProps {
  product: V2Product;
  /** Card width class override inside rails vs grids. */
  className?: string;
}

const COLOR_HINTS = ['لون', 'اللون', 'color'];

/**
 * The Atelier product card. Editorial portrait photography with a hover
 * angle-swap, quiet serif type, and an April-inspired inline quick-add:
 * tapping "+" on a variable product reveals its size/color chips right in
 * the card so the shopper never leaves the page.
 */
export const AtelierProductCard: React.FC<AtelierProductCardProps> = ({ product, className = '' }) => {
  const { cart, ui, wishlist, product: productCtx } = useStorefrontCore();
  const formatPrice = usePriceFormatter();

  const [quickOpen, setQuickOpen] = useState(false);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  const outOfStock = product.availability === 'out_of_stock';
  const discount = discountPercent(product);
  const remaining = lowStockRemaining(product);
  const variable = isVariableProduct(product);

  const mainImage = getImageUrl(product.image || product.images?.[0] || '');
  const hoverImage = useMemo(() => {
    const candidates = [product.images?.[1], product.images?.[2], product.images?.[0]].filter(Boolean);
    const next = candidates.find((c) => c !== product.image);
    return next ? getImageUrl(next as string) : null;
  }, [product.image, product.images]);

  const wished = wishlist?.isInWishlist ? wishlist.isInWishlist(product.id) : false;

  const missingGroups = useMemo(
    () => (product.variants || []).filter((g) => !selection[g.name]),
    [product.variants, selection]
  );

  const openDetail = () => {
    // Card tap opens the bespoke detail overlay through the product context.
    ui.setShowCart(false);
    productCtx.handleProductClick(product);
  };

  const handleAdd = async () => {
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
    <div className={`group relative flex w-full min-w-0 flex-col overflow-hidden rounded-sm border border-stone-100 bg-white ${className}`} dir="rtl">
      {/* Image — fixed portrait ratio so every grid cell aligns */}
      <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-stone-100">
        <a href="#" onClick={(e) => { e.preventDefault(); openDetail(); }} aria-label={product.name} className="block h-full w-full">
          <img src={mainImage} alt={product.name} loading="lazy"
            className="h-full w-full object-cover object-center transition-all duration-700 group-hover:scale-[1.03]"
            style={{ opacity: hoverImage ? 1 : undefined }}
            onError={(e) => { (e.currentTarget.style.opacity = '0'); }} />
          {hoverImage && (
            <img src={hoverImage} alt="" loading="lazy" aria-hidden
              className="absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
          )}
        </a>

        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {discount > 0 && (
            <span className="rounded-sm bg-[#9d7463] px-2 py-1 text-[11px] font-bold text-white shadow-sm">
              -{discount}%
            </span>
          )}
          {!!remaining && (
            <span className="rounded-sm bg-stone-900/85 px-2 py-1 text-[10px] font-semibold text-[#f5e9d8] backdrop-blur">
              آخر {remaining} قطع
            </span>
          )}
        </div>

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <span className="border border-stone-400 px-4 py-1.5 text-xs font-bold tracking-widest text-stone-600">نفذت</span>
          </div>
        )}

        {/* Wishlist */}
        <button
          type="button"
          onClick={() => wishlist.toggle(product.id)}
          aria-label={wished ? 'إزالة من المفضلة' : 'أضيفي للمفضلة'}
          className={`absolute top-3 left-3 rounded-full p-2 backdrop-blur transition-all ${
            wished ? 'bg-[#9d7463] text-white' : 'bg-white/80 text-stone-600 opacity-0 group-hover:opacity-100 hover:text-[#9d7463]'
          } max-md:opacity-100`}
        >
          <Heart className="h-4 w-4" fill={wished ? 'currentColor' : 'none'} />
        </button>

        {/* Quick add trigger */}
        {!outOfStock && (
          <button
            type="button"
            onClick={() => (variable ? setQuickOpen((v) => !v) : handleAdd())}
            disabled={adding}
            aria-label="إضافة سريعة"
            className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-stone-900/90 px-4 py-2 text-xs font-semibold text-white opacity-0 shadow-lg backdrop-blur transition-all duration-300 hover:bg-[#9d7463] disabled:opacity-50 group-hover:opacity-100 max-md:opacity-100"
          >
            {adding ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {adding ? 'أُضيفت' : 'إضافة'}
          </button>
        )}

        {/* Inline variant picker */}
        {quickOpen && variable && !outOfStock && (
          <div className="absolute inset-x-2 bottom-2 rounded-md border border-stone-200 bg-white/97 p-3 shadow-xl backdrop-blur">
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
                        onClick={() => setSelection((s) => ({ ...s, [group.name]: val }))}
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
              onClick={handleAdd}
              disabled={adding || missingGroups.length > 0}
              className="mt-2 w-full rounded-full bg-stone-900 py-2 text-xs font-bold text-white transition hover:bg-[#9d7463] disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {missingGroups.length > 0 ? `اختاري ${missingGroups.map((g) => g.name).join(' و')}` : adding ? 'جارٍ الإضافة…' : 'أضيفي للسلة'}
            </button>
          </div>
        )}
      </div>

      {/* Meta — self-contained flex-col inside the card, never floats */}
      <div className="flex w-full min-w-0 flex-1 flex-col gap-1 bg-white px-3 pb-3 pt-3 text-center sm:text-start">
        <a href="#" onClick={(e) => { e.preventDefault(); openDetail(); }}
          className="line-clamp-2 min-h-[2.6em] w-full font-serif text-[15px] font-semibold leading-snug text-stone-800 transition-colors hover:text-[#9d7463]">
          {product.name}
        </a>
        <div className="mt-auto flex w-full items-baseline justify-center gap-2 sm:justify-start">
          <span className="shrink-0 text-[15px] font-bold text-stone-900">{formatPrice(product.price)}</span>
          {discount > 0 && !!product.originalPrice && (
            <span className="min-w-0 truncate text-xs text-stone-400 line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>
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
