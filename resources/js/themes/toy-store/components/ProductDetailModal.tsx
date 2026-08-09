import { createSafeHtml } from '@/utils/xss-protection';
import React, { useState } from 'react';
import { X, Plus, Minus, Heart } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-purple-900/30" onClick={onClose}>
      <div className="flex items-end md:items-center justify-center min-h-full p-4">
        <div 
          className="bg-white w-full h-[calc(100vh-2rem)] md:h-auto md:max-w-4xl md:max-h-[90vh] overflow-hidden rounded-t-[2rem] rounded-2xl shadow-xl flex flex-col mb-4 md:mb-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Simple Header */}
          <div className="flex items-center justify-between p-6 bg-purple-400 rounded-t-[2rem] md:rounded-t-2xl">
            <h2 className="text-lg font-bold text-white truncate flex-1 ml-4">
              {product.name}
            </h2>
            <div className="flex items-center gap-2">
              <WishlistButton productId={product.id} iconOnly />
              <button 
                onClick={onClose}
                className="p-2 bg-white/20 hover:bg-white/30 transition-colors rounded-full"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row flex-1 overflow-auto">
            {/* Image Section */}
            <div className="w-full md:w-1/2 bg-blue-50 relative flex-shrink-0">
              {isOnSale && (
                <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10 bg-red-400 text-white px-2 py-1 md:px-4 md:py-2 rounded-full font-bold text-xs md:text-sm">
                  {discountPercentage}% خصم
                </div>
              )}

              <div className="h-48 sm:h-64 md:h-full relative">
                <img
                  src={getImageUrl(product.images && product.images.length > 0 ? product.images[selectedImageIndex] : product.image)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                
                {product.images && product.images.length > 1 && (
                  <>
                    <button 
                      onClick={() => onImageSelect(selectedImageIndex === 0 ? product.images!.length - 1 : selectedImageIndex - 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-400 hover:bg-purple-500 p-3 rounded-full transition-colors"
                    >
                      <svg className="w-4 h-4 text-white rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => onImageSelect(selectedImageIndex === product.images!.length - 1 ? 0 : selectedImageIndex + 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-purple-400 hover:bg-purple-500 p-3 rounded-full transition-colors"
                    >
                      <svg className="w-4 h-4 text-white rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {product.images && product.images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 md:bottom-4">
                  <div className="flex gap-1 md:gap-2 bg-white/80 p-1 md:p-2 rounded-full overflow-x-auto max-w-[90vw] md:max-w-none">
                    {product.images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => onImageSelect(index)}
                        className={`w-8 h-8 md:w-12 md:h-12 rounded-full overflow-hidden border-2 flex-shrink-0 ${
                          selectedImageIndex === index ? 'border-purple-400' : 'border-white'
                        }`}
                      >
                        <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col md:min-h-0">
              <div className="flex-1 md:overflow-y-auto p-6 space-y-4">
                {product.category && (
                  <span className="inline-block bg-yellow-200 text-purple-700 text-sm font-bold px-4 py-2 rounded-full">
                    {product.category}
                  </span>
                )}

                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-700 leading-tight">
                  {product.name}
                </h1>

                {/* Price */}
                <div className="bg-green-100 rounded-2xl p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    <span className="text-2xl md:text-3xl font-bold text-green-600">
                      {formatCurrency(product.price, storeSettings, currencies)}
                    </span>
                    {isOnSale && (
                      <span className="text-base md:text-lg text-gray-500 line-through">
                        {formatCurrency(product.originalPrice!, storeSettings, currencies)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Variants */}
                {product.variants && product.variants.length > 0 && (
                  <div className="space-y-2 md:space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                      {product.variants.map((variant, index) => (
                        <div key={index}>
                          <label className="block text-xs md:text-sm font-bold text-purple-700 mb-1 md:mb-2">
                            {variant.name}
                          </label>
                          <Select
                            value={selectedVariants[variant.name] || ''}
                            onValueChange={(value) => setSelectedVariants(prev => ({
                              ...prev,
                              [variant.name]: value
                            }))}
                          >
                            <SelectTrigger className="rounded-xl border-2 border-purple-200 h-9 md:h-10">
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
                  </div>
                )}

                {/* Stock */}
                <div className={`flex items-center gap-2 p-2 md:p-3 rounded-xl ${
                  product.availability === 'in_stock' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
                    product.availability === 'in_stock' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className={`text-xs md:text-sm font-bold ${
                    product.availability === 'in_stock' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {product.availability === 'in_stock' 
                      ? `${product.stockQuantity} متاح` 
                      : 'غير متوفر'
                    }
                  </span>
                </div>

                {/* Tabs */}
                <div>
                  <div className="flex gap-2 md:gap-4 border-b-2 border-purple-100">
                    <button
                      onClick={() => setActiveTab('details')}
                      className={`pb-1 md:pb-2 text-xs md:text-sm font-bold border-b-2 ${
                        activeTab === 'details' 
                          ? 'border-purple-400 text-purple-700' 
                          : 'border-transparent text-purple-400'
                      }`}
                    >
                      التفاصيل
                    </button>
                    {product.description && (
                      <button
                        onClick={() => setActiveTab('description')}
                        className={`pb-1 md:pb-2 text-xs md:text-sm font-bold border-b-2 ${
                          activeTab === 'description' 
                            ? 'border-purple-400 text-purple-700' 
                            : 'border-transparent text-purple-400'
                        }`}
                      >
                        الوصف
                      </button>
                    )}
                  </div>

                  <div className="mt-2 md:mt-4">
                    {activeTab === 'details' && (
                      <div className="space-y-2 md:space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                          <div>
                            <span className="text-purple-500">الرمز:</span>
                            <div className="font-bold text-purple-700 break-all">{product.sku}</div>
                          </div>
                          <div>
                            <span className="text-purple-500">الفئة:</span>
                            <div className="font-bold text-purple-700">{product.category || 'لا يوجد'}</div>
                          </div>
                        </div>
                        {product.customFields && product.customFields.length > 0 && (
                          <div className="space-y-1 md:space-y-2">
                            {product.customFields.map((field, index) => (
                              <div key={index} className="flex justify-between text-xs md:text-sm">
                                <span className="text-purple-500 flex-shrink-0">{field.name}:</span>
                                <span className="font-bold text-purple-700 text-left mr-2">{field.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'description' && product.description && (
                      <div 
                        className="text-xs md:text-sm text-purple-600 leading-relaxed"
                        dangerouslySetInnerHTML={createSafeHtml(product.description)}
                      />
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-purple-100">
                  <ProductReviews productId={product.id} />
                </div>
              </div>

              {/* Action Bar */}
              <div className="border-t-2 border-purple-100 p-6 flex-shrink-0 sticky bottom-0 bg-white">
                <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs md:text-sm font-bold text-purple-700">الكمية:</span>
                    <div className="flex items-center bg-purple-100 rounded-full">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                        className="p-1.5 md:p-2 hover:bg-purple-200 disabled:opacity-50 rounded-full"
                      >
                        <Minus className="w-3 h-3 md:w-4 md:h-4 text-purple-600" />
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
                        className="w-10 md:w-12 text-center bg-transparent font-bold text-purple-700 focus:outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="1"
                        max={product.stockQuantity}
                      />
                      <button
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= product.stockQuantity}
                        className="p-1.5 md:p-2 hover:bg-purple-200 disabled:opacity-50 rounded-full"
                      >
                        <Plus className="w-3 h-3 md:w-4 md:h-4 text-purple-600" />
                      </button>
                    </div>
                  </div>

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
                    className={`flex-1 py-3 md:py-4 px-4 md:px-6 font-bold text-sm md:text-lg rounded-2xl transition-colors md:w-full ${
                      product.availability === 'in_stock' && 
                      (!product.variants || product.variants.length === 0 || 
                       product.variants.every(variant => selectedVariants[variant.name]))
                        ? 'bg-purple-500 hover:bg-purple-600 text-white'
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
                </div>

                <WhatsAppOrderButton
                  product={{ name: product.name, price: product.price }}
                  variants={Object.keys(selectedVariants).length > 0 ? selectedVariants : null}
                  className="w-full py-3 md:py-4 px-4 md:px-6 font-bold text-sm md:text-lg rounded-2xl bg-[#25D366] hover:bg-[#1eb85a] text-white flex items-center justify-center gap-2 md:w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};