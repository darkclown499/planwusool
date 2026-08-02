import React from 'react';
import { Plus, Eye } from 'lucide-react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { toast } from '@/components/custom-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  categoryId: string;
  availability: 'in_stock' | 'out_of_stock';
  description?: string;
  variants?: { name: string; values: string[] }[];
}

interface ProductGridProps {
  products: Product[];
  currency: string;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
  categoryName: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  currency,
  onAddToCart,
  onProductClick,
  categoryName
}) => {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12 bg-stone-50 rounded-lg border border-stone-200">
        <p className="text-amber-800 text-lg font-medium">لا توجد منتجات لذيذة في {categoryName} بعد!</p>
        <p className="text-amber-700 text-sm mt-2">ترقّب وصول إضافات جديدة قريباً.</p>
      </div>
    );
  }

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  const getDiscountPercentage = (originalPrice: number, currentPrice: number) => {
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  };

  return (
    <>
      {/* Mobile List View */}
      <div className="block md:hidden px-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-sm border border-stone-200 mb-3 overflow-hidden"
          >
            <div className="flex p-3">
              {/* Product Image */}
              <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-stone-100 group/image">
                <img
                  src={getImageUrl(product.image) || '/placeholder.jpg'}
                  alt={product.name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => onProductClick(product)}
                />
                
                {/* View Icon */}
                <button 
                  onClick={() => onProductClick(product)}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 cursor-pointer"
                >
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                </button>
                
                {/* Badges */}
                <div className="absolute top-1 right-1 flex flex-col gap-1 items-start">
                  {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
                    <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                      بالخيارات
                    </span>
                  )}
                  {product.originalPrice && (
                    <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                      -{getDiscountPercentage(product.originalPrice, product.price)}%
                    </span>
                  )}
                </div>

                {/* Out of Stock Overlay */}
                {product.availability === 'out_of_stock' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-white text-amber-900 px-2 py-1 rounded text-xs font-bold">
                      غير متوفر
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 mr-3 flex flex-col justify-between min-w-0">
                <div>
                  <h3
                    className="font-serif font-bold text-amber-900 text-sm cursor-pointer hover:text-amber-700 transition-colors line-clamp-2 mb-1 leading-tight"
                    onClick={() => onProductClick(product)}
                  >
                    {product.name}
                  </h3>

                  {/* Description */}
                  {product.description && (
                    <div 
                      className="text-amber-600 text-xs mb-2 line-clamp-1"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  )}

                  {/* Price */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base font-bold text-amber-900">
                      {formatCurrency(product.price, storeSettings, currencies)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs text-amber-500 line-through">
                        {formatCurrency(product.originalPrice, storeSettings, currencies)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={() => {
                    const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
                    if (hasVariants) {
                      onProductClick(product);
                      return;
                    }
                    onAddToCart(product);
                  }}
                  disabled={product.availability === 'out_of_stock'}
                  className={`
                    flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-medium transition-all duration-200 text-xs w-full
                    ${product.availability === 'out_of_stock'
                      ? 'bg-stone-200 text-amber-500 cursor-not-allowed'
                      : 'bg-amber-700 text-white hover:bg-amber-800 cursor-pointer'
                    }
                  `}
                >
                  {product.availability === 'out_of_stock' ? (
                    <span>غير متوفر</span>
                  ) : product.variants && Array.isArray(product.variants) && product.variants.length > 0 ? (
                    <span>اختر الخيارات</span>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      <span>أضف</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Grid View */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => {
          const hasDiscount = product.originalPrice;
          const isOutOfStock = product.availability === 'out_of_stock';
          
          return (
            <div
              key={product.id}
              className="group flex flex-col bg-stone-50 border-2 border-stone-200 hover:border-amber-400 transition-all duration-300 overflow-hidden relative"
              style={{ borderRadius: '20px 20px 0 0' }}
            >
              {/* Decorative Top Border */}
              <div className="h-1 bg-amber-600"></div>
              
              {/* Product Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-white m-3 rounded-xl">
                <img
                  src={getImageUrl(product.image) || '/placeholder.jpg'}
                  alt={product.name}
                  className="w-full h-full object-scale-down cursor-pointer"
                  onClick={() => onProductClick(product)}
                />
                
                {/* Sale Badge */}
                {hasDiscount && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
                    -{getDiscountPercentage(product.originalPrice!, product.price)}%
                  </div>
                )}
                
                {/* Variant Badge */}
                {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
                  <div className="absolute top-2 right-2 bg-amber-600 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
                    بالخيارات
                  </div>
                )}
                
                {/* Out of Stock Overlay */}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center rounded-xl">
                    <div className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold text-sm shadow-lg">
                      غير متوفر
                    </div>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 flex flex-col h-full px-4 pb-4">
                {/* Product Name */}
               <div className="flex-1">
                 <h3
                  className="font-serif font-bold text-amber-900 text-lg mb-3 line-clamp-2 cursor-pointer hover:text-amber-700 transition-colors text-center"
                  onClick={() => onProductClick(product)}
                >
                  {product.name}
                </h3>
               </div>

                <div>
                  {/* Price Section */}
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-2xl font-bold text-amber-900">
                      {formatCurrency(product.price, storeSettings, currencies)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatCurrency(product.originalPrice!, storeSettings, currencies)}
                      </span>
                    )}
                  </div>

                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={() => {
                    const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
                    if (hasVariants) {
                      onProductClick(product);
                      return;
                    }
                    onAddToCart(product);
                  }}
                  disabled={isOutOfStock}
                  className={`
                    w-full py-3 px-4 rounded-full font-bold text-sm transition-all duration-300 shadow-md
                    ${isOutOfStock
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-amber-600 text-white hover:bg-amber-700 hover:shadow-lg transform hover:scale-105'
                    }
                  `}
                >
                  {isOutOfStock ? (
                    'غير متوفر'
                  ) : product.variants && Array.isArray(product.variants) && product.variants.length > 0 ? (
                    'اختر الخيارات'
                  ) : (
                    'أضف إلى السلة'
                  )}
                </button>
                
                {/* SKU */}
                <div className="text-center mt-2 text-xs text-amber-500">
                  الرمز: {product.sku}
                </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};