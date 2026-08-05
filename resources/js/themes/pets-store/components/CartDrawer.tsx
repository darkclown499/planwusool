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
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
        
        {/* Pets Header */}
        <div className="bg-orange-600 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">سلة التسوق</h2>
                <p className="text-orange-100 text-sm">{cartItems.length} منتجات مميزة</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-orange-100 hover:text-white hover:bg-orange-500 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content - Table Style Layout */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">سلتك فارغة</h3>
              <p className="text-gray-600 mb-6">أضف منتجات للبدء!</p>
              <button
                onClick={onClose}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                تسوق الآن
              </button>
            </div>
          ) : (
            <div className="p-4">
              {/* Table Header */}
              <div className="bg-white rounded-t-lg border-b-2 border-orange-200 p-3 mb-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">المنتج</div>
                  <div className="col-span-2 text-center">الكمية</div>
                  <div className="col-span-2 text-right">السعر</div>
                  <div className="col-span-2 text-center">إجراء</div>
                </div>
              </div>
              
              {/* Table Rows */}
              <div className="space-y-1 overflow-x-auto">
                {cartItems.map((item, index) => (
                  <div key={index} className="min-w-md bg-white rounded-lg p-3 border border-gray-200 hover:border-orange-300 transition-colors">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Item Number */}
                      <div className="col-span-1">
                        <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                      </div>
                      
                      {/* Product Info */}
                      <div className="col-span-5">
                        <div className="flex items-center gap-3">
                          <img 
                            src={getImageUrl(item.image)} 
                            alt={item.name} 
                            onClick={() => onProductClick(item)}
                            className="w-14 h-14 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" 
                          />
                          <div className="min-w-0">
                            <h3 
                              onClick={() => onProductClick(item)}
                              className="font-semibold text-gray-900 text-sm leading-tight cursor-pointer hover:text-orange-600 transition-colors line-clamp-1"
                            >
                              {item.name}
                            </h3>
                            <p className="text-xs text-gray-500">{formatCurrency(item.price, storeSettings, currencies)} للقِطعة</p>
                            
                            {/* Variants */}
                            {(() => {
                              const variants: Record<string, any> = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
                              return variants && Object.keys(variants).length > 0 && (
                                <div className="text-xs text-orange-600 mt-1">
                                  {Object.entries(variants).map(([key, value], index) => (
                                    <span key={key} className="bg-orange-100 px-1 py-0.5 rounded ml-1">
                                      {key}: {value}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Quantity */}
                      <div className="col-span-2">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => item.quantity > 1 && onUpdateQuantity(index, -1)}
                            className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                              item.quantity > 1 ? 'bg-orange-600 text-white hover:bg-orange-700 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            } transition-colors`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-bold text-gray-900 text-sm">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(index, 1)}
                            className="w-6 h-6 flex items-center justify-center bg-orange-600 hover:bg-orange-700 rounded text-white text-xs font-bold cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Price */}
                      <div className="col-span-2 text-right">
                        <div className="font-bold text-orange-600 text-sm">
                          {formatCurrency(item.price * item.quantity, storeSettings, currencies)}
                        </div>
                        {item.taxName && item.taxPercentage && (
                          <div className="text-xs text-gray-500">
                            +{item.taxPercentage}% ضريبة
                          </div>
                        )}
                      </div>
                      
                      {/* Action */}
                      <div className="col-span-2 text-center">
                        <button 
                          onClick={() => onRemoveFromCart(index)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Receipt-Style Footer */}
        {cartItems.length > 0 && (
          <div className="bg-white border-t-2 border-orange-200 p-4">
            {/* Receipt Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border-2 border-dashed border-gray-300">
              <div className="text-center mb-3">
                <Receipt className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <h3 className="font-bold text-gray-900">ملخص الإيصال</h3>
                <div className="w-full h-px bg-gray-300 my-2"></div>
              </div>
              
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">المجموع الفرعي:</span>
                  <span className="font-bold">{formatCurrency(subtotal, storeSettings, currencies)}</span>
                </div>
                {totalTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">الضريبة:</span>
                    <span className="font-bold">{formatCurrency(totalTax, storeSettings, currencies)}</span>
                  </div>
                )}
                <div className="border-t border-gray-400 pt-2 flex justify-between text-lg">
                  <span className="font-bold text-gray-900">الإجمالي:</span>
                  <span className="font-bold text-orange-600">{formatCurrency(total, storeSettings, currencies)}</span>
                </div>
              </div>
            </div>
            
            {/* Checkout Button */}
            <button 
              onClick={onCheckout}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>إتمام عملية الشراء</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};