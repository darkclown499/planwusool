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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-rose-50 shadow-2xl flex flex-col">
        {/* Elegant Header */}
        <div className="bg-white border-b border-rose-200">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-gray-900">My Fashion Bag</h2>
                <p className="text-sm text-rose-600 font-medium">{cartItems.length} {cartItems.length === 1 ? 'item' : 'pieces'} selected</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-100 rounded-full transition-all duration-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto sm:px-6 px-4 py-4">
          {cartItems.length === 0 ? (
            <div className="text-center mt-24">
              <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <svg className="w-12 h-12 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-serif font-semibold text-gray-900 mb-3">Your bag awaits</h3>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">Discover our curated collection<br/>and add your favorite pieces</p>
              <button
                onClick={onClose}
                className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-full font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item, index) => (
                <div key={index} className="group bg-white rounded-3xl p-4 shadow-sm border border-rose-100 hover:shadow-lg hover:border-rose-200 transition-all duration-300">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 shadow-sm">
                        <img 
                          src={getImageUrl(item.image)} 
                          alt={item.name} 
                          onClick={() => onProductClick(item)}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                        {item.quantity}
                      </div>
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h3 
                          onClick={() => onProductClick(item)}
                          className="font-serif font-semibold text-gray-900 text-base leading-tight cursor-pointer hover:text-rose-600 transition-colors line-clamp-2"
                        >
                          {item.name}
                        </h3>
                        <button 
                          onClick={() => onRemoveFromCart(index)}
                          className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Variants */}
                      {(() => {
                        const variants = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                        return variants && Object.keys(variants).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {Object.entries(variants).map(([key, value]) => (
                              <span key={key} className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-medium">
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                      
                      {/* Price and Quantity */}
                      <div className="flex flex-wrap gap-2 items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-rose-600">
                            {formatCurrency(item.price * item.quantity, storeSettings, currencies)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatCurrency(item.price, storeSettings, currencies)} each
                          </span>
                        </div>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center bg-rose-50 rounded-full p-1 border border-rose-200">
                          <button 
                            onClick={() => item.quantity > 1 && onUpdateQuantity(index, -1)}
                            className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all ${
                              item.quantity > 1 
                                ? 'bg-white text-rose-600 hover:bg-rose-100 shadow-sm cursor-pointer' 
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-gray-900">
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => onUpdateQuantity(index, 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-rose-600 hover:bg-rose-100 rounded-full text-sm font-bold shadow-sm cursor-pointer transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      {/* Tax Info */}
                      {item.taxName && item.taxPercentage && (
                        <p className="text-xs text-gray-400 mt-2 italic">
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
          <div className="bg-white border-t border-rose-200 p-6">
            {/* Summary */}
            <div className="bg-rose-50 rounded-2xl p-5 mb-4 border border-rose-100">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(subtotal, storeSettings, currencies)}</span>
                </div>
                {totalTax > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Tax</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(totalTax, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="h-px bg-rose-200 my-3"></div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-serif font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-rose-600">
                    {formatCurrency(total, storeSettings, currencies)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Checkout Button */}
            <button 
              onClick={onCheckout}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
              <span className="font-serif">Proceed to Checkout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};