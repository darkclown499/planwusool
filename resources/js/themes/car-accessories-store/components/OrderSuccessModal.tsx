import React from 'react';
import { toast } from '@/components/custom-toast';
import { CheckCircle, Copy, ExternalLink, ShoppingCart, FileText } from 'lucide-react';
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
    const orderLink = generateStoreUrl('store.order-confirmation', store, { orderNumber });

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
    <div className="fixed inset-0 z-60 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/70"></div>
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div className="bg-slate-800 w-full max-w-md border-2 border-red-600 overflow-hidden my-auto" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="bg-black text-white p-4 sm:p-6 text-center border-b-2 border-red-600">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">ORDER CONFIRMED</h2>
            <p className="text-slate-300 text-xs sm:text-sm font-bold">PARTS SUCCESSFULLY ORDERED</p>
          </div>
          
          <div className="p-4 sm:p-6 bg-slate-800">
            {/* Order Number */}
            <div className="bg-slate-900 border-2 border-slate-700 p-3 sm:p-4 mb-4 text-center">
              <div className="text-red-400 text-xs font-bold mb-1">ORDER NUMBER</div>
              <div className="text-white text-lg sm:text-xl font-bold">{orderNumber}</div>
            </div>
            
            {/* Order Link */}
            {orderNumber && (
              <div className="bg-black border border-slate-700 p-3 sm:p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-xs sm:text-sm font-bold">ORDER TRACKING LINK</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="text" 
                    value={orderLink}
                    readOnly
                    className="flex-1 text-xs bg-slate-800 border border-slate-600 px-2 py-2 text-white select-all font-bold"
                  />
                  <button
                    onClick={copyOrderLink}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span className="hidden sm:inline">COPY</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={onContinueShopping}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>CONTINUE SHOPPING</span>
              </button>
              
              {orderNumber && (
                <a
                  href={orderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>VIEW ORDER DETAILS</span>
                </a>
              )}
            </div>
            
            {/* Footer Message */}
            <div className="bg-slate-900 border border-slate-700 p-3 mt-4 text-center">
              <p className="text-slate-300 text-xs font-bold">
                ORDER PROCESSING INITIATED<br/>
                TRACKING INFO WILL BE SENT VIA EMAIL
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};