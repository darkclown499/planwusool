import React from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';

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
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-amber-25 shadow-2xl flex flex-col" style={{backgroundColor: '#fefdf8'}}>
        {/* Cozy Header with Home Icon */}
        <div className="bg-white border-b-2 border-amber-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center border-2 border-amber-200">
                <svg className="w-7 h-7 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2m-6 4h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-amber-900 mb-1">سلة التسوق</h2>
                <div className="flex items-center gap-2 text-amber-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-sm font-medium">{cartItems.length} عنصر{cartItems.length > 1 ? 'ات' : ''} في منزلك</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-xl transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content with Wood-like Background */}
        <div className="flex-1 overflow-y-auto p-6" style={{backgroundColor: '#faf8f1'}}>
          {cartItems.length === 0 ? (
            <div className="text-center mt-16">
              <div className="w-28 h-28 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border-4 border-amber-200 shadow-inner">
                <svg className="w-14 h-14 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-amber-900 mb-3">منزلك في انتظارك</h3>
              <p className="text-amber-700 mb-8 leading-relaxed">حوّل مساحتك مع ديكوراتنا<br/>المختارة بعناية</p>
              <button
                onClick={onClose}
                className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                استكشف المجموعة
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {cartItems.map((item, index) => (
                <div key={index} className="bg-white rounded-3xl p-5 shadow-lg border-2 border-amber-100 hover:shadow-xl hover:border-amber-200 transition-all duration-300">
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">منتج منزلي #{index + 1}</span>
                    </div>
                    <button 
                      onClick={() => onRemoveFromCart(index)}
                      className="p-2 text-amber-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-5">
                    {/* Product Image */}
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-amber-50 border-2 border-amber-200 shadow-md">
                        <img 
                          src={getImageUrl(item.image)} 
                          alt={item.name} 
                          onClick={() => onProductClick(item)}
                          className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300" 
                        />
                      </div>
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 
                        onClick={() => onProductClick(item)}
                        className="font-bold text-amber-900 text-base sm:text-lg mb-2 cursor-pointer hover:text-amber-700 transition-colors leading-tight"
                      >
                        {item.name}
                      </h3>
                      
                      {/* Variants */}
                      {(() => {
                        const variants: Record<string, any> = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                        return variants && Object.keys(variants).length > 0 && (
                          <div className="flex flex-wrap gap-1 sm:gap-2 mb-3">
                            {Object.entries(variants).map(([key, value]) => (
                              <span key={key} className="text-xs bg-amber-100 text-amber-800 px-2 sm:px-3 py-1 rounded-full font-semibold border border-amber-200">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                      
                      {/* Price Section */}
                      <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-xl sm:text-2xl font-bold text-amber-700">
                              {formatCurrency(item.price * item.quantity, storeSettings, currencies)}
                            </p>
                            <p className="text-sm text-amber-600">
                              {formatCurrency(item.price, storeSettings, currencies)} × {item.quantity}
                            </p>
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center bg-white rounded-xl border-2 border-amber-200 shadow-sm w-fit">
                            <button 
                              onClick={() => item.quantity > 1 && onUpdateQuantity(index, -1)}
                              className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-r-xl text-sm sm:text-lg font-bold transition-all ${
                                item.quantity > 1 
                                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer' 
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              −
                            </button>
                            <div className="w-10 sm:w-12 h-8 sm:h-10 flex items-center justify-center bg-white border-x-2 border-amber-200">
                              <span className="text-sm sm:text-lg font-bold text-amber-900">{item.quantity}</span>
                            </div>
                            <button 
                              onClick={() => onUpdateQuantity(index, 1)}
                              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-l-xl text-sm sm:text-lg font-bold cursor-pointer transition-all"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tax Info */}
                      {item.taxName && item.taxPercentage && (
                        <p className="text-xs text-amber-600 italic">
                          {item.taxName}: {item.taxPercentage}% ({formatCurrency((item.price * item.quantity * item.taxPercentage) / 100, storeSettings, currencies)})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Checkout Section */}
        {cartItems.length > 0 && (
          <div className="bg-white border-t-2 border-amber-200 p-6">
            {/* Summary Card */}
            <div className="bg-amber-50 rounded-2xl p-4 mb-4 border-2 border-amber-200 shadow-inner">
              <div className="text-center mb-3">
                <h3 className="text-base font-bold text-amber-900 mb-1">ملخص الطلب</h3>
                <div className="w-12 h-0.5 bg-amber-400 rounded-full mx-auto"></div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1">
                  <span className="text-amber-700 font-medium text-sm">المجموع الفرعي</span>
                  <span className="font-bold text-amber-900 text-sm">{formatCurrency(subtotal, storeSettings, currencies)}</span>
                </div>
                {totalTax > 0 && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-amber-700 font-medium text-sm">الضريبة</span>
                    <span className="font-bold text-amber-900 text-sm">{formatCurrency(totalTax, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="border-t border-amber-300 pt-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-amber-900">الإجمالي</span>
                    <span className="text-2xl font-bold text-amber-700">{formatCurrency(total, storeSettings, currencies)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Checkout Button */}
            <button 
              onClick={onCheckout}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-5 px-6 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-lg">إتمام عملية الشراء</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};