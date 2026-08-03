import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { useMasalahTheme } from '../MasalahThemeProvider';
import { useStorefrontLocale } from '../../../contexts/StorefrontLocaleContext';
import { WishlistButton } from '@/components/storefront/WishlistButton';
import { ProductReviews } from '@/components/storefront/ProductReviews';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  sku: string;
  stockQuantity: number;
  availability: 'in_stock' | 'out_of_stock';
  description?: string;
  variants?: { name: string; options: string[] }[];
  customFields?: { name: string; value: string }[];
}

interface ProductDetailProps {
  product: Product;
  selectedImageIndex: number;
  onClose: () => void;
  onImageSelect: (index: number) => void;
  onAddToCart: (product: any) => void;
  onBuyNow?: (product: any) => void;
  storePhone?: string;
  deliveryAreas?: string[];
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  selectedImageIndex,
  onClose,
  onImageSelect,
  onAddToCart,
  onBuyNow,
  storePhone,
  deliveryAreas
}) => {
  const theme = useMasalahTheme();
  const { t } = useStorefrontLocale();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string>('');

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  useEffect(() => {
    setQuantity(1);
    setSelectedVariant('');
  }, [product.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const payload = () => ({
    ...product,
    quantity,
    selectedVariants: selectedVariant ? { [product.variants?.[0]?.name || 'weight']: selectedVariant } : undefined
  });

  const buildWhatsAppLink = () => {
    const phone = storePhone?.replace(/\D/g, '');
    if (!phone) return '';
    const message = encodeURIComponent(
       `${t('مرحباً! أرغب بطلب:')} ${product.name} (${selectedVariant || t('الوزن الافتراضي')}) - ${t('الكمية:')} ${quantity}`
    );
    return `https://wa.me/${phone}?text=${message}`;
  };

  const currentImage = images[selectedImageIndex] || images[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-2xl md:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
           <h3 className="font-bold text-gray-900">{t('تفاصيل المنتج')}</h3>
           <div className="flex items-center gap-1">
             <WishlistButton productId={product.id} iconOnly />
             <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer" aria-label={t('إغلاق')}>
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-0 md:gap-6">
          <div className="p-4 md:p-6">
            <div className="relative rounded-xl overflow-hidden bg-gray-50 aspect-square">
              <img src={getImageUrl(currentImage)} alt={product.name} className="w-full h-full object-cover" />
              {discountPercentage > 0 && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                   {t('خصم')} {discountPercentage}%
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => onImageSelect(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                      index === selectedImageIndex ? '' : 'border-transparent opacity-60'
                    }`}
                    style={index === selectedImageIndex ? { borderColor: theme.colors.primary } : {}}
                  >
                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 md:p-6 md:pe-6 md:ps-0">
            <p className="text-xs text-gray-400 mb-1">{product.sku}</p>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{product.name}</h2>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
                {formatCurrency(product.price, storeSettings, currencies)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatCurrency(product.originalPrice, storeSettings, currencies)}
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">{product.description}</p>
            )}

            {(product.variants || []).map((variant) => (
              <div key={variant.name} className="mb-4">
                <p className="text-sm font-semibold text-gray-800 mb-2">{variant.name}</p>
                <div className="flex flex-wrap gap-2">
                  {variant.options.map((option) => {
                    const active = selectedVariant === option;
                    return (
                      <button
                        key={option}
                        onClick={() => setSelectedVariant(option)}
                        className="text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer transition-colors"
                        style={{
                          borderColor: active ? theme.colors.primary : '#e5e7eb',
                          background: active ? theme.colors.primarySoft : 'white',
                          color: active ? theme.colors.primaryDark : '#4b5563'
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3 mb-5">
              <p className="text-sm font-semibold text-gray-800">{t('الكمية')}</p>
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  -
                </button>
                <span className="w-10 text-center font-semibold text-gray-800">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stockQuantity || 99, quantity + 1))}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-gray-400">
                 {t('المتوفر:')} {product.stockQuantity}
              </span>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              <button
                onClick={() => onAddToCart(payload())}
                className="w-full text-sm font-bold py-3 rounded-xl text-white transition-colors cursor-pointer"
                style={{ background: theme.colors.primary }}
              >
                 {t('أضف إلى السلة')}
              </button>
              {onBuyNow && (
                <button
                  onClick={() => onBuyNow(payload())}
                  className="w-full text-sm font-bold py-3 rounded-xl transition-colors cursor-pointer"
                  style={{ background: theme.colors.primarySoft, color: theme.colors.primaryDark }}
                >
                  {t('شراء مباشر')}
                </button>
              )}
              {buildWhatsAppLink() && (
                <a
                  href={buildWhatsAppLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full text-sm font-bold py-3 rounded-xl text-center transition-colors cursor-pointer"
                  style={{ background: '#25d366', color: '#ffffff' }}
                >
                   {t('اطلب عبر واتساب')}
                </a>
              )}
            </div>

            <div
              className="rounded-xl p-3 mb-3 text-sm"
              style={{ background: theme.colors.primarySoft, color: theme.colors.primaryDark }}
            >
               <span className="font-bold">{t('الدفع عند الاستلام متاح')}</span>
               <span className="block text-xs mt-0.5">{t('ادفع نقداً أو بالشبكة عند وصول طلبك.')}</span>
            </div>

            {deliveryAreas && deliveryAreas.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">{t(theme.copy.deliveryTitle)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {deliveryAreas.map((area) => (
                    <span key={area} className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 border-t border-gray-100">
          <ProductReviews productId={product.id} />
        </div>
      </div>
    </div>
  );
};
