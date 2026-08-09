import React, { useEffect } from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { ShoppingBag, X, Minus, Plus, Trash2 } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stockQuantity: number;
  taxName?: string;
  taxPercentage?: number;
  variants?: {[key: string]: string} | null;
}

interface CartDrawerProps {
  cartItems: CartItem[];
  currency: string;
  onClose: () => void;
  onRemoveFromCart: (index: number) => void;
  onUpdateQuantity: (index: number, change: number) => void;
  onQuantityChange: (index: number, quantity: number) => void;
  onProductClick: (item: CartItem) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  cartItems,
  currency,
  onClose,
  onRemoveFromCart,
  onUpdateQuantity,
  onQuantityChange,
  onProductClick,
  onCheckout
}) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const storeSettings = (window as any).page?.props?.storeSettings || {};
  const currencies = (window as any).page?.props?.currencies || [];
  
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalTax = cartItems.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    const taxAmount = item.taxPercentage ? (itemTotal * item.taxPercentage) / 100 : 0;
    return sum + taxAmount;
  }, 0);
  const total = subtotal + totalTax;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-amber-900/50" onClick={onClose}></div>
      <div className="absolute left-0 top-0 h-full w-full max-w-md bg-amber-50 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="bg-amber-700 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold">سلة التسوق</h2>
                <p className="text-amber-300 text-sm">{cartItems.length} كتب مميزة</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-amber-300 hover:text-white hover:bg-amber-600 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content - List Style Layout */}
        <div className="flex-1 overflow-y-auto bg-amber-100">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 bg-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="text-xl font-serif font-bold text-amber-800 mb-3">سلتك فارغة</h3>
              <p className="text-amber-600 mb-6">أضف بعض الكتب الرائعة!</p>
              <button
                onClick={onClose}
                className="bg-amber-700 hover:bg-amber-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                متابعة التسوق
              </button>
            </div>
          ) : (
            <div className="divide-y divide-amber-200">
              {cartItems.map((item, index) => (
                <div key={index} className="bg-white p-4 hover:bg-amber-50 transition-colors">
                  {/* Item Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-amber-700 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-xs font-medium text-amber-500 uppercase tracking-wide">منتجاتنا</span>
                    </div>
                    <button 
                      onClick={() => onRemoveFromCart(index)}
                      className="p-1 text-amber-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img 
                        src={getImageUrl(item.image)} 
                        alt={item.name} 
                        onClick={() => onProductClick(item)}
                        className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-amber-200" 
                      />
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 
                        onClick={() => onProductClick(item)}
                        className="font-serif font-bold text-amber-900 text-base leading-tight cursor-pointer hover:text-amber-700 transition-colors mb-1"
                      >
                        {item.name}
                      </h3>
                      
                      {/* Variants */}
                      {(() => {
                        let variants: Record<string, any> = (item.variants ?? {}) as Record<string, any>;
                        if (typeof item.variants === 'string') {
                          try { variants = JSON.parse(item.variants); } catch { variants = {}; }
                        }
                        return variants && Object.keys(variants).length > 0 && (
                          <div className="text-xs text-amber-600 mb-2">
                            {Object.entries(variants).map(([key, value], index) => (
                              <span key={key} className="bg-amber-100 px-2 py-1 rounded mr-1">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                      
                      {/* Price Row */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-lg font-bold text-amber-800">{formatCurrency(item.price * item.quantity, storeSettings, currencies)}</p>
                          <p className="text-xs text-amber-500">{formatCurrency(item.price, storeSettings, currencies)} × {item.quantity}</p>
                        </div>
                      </div>
                      
                      {/* Quantity Controls and Tax Info - Side by Side */}
                      <div className="bg-amber-100 rounded-lg p-2">
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-amber-700">الكمية:</span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => item.quantity > 1 && onUpdateQuantity(index, -1)}
                                className={`w-7 h-7 flex items-center justify-center bg-white rounded text-amber-600 transition-colors border border-amber-200 ${
                                  item.quantity > 1 ? 'hover:bg-amber-600 hover:text-white cursor-pointer' : 'cursor-not-allowed opacity-50'
                                }`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-bold text-amber-900 text-sm">{item.quantity}</span>
                              <button 
                                onClick={() => onUpdateQuantity(index, 1)}
                                className="w-7 h-7 flex items-center justify-center bg-white hover:bg-amber-600 hover:text-white rounded text-amber-600 transition-colors cursor-pointer border border-amber-200"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Tax Info */}
                          {item.taxName && item.taxPercentage && (
                            <p className="text-xs text-amber-500 italic">
                              {item.taxName}: {item.taxPercentage}% ({formatCurrency((item.price * item.quantity * item.taxPercentage) / 100, storeSettings, currencies)})
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Checkout Footer */}
        {cartItems.length > 0 && (
          <div className="bg-white border-t-2 border-amber-200 p-4">
            {/* Order Summary */}
            <div className="bg-amber-100 rounded-lg p-4 mb-4">
              <h3 className="font-serif font-bold text-amber-900 mb-3 text-center">ملخص الطلب</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600">المجموع الفرعي</span>
                  <span className="font-semibold text-amber-900">{formatCurrency(subtotal, storeSettings, currencies)}</span>
                </div>
                {totalTax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-600">الضريبة</span>
                    <span className="font-semibold text-amber-900">{formatCurrency(totalTax, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="border-t border-amber-300 pt-2 flex justify-between">
                  <span className="font-serif font-bold text-amber-900">الإجمالي</span>
                  <span className="text-xl font-bold text-amber-800">{formatCurrency(total, storeSettings, currencies)}</span>
                </div>
              </div>
            </div>
            
            {/* Checkout Button */}
            <button 
              onClick={onCheckout}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-serif font-bold py-4 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>إتمام الطلب</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};