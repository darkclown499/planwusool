import React from 'react';
import { ShoppingBag, Heart, Eye, Star } from 'lucide-react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { toast } from '@/components/custom-toast';
import { WishlistButton } from '@/components/storefront/WishlistButton';
import { WhatsAppOrderButton } from '@/components/storefront/WhatsAppOrderButton';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  sku: string;
  stockQuantity: number;
  categoryId: string;
  availability: 'in_stock' | 'out_of_stock';
  description?: string;
  variants?: Array<{ name: string; values?: string[]; options?: string[] }>;
  customFields?: { name: string; value: string }[];
  taxName?: string;
  taxPercentage?: number;
}

interface ProductCardProps {
  products: Product[];
  currency: string;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
  categoryName: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  products,
  currency,
  onAddToCart,
  onProductClick,
  categoryName
}) => {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🏠</div>
        <h3 className="text-xl font-semibold text-yellow-800 mb-2">لا توجد منتجات في {categoryName}</h3>
        <p className="text-yellow-600">ترقب قريباً منتجات جديدة!</p>
      </div>
    );
  }

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  const getDiscountPercentage = (original: number, sale: number) => {
    return Math.round(((original - sale) / original) * 100);
  };

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
      {products.map((product) => (
        <div
          key={product.id}
          onClick={() => onProductClick(product)}
          className="group flex flex-col bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-yellow-100 hover:border-yellow-300 transform hover:-translate-y-2 cursor-pointer"
        >
          {/* Product Image */}
          <div className="relative aspect-square overflow-hidden bg-yellow-50">
            <img
              src={getImageUrl(product.image) || '/placeholder.jpg'}
              alt={product.name}
              className="w-full h-full object-scale-down group-hover:scale-110 transition-transform duration-700"
            />
            


            {/* Badges */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2">
              <WishlistButton productId={product.id} iconOnly />
              {product.availability === 'out_of_stock' && (
                <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  غير متوفر
                </span>
              )}
              {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
                <span className="px-3 py-1 bg-yellow-600 text-white text-xs font-bold rounded-full">
                  بالخيارات
                </span>
              )}
              {product.originalPrice && (
                <span className="w-fit px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  -{getDiscountPercentage(product.originalPrice, product.price)}%
                </span>
              )}
            </div>

            {/* Stock Indicator */}
            {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
              <div className="absolute top-4 left-4">
                <span className="px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
                  متبقي {product.stockQuantity} فقط
                </span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 flex flex-col h-full p-3 sm:p-4 md:p-6">


           <div className="flex-1">
             {/* Product Name */}
            <h3 className="font-serif text-sm sm:text-base md:text-lg font-semibold text-yellow-900 mb-2 line-clamp-2 group-hover:text-yellow-700 transition-colors">
              {product.name}
            </h3>
           </div>

            <div>
              {/* Price */}
            <div className="flex items-center space-x-1 sm:space-x-2 mb-2 sm:mb-4">
              <span className="text-base sm:text-xl md:text-2xl font-bold text-yellow-800">
                {formatCurrency(product.price, storeSettings, currencies)}
              </span>
              {product.originalPrice && (
                <span className="text-xs sm:text-base md:text-lg text-gray-500 line-through">
                  {formatCurrency(product.originalPrice, storeSettings, currencies)}
                </span>
              )}
            </div>

            {/* Description - Hidden on mobile */}
            {product.description && (
              <div 
                className="text-sm text-yellow-700/70 mb-4 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
                  if (hasVariants) {
                    onProductClick(product);
                    return;
                  }
                  onAddToCart(product);
                }}
                disabled={product.availability === 'out_of_stock'}
                className={`
                  flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-2 sm:px-4 rounded-xl font-semibold transition-all duration-300 text-xs sm:text-sm
                  ${product.availability === 'out_of_stock'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  }
                `}
              >
                <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                {product.availability === 'out_of_stock' ? (
                  <>
                    <span className="hidden sm:inline">غير متوفر</span>
                    <span className="sm:hidden">غير متوفر</span>
                  </>
                ) : product.variants && Array.isArray(product.variants) && product.variants.length > 0 ? (
                  <>
                    <span className="hidden sm:inline">اختر الخيارات</span>
                    <span className="sm:hidden">الخيارات</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">أضف إلى السلة</span>
                    <span className="sm:hidden">أضف</span>
                  </>
                )}
              </button>
            </div>

            <WhatsAppOrderButton
              product={{ name: product.name, price: product.price }}
              className="w-full mt-3 bg-[#25D366] hover:bg-[#1eb85a] text-white font-medium py-2 sm:py-3 px-4 rounded-xl transition-all duration-300 text-xs sm:text-sm flex items-center justify-center gap-2"
            />

            {/* SKU - Hidden on mobile */}
            <div className="hidden sm:block mt-3 text-xs text-yellow-600/60">
              الرمز: {product.sku}
            </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};