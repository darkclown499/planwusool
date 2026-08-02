import React from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  sku: string;
  stockQuantity: number;
  availability: 'in_stock' | 'out_of_stock';
  variants?: { name: string; options: string[] }[];
}

interface ProductGridProps {
  products: Product[];
  currency: string;
  onAddToCart: (product: Product, quantity?: number) => void;
  onProductClick: (product: Product) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  currency,
  onAddToCart,
  onProductClick,
}) => {
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];
  
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-8 md:py-12">
        <Package className="h-12 w-12 md:h-16 md:w-16 text-purple-300 mx-auto mb-3 md:mb-4" />
        <p className="text-base md:text-lg text-purple-600 font-medium">لا توجد ألعاب في هذه الفئة</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
      {products.map((product) => {
        const hasVariants = product.variants && product.variants.length > 0;
        const isOnSale = product.originalPrice && product.originalPrice > product.price;
        const discountPercentage = isOnSale 
          ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
          : 0;

        return (
          <div
            key={product.id}
            className="bg-purple-50 flex flex-col rounded-lg border border-purple-200 hover:border-purple-300 transition-all duration-200 overflow-hidden group"
          >
            {/* Product Image */}
            <div 
              className="relative aspect-square cursor-pointer overflow-hidden bg-white m-2 rounded-lg"
              onClick={() => onProductClick(product)}
            >
              <img
                src={getImageUrl(product.image)}
                alt={product.name}
                className="w-full h-full object-scale-down"
              />
              
              {/* Badges */}
              <div className="absolute top-1 sm:top-2 right-1 sm:right-2 flex flex-col gap-1 items-start">
                {hasVariants && (
                  <span className="bg-blue-500 text-white px-1 py-0.5 sm:px-2 sm:py-1 rounded text-xs font-bold shadow-sm">
                    بالخيارات
                  </span>
                )}
                {isOnSale && (
                  <span className="bg-green-500 text-white px-1 py-0.5 sm:px-2 sm:py-1 rounded text-xs font-bold shadow-sm inline-block">
                    -{discountPercentage}%
                  </span>
                )}
              </div>
              
              {/* Stock Status */}
              {product.availability === 'out_of_stock' && (
                <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                  <span className="bg-red-100 text-red-700 px-3 py-2 rounded font-medium text-sm">
                    غير متوفر
                  </span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-3 flex-1 flex flex-col">
              {/* Product Name */}
              <div className='flex-1'>
                <h3 
                className="font-medium text-purple-800 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-purple-600 transition-colors"
                onClick={() => onProductClick(product)}
              >
                {product.name}
              </h3>
              </div>

              <div>
                {/* Price */}
              <div className="mb-3">
                <span className="text-lg font-bold text-purple-700">
                  {formatCurrency(product.price, storeSettings, currencies)}
                </span>
                {isOnSale && (
                  <span className="text-sm text-gray-500 line-through mr-2">
                    {formatCurrency(product.originalPrice!, storeSettings, currencies)}
                  </span>
                )}
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={() => {
                  if (hasVariants) {
                    onProductClick(product);
                  } else {
                    onAddToCart(product, 1);
                  }
                }}
                disabled={product.availability === 'out_of_stock'}
                className={`w-full py-2 px-4 rounded-lg font-medium text-xs sm:text-sm transition-colors border ${
                  product.availability === 'out_of_stock'
                    ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'border-purple-300 text-purple-700 hover:bg-purple-100'
                }`}
              >
                {product.availability === 'out_of_stock' 
                  ? 'غير متوفر' 
                  : hasVariants 
                    ? 'اختر الخيارات'
                    : 'أضف إلى السلة'
                }
              </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};