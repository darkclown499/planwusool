import React from 'react';
import { Check, MessageCircle, Heart, Plus, PackageX } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { toast } from '@/components/custom-toast';
import { css, priceOf, salePriceOf, productWhatsAppUrl } from '@/builder/sections/helpers';
import { getImageUrl } from '@/utils/image-helper';

/**
 * Dense-marketplace product card — price is the loudest element on the
 * card (grocery-delivery-app pattern), thumbnail is small and square,
 * name is secondary/muted, actions collapse to two small icon buttons.
 * Built for 5-6 column grids at small gaps, not boutique whitespace.
 */
interface DenseProductCardProps {
  product: any;
}

export const DenseProductCard: React.FC<DenseProductCardProps> = ({ product }) => {
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
      className="group relative flex w-full flex-col overflow-hidden border bg-white transition-shadow duration-150 hover:shadow-md"
      style={{
        borderColor: css('--twc-border', '#e2e8f0'),
        borderRadius: css('--twx-radius', '0.625rem'),
      }}
    >
      <button
        type="button"
        onClick={() => productCtx.handleProductClick(product)}
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-slate-50"
        aria-label={product.name}
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
          />
        ) : (
          <PackageX className="h-6 w-6 text-slate-300" />
        )}
        {hasSale && (
          <span
            className="absolute start-1 top-1 rounded px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-white"
            style={{ background: css('--twc-danger', '#dc2626') }}
          >
            -{saleOff}%
          </span>
        )}
        {!inStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-[10px] font-bold text-white">
            نفد المخزون
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={handleWishlist}
        aria-label={inWishlist ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
        className={`absolute end-1 top-1 flex h-5.5 w-5.5 items-center justify-center rounded-full text-[10px] shadow-sm transition active:scale-90 ${
          inWishlist ? 'bg-red-50 text-red-500' : 'bg-white/90 text-slate-400 hover:text-red-500'
        }`}
        style={{ height: '1.375rem', width: '1.375rem' }}
      >
        <Heart className={`h-3 w-3 ${inWishlist ? 'fill-current' : ''}`} />
      </button>

      {/* Content — price leads, name is small/muted underneath */}
      <div className="flex flex-1 flex-col gap-0.5 p-1.5 sm:p-2">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-sm font-extrabold sm:text-base" style={{ color: css('--twc-primary', '#0f8a5f') }}>
            {salePriceOf(product)}
          </span>
          {hasSale && (
            <span className="truncate text-[10px] text-slate-400 line-through">{priceOf(product)}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => productCtx.handleProductClick(product)}
          className="text-start"
        >
          <h3
            className="line-clamp-2 text-[11px] leading-snug"
            style={{ color: css('--twc-text-secondary', '#64748b') }}
          >
            {product.name}
          </h3>
        </button>

        <div className="mt-auto flex items-center justify-between gap-1 pt-1">
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="اطلب عبر واتساب"
              className="flex h-6 w-6 items-center justify-center rounded-full text-white transition hover:opacity-90"
              style={{ background: '#25D366' }}
            >
              <MessageCircle className="h-3 w-3" />
            </a>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!inStock}
            title={inCart ? 'في سلتك' : 'أضف للسلة'}
            aria-label={inCart ? 'في سلتك' : 'أضف للسلة'}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-white transition active:scale-90 ${
              !inStock ? 'cursor-not-allowed opacity-40' : ''
            }`}
            style={{ background: inCart ? css('--twc-secondary', '#16a34a') : css('--twc-primary', '#0f8a5f') }}
          >
            {inCart ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </article>
  );
};

export default DenseProductCard;
