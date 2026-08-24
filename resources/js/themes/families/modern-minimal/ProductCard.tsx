import React from 'react';
import { Check, Heart, MessageCircle, ShoppingBag } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { useStorefrontCore } from '@/templates/storefront';
import { getImageUrl } from '@/utils/image-helper';
import { css, priceOf, productWhatsAppUrl, salePriceOf } from '@/builder/sections/helpers';

/**
 * modern-minimal's own product card — quiet, uncluttered: a plain square
 * photo, small type below, thin ghost action buttons instead of filled
 * circles/overlays. Same data contract as the shared ProductCard (wishlist,
 * quick-add, sale, out-of-stock, WhatsApp) but visually its own thing.
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
      {/* Photo — plain square, no chrome, quiet rounded corners */}
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{ background: css('--twc-surface', '#f8fafc'), borderRadius: css('--twx-radius', '0.75rem') }}
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
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${
              !inStock ? 'grayscale' : ''
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ color: css('--twc-muted', '#cbd5e1') }}>
            <ShoppingBag className="h-8 w-8" />
          </div>
        )}

        {hasSale && inStock && (
          <span
            className="absolute top-3 start-3 z-[2] rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: css('--twc-background', '#ffffff'),
              color: css('--twc-text-primary', '#0f172a'),
              border: `1px solid ${css('--twc-border', '#e2e8f0')}`,
            }}
          >
            خصم {saleOff}%
          </span>
        )}

        {/* Wishlist — quiet outline circle, subtle, hidden until hover on desktop */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={inWishlist ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
          className="absolute top-3 end-3 z-[2] flex h-8 w-8 items-center justify-center rounded-full opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
          style={{
            background: css('--twc-background', '#ffffff'),
            color: inWishlist ? css('--twc-danger', '#dc2626') : css('--twc-text-secondary', '#64748b'),
            border: `1px solid ${css('--twc-border', '#e2e8f0')}`,
          }}
        >
          <Heart className={`h-3.5 w-3.5 ${inWishlist ? 'fill-current' : ''}`} />
        </button>

        {!inStock && (
          <span
            className="absolute bottom-3 start-3 z-[2] rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: css('--twc-background', '#ffffff'), color: css('--twc-text-secondary', '#64748b'), border: `1px solid ${css('--twc-border', '#e2e8f0')}` }}
          >
            غير متوفر
          </span>
        )}
      </div>

      {/* Text block — quiet hierarchy: name, then price row */}
      <div className="flex flex-col gap-1.5 pt-3">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug sm:text-sm" style={{ color: css('--twc-text-primary', '#0f172a') }}>
          <button type="button" onClick={() => productCtx.handleProductClick(product)} className="text-start">
            {product.name}
          </button>
        </h3>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-sm font-semibold" style={{ color: css('--twc-text-primary', '#0f172a') }}>
              {salePriceOf(product)}
            </span>
            {hasSale && (
              <span className="truncate text-xs" style={{ color: css('--twc-muted', '#94a3b8'), textDecoration: 'line-through' }}>
                {priceOf(product)}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label="اطلب عبر واتساب"
                className="flex h-7 w-7 items-center justify-center rounded-full transition hover:opacity-70"
                style={{ color: '#25D366', border: `1px solid ${css('--twc-border', '#e2e8f0')}` }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={!inStock}
              aria-label={inCart ? 'في سلتك' : 'أضف للسلة'}
              title={inCart ? 'في سلتك' : 'أضف للسلة'}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition hover:opacity-70 ${!inStock ? 'cursor-not-allowed opacity-30' : ''}`}
              style={{
                color: inCart ? css('--twc-primary', '#0f8a5f') : css('--twc-text-secondary', '#64748b'),
                border: `1px solid ${inCart ? css('--twc-primary', '#0f8a5f') : css('--twc-border', '#e2e8f0')}`,
              }}
            >
              {inCart ? <Check className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
