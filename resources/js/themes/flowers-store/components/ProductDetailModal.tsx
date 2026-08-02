import React, { useState } from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { toast } from '@/components/custom-toast';
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
  const [selectedVariants, setSelectedVariants] = useState<{[key: string]: string}>({});

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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      <div className="absolute inset-0 flex items-center justify-center p-2 md:p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] md:max-h-[70vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-red-100">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">تفاصيل المنتج</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-red-50 rounded-full transition-colors">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col md:flex-row max-h-[calc(85vh-80px)] md:max-h-[calc(70vh-80px)] overflow-y-auto md:overflow-hidden">
            {/* Image Gallery */}
            <div className="w-full md:w-2/5 p-4 md:p-6 md:sticky md:top-0 md:overflow-hidden">
              <div className="h-auto md:h-full flex flex-col space-y-4">
                <div className="relative flex-1 bg-red-50 rounded-xl overflow-hidden group">
                  <img
                    src={getImageUrl(product.images && product.images.length > 0 ? product.images[selectedImageIndex] : product.image)}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-scale-down select-none"
                  />
                  
                  {/* Navigation Arrows */}
                  {product.images && product.images.length > 1 && (
                    <>
                      <button 
                        onClick={() => onImageSelect(selectedImageIndex === 0 ? product.images!.length - 1 : selectedImageIndex - 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full transition-colors cursor-pointer shadow-lg rtl-flip"
                      >
                        <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => onImageSelect(selectedImageIndex === product.images!.length - 1 ? 0 : selectedImageIndex + 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full transition-colors cursor-pointer shadow-lg rtl-flip"
                      >
                        <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 text-xs rounded">
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
                        className={`flex-shrink-0 w-16 h-16 overflow-hidden border-2 rounded-lg transition-all duration-300 cursor-pointer ${
                          selectedImageIndex === index 
                            ? 'border-red-500 scale-105' 
                            : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                        }`}
                      >
                        <img
                          src={getImageUrl(image)}
                          alt={`${product.name} ${index + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover rounded-lg p-0.5"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="flex-1 md:border-l md:border-red-200 flex flex-col md:overflow-hidden">
              <div className="flex-1 md:overflow-y-auto space-y-4 md:space-y-4 pb-6 p-4 md:p-6">
                
                {/* Product Title & Category */}
                <div>
                  {product.category && (
                    <span className="inline-block bg-red-100 text-red-700 px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-medium mb-3">
                      {product.category}
                    </span>
                  )}
                  <h1 className="text-xl md:text-2xl font-serif text-gray-900 leading-tight mb-2">{product.name}</h1>
                  <p className="text-gray-500 text-sm">الرمز: {product.sku}</p>
                </div>

                {/* Pricing Section */}
                <div className="bg-red-50 rounded-2xl p-4">
                  <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 mb-3">
                    <span className="text-2xl md:text-3xl font-bold text-red-600">
                      {formatCurrency(product.price, storeSettings, currencies)}
                    </span>
                    {product.originalPrice && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg md:text-xl text-gray-400 line-through">
                          {formatCurrency(product.originalPrice, storeSettings, currencies)}
                        </span>
                        <span className="bg-red-500 text-white text-xs md:text-sm font-bold px-2 md:px-3 py-1 rounded-full">
                          -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% خصم
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${product.availability === 'in_stock' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={`font-medium text-sm md:text-base ${product.availability === 'in_stock' ? 'text-green-700' : 'text-red-700'}`}>
                        {product.availability === 'in_stock' ? 'متوفر' : 'غير متوفر'}
                      </span>
                    </div>
                    <span className="text-gray-600 text-sm md:text-base">({product.stockQuantity} متاح)</span>
                  </div>
                </div>

                {/* Variants Selection */}
                {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
                  <div className="space-y-3 md:space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">اختر أسلوبك</h3>
                    {product.variants.map((variant, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                          {variant?.name || 'خيار'}
                        </label>
                        <Select 
                          value={selectedVariants[variant.name] || ''}
                          onValueChange={(value) => setSelectedVariants(prev => ({...prev, [variant.name]: value}))}
                        >
                          <SelectTrigger className="w-full focus:ring-red-300 focus:border-red-300">
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
                )}

                {/* Description */}
                {product.description && (
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3">الوصف</h3>
                    <div 
                      className="text-gray-600 leading-relaxed prose prose-sm max-w-none text-sm md:text-base"
                      dangerouslySetInnerHTML={{ __html: product.description }} 
                    />
                  </div>
                )}

                {/* Specifications */}
                {product.customFields && product.customFields.length > 0 && (
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3">تفاصيل المنتج</h3>
                    <div className="bg-red-50 rounded-2xl p-4 space-y-3">
                      {product.customFields.map((field, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-red-200 last:border-0">
                          <span className="font-medium text-gray-700 text-sm md:text-base">{field.name}</span>
                          <span className="text-gray-600 font-medium text-sm md:text-base">{field.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Sticky Add to Cart Button */}
              <div className="sticky bottom-2 md:relative md:bottom-auto border-t border-red-100 pt-4 bg-white p-3 md:p-4">
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
                  className={`w-full py-2 md:py-3 rounded-lg font-medium text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${
                    product.availability === 'out_of_stock' || (product.variants && Array.isArray(product.variants) && product.variants.length > 0 && Object.keys(selectedVariants).length < product.variants.length)
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                  </svg>
                  {product.availability === 'out_of_stock' 
                    ? 'غير متوفر' 
                    : (product.variants && Array.isArray(product.variants) && product.variants.length > 0 && Object.keys(selectedVariants).length < product.variants.length)
                      ? 'اختر الخيارات'
                      : 'أضف إلى السلة'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};