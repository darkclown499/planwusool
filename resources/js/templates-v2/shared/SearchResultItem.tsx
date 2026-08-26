import React from 'react';
import { getImageUrl } from '@/utils/image-helper';
import { usePriceFormatter } from './hooks';

/**
 * Shared live-search row — polished, scannable, Arabic-friendly.
 * Requirements:
 * - image ~64-72px visual box, object-contain (grocery/packaged)
 * - name max 2 lines (line-clamp-2) not aggressive single truncate
 * - price primary close to title, original line-through secondary
 * - OOS badge
 * - whole row clickable, no nested buttons (quick-add uses stopPropagation)
 * - wishlist/quick-add must not create nested-button HTML
 */
export const SearchResultItem: React.FC<{
  product: any;
  onClick: (p: any) => void;
  onQuickAdd?: (p: any) => void;
  variant?: 'neutral' | 'souq' | 'bakery' | 'electronics' | 'restaurant' | 'bazaar' | 'fashion';
}> = ({ product, onClick, onQuickAdd, variant = 'neutral' }) => {
  const formatPrice = usePriceFormatter();
  const hasSale = product?.originalPrice != null && Number(product.originalPrice) > Number(product.price);
  const oos = product?.availability === 'out_of_stock';
  const isVariant = product?.inventoryMode === 'variant';
  const canQuickAdd = !oos && !isVariant && typeof onQuickAdd === 'function';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(product);
        }
      }}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-start transition hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
    >
      <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
        <img
          src={getImageUrl(product.image || product.images?.[0] || '')}
          alt=""
          className="h-full w-full object-contain p-1"
          loading="lazy"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[14px] font-bold leading-snug text-stone-800">{product.name}</span>
        <span className="mt-1 flex flex-wrap items-baseline gap-1.5">
          <span className="text-[15px] font-black text-stone-900">{formatPrice(product.price)}</span>
          {hasSale && <span className="text-xs text-stone-400 line-through">{formatPrice(product.originalPrice)}</span>}
          {oos ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-600">نفذت</span>
          ) : product.category ? (
            <span className="text-[11px] text-stone-400">{product.category}</span>
          ) : null}
        </span>
      </span>
      {canQuickAdd && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd!(product);
          }}
          aria-label="إضافة للسلة"
          className="flex h-9 min-h-[44px] shrink-0 items-center justify-center rounded-full bg-black px-4 text-xs font-black text-white hover:bg-stone-800 active:scale-95"
        >
          + إضافة
        </button>
      )}
    </div>
  );
};

/** Skeleton row for loading state — no jarring jump */
export const SearchResultSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-2 py-2.5">
    <span className="h-[64px] w-[64px] shrink-0 animate-pulse rounded-xl bg-stone-100" />
    <span className="min-w-0 flex-1 space-y-2">
      <span className="block h-3 w-3/4 animate-pulse rounded bg-stone-100" />
      <span className="block h-3 w-1/2 animate-pulse rounded bg-stone-100" />
    </span>
    <span className="h-6 w-16 animate-pulse rounded-full bg-stone-100" />
  </div>
);
