import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
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
  category?: string;
  availability: 'in_stock' | 'out_of_stock';
  description?: string;
  variants?: any[];
  customFields?: any[];
  taxName?: string;
  taxPercentage?: number;
}

interface ProductGridProps {
  products: Product[];
  currency: string;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  currency,
  onAddToCart,
  onProductClick
}) => {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-800 border-2 border-slate-800">
        <div className="text-6xl mb-4">🚗</div>
        <p className="text-white text-lg font-bold">لا توجد منتجات</p>
      </div>
    );
  }

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  const getDiscountPercentage = (originalPrice: number, salePrice: number) => {
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  };

  return (
    <div className="grid sm:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
      {products.map((product) => (
        <div
          key={product.id}
          className="group bg-white border-2 border-slate-800 hover:border-amber-600 transition-all duration-300 min-w-0"
        >
          {/* Header Bar */}
          <div className="bg-slate-800 p-1 sm:p-2 flex justify-between items-center">
            <span className="text-white text-xs font-bold truncate">
              {product.category || 'منتجات'}
            </span>
            <span className="text-slate-300 text-xs mr-1 flex-shrink-0">
              #{product.sku}
            </span>
          </div>

          {/* Product Image */}
          <div className="relative aspect-square overflow-hidden bg-slate-100">
            <img
              src={getImageUrl(product.image) || '/placeholder.jpg'}
              alt={product.name}
              className="w-full h-full object-scale-down"
            />
            
            <div className="absolute top-2 right-2">
              <WishlistButton productId={product.id} iconOnly />
            </div>
            
            {/* Corner Badges */}
            {product.availability === 'out_of_stock' && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                <span className="bg-amber-600 text-white px-3 py-1 text-xs font-bold">
                  غير متوفر
                </span>
              </div>
            )}
            
            {product.variants && product.variants.length > 0 && (
              <div className="absolute bottom-2 right-2 bg-amber-600 text-white px-2 py-1 text-xs font-bold">
                بالخيارات
              </div>
            )}
            
            {product.originalPrice && product.originalPrice > product.price && (
              <div className="absolute top-2 left-2 bg-amber-600 text-white px-2 py-1 text-xs font-bold">
                -{getDiscountPercentage(product.originalPrice, product.price)}%
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-2 sm:p-3">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm mb-2 line-clamp-2 cursor-pointer hover:text-amber-600 transition-colors h-8 sm:h-10"
                onClick={() => onProductClick(product)}>
              {product.name}
            </h3>

            <div className="space-y-1 sm:space-y-2">
              {/* Price Row */}
              <div className="flex items-center justify-between min-w-0">
                <span className="text-sm sm:text-lg font-black text-amber-600 truncate">
                  {formatCurrency(product.price, storeSettings, currencies)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-xs text-slate-500 line-through mr-1 flex-shrink-0">
                    {formatCurrency(product.originalPrice, storeSettings, currencies)}
                  </span>
                )}
              </div>
              
              {/* Stock Row */}
              <div className="text-xs font-medium">
                {product.stockQuantity > 0 ? (
                  <span className="text-green-600">
                    ✓ {product.stockQuantity > 10 ? 'متوفر' : `بقي ${product.stockQuantity} فقط`}
                  </span>
                ) : (
                  <span className="text-amber-600">
                    ✗ غير متوفر
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer Button */}
          <div className="bg-slate-800 p-1 sm:p-2">
            <button
              onClick={() => {
                if (product.variants && product.variants.length > 0) {
                  onProductClick(product);
                } else {
                  onAddToCart(product);
                }
              }}
              disabled={product.availability === 'out_of_stock'}
              className={`w-full py-1 sm:py-2 text-xs font-bold transition-colors ${
                product.availability === 'in_stock'
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              {product.availability === 'out_of_stock' ? (
                'غير متوفر'
              ) : product.variants && product.variants.length > 0 ? (
                <span className="hidden sm:inline">اختر الخيارات</span>
              ) : (
                <span className="hidden sm:inline">أضف إلى السلة</span>
              )}
              {product.availability === 'in_stock' && (
                <span className="sm:hidden">
                  {product.variants && product.variants.length > 0 ? 'الخيارات' : 'أضف'}
                </span>
              )}
            </button>
            <WhatsAppOrderButton
              product={{ name: product.name, price: product.price }}
              className="mt-1 sm:mt-2 w-full py-1 sm:py-2 text-xs font-bold transition-colors flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1eb85a] text-white"
            />
          </div>
        </div>
      ))}
    </div>
  );
};