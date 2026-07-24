import React from 'react';
import { toast } from '@/components/custom-toast';
import { X, Copy, ShoppingBag, Package } from 'lucide-react';
import { generateStoreUrl } from "../../../utils/store-url-helper";

interface OrderSuccessModalProps {
  orderNumber: string;
  storeSlug: string;
  store?: any;
  onClose: () => void;
  onContinueShopping: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  orderNumber,
  storeSlug,
  store,
  onClose,
  onContinueShopping
}) => {
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

    const orderLink = generateStoreUrl('store.order-confirmation', store, { orderNumber });

      const copyOrderLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderLink);
      toast.success("Order link copied to clipboard!");
    } else {
      // Fallback for non-HTTPS or older browsers
      const textArea = document.createElement("textarea");
      textArea.value = orderLink;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Order link copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy link");
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-purple-900/50" onClick={onClose}>
      <div className="flex items-center justify-center h-full p-4">
        <div 
          className="bg-white w-full max-w-md overflow-hidden shadow-2xl rounded-2xl border-4 border-purple-200 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-purple-100 border-b-2 border-purple-200">
            <h2 className="text-xl font-bold text-purple-800">Order Confirmed!</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-purple-200 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-purple-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-purple-700 font-medium">Your order has been placed successfully</p>
            </div>
            
            {/* Order Number */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Package className="w-5 h-5 text-purple-600" />
                <span className="text-purple-600 text-sm font-bold">Order Number</span>
              </div>
              <p className="text-xl font-bold text-purple-800">#{orderNumber}</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={onContinueShopping}
                className="w-full py-3 px-4 font-bold rounded-xl transition-all bg-purple-500 hover:bg-purple-600 transform hover:scale-105 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Continue Shopping</span>
              </button>
              
              {orderNumber && (
                <div className="space-y-3">
                  <a
                    href={orderLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 font-bold rounded-xl transition-all bg-green-500 hover:bg-green-600 transform hover:scale-105 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Package className="w-5 h-5" />
                    <span>View Order</span>
                  </a>
                  
                  <button
                    onClick={copyOrderLink}
                    className="w-full py-3 px-4 font-bold rounded-xl transition-all bg-purple-100 hover:bg-purple-200 text-purple-700 border-2 border-purple-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-5 h-5" />
                    <span>Copy Order Link</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};