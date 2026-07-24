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
  images?: string[];
  sku: string;
  stockQuantity: number;
  categoryId: string;
  availability: 'in_stock' | 'out_of_stock';
  taxName?: string;
  taxPercentage?: number;
  description?: string;
  variants?: { name: string; options?: string[]; values?: string[] }[];
  customFields?: { name: string; value: string }[];
}

interface ProductGridProps {
  products: Product[];
  currency: string;
  onAddToCart: (product: Product, quantity?: number, variants?: any) => void;
  onProductClick: (product: Product) => void;
  categoryName?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  currency,
  onAddToCart,
  onProductClick,
  categoryName
}) => {
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-500">Try adjusting your search or browse other categories</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="group bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          {/* Product Image */}
          <div className="relative aspect-[3/4] md:aspect-square overflow-hidden bg-gray-50">
            <img
              src={getImageUrl(product.image)}
              alt={product.name}
              onClick={() => onProductClick(product)}
              className="w-full h-full object-scale-down cursor-pointer transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col space-y-2">
              {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
                <div className="bg-rose-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                  In Variants
                </div>
              )}
              {product.originalPrice && (
                <div className="w-fit bg-rose-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                  -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                </div>
              )}
            </div>

            {/* Stock Status */}
            {product.availability === 'out_of_stock' && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
                <span className="bg-white text-gray-900 px-3 py-1 rounded-lg text-sm font-medium">
                  Out of Stock
                </span>
              </div>
            )}

            {/* Quick Actions */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {/* Quick View */}
              <button 
                onClick={() => onProductClick(product)}
                className="w-8 h-8 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-600 hover:text-rose-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>

            {/* Add to Cart - Mobile */}
            <div className="absolute bottom-3 left-3 right-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={() => {
                  const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
                  if (hasVariants) {
                    onProductClick(product);
                    return;
                  }
                  onAddToCart(product, 1);
                }}
                disabled={product.availability === 'out_of_stock'}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-300 shadow-lg"
              >
                {product.availability === 'out_of_stock' 
                  ? 'Out of Stock' 
                  : (product.variants && Array.isArray(product.variants) && product.variants.length > 0)
                    ? 'Select Options'
                    : 'Add to Cart'
                }
              </button>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-3 md:p-4">
            {/* Product Name */}
            <h3 
              onClick={() => onProductClick(product)}
              className="font-medium text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-rose-600 transition-colors text-sm md:text-base"
            >
              {product.name}
            </h3>

            {/* Price */}
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm md:text-lg font-semibold text-gray-900">
                {formatCurrency(product.price, storeSettings, currencies)}
              </span>
              {product.originalPrice && (
                <span className="text-xs md:text-sm text-gray-500 line-through">
                  {formatCurrency(product.originalPrice, storeSettings, currencies)}
                </span>
              )}
            </div>

            {/* Variant Names */}
            {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {product.variants.slice(0, 3).map((variant, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-rose-100 text-rose-600 rounded border hover:border-rose-300 cursor-pointer transition-colors"
                    >
                      {variant.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Info */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>SKU: {product.sku}</span>
              {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
                <span className="text-orange-500 font-medium">
                  Only {product.stockQuantity} left
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};