import React from 'react';
import { Eye, Gift, Plus } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { formatCurrency } from '@/utils/currency-formatter';
import { WishlistButton } from './WishlistButton';
import { WhatsAppOrderButton } from './WhatsAppOrderButton';
import { createSafeHtml } from '@/utils/xss-protection';
import { calcEarnedPoints, getLoyaltySettingsFromPage } from '@/utils/loyalty';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  categoryId: string;
  sku: string;
  availability: 'in_stock' | 'out_of_stock';
  description?: string;
  variants?: Array<{ name: string; values?: string[]; options?: string[] }>;
}

interface CurrencySettings {
  defaultCurrency?: string;
  decimalFormat?: string;
  decimalSeparator?: string;
  thousandsSeparator?: string;
  currencySymbolPosition?: string;
  currencySymbolSpace?: boolean | string;
  floatNumber?: boolean | string;
}

interface Currency {
  code: string;
  symbol: string;
}

interface PageProps {
  storeSettings?: CurrencySettings;
  currencies?: Currency[];
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

export const getDiscountPercentage = (originalPrice: number, currentPrice: number): number => {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onProductClick,
}) => {
  const isInStock = product.availability === 'in_stock';
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? getDiscountPercentage(product.originalPrice, product.price)
      : 0;

  const pageProps = (window as unknown as { page?: { props?: PageProps } }).page?.props;
  const storeSettings = pageProps?.storeSettings || {};
  const currencies = pageProps?.currencies || [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden group transition-shadow duration-200 hover:shadow-md">
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={getImageUrl(product.image) || '/placeholder.jpg'}
          alt={product.name}
          className="w-full h-full object-cover object-center cursor-pointer transition-transform duration-200 group-hover:scale-105"
          onClick={() => onProductClick(product)}
          loading="lazy"
        />

        {!isInStock && (
          <span className="absolute top-2 left-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
            نفذ المخزون
          </span>
        )}

        {discount > 0 && (
          <span className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </span>
        )}

        <button
          onClick={() => onProductClick(product)}
          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
        >
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors">
            <Eye className="h-4 w-4 text-white" />
          </div>
        </button>
      </div>

      <div className="p-4 flex flex-col">
        <h3
          className="text-lg font-medium text-gray-800 line-clamp-1 cursor-pointer"
          onClick={() => onProductClick(product)}
          dangerouslySetInnerHTML={createSafeHtml(product.name)}
        />

        <div className="mt-2 flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(product.price, storeSettings, currencies)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-sm text-gray-500 line-through">
              {formatCurrency(product.originalPrice, storeSettings, currencies)}
            </span>
          )}
        </div>

        {(() => {
          const pts = calcEarnedPoints(Number(product.price) || 0, getLoyaltySettingsFromPage());
          return pts > 0 ? (
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-600">
              <Gift className="h-3 w-3" /> كسب {pts} نقطة
            </span>
          ) : null;
        })()}
        {isInStock ? (
          <button
            onClick={() => onAddToCart(product)}
            className="mt-3 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-1.5 rounded transition-colors"
          >
            <Plus className="h-4 w-4" />
            إضافة للسلة
          </button>
        ) : (
          <button
            disabled
            className="mt-3 flex items-center justify-center gap-1 bg-gray-300 text-gray-500 text-sm font-medium py-1.5 rounded cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            غير متوفر
          </button>
        )}

        <div className="mt-2 flex gap-2">
          <WishlistButton productId={product.id} />
          <WhatsAppOrderButton product={product} />
        </div>
      </div>
    </div>
  );
};
