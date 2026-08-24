import React from 'react';
import { Check, Flame, Heart, MessageCircle, PackageX, ShoppingCart, Zap } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { toast } from '@/components/custom-toast';
import { css, priceOf, salePriceOf, productWhatsAppUrl } from '@/builder/sections/helpers';
import { getImageUrl } from '@/utils/image-helper';

/**
 * flash-deals family product card — a bold "deal tile" instead of the shared
 * quiet card: diagonal-style discount ribbon, a "الأكثر مبيعاً" chip for
 * featured items, and a full-width primary "أضف للسلة" action bar (rather
 * than a small icon button) to read as a promo storefront, not a boutique.
 */
export const DealProductCard: React.FC<{ product: any; wide?: boolean }> = ({ product, wide = false }) => {
  const { cart, product: productCtx, wishlist, config } = useStorefrontCore();
  const image = getImageUrl(product.image);
  const hasSale = Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price);
  const saleOff = hasSale
    ? Math.round(((Number(product.price) - Number(product.sale_price)) / Number(product.price)) * 100)
    : 0;
  const isBestseller = Boolean(product.is_featured || product.featured);
  const inStock = product.stock === null || product.stock === undefined || Number(product.stock) > 0;
  const whatsapp = productWhatsAppUrl(config, product);
  const inWishlist = wishlist.isInWishlist?.(product.id) ?? false;
  const inCart = (cart.cartItems || []).some((i: any) => String(i.id) === String(product.id));

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = await wishlist.toggle(product.id);
    if (added !== null && added !== undefined) {
      toast.success(added ? 'أُضيف إلى المفضلة ❤️' : 'أُزيل من المفضلة');
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inStock) return;
    cart.addToCart(product);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => productCtx.handleProductClick(product)}
      onKeyDown={(e) => e.key === 'Enter' && productCtx.handleProductClick(product)}
      className={`group relative flex ${wide ? 'w-[168px] sm:w-[190px]' : 'w-[150px] sm:w-[172px]'} shrink-0 cursor-pointer flex-col overflow-hidden border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
      style={{ borderColor: css('--twc-border', '#e2e8f0'), borderRadius: css('--twx-radius', '0.75rem') }}
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden" style={{ background: css('--twc-surface', '#f4f4f8') }}>
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <PackageX className="h-8 w-8" />
          </div>
        )}

        {/* Badge stack — top-start */}
        <div className="absolute top-2 start-2 z-10 flex flex-col items-start gap-1">
          {hasSale && (
            <span
              className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-black text-white shadow"
              style={{ background: css('--twc-danger', '#dc2626') }}
            >
              <Zap className="h-2.5 w-2.5 fill-current" />
              خصم {saleOff}%
            </span>
          )}
          {isBestseller && (
            <span
              className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-black text-white shadow"
              style={{ background: css('--twc-accent', '#f15f3d') }}
            >
              <Flame className="h-2.5 w-2.5 fill-current" />
              الأكثر مبيعاً
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={inWishlist ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
          className={`absolute top-2 end-2 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow transition active:scale-90 ${
            inWishlist ? 'bg-red-50 text-red-500' : 'bg-white/90 text-slate-400 hover:text-red-500'
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${inWishlist ? 'fill-current' : ''}`} />
        </button>

        {!inStock && (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 text-xs font-bold text-white">
            نفد المخزون
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h3 className="line-clamp-2 min-h-[2.2em] text-[12px] font-bold leading-snug" style={{ color: css('--twc-text-primary', '#0f172a') }}>
          {product.name}
        </h3>
        <div className="mt-auto flex items-baseline gap-1.5">
          <span className="truncate text-sm font-black" style={{ color: css('--twc-primary', '#0f8a5f') }}>
            {salePriceOf(product)}
          </span>
          {hasSale && <span className="truncate text-[10px] text-slate-400 line-through">{priceOf(product)}</span>}
        </div>

        {/* Action bar */}
        <div className="mt-1 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!inStock}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-extrabold text-white transition hover:opacity-90 active:scale-95 ${
              !inStock ? 'cursor-not-allowed opacity-40' : ''
            }`}
            style={{ background: inCart ? css('--twc-secondary', '#16a34a') : css('--twc-primary', '#0f8a5f') }}
          >
            {inCart ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
            {inCart ? 'في سلتك' : 'أضف للسلة'}
          </button>
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="اطلب عبر واتساب"
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-white transition hover:opacity-90"
              style={{ background: '#25D366' }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export default DealProductCard;
