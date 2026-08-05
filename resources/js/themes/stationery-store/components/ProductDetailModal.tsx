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
  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-[800px] max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">تفاصيل المنتج</h2>
            <div className="flex items-center gap-1">
              <WishlistButton productId={product.id} iconOnly />
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Image Section */}
            <div className="w-full md:w-[50%] p-4 md:p-4 md:sticky md:top-0 md:overflow-hidden">
              <div className="h-full flex flex-col space-y-4">
                <div className="relative flex-1 bg-gray-50 rounded-xl overflow-hidden">
                  <img 
                    src={getImageUrl(product.images && product.images.length > 0 ? product.images[selectedImageIndex] : product.image)} 
                    alt={product.name} 
                    loading="lazy"
                    className="w-full h-full object-scale-down select-none"
                  />
                  
                  {product.images && product.images.length > 1 && (
                    <>
                      <button 
                        onClick={() => onImageSelect(selectedImageIndex === 0 ? product.images!.length - 1 : selectedImageIndex - 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full transition-colors cursor-pointer group rtl-flip"
                      >
                        <svg className="w-4 h-4 text-gray-800 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => onImageSelect(selectedImageIndex === product.images!.length - 1 ? 0 : selectedImageIndex + 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full transition-colors cursor-pointer group rtl-flip"
                      >
                        <svg className="w-4 h-4 text-gray-800 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    {product.images.map((img, index) => (
                      <button 
                        key={index} 
                        onClick={() => onImageSelect(index)}
                        className={`flex-shrink-0 w-16 h-16 overflow-hidden border-2 rounded-lg transition-all duration-300 cursor-pointer ${
                          selectedImageIndex === index 
                            ? 'border-sky-500 scale-105' 
                            : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                        }`}
                      >
                        <img 
                          src={getImageUrl(img)} 
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
            
            {/* Content Section */}
            <div className="flex-1 p-4 md:p-4 md:border-l md:border-gray-200">
              <div className="space-y-4 md:space-y-3">
                {product.category && (
                  <span className="inline-block bg-sky-100 text-sky-800 text-xs font-medium px-3 py-1 rounded-full">
                    {product.category}
                  </span>
                )}
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-bold text-sky-600">{formatCurrency(product.price, storeSettings, currencies)}</span>
                    {product.originalPrice && (
                      <>
                        <span className="text-lg text-gray-500 line-through">{formatCurrency(product.originalPrice, storeSettings, currencies)}</span>
                        <span className="bg-red-100 text-red-700 text-sm text-center font-medium px-2 py-1 rounded-full">
                          -{Math.round((((product.originalPrice ?? 0) - product.price) / (product.originalPrice ?? 0)) * 100)}% خصم
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 pb-3 md:border-b md:border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 md:w-2 h-3 md:h-2 rounded-full ${product.availability === 'in_stock' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`font-medium md:text-sm ${product.availability === 'in_stock' ? 'text-green-700' : 'text-red-700'}`}>
                      {product.availability === 'in_stock' ? 'متوفر' : 'غير متوفر'}
                    </span>
                  </div>
                  <span className="text-gray-600 md:text-sm">({product.stockQuantity} متاح)</span>
                  <span className="hidden md:inline text-xs text-gray-600 mr-auto">الرمز: {product.sku}</span>
                </div>
                
                <div className="block md:hidden text-sm text-gray-600">
                  <span className="font-medium">الرمز:</span> {product.sku}
                </div>
                
                {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
                  <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 md:border-b md:border-gray-100">
                    {product.variants.map((variant, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-2 md:mb-1">{variant?.name || 'خيار'}</label>
                        <Select 
                          value={selectedVariants[variant.name] || ''}
                          onValueChange={(value) => setSelectedVariants(prev => ({...prev, [variant.name]: value}))}
                        >
                          <SelectTrigger className="w-full focus:ring-sky-500 focus:border-sky-500">
                            <SelectValue placeholder={`اختر ${variant?.name || 'الخيار'}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {(variant?.options || variant?.values || []).map((option, optIndex) => (
                              <SelectItem key={optIndex} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
                
                <button 
                  onClick={() => {
                    const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
                    
                    if (hasVariants) {
                      // Check if all variants are selected
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
                  disabled={product.availability === 'out_of_stock' || (product.variants && Array.isArray(product.variants) && product.variants.length > 0 && Object.keys(selectedVariants).length < (product.variants?.length ?? 0))}
                  className={`w-full py-3 md:py-2.5 px-6 mb-3 md:px-4 rounded-xl md:rounded-lg font-semibold md:text-sm transition-colors cursor-pointer mb-0 md:mb-3 sticky bottom-4 ${
                    product.availability === 'out_of_stock' || (product.variants && Array.isArray(product.variants) && product.variants.length > 0 && Object.keys(selectedVariants).length < (product.variants?.length ?? 0))
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-700 text-white'
                  }`}
                >
                  {product.availability === 'out_of_stock' 
                    ? 'غير متوفر' 
                    : (product.variants && Array.isArray(product.variants) && product.variants.length > 0 && Object.keys(selectedVariants).length < (product.variants?.length ?? 0))
                      ? 'اختر الخيارات'
                      : 'أضف إلى السلة'
                  }
                </button>

                <WhatsAppOrderButton
                  product={{ name: product.name, price: product.price }}
                  variants={Object.keys(selectedVariants).length > 0 ? selectedVariants : null}
                  className="w-full py-3 md:py-2.5 px-6 md:px-4 rounded-xl md:rounded-lg font-semibold md:text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1eb85a] text-white sticky bottom-4"
                />
                
                {product.description && (
                  <div className="pb-3 md:border-b md:border-gray-100">
                    <h4 className="font-semibold md:text-sm text-gray-900 mb-2 md:mb-1">الوصف</h4>
                    <div 
                      className="text-gray-600 md:text-sm leading-relaxed" 
                      dangerouslySetInnerHTML={{ __html: product.description }} 
                    />
                  </div>
                )}
                
                {product.customFields && product.customFields.length > 0 && (
                  <div>
                    <h4 className="font-semibold md:text-sm text-gray-900 mb-3 md:mb-2">المواصفات</h4>
                    <div className="bg-gray-50 rounded-lg p-3 md:p-0 md:bg-transparent md:rounded-none">
                      <div className="space-y-2 md:grid md:grid-cols-1 md:gap-2 md:space-y-0">
                        {product.customFields.map((field, index) => (
                          <div key={index} className="flex justify-between py-2 md:py-1.5 px-0 md:px-2 border-b md:border-0 md:bg-gray-50 md:rounded border-gray-200 last:border-0 text-sm">
                            <span className="font-medium text-gray-700">{field.name}:</span>
                            <span className="text-gray-600 text-left">{field.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <ProductReviews productId={product.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};