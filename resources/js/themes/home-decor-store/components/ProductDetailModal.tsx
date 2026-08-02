import React from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { toast } from '@/components/custom-toast';
import { ShoppingBag, Heart, Eye, Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  variants?: { name: string; options?: string[]; values?: string[] }[];
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
  
  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl md:rounded-3xl shadow-2xl w-full max-w-6xl max-h-[85vh] md:max-h-[70vh] overflow-hidden flex flex-col border border-amber-100" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-amber-100 bg-amber-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-serif font-bold text-amber-900">تفاصيل المنتج</h2>
            </div>
            <button onClick={onClose} className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col md:flex-row flex-1 max-h-[calc(85vh-80px)] md:max-h-[calc(70vh-80px)] overflow-y-auto md:overflow-hidden">
            {/* Image Gallery */}
            <div className="w-full md:w-2/5 p-4 md:p-6 bg-amber-50/50 md:overflow-hidden">
              <div className="h-64 md:h-full flex flex-col space-y-3 md:space-y-4">
                <div className="relative flex-1 bg-white rounded-2xl overflow-hidden shadow-xl border-2 border-amber-200/50">
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber-600/90 hover:bg-amber-700 text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-110 rtl-flip"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => onImageSelect(selectedImageIndex === product.images!.length - 1 ? 0 : selectedImageIndex + 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-amber-600/90 hover:bg-amber-700 text-white p-2.5 rounded-full shadow-lg transition-all hover:scale-110 rtl-flip"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div className="absolute bottom-4 left-4 bg-amber-900/80 text-white px-3 py-1 text-sm rounded-full">
                        {selectedImageIndex + 1} / {product.images.length}
                      </div>
                    </>
                  )}
                </div>
                
                {product.images && product.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-1">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => onImageSelect(index)}
                        className={`flex-shrink-0 w-14 h-14 md:w-18 md:h-18 overflow-hidden border-2 rounded-lg md:rounded-xl transition-all ${
                          selectedImageIndex === index 
                            ? 'border-amber-600 ring-2 ring-amber-300 shadow-lg transform scale-105' 
                            : 'border-amber-200 hover:border-amber-400 hover:shadow-md'
                        }`}
                      >
                        <img
                          src={getImageUrl(image)}
                          alt={`${product.name} ${index + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="flex-1 flex flex-col md:overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
                
                {/* Product Title & Category */}
                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-amber-100">
                  <div className="space-y-3 md:space-y-4">
                    {product.category && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span className="text-amber-800 font-semibold text-sm uppercase tracking-wide">
                          {product.category}
                        </span>
                      </div>
                    )}
                    
                    <h1 className="text-2xl md:text-3xl font-serif font-bold text-amber-900 leading-tight">{product.name}</h1>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-amber-100">
                      <div className="inline-flex items-center bg-amber-50 px-3 py-1.5 rounded-full">
                        <span className="text-amber-700 text-sm font-medium">الرمز: {product.sku}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>تفاصيل المنتج</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-amber-50 rounded-2xl p-4 md:p-6 border border-amber-200 shadow-sm">
                  <div className="text-center mb-4 md:mb-6">
                    <div className="text-3xl md:text-4xl font-bold text-amber-700 mb-2">
                      {formatCurrency(product.price, storeSettings, currencies)}
                    </div>
                    {product.originalPrice && (
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-xl text-amber-400 line-through">
                          {formatCurrency(product.originalPrice, storeSettings, currencies)}
                        </span>
                        <span className="bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-sm">
                          {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% خصم
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center gap-6 bg-white rounded-xl p-4 border border-amber-100">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${product.availability === 'in_stock' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={`font-semibold ${product.availability === 'in_stock' ? 'text-green-700' : 'text-red-700'}`}>
                        {product.availability === 'in_stock' ? 'متوفر' : 'غير متوفر'}
                      </span>
                    </div>
                    <div className="w-px h-4 bg-amber-200"></div>
                    <span className="text-amber-700 font-medium">متبقي {product.stockQuantity} وحدة</span>
                  </div>
                </div>

                {/* Add to Cart Button - Show only if no variants */}
                {!(product.variants && Array.isArray(product.variants) && product.variants.length > 0) && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
                    <button
                      onClick={() => {
                        onAddToCart(product);
                        onClose();
                      }}
                      disabled={product.availability === 'out_of_stock'}
                      className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-3"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      {product.availability === 'out_of_stock' ? 'غير متوفر' : 'أضف إلى السلة'}
                    </button>
                  </div>
                )}

                {/* Variants */}
                {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-amber-100 space-y-4">
                    <h3 className="text-xl font-serif font-bold text-amber-900 flex items-center gap-2">
                      <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                      خصص اختيارك
                    </h3>
                    <div className="grid gap-4">
                      {product.variants.map((variant, index) => (
                        <div key={index}>
                          <label className="block text-sm font-semibold text-amber-800 mb-2 capitalize">
                            {variant?.name || 'خيار'}
                          </label>
                          <Select 
                            value={selectedVariants[variant.name] || ''}
                            onValueChange={(value) => setSelectedVariants(prev => ({...prev, [variant.name]: value}))}
                          >
                            <SelectTrigger className="w-full focus:ring-amber-500 focus:border-amber-500 border-amber-200 bg-amber-50/30">
                              <SelectValue placeholder={`اختر ${variant?.name || 'الخيار'}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {((variant?.options && Array.isArray(variant.options)) ? variant.options : (variant?.values && Array.isArray(variant.values)) ? variant.values : []).map((option, optIndex) => (
                                <SelectItem key={optIndex} value={option}>{option}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add to Cart Button - Show after variants */}
                    <div className="pt-4 border-t border-amber-100">
                      <button
                        onClick={() => {
                          const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
                          
                          if (hasVariants) {
                            const requiredVariants = product.variants.length;
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
                        disabled={product.availability === 'out_of_stock' || (product.variants && Array.isArray(product.variants) && product.variants.length > 0 && Object.keys(selectedVariants).length < product.variants.length)}
                        className={`w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-3 ${
                          product.availability === 'out_of_stock' || (product.variants && Array.isArray(product.variants) && product.variants.length > 0 && Object.keys(selectedVariants).length < product.variants.length)
                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                      >
                        <ShoppingBag className="w-5 h-5" />
                        {product.availability === 'out_of_stock' 
                          ? 'غير متوفر' 
                          : (product.variants && Array.isArray(product.variants) && product.variants.length > 0 && Object.keys(selectedVariants).length < product.variants.length)
                            ? 'اختر الخيارات'
                            : 'أضف إلى السلة'
                        }
                      </button>
                    </div>
                  </div>
                )}

                {/* Description */}
                {product.description && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100">
                    <h3 className="text-xl font-serif font-bold text-amber-900 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                      الوصف
                    </h3>
                    <div 
                      className="text-amber-800 leading-relaxed prose prose-amber max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.description }} 
                    />
                  </div>
                )}

                {/* Specifications */}
                {product.customFields && product.customFields.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100">
                    <h3 className="text-xl font-serif font-bold text-amber-900 mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                      المواصفات
                    </h3>
                    <div className="bg-amber-50 rounded-xl p-3 md:p-4 border border-amber-200">
                      <div className="space-y-2 md:space-y-3">
                        {product.customFields.map((field, index) => (
                          <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 px-3 bg-white rounded-lg border border-amber-100 space-y-1 sm:space-y-0">
                            <span className="font-semibold text-amber-800 text-sm md:text-base">{field.name}</span>
                            <span className="text-amber-700 font-medium text-sm md:text-base break-words">{field.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};