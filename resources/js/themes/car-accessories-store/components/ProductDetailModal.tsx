import { createSafeHtml } from '@/utils/xss-protection';
import React from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { toast } from '@/components/custom-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WishlistButton } from '@/components/storefront/WishlistButton';
import { WhatsAppOrderButton } from '@/components/storefront/WhatsAppOrderButton';
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
  categoryId: string;
  category?: string;
  availability: 'in_stock' | 'out_of_stock';
  description?: string;
  variants?: Array<{ name: string; values?: string[]; options?: string[] }>;
  customFields?: { name: string; value: string }[];
}

interface ProductDetailModalProps {
  product: Product;
  currency: string;
  selectedImageIndex: number;
  onClose: () => void;
  onImageSelect: (index: number) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  currency,
  selectedImageIndex,
  onClose,
  onImageSelect,
  onAddToCart
}) => {
  const [selectedVariants, setSelectedVariants] = React.useState<{[key: string]: string}>({});

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70"></div>
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-2 md:p-4">
        <div className="bg-slate-800 w-full h-screen sm:h-auto sm:max-w-lg md:max-w-5xl sm:max-h-[95vh] md:max-h-[85vh] overflow-hidden flex flex-col border-2 border-red-600 sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="bg-slate-900 text-white p-3 sm:p-4 border-b-2 border-red-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-600 flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">تفاصيل المنتج</h2>
              </div>
              <div className="flex items-center gap-2">
                <WishlistButton productId={product.id} iconOnly />
                <button onClick={onClose} className="p-1.5 sm:p-2 text-slate-300 hover:text-red-400 hover:bg-slate-800 transition-colors">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row flex-1 md:overflow-hidden overflow-y-auto">
            {/* Image Gallery */}
            <div className="w-full md:w-1/2 bg-black border-l-0 md:border-l-4 border-red-600 flex-shrink-0 overflow-y-auto">
              <div className="p-2 sm:p-4">
                <div className="bg-slate-900 border-2 border-slate-700 p-1 sm:p-2">
                  <div className="relative h-64 sm:h-80 md:h-96 bg-slate-800">
                    <img
                      src={getImageUrl(product.images && product.images.length > 0 ? product.images[selectedImageIndex] : product.image)}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-scale-down"
                    />
                    

                    
                    {product.images && product.images.length > 1 && (
                      <>
                        <button 
                          onClick={() => onImageSelect(selectedImageIndex === 0 ? product.images!.length - 1 : selectedImageIndex - 1)}
                          className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white p-1.5 sm:p-2 border border-white rtl-flip"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => onImageSelect(selectedImageIndex === product.images!.length - 1 ? 0 : selectedImageIndex + 1)}
                          className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white p-1.5 sm:p-2 border border-white rtl-flip"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 bg-red-600 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-mono border border-white">
                          {selectedImageIndex + 1}/{product.images.length}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {product.images && product.images.length > 1 && (
                  <div className="mt-2 sm:mt-4 bg-slate-900 border-2 border-slate-700 p-1 sm:p-2">
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                      {product.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => onImageSelect(index)}
                          className={`aspect-square border-2 transition-all ${
                            selectedImageIndex === index 
                              ? 'border-red-600 bg-red-600/20' 
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <img
                            src={getImageUrl(image)}
                            alt={`View ${index + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="flex-1 p-3 sm:p-4 md:p-6 bg-slate-800">
                <div className="space-y-3 sm:space-y-4 md:space-y-6 pb-4">
                
                {/* Product Title & Category */}
                <div className="bg-slate-900 border-4 border-slate-700 p-4">
                  <div className="border-r-4 border-red-600 pr-4">
                    {product.category && (
                      <div className="bg-red-600 text-white px-2 py-1 text-xs font-bold uppercase tracking-wider inline-block mb-3">
                        {product.category}
                      </div>
                    )}
                    
                    <h1 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wide mb-4">{product.name}</h1>
                    
                    <div className="grid grid-cols-2 gap-4 bg-black border-2 border-slate-700 p-3">
                      <div>
                        <div className="text-red-400 text-xs font-bold uppercase">رقم القطعة</div>
                        <div className="text-white font-bold">{product.sku}</div>
                      </div>
                      <div>
                        <div className="text-red-400 text-xs font-bold uppercase">الحالة</div>
                        <div className="text-green-400 font-bold">موثوق</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-black border-4 border-red-600">
                  <div className="bg-red-600 text-white p-2">
                    <div className="text-center font-bold text-sm tracking-wider">أسعار المنتج</div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-900 border-2 border-slate-700 p-3">
                        <div className="text-red-400 text-xs font-bold uppercase mb-1">سعر الوحدة</div>
                        <div className="text-2xl font-bold text-white">
                          {formatCurrency(product.price, storeSettings, currencies)}
                        </div>
                      </div>
                      {product.originalPrice && (
                        <div className="bg-slate-900 border-2 border-slate-700 p-3">
                          <div className="text-red-400 text-xs font-bold uppercase mb-1">السعر الأصلي</div>
                          <div className="text-lg font-bold text-slate-400 line-through">
                            {formatCurrency(product.originalPrice, storeSettings, currencies)}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-slate-900 border-2 border-slate-700 p-3">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-red-400 text-xs font-bold uppercase">التوفر</div>
                          <div className={`font-bold text-sm ${
                            product.availability === 'in_stock' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {product.availability === 'in_stock' ? 'متوفر' : 'غير متوفر'}
                          </div>
                        </div>
                        <div>
                          <div className="text-red-400 text-xs font-bold uppercase">الكمية</div>
                          <div className="text-white font-bold text-sm">{product.stockQuantity}</div>
                        </div>
                        {product.originalPrice && (
                          <div>
                            <div className="text-red-400 text-xs font-bold uppercase">التوفير</div>
                            <div className="text-green-400 font-bold text-sm">
                              {Math.round((((product.originalPrice ?? 0) - product.price) / (product.originalPrice ?? 0)) * 100)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variants */}
                {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
                  <div className="bg-slate-900 p-4 md:p-6 border-2 border-slate-700 space-y-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <div className="w-1 h-6 bg-red-600"></div>
                      الخيارات
                    </h3>
                    <div className="grid gap-4">
                      {product.variants.map((variant, index) => (
                        <div key={index}>
                          <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                            {variant?.name || 'خيار'}
                          </label>
                          <Select 
                            value={selectedVariants[variant.name] || ''}
                            onValueChange={(value) => setSelectedVariants(prev => ({...prev, [variant.name]: value}))}
                          >
                            <SelectTrigger className="w-full focus:ring-red-500 focus:border-red-500 border-slate-600 bg-slate-800 text-white">
                              <SelectValue placeholder={`اختر ${variant?.name || 'الخيار'}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {(variant?.values || variant?.options) && Array.isArray(variant?.values || variant?.options) && (variant?.values || variant?.options || []).map((option: any, optIndex: any) => (
                                <SelectItem key={optIndex} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add to Cart Button */}
                <div className="bg-slate-900 p-4 border-2 border-slate-700 sticky bottom-0">
                  <button
                    onClick={() => {
                      const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
                      
                      if (hasVariants) {
                        const requiredVariants = product.variants?.length ?? 0;
                        const selectedVariantsCount = Object.keys(selectedVariants).length;
                        
                        if (selectedVariantsCount < requiredVariants) {
                          toast.error('يرجى اختيار جميع الخيارات قبل الإضافة إلى السلة');
                          return;
                        }
                      }
                      
                      const productToAdd = hasVariants && Object.keys(selectedVariants).length > 0 
                        ? {...product, selectedVariants} 
                        : product;
                      onAddToCart(productToAdd);
                      onClose();
                    }}
                    disabled={product.availability === 'out_of_stock' || 
                      (product.variants && Array.isArray(product.variants) && product.variants.length > 0 && 
                       Object.keys(selectedVariants).length < (product.variants?.length ?? 0))}
                    className={`w-full py-2 md:py-3 font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 ${
                      product.availability === 'out_of_stock' || 
                      (product.variants && Array.isArray(product.variants) && product.variants.length > 0 && 
                       Object.keys(selectedVariants).length < (product.variants?.length ?? 0))
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                    </svg>
                    {product.availability === 'out_of_stock' 
                      ? 'غير متوفر' 
                      : (product.variants && Array.isArray(product.variants) && product.variants.length > 0 && 
                         Object.keys(selectedVariants).length < (product.variants?.length ?? 0))
                        ? 'اختر الخيارات'
                        : 'أضف إلى السلة'
                    }
                  </button>
                  <WhatsAppOrderButton
                    product={{ name: product.name, price: product.price }}
                    variants={Object.keys(selectedVariants).length > 0 ? selectedVariants : null}
                    className="w-full py-2 md:py-3 font-bold text-sm md:text-base mt-2 transition-all flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1eb85a] text-white"
                  />
                </div>

                {/* Description */}
                {product.description && (
                  <div className="bg-slate-900 p-4 md:p-6 border-2 border-slate-700">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-red-600"></div>
                      الوصف
                    </h3>
                    <div 
                      className="text-slate-300 leading-relaxed"
                      dangerouslySetInnerHTML={createSafeHtml(product.description)} 
                    />
                  </div>
                )}

                {/* Specifications */}
                {product.customFields && product.customFields.length > 0 && (
                  <div className="bg-slate-900 p-4 md:p-6 border-2 border-red-600">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-red-600"></div>
                      المواصفات
                    </h3>
                    <div className="bg-slate-800 p-3 md:p-4 border border-slate-700">
                      <div className="space-y-2 md:space-y-3">
                        {product.customFields.map((field, index) => (
                          <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 px-3 bg-slate-900 border border-slate-700 space-y-1 sm:space-y-0">
                            <span className="font-bold text-slate-300 text-sm md:text-base uppercase">{field.name}</span>
                            <span className="text-white font-medium text-sm md:text-base break-words">{field.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-slate-900 p-4 md:p-6 border-2 border-slate-700">
                  <ProductReviews productId={product.id} />
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};