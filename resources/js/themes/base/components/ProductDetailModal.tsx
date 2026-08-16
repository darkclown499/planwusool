import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, ShoppingCart, Heart, Truck, Shield, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { get_image_url } from '@/utils/image-helper';
import { formatStoreCurrency } from '@/utils/currency-helper';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  description?: string;
  availability: 'in_stock' | 'out_of_stock';
  stockQuantity: number;
  variants?: Record<string, any>[];
  rating?: number;
  reviewCount?: number;
  sku?: string;
  category?: string;
}

interface BaseProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const BaseProductDetailModal: React.FC<BaseProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  className,
}) => {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen && product) {
      setSelectedImage(0);
      setQuantity(1);
      setSelectedVariants({});
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const images = product.images?.length ? product.images : [product.image];
  const isWishlisted = isInWishlist(product.id);
  const currentImage = get_image_url(images[selectedImage]) || get_image_url(product.image) || '/images/placeholder-product.png';

  const handleAddToCart = () => {
    if (product.availability === 'out_of_stock') return;
    addToCart(product, quantity, selectedVariants);
    onClose();
  };

  const imgUrl = (url: string) => get_image_url(url) || '/images/placeholder-product.png';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4">
        <div className={cn(
          'relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl',
          'flex flex-col lg:flex-row overflow-hidden',
          className
        )}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white text-gray-500 hover:text-gray-700 rounded-full shadow-sm transition-colors"
            aria-label={t('Close detail')}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Images */}
          <div className="lg:w-1/2 p-4 sm:p-6 flex flex-col gap-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50">
              <img
                src={imgUrl(currentImage)}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.availability === 'out_of_stock' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-medium px-4 py-2 bg-red-500 rounded">
                    {t('Out of Stock')}
                  </span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      'w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors',
                      index === selectedImage
                        ? 'border-primary'
                        : 'border-transparent hover:border-gray-200'
                    )}
                    style={{ borderColor: index === selectedImage ? 'var(--theme-color)' : undefined }}
                  >
                    <img
                      src={imgUrl(img)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:w-1/2 p-4 sm:p-6 grid grid-rows-[1fr_auto] gap-4">
            <div className="min-h-0 overflow-y-auto">
              {product.category && (
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--theme-color)' }}>
                  {product.category}
                </p>
              )}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>

              {product.rating && (
                <div className="flex items-center gap-1 mb-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-gray-600">{product.rating.toFixed(1)}</span>
                  {product.reviewCount && (
                    <span className="text-sm text-gray-400 ml-1">({product.reviewCount} {t('reviews')})</span>
                  )}
                </div>
              )}

              <div className="flex items-baseline gap-3 mb-4">
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-xl text-gray-400 line-through">
                    {formatStoreCurrency(product.originalPrice)}
                  </span>
                )}
                <span className="text-3xl font-bold text-gray-900">
                  {formatStoreCurrency(product.price)}
                </span>
              </div>

              {/* Availability */}
              <div className={cn(
                'flex items-center gap-2 mb-4 px-3 py-2 rounded-lg',
                product.availability === 'in_stock'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-600'
              )}>
                {product.availability === 'in_stock' ? (
                  <>
                    <Shield className="h-5 w-5" />
                    <span>{t('In Stock')}</span>
                    {product.stockQuantity <= 5 && (
                      <span className="text-xs">({product.stockQuantity} {t('available')})</span>
                    )}
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5" />
                    <span>{t('Out of Stock')}</span>
                  </>
                )}
              </div>

              {product.description && (
                <div className="prose prose-sm text-gray-600 mb-6">
                  <p>{product.description}</p>
                </div>
              )}

              {product.sku && (
                <p className="text-xs text-gray-400 mb-4">
                  {t('SKU')}: {product.sku}
                </p>
              )}
            </div>

            {/* Action bar */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              {product.stockQuantity > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-l-lg transition-colors"
                      aria-label={t('Decrease quantity')}
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-r-lg transition-colors"
                      aria-label={t('Increase quantity')}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => toggleWishlist(product)}
                    className={cn(
                      'p-3 rounded-xl border transition-colors',
                      isWishlisted
                        ? 'border-red-200 text-red-500 bg-red-50'
                        : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50'
                    )}
                    aria-label={isWishlisted ? t('Remove from wishlist') : t('Add to wishlist')}
                  >
                    <Heart className={cn('h-5 w-5', isWishlisted && 'fill-current')} />
                  </button>
                </div>
              )}

              <Button
                className="w-full py-3 text-lg"
                size="lg"
                disabled={product.availability === 'out_of_stock'}
                onClick={handleAddToCart}
                style={{ backgroundColor: 'var(--theme-color)' }}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {product.availability === 'in_stock' ? t('Add to Cart') : t('Out of Stock')}
              </Button>

              <div className="flex items-center gap-6 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Truck className="h-4 w-4" /> {t('Free shipping over 100')}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" /> {t('Secure payment')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseProductDetailModal;
