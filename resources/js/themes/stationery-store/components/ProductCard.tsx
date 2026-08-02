import React from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { toast } from '@/components/custom-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  discount?: number;
  sku: string;
  variants?: { name: string; values: string[] }[];
}

interface ProductCardProps {
  product: Product;
  currency: string;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, currency, onAddToCart, onProductClick }) => {
  const discountPercentage = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : product.discount;

  // Get store settings from page props
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden flex items-center gap-3 p-4 bg-white border-b border-gray-100">
        <div className="flex-shrink-0">
          <img 
            src={getImageUrl(product.image)} 
            alt={product.name}
            onClick={() => onProductClick(product)}
            loading="lazy"
            className="w-16 h-16 object-cover rounded-lg cursor-pointer"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 
            onClick={() => onProductClick(product)}
            className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-sky-600"
          >
            {product.name}
          </h3>
          
          <p className="text-xs text-gray-500 mb-1">الرمز: {product.sku}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(product.price, storeSettings, currencies)}
            </span>
            
            {product.originalPrice && (
              <span className="text-sm text-gray-500 line-through">
                {formatCurrency(product.originalPrice, storeSettings, currencies)}
              </span>
            )}
            
            {discountPercentage && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                -{discountPercentage}%
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={() => {
            const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
            if (hasVariants) {
              onProductClick(product);
              return;
            }
            onAddToCart(product);
          }}
          className="flex-shrink-0 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          {product.variants && Array.isArray(product.variants) && product.variants.length > 0 ? (
            <>
              <span className="hidden md:inline">اختر الخيارات</span>
              <svg className="w-5 h-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </>
          ) : (
            <>
              <span className="hidden md:inline">أضف إلى السلة</span>
              <svg className="w-5 h-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-square relative overflow-hidden">
          <img 
            src={getImageUrl(product.image)} 
            alt={product.name}
            onClick={() => onProductClick(product)}
            loading="lazy"
            className="w-full h-full object-scale-down group-hover:scale-105 transition-transform duration-300 cursor-pointer"
          />
          <div className="absolute top-3 right-3 flex flex-col space-y-2">
            {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
              <span className="bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                بالخيارات
              </span>
            )}
            {discountPercentage && (
              <span className="w-fit bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                -{discountPercentage}%
              </span>
            )}
          </div>
        </div>
        
        <div className="p-5 flex-1 flex flex-col h-full">
          <div className='flex-1'>
            <h3 
            onClick={() => onProductClick(product)}
            className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm leading-5 cursor-pointer hover:text-sky-600"
          >
            {product.name}
          </h3>
          
          <p className="text-xs text-gray-500 mb-3">الرمز: {product.sku}</p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-4">
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(product.price, storeSettings, currencies)}
            </span>
            
            {product.originalPrice && (
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(product.originalPrice, storeSettings, currencies)}
              </span>
            )}
          </div>
          
          <button
            onClick={() => {
              const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
              if (hasVariants) {
                onProductClick(product);
                return;
              }
              onAddToCart(product);
            }}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm cursor-pointer"
          >
            {product.variants && Array.isArray(product.variants) && product.variants.length > 0 ? 'اختر الخيارات' : 'أضف إلى السلة'}
          </button>
          </div>
        </div>
      </div>
    </>
  );
};