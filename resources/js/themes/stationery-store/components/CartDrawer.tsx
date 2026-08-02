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
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 px-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">سلة التسوق</h2>
              <span className="text-xs text-gray-500">{cartItems.length} عنصر{cartItems.length > 1 ? 'ات' : ''}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 px-6 bg-gray-50">
          {cartItems.length === 0 ? (
            <div className="text-center mt-20">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">سلتك فارغة</h3>
              <p className="text-gray-500 text-sm mb-6">أضف بعض المنتجات للبدء</p>
              <button
                onClick={onClose}
                className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
              >
                متابعة التسوق
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item, index) => (
                <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div>
                      <img 
                        src={getImageUrl(item.image)} 
                        alt={item.name} 
                        onClick={() => onProductClick(item)}
                        loading="lazy"
                        className="w-16 h-16 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 
                        onClick={() => onProductClick(item)}
                        className="font-semibold text-gray-900 mb-1 text-sm leading-tight cursor-pointer hover:text-sky-600 transition-colors"
                      >
                        {item.name}
                      </h3>
                      {(() => {
                        const variants = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                        return variants && Object.keys(variants).length > 0 && (
                          <div className="text-xs text-gray-500 mb-1">
                            {Object.entries(variants).map(([key, value], index) => (
                              <span key={key}>
                                {key}: {value}
                                {index < Object.keys(variants).length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sky-600 font-bold text-lg">{formatCurrency(item.price * item.quantity, storeSettings, currencies)}</p>
                        <button 
                          onClick={() => onRemoveFromCart(index)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{formatCurrency(item.price, storeSettings, currencies)} للقطعة</span>
                      </div>
                      {item.taxName && item.taxPercentage && (
                        <p className="text-xs text-gray-400 mt-2">
                          {item.taxName}: {item.taxPercentage}% ({formatCurrency((item.price * item.quantity * item.taxPercentage) / 100, storeSettings, currencies)})
                        </p>
                      )}
                      <div className="flex items-center justify-end mt-2">
                        <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                          <button 
                            onClick={() => item.quantity > 1 && onUpdateQuantity(index, -1)}
                            className={`w-7 h-7 flex items-center justify-center rounded-md text-white text-sm shadow-sm font-bold leading-none ${
                              item.quantity > 1 ? 'bg-sky-600 hover:bg-sky-700 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'
                            }`}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => onQuantityChange(index, e.target.value)}
                            className="w-8 text-sm font-semibold text-gray-900 text-center bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min="1"
                          />
                          <button 
                            onClick={() => onUpdateQuantity(index, 1)}
                            className="w-7 h-7 flex items-center justify-center bg-sky-600 hover:bg-sky-700 rounded-md text-white text-sm cursor-pointer shadow-sm font-bold leading-none"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {cartItems.length > 0 && (
          <div className="border-t border-gray-200 p-4 px-6 bg-white mt-auto">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">المجموع الفرعي</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(subtotal, storeSettings, currencies)}</span>
                </div>
                {totalTax > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">الضريبة</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(totalTax, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">الإجمالي</span>
                  <span className="text-2xl font-bold text-sky-600">{formatCurrency(total, storeSettings, currencies)}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={onCheckout}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 px-6 rounded-2xl transition-colors shadow-lg hover:shadow-xl cursor-pointer flex items-center justify-center gap-2 mt-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
              </svg>
              إتمام عملية الشراء
            </button>
          </div>
        )}
      </div>
    </div>
  );
};