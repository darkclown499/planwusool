import React from 'react';
import { getImageUrl } from '../../../utils/image-helper';
import { formatCurrency } from '../../../utils/currency-formatter';
import { X, ShoppingCart, Minus, Plus, Trash2, ShoppingBag, Receipt } from 'lucide-react';

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

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/70" onClick={onClose}></div>
      <div className="absolute right-0 top-0 h-full w-full max-w-sm sm:max-w-md bg-slate-800 shadow-2xl flex flex-col border-l-2 border-red-600">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-red-600 bg-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">سلة التسوق</h2>
              <span className="text-xs text-slate-300 font-medium">{cartItems.length} عنصر{cartItems.length !== 1 ? 'ات' : ''}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400 hover:text-red-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-800">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-20 h-20 bg-red-600 flex items-center justify-center mb-4">
                <ShoppingBag className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">سلتك فارغة</h3>
              <p className="text-slate-300 text-sm mb-6 font-medium">أضف بعض المنتجات للبدء</p>
              <button
                onClick={onClose}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 font-bold transition-colors border-2 border-red-600"
              >
                متابعة التسوق
              </button>
            </div>
          ) : (
            <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
              {cartItems.map((item, index) => (
                <div key={index} className="bg-slate-900 border-2 border-slate-700 p-3 sm:p-4 hover:border-red-600 transition-all">
                  <div className="flex gap-3 sm:gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img 
                        src={getImageUrl(item.image)} 
                        alt={item.name} 
                        onClick={() => onProductClick(item)}
                        loading="lazy"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                      />
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h3 
                          onClick={() => onProductClick(item)}
                          className="font-bold text-white text-sm sm:text-base leading-tight cursor-pointer hover:text-red-400 transition-colors line-clamp-2"
                        >
                          {item.name}
                        </h3>
                        <button 
                          onClick={() => onRemoveFromCart(index)}
                          className="p-1 sm:p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors mr-1 sm:mr-2 flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      
                      {/* Variants */}
                      {(() => {
                        const variants: Record<string, any> = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                        return variants && Object.keys(variants).length > 0 && (
                          <div className="text-xs text-slate-400 mb-2 font-medium">
                            {Object.entries(variants).map(([key, value], index) => (
                              <span key={key}>
                                {key}: {value}
                                {index < Object.keys(variants).length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                      
                      {/* Price and Unit Price */}
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-sm sm:text-lg font-bold text-red-400">
                            {formatCurrency(item.price * item.quantity, storeSettings, currencies)}
                          </div>
                          <div className="text-xs text-slate-400 font-medium">
                            {formatCurrency(item.price, storeSettings, currencies)} للقطعة
                          </div>
                        </div>
                      </div>
                      
                      {/* Tax Info */}
                      {item.taxName && item.taxPercentage && (
                        <div className="text-xs text-slate-400 mb-3 font-medium">
                          {item.taxName}: {item.taxPercentage}% ({formatCurrency((item.price * item.quantity * item.taxPercentage) / 100, storeSettings, currencies)})
                        </div>
                      )}
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-slate-300 font-bold">الكمية</span>
                        <div className="flex items-center gap-1 bg-slate-700 p-1">
                          <button 
                            onClick={() => item.quantity > 1 && onUpdateQuantity(index, -1)}
                            className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-white font-bold ${
                              item.quantity > 1 ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-600 cursor-not-allowed'
                            } transition-colors`}
                          >
                            <Minus className="w-2 h-2 sm:w-3 sm:h-3" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => onQuantityChange(index, Number(e.target.value))}
                            className="w-8 sm:w-10 text-xs sm:text-sm font-bold text-white text-center bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min="1"
                          />
                          <button 
                            onClick={() => onUpdateQuantity(index, 1)}
                            className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold transition-colors"
                          >
                            <Plus className="w-2 h-2 sm:w-3 sm:h-3" />
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
        
        {/* Footer - Order Summary & Checkout */}
        {cartItems.length > 0 && (
          <div className="border-t-2 border-red-600 bg-black p-4 sm:p-6">
            {/* Order Summary */}
            <div className="bg-slate-700 border-2 border-slate-600 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-4 h-4 text-red-400" />
                <span className="font-bold text-white">ملخص الطلب</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 font-medium">المجموع الفرعي</span>
                  <span className="font-bold text-white">{formatCurrency(subtotal, storeSettings, currencies)}</span>
                </div>
                {totalTax > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 font-medium">الضريبة</span>
                    <span className="font-bold text-white">{formatCurrency(totalTax, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="border-t-2 border-slate-600 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-white">الإجمالي</span>
                    <span className="text-xl font-bold text-red-400">{formatCurrency(total, storeSettings, currencies)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Checkout Button */}
            <button 
              onClick={onCheckout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 transition-all border-2 border-red-600 flex items-center justify-center gap-3"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline">إتمام عملية الشراء</span>
              <span className="sm:hidden">الدفع</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};