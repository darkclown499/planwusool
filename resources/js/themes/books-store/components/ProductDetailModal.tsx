import React, { useEffect } from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { toast } from '@/components/custom-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { log } from 'console';

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
  variants?: { name: string; values: string[] }[];
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
  const [selectedVariants, setSelectedVariants] = React.useState<{ [key: string]: string }>({});
  const [quantity, setQuantity] = React.useState(1);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] md:max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="relative bg-amber-700 p-3 sm:p-4 flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-2 left-2 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center text-white pl-10">
              <ShoppingBag className="w-5 h-5 ml-2 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-serif font-bold truncate">{product.name}</h2>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col md:flex-row max-h-[calc(85vh-80px)] md:max-h-[calc(70vh-80px)] overflow-y-auto md:overflow-hidden">
            {/* <div className="flex flex-col lg:flex-row"> */}

            {/* Image Section */}
            <div className="w-full lg:w-1/2 p-4 sm:p-6 md:sticky md:top-0 md:overflow-hidden">
              <div className="h-auto md:h-full flex flex-col space-y-4">
                <div className="relative aspect-square bg-amber-100 rounded-lg overflow-hidden">
                  <img
                    src={getImageUrl(product.images && product.images.length > 0 ? product.images[selectedImageIndex] : product.image)}
                    alt={product.name}
                    className="w-full h-full object-scale-down"
                  />
                </div>

                {product.images && product.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {product.images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => onImageSelect(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${selectedImageIndex === index
                            ? 'border-amber-600'
                            : 'border-amber-300 hover:border-amber-500'
                          }`}
                      >
                        <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="w-full flex-1 flex flex-col lg:w-1/2 p-4 sm:p-6 lg:border-r border-amber-200 md:overflow-y-auto">
              <div className="flex-1 space-y-4 sm:space-y-6">

                {/* Category */}
                {product.category && (
                  <span className="inline-block bg-amber-200 text-amber-800 text-xs font-medium px-3 py-1 rounded-full">
                    {product.category}
                  </span>
                )}

                {/* Price */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl sm:text-3xl font-bold text-amber-800">{formatCurrency(product.price, storeSettings, currencies)}</span>
                    {product.originalPrice && (
                      <>
                        <span className="text-lg text-amber-500 line-through">{formatCurrency(product.originalPrice, storeSettings, currencies)}</span>
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Stock Status */}
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${product.availability === 'in_stock' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`font-medium text-sm ${product.availability === 'in_stock' ? 'text-green-700' : 'text-red-700'}`}>
                      {product.availability === 'in_stock' ? 'متوفر' : 'غير متوفر'}
                    </span>
                  </div>
                  <span className="text-xs text-amber-500">{product.stockQuantity} متاح • الرمز: {product.sku}</span>
                </div>

                {/* Description */}
                {product.description && (
                  <div>
                    <h4 className="font-serif font-semibold text-amber-900 mb-2">الوصف</h4>
                    <div className="text-amber-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: product.description }} />
                  </div>
                )}

                {/* Variants */}
                {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
                  <div>
                    <h4 className="font-serif font-semibold text-amber-900 mb-3">الخيارات</h4>
                    <div className="space-y-3">
                      {product.variants.map((variant, index) => (
                        <div key={index}>
                          <label className="block text-sm font-medium text-amber-700 mb-2">{variant?.name}</label>
                          <Select
                            value={selectedVariants[variant.name] || ''}
                            onValueChange={(value) => setSelectedVariants(prev => ({ ...prev, [variant.name]: value }))}
                          >
                            <SelectTrigger className="w-full border-amber-300 focus:border-amber-500 focus:ring-amber-500">
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
                  </div>
                )}

                {/* Custom Fields */}
                {product.customFields && product.customFields.length > 0 && (
                  <div>
                    <h4 className="font-serif font-semibold text-amber-900 mb-3">المواصفات</h4>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <div className="space-y-2">
                        {product.customFields.map((field, index) => (
                          <div key={index} className="flex justify-between py-1 border-b border-amber-200 last:border-0">
                            <span className="font-medium text-amber-700 text-sm">{field.name}:</span>
                            <span className="text-amber-600 text-sm">{field.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* </div> */}
          </div>

          {/* Bottom Actions */}
          <div className="p-4 sm:p-6 bg-gradient-to-t from-amber-100 to-amber-50 border-t-2 border-amber-200 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">

              {/* Quantity Section */}
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <span className="font-serif font-semibold text-amber-900">الكمية:</span>
                <div className="flex items-center bg-white rounded-lg border border-amber-300 shadow-sm">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-amber-100 rounded-r-lg transition-colors cursor-pointer"
                  >
                    <Minus className="w-4 h-4 text-amber-600" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const newQuantity = parseInt(e.target.value) || 1;
                      setQuantity(Math.min(Math.max(1, newQuantity), product.stockQuantity));
                    }}
                    className="px-4 py-2 font-bold text-amber-800 min-w-[50px] text-center border-x border-amber-200 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="1"
                    max={product.stockQuantity}
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                    className="p-2 hover:bg-amber-100 rounded-l-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-amber-600" />
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={() => {
                  const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
                  if (hasVariants && Object.keys(selectedVariants).length < product.variants.length) {
                    toast.error('يرجى اختيار جميع الخيارات قبل الإضافة إلى السلة');
                    return;
                  }
                  const productToAdd = hasVariants ? { ...product, selectedVariants, quantity } : { ...product, quantity };
                  onAddToCart(productToAdd);
                  onClose();
                }}
                disabled={product.availability === 'out_of_stock' ||
                  (product.variants && Array.isArray(product.variants) && product.variants.length > 0 &&
                    Object.keys(selectedVariants).length < product.variants.length)}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${product.availability === 'in_stock' &&
                    (!product.variants || product.variants.length === 0 ||
                      Object.keys(selectedVariants).length === product.variants.length)
                    ? 'bg-amber-700 hover:bg-amber-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-amber-300 text-amber-500 cursor-not-allowed'
                  }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="font-serif text-base">
                  {product.availability === 'out_of_stock'
                    ? 'غير متوفر'
                    : (product.variants && Array.isArray(product.variants) && product.variants.length > 0 &&
                      Object.keys(selectedVariants).length < product.variants.length)
                      ? 'اختر الخيارات'
                      : `أضف ${quantity} • ${formatCurrency(product.price * quantity, storeSettings, currencies)}`
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};