import React from 'react';
import { Check, Heart, MessageCircle, ShoppingBag } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { useStorefrontCore } from '@/templates/storefront';
import { getImageUrl } from '@/utils/image-helper';
import { css, priceOf, productWhatsAppUrl, salePriceOf } from '@/builder/sections/helpers';

/**
 * editorial-boutique's own card — a portrait lookbook plate, not a boxed
 * product tile: tall 3:4 photography, no borders/shadows/badge-pills, a
 * quiet serif-leaning name + price beneath, and the "add to bag" action
 * hidden inside a bar that slides up over the photo on hover (desktop) —
 * on touch it simply sits visible at the foot of the image so it never
 * disappears where hover doesn't exist.
 */
export const ProductCard: React.FC<{ product: any }> = ({ product }) => {
  const { cart, product: productCtx, wishlist, config } = useStorefrontCore();
  const image = getImageUrl(product.image);
  const hasSale = Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price);
  const saleOff = hasSale
    ? Math.round(((Number(product.price) - Number(product.sale_price)) / Number(product.price)) * 100)
    : 0;
  const inStock = product.stock === null || product.stock === undefined || Number(product.stock) > 0;
  const whatsapp = productWhatsAppUrl(config, product);
  const inWishlist = wishlist.isInWishlist?.(product.id) ?? false;
  const inCart = (cart.cartItems || []).some((i: any) => String(i.id) === String(product.id));

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = await wishlist.toggle(product.id);
    if (added !== null && added !== undefined) {
      toast.success(added ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة');
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inStock) return;
    cart.addToCart(product);
  };

  return (
    <article className="group flex w-full flex-col">
      <div
        className="relative aspect-[3/4] w-full overflow-hidden"
        style={{ background: css('--twc-surface', '#faf8f6') }}
      >
        <button
          type="button"
          onClick={() => productCtx.handleProductClick(product)}
          className="absolute inset-0 z-[1] cursor-pointer"
          aria-label={product.name}
        />
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] ${
              !inStock ? 'grayscale' : ''
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ color: css('--twc-muted', '#cbb9b3') }}>
            <ShoppingBag className="h-8 w-8" />
          </div>
        )}

        {/* Sale kicker — small tracked overline, not a filled badge */}
        {hasSale && inStock && (
          <span
            className="absolute top-3 start-3 z-[2] text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: css('--twc-accent', '#a4655f') }}
          >
            خصم {saleOff}٪
          </span>
        )}

        {!inStock && (
          <span
            className="absolute top-3 start-3 z-[2] text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: css('--twc-text-secondary', '#8a8178') }}
          >
            نفدت الكمية
          </span>
        )}

        {/* Wishlist — bare heart, no chip background, quiet on desktop until hover */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={inWishlist ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
          className="absolute top-3 end-3 z-[2] flex h-8 w-8 items-center justify-center rounded-full opacity-100 backdrop-blur-sm transition sm:opacity-0 sm:group-hover:opacity-100"
          style={{ background: 'rgba(255,255,255,.72)', color: inWishlist ? css('--twc-accent', '#a4655f') : css('--twc-text-primary', '#161311') }}
        >
          <Heart className={`h-[15px] w-[15px] ${inWishlist ? 'fill-current' : ''}`} />
        </button>

        {/* Slide-up "add to bag" bar — always resting visible on touch, hidden until hover on desktop */}
        {inStock && (
          <button
            type="button"
            onClick={handleQuickAdd}
            className="absolute inset-x-0 bottom-0 z-[2] flex translate-y-0 items-center justify-center gap-2 border-t py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur-sm transition-transform duration-300 ease-out sm:translate-y-full sm:group-hover:translate-y-0"
            style={{
              background: 'rgba(255,255,255,.88)',
              borderColor: css('--twc-border', '#e5e2dc'),
              color: css('--twc-text-primary', '#161311'),
            }}
          >
            {inCart ? <Check className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
            {inCart ? 'في حقيبتك' : 'أضيفي للحقيبة'}
          </button>
        )}
      </div>

      {/* Text plate — quiet hierarchy, no card chrome */}
      <div className="flex flex-col gap-1 pt-3.5 text-center">
        <h3
          className="line-clamp-1 text-[13px] font-medium leading-snug sm:text-sm"
          style={{ color: css('--twc-text-primary', '#161311'), fontFamily: css('--twf-heading-font', 'inherit') }}
        >
          <button type="button" onClick={() => productCtx.handleProductClick(product)}>
            {product.name}
          </button>
        </h3>
        <div className="flex items-center justify-center gap-2">
          <span className="text-[13px] font-semibold" style={{ color: css('--twc-text-primary', '#161311') }}>
            {salePriceOf(product)}
          </span>
          {hasSale && (
            <span className="text-[11px]" style={{ color: css('--twc-muted', '#a9a099'), textDecoration: 'line-through' }}>
              {priceOf(product)}
            </span>
          )}
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="اطلبي عبر واتساب"
              className="ms-1 inline-flex h-5 w-5 items-center justify-center rounded-full transition hover:opacity-70"
              style={{ color: '#25D366' }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
