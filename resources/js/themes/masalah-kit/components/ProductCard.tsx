import React, { useState } from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { useMasalahTheme } from '../MasalahThemeProvider';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  sku: string;
  stockQuantity: number;
  categoryId: string;
  availability: 'in_stock' | 'out_of_stock';
  variants?: { name: string; options: string[] }[];
  customFields?: { name: string; value: string }[];
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: any) => void;
  onProductClick: (product: Product) => void;
}

const weightLabels = ['كجم', 'جم', 'وزن', 'الوزن'];

function getWeightLabel(product: Product): string {
  const variant = (product.variants || []).find((v) =>
    weightLabels.some((label) => v.name.toLowerCase().includes(label.toLowerCase()))
  );
  if (variant && variant.options.length > 0) return variant.options[0];

  const field = (product.customFields || []).find((f) =>
    weightLabels.some((label) => f.name.toLowerCase().includes(label.toLowerCase()))
  );
  return field?.value || '';
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onProductClick }) => {
  const theme = useMasalahTheme();
  const [favorite, setFavorite] = useState(false);

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
  const weightLabel = getWeightLabel(product);

  const handleAdd = () => {
    if (hasVariants) {
      onProductClick(product);
      return;
    }
    onAddToCart(product);
  };

  if (theme.layout.cardStyle === 'horizontal') {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col sm:flex-row">
        <button
          onClick={() => onProductClick(product)}
          className="sm:w-28 h-28 shrink-0 overflow-hidden bg-gray-50 cursor-pointer"
        >
          <img
            src={getImageUrl(product.image)}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
        </button>
        <div className="p-3 flex-1 flex flex-col min-w-0">
          <h3
            onClick={() => onProductClick(product)}
            className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1 cursor-pointer hover:text-blue-600"
          >
            {product.name}
          </h3>
          <p className="text-xs text-gray-400 mb-1.5">{product.sku}</p>
          <div className="flex items-center gap-2 mt-auto">
            <span className="font-bold text-gray-900 text-sm">
              {formatCurrency(product.price, storeSettings, currencies)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through">
                {formatCurrency(product.originalPrice, storeSettings, currencies)}
              </span>
            )}
            {discountPercentage > 0 && (
              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                -{discountPercentage}%
              </span>
            )}
          </div>
          <button
            onClick={handleAdd}
            className="mt-2 text-xs font-bold py-1.5 rounded-lg text-white transition-colors cursor-pointer"
            style={{ background: theme.colors.primary }}
          >
            {hasVariants ? 'اختر الخيارات' : 'أضف إلى السلة'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <button onClick={() => onProductClick(product)} className="w-full h-full cursor-pointer">
          <img
            src={getImageUrl(product.image)}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </button>
        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          {discountPercentage > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              -{discountPercentage}%
            </span>
          )}
          {hasVariants && (
            <span
              className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow"
              style={{ background: theme.colors.primary }}
            >
              بالخيارات
            </span>
          )}
        </div>
        <button
          onClick={() => setFavorite(!favorite)}
          className="absolute bottom-2 left-2 p-1.5 bg-white rounded-full shadow cursor-pointer"
          aria-label="المفضلة"
        >
          <svg
            className="w-4 h-4"
            fill={favorite ? '#ef4444' : 'none'}
            stroke={favorite ? '#ef4444' : '#9ca3af'}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3
          onClick={() => onProductClick(product)}
          className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 cursor-pointer hover:text-blue-600 flex-1"
        >
          {product.name}
        </h3>
        {weightLabel && (
          <span className="text-[11px] text-gray-400 mb-1.5 inline-flex items-center gap-1">
            <svg className="w-3 h-3" style={{ color: theme.colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 12h18M3 18h18" />
            </svg>
            {weightLabel}
          </span>
        )}
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-gray-900 text-sm">
            {formatCurrency(product.price, storeSettings, currencies)}
          </span>
          {product.originalPrice && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(product.originalPrice, storeSettings, currencies)}
            </span>
          )}
        </div>
        <button
          onClick={handleAdd}
          className="w-full text-xs font-bold py-2 rounded-lg text-white transition-colors cursor-pointer"
          style={{ background: theme.colors.primary }}
        >
          {hasVariants ? 'اختر الخيارات' : 'أضف إلى السلة'}
        </button>
      </div>
    </div>
  );
};
