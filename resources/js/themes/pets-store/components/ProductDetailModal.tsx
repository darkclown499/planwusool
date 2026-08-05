import React, { useState } from 'react';
import { X, Plus, Minus, Star, Truck, Shield, Heart } from 'lucide-react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
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
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedVariants, setSelectedVariants] = useState<{[key: string]: string}>({});

  // Prevent background scrolling
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  const isOnSale = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = isOnSale 
    ? Math.round((((product.originalPrice ?? 0) - product.price) / (product.originalPrice ?? 0)) * 100)
    : 0;

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= product.stockQuantity) {
      setQuantity(newQuantity);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div className="flex items-end sm:items-center justify-center min-h-full p-0 sm:p-2 md:p-4">
        <div 
          className="bg-white w-full h-screen sm:h-auto sm:max-w-lg md:max-w-4xl sm:max-h-[95vh] md:max-h-[90vh] sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-white sm:bg-orange-50">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2 sm:pr-4">
              {product.name}
            </h2>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <WishlistButton productId={product.id} iconOnly className="p-1.5 sm:p-2 hover:bg-gray-100 sm:hover:bg-orange-100 rounded-full transition-colors" />
              <button 
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-gray-100 sm:hover:bg-orange-100 rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row flex-1 md:overflow-hidden overflow-y-auto">
            {/* Image Section */}
            <div className="w-full md:w-1/2 bg-gray-50 relative flex-shrink-0">
              {/* Sale Badge */}
              {isOnSale && (
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 bg-red-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                  -{discountPercentage}% خصم
                </div>
              )}

              {/* Main Image */}
              <div className="h-48 md:h-full relative overflow-hidden">
                <img
                  src={getImageUrl(product.images && product.images.length > 0 ? product.images[selectedImageIndex] : product.image)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Image Navigation */}
                {product.images && product.images.length > 1 && (
                  <>
                    <button 
                      onClick={() => onImageSelect(selectedImageIndex === 0 ? product.images!.length - 1 : selectedImageIndex - 1)}
                      className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 sm:p-2 rounded-full shadow-lg transition-colors rtl-flip"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => onImageSelect(selectedImageIndex === product.images!.length - 1 ? 0 : selectedImageIndex + 1)}
                      className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 sm:p-2 rounded-full shadow-lg transition-colors rtl-flip"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Image Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 max-w-[90%]">
                  <div className="flex gap-1 sm:gap-2 bg-black/20 backdrop-blur-sm rounded-lg p-1 sm:p-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
                    {product.images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => onImageSelect(index)}
                        className={`flex-shrink-0 w-8 h-8 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImageIndex === index ? 'border-white scale-110' : 'border-transparent'
                        }`}
                      >
                        <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col md:min-h-0">
              <div className="flex-1 md:overflow-y-auto">
                <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
                  {/* Category & Title */}
                  <div>
                    {product.category && (
                      <span className="inline-block bg-orange-100 text-orange-800 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full mb-2 sm:mb-3">
                        {product.category}
                      </span>
                    )}
                    <h1 className="hidden sm:block text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                      {product.name}
                    </h1>
                  </div>

                  {/* Price */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                    <span className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600">
                      {formatCurrency(product.price, storeSettings, currencies)}
                    </span>
                    {isOnSale && (
                      <span className="text-base sm:text-lg text-gray-500 line-through">
                        {formatCurrency(product.originalPrice!, storeSettings, currencies)}
                      </span>
                    )}
                  </div>

                  {/* Variants */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="space-y-3 sm:space-y-4">
                      {product.variants.map((variant, index) => (
                        <div key={index}>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                            {variant.name}
                          </label>
                          <Select
                            value={selectedVariants[variant.name] || ''}
                            onValueChange={(value) => setSelectedVariants(prev => ({
                              ...prev,
                              [variant.name]: value
                            }))}
                          >
                            <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
                              <SelectValue placeholder={`اختر ${variant.name}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {(variant.options || variant.values || []).length > 0 && (variant.options || variant.values || []).map((option, optionIndex) => (
                                <SelectItem key={optionIndex} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stock Status */}
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      product.availability === 'in_stock' ? 'bg-orange-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      product.availability === 'in_stock' ? 'text-orange-700' : 'text-red-700'
                    }`}>
                      {product.availability === 'in_stock' 
                        ? `${product.stockQuantity} متاح` 
                        : 'غير متوفر'
                      }
                    </span>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200">
                    <div className="flex gap-3 sm:gap-4 md:gap-6">
                      <button
                        onClick={() => setActiveTab('details')}
                        className={`pb-2 sm:pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                          activeTab === 'details' 
                            ? 'border-orange-500 text-orange-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        المواصفات
                      </button>
                      {product.description && (
                        <button
                          onClick={() => setActiveTab('description')}
                          className={`pb-2 sm:pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'description' 
                              ? 'border-orange-500 text-orange-600' 
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          الوصف
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div>
                    {activeTab === 'details' && (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                          <div className="flex justify-between sm:block">
                            <span className="text-gray-500">الرمز:</span>
                            <span className="sm:mr-0 mr-2 font-medium">{product.sku}</span>
                          </div>
                          <div className="flex justify-between sm:block">
                            <span className="text-gray-500">الفئة:</span>
                            <span className="sm:mr-0 mr-2 font-medium">{product.category || 'غير متوفر'}</span>
                          </div>
                        </div>
                        {product.customFields && product.customFields.length > 0 && (
                          <div className="space-y-2 sm:space-y-3">
                            <h4 className="text-sm sm:text-base font-medium text-gray-900">المواصفات</h4>
                            <div className="space-y-1 sm:space-y-2">
                              {product.customFields.map((field, index) => (
                                <div key={index} className="flex justify-between text-xs sm:text-sm py-1">
                                  <span className="text-gray-500">{field.name}:</span>
                                  <span className="font-medium text-left break-words">{field.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'description' && product.description && (
                      <div 
                        className="text-xs sm:text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none overflow-wrap-anywhere"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                      />
                    )}
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <ProductReviews productId={product.id} />
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="border-t bg-white p-3 sm:p-4 md:p-6 flex-shrink-0 sticky bottom-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  {/* Quantity Selector */}
                  <div className="flex items-center justify-center sm:justify-start">
                    <span className="text-xs sm:text-sm text-gray-600 ml-2 sm:ml-3">الكمية:</span>
                    <div className="flex items-center border border-gray-300 rounded-lg sm:rounded-xl">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                        className="p-2 sm:p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-r-lg sm:rounded-r-xl"
                      >
                        <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || 1;
                          if (newQuantity >= 1 && newQuantity <= product.stockQuantity) {
                            setQuantity(newQuantity);
                          }
                        }}
                        className="px-2 py-2 sm:py-3 font-medium min-w-[50px] sm:min-w-[60px] text-center border-x border-gray-300 bg-white focus:outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="1"
                        max={product.stockQuantity}
                      />
                      <button
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= product.stockQuantity}
                        className="p-2 sm:p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-l-lg sm:rounded-l-xl"
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => {
                      const hasVariants = product.variants && product.variants.length > 0;
                      
                      if (hasVariants) {
                        const requiredVariants = product.variants?.length ?? 0;
                        const selectedVariantsCount = Object.keys(selectedVariants).length;
                        
                        if (selectedVariantsCount < requiredVariants) {
                          return;
                        }
                      }
                      
                      const productToAdd = hasVariants && Object.keys(selectedVariants).length > 0 
                        ? {...product, selectedVariants, quantity} 
                        : {...product, quantity};
                      onAddToCart(productToAdd);
                      onClose();
                    }}
                    disabled={product.availability === 'out_of_stock' || 
                      (product.variants && product.variants.length > 0 && 
                       product.variants.some(variant => !selectedVariants[variant.name]))}
                    className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold transition-colors text-center text-sm sm:text-base ${
                      product.availability === 'in_stock' && 
                      (!product.variants || product.variants.length === 0 || 
                       product.variants.every(variant => selectedVariants[variant.name]))
                        ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {product.availability === 'out_of_stock' 
                      ? 'غير متوفر'
                      : (product.variants && product.variants.length > 0 && 
                         product.variants.some(variant => !selectedVariants[variant.name]))
                        ? 'اختر الخيارات'
                        : `أضف ${quantity} إلى السلة`
                    }
                  </button>
                  <WhatsAppOrderButton
                    product={{ name: product.name, price: product.price }}
                    className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold transition-colors text-center text-sm sm:text-base bg-[#25D366] hover:bg-[#1eb85a] text-white flex items-center justify-center gap-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};