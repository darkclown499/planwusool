import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { getImageUrl } from '@/utils/image-helper';
import { formatCurrency } from '@/utils/currency-formatter';
import { productWhatsAppUrl } from '@/builder/sections/helpers';

interface WpProductCardProps {
  product: any;
  addToCartLabel: string;
  /** wow.js entrance class copied from the original markup */
  revealClass?: string;
}

/**
 * Faithful `.tab-product` card: image zooms + fades on hover while a
 * pill add-to-cart button floats up (exact original behaviour), with a
 * round `onsale` badge when a sale price is set.
 */
export const WpProductCard: React.FC<WpProductCardProps> = ({ product, addToCartLabel, revealClass = 'wow-zoomIn' }) => {
  const { cart, config } = useStorefrontCore();

  const price = Number(product.price) || 0;
  const salePrice = Number(product.sale_price) || 0;
  const hasSale = salePrice > 0 && salePrice < price;
  const offPct = hasSale ? Math.round(((price - salePrice) / price) * 100) : 0;
  const whatsapp = productWhatsAppUrl(config, product);

  return (
    <article className={`wpt-product wpt-reveal ${revealClass}`}>
      <div className="wpt-product__image">
        {hasSale && <span className="wpt-onsale">-{offPct}%</span>}
        <figure>
          <img src={getImageUrl(product.image)} alt={product.name} loading="lazy" />
        </figure>
        <div className="wpt-product__cart">
          <button type="button" onClick={() => cart.addToCart(product)}>
            <ShoppingCart size={15} />
            {addToCartLabel}
          </button>
        </div>
      </div>

      <div className="wpt-product__details">
        <a href={whatsapp || '#'} target={whatsapp ? '_blank' : undefined} rel="noreferrer" className="wpt-product__name no-underline">
          {product.name}
        </a>
        <div className="wpt-product__price">
          {hasSale && <del>{formatCurrency(price)}</del>}
          <ins>{formatCurrency(hasSale ? salePrice : price)}</ins>
        </div>
      </div>
    </article>
  );
};
