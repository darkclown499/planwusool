import React from 'react';
import { toast } from '@/components/custom-toast';
import { X, Copy, ShoppingBag, Receipt } from 'lucide-react';
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
      toast.success("تم نسخ رابط الطلب!");
    } else {
      // Fallback for non-HTTPS or older browsers
      const textArea = document.createElement("textarea");
      textArea.value = orderLink;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("تم نسخ رابط الطلب!");
      } catch (err) {
        toast.error("فشل نسخ الرابط");
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="fixed inset-0 z-60 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/70"></div>
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-2 md:p-4">
        <div className="bg-white w-full h-auto max-h-[90vh] sm:max-w-lg rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="relative bg-green-600 p-4 sm:p-5 flex-shrink-0">
            <button 
              onClick={onClose}
              className="absolute top-3 left-3 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center text-white">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold mb-1">تم إتمام الطلب بنجاح!</h2>
              <p className="text-green-100 text-xs sm:text-sm">طلبك في الطريق إليك</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            
            {/* Order Number Card */}
            <div className="bg-stone-50 rounded-2xl p-4 mb-4 border border-stone-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-500 uppercase tracking-wide font-medium">رقم الطلب</p>
                  <p className="text-lg sm:text-xl font-serif font-bold text-amber-900 mt-1">#{orderNumber}</p>
                </div>
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>



            {/* Order Link */}
            {orderNumber && (
              <div className="bg-stone-100 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">رابط فاتورة الطلب</span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={orderLink}
                    readOnly
                    className="flex-1 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg px-3 py-2 text-amber-600 truncate"
                  />
                  <button
                    onClick={copyOrderLink}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span className="hidden sm:inline">نسخ</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={onContinueShopping}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="font-serif">متابعة التسوق</span>
              </button>
              {orderNumber && (
                <a
                  href={orderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-stone-100 hover:bg-stone-200 text-amber-700 font-semibold py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 border border-stone-300 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>عرض التفاصيل</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};