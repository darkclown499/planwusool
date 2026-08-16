import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Heart, Eye, Star } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { get_image_url } from '@/utils/image-helper';
import { formatStoreCurrency } from '@/utils/currency-helper';
import { formatCurrency } from '@/utils/currency-formatter';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  categoryId: string;
  category?: string;
  availability: 'in_stock' | 'out_of_stock';
  sku: string;
  stockQuantity: number;
  variants?: Record<string, any>[];
  rating?: number;
  reviewCount?: number;
}

interface BaseProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4;
  showAddToCart?: boolean;
  showWishlist?: boolean;
  showQuickView?: boolean;
  showRating?: boolean;
  variant?: 'grid' | 'list';
  className?: string;
  emptyMessage?: string;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
}

export const BaseProductGrid: React.FC<BaseProductGridProps> = ({
  products,
  columns = 3,
  showAddToCart = true,
  showWishlist = true,
  showQuickView = true,
  showRating = true,
  variant = 'grid',
  className,
  emptyMessage,
  onProductClick,
  onAddToCart,
  onToggleWishlist,
}) => {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  if (!products.length) {
    return (
      <div className={cn('text-center py-16', className)}>
        <div className="w-20 h-20 mx-auto mb-4 text-gray-300">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {emptyMessage || t('No products found')}
        </h3>
        <p className="text-gray-500">{t('Try adjusting your filters or search terms')}</p>
      </div>
    );
  }

  const handleAddToCart = (product: Product) => {
    if (onAddToCart) {
      onAddToCart(product);
    } else {
      addToCart(product);
    }
  };

  const handleToggleWishlist = (product: Product) => {
    if (onToggleWishlist) {
      onToggleWishlist(product);
    } else {
      toggleWishlist(product);
    }
  };

  const handleQuickView = (product: Product) => {
    if (onProductClick) {
      onProductClick(product);
    }
  };

  return (
    <div className={cn(
      variant === 'grid'
        ? `grid gap-6 ${columnClasses[columns]}`
        : 'space-y-4',
      className
    )}>
      {products.map((product) => {
        const isWishlisted = isInWishlist(product.id);
        const imageUrl = get_image_url(product.image) || '/images/placeholder-product.png';

        if (variant === 'list') {
          return (
            <div
              key={product.id}
              className={cn(
                'flex gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors',
                'group'
              )}
              onMouseEnter={() => setHoveredProduct(product.id)}
              onMouseLeave={() => setHoveredProduct(null)}
            >
              <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {product.availability === 'out_of_stock' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-medium px-3 py-1 bg-red-500 rounded">
                      {t('Out of Stock')}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{product.category}</p>
                  {showRating && product.rating && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-600">{product.rating.toFixed(1)}</span>
                      {product.reviewCount && (
                        <span className="text-sm text-gray-400 ml-1">({product.reviewCount})</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 ml-auto">
                  <div className="flex flex-col items-end">
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatStoreCurrency(product.originalPrice)}
                      </span>
                    )}
                    <span className="text-lg font-bold text-gray-900">
                      {formatStoreCurrency(product.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {showWishlist && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleWishlist(product); }}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          isWishlisted
                            ? 'text-red-500 bg-red-50'
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        )}
                        aria-label={isWishlisted ? t('Remove from wishlist') : t('Add to wishlist')}
                      >
                        <Heart
                          className={cn('h-5 w-5', isWishlisted ? 'fill-current' : '')}
                        />
                      </button>
                    )}
                    {showQuickView && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleQuickView(product); }}
                        className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label={t('Quick view')}
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    )}
                    {showAddToCart && product.availability === 'in_stock' && (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                        className="ml-2"
                        style={{ backgroundColor: 'var(--theme-color)' }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        {t('Add')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={product.id}
            className={cn(
              'group flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden',
              'hover:border-gray-200 hover:shadow-lg transition-all duration-300'
            )}
            onMouseEnter={() => setHoveredProduct(product.id)}
            onMouseLeave={() => setHoveredProduct(null)}
          >
            <div className="relative aspect-square overflow-hidden bg-gray-50">
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {product.availability === 'out_of_stock' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-medium px-4 py-2 bg-red-500 rounded">
                    {t('Out of Stock')}
                  </span>
                </div>
              )}
              <div className="absolute top-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                {showWishlist && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleWishlist(product); }}
                    className={cn(
                      'p-2 rounded-full transition-colors ml-2',
                      isWishlisted
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-red-50 hover:text-red-500'
                    )}
                    aria-label={isWishlisted ? t('Remove from wishlist') : t('Add to wishlist')}
                  >
                    <Heart
                      className={cn('h-5 w-5', isWishlisted ? 'fill-current' : '')}
                    />
                  </button>
                )}
                {showQuickView && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleQuickView(product); }}
                    className="p-2 bg-white text-gray-600 rounded-full hover:bg-gray-100 mr-2"
                    aria-label={t('Quick view')}
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-semibold text-gray-900 truncate flex-1 pr-2">
                  {product.name}
                </h4>
                {showRating && product.rating && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-gray-600">{product.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-2">{product.category}</p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatStoreCurrency(product.originalPrice)}
                    </span>
                  )}
                  <span className="text-lg font-bold text-gray-900">
                    {formatStoreCurrency(product.price)}
                  </span>
                </div>
                {showAddToCart && product.availability === 'in_stock' && (
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                    className="w-full sm:w-auto"
                    style={{ backgroundColor: 'var(--theme-color)' }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    {t('Add to Cart')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BaseProductGrid;