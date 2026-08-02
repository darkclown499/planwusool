import React from 'react';
import { toast } from '@/components/custom-toast';
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
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="absolute inset-0 flex items-end md:items-center justify-center p-2 md:p-4">
        <div className="bg-white rounded-3xl md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-yellow-200" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 md:p-8 text-center max-h-[90vh] md:max-h-[80vh] overflow-y-auto">
            {/* Success Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 border-4 border-yellow-200">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
              </svg>
            </div>
            
            <h2 className="text-xl md:text-3xl font-serif font-bold text-yellow-900 mb-2 md:mb-3">تم إتمام الطلب بنجاح!</h2>
            <p className="text-yellow-700 mb-4 md:mb-6 text-sm md:text-lg">شكراً لطلبك. سنقوم بمعالجته قريباً.</p>
            
            {/* Order Number */}
            <div className="bg-yellow-50 rounded-2xl p-4 md:p-6 mb-4 md:mb-6 border-2 border-yellow-100">
              <div className="flex items-center justify-center gap-2 md:gap-3 mb-2">
                <span className="text-xl md:text-2xl">🏠</span>
                <p className="text-xs md:text-sm font-semibold text-yellow-800">رقم الطلب</p>
              </div>
              <p className="text-lg md:text-2xl font-bold text-yellow-900 font-mono">{orderNumber}</p>
            </div>
            
            {/* Order Invoice Link */}
            {orderNumber && (
              <div className="bg-white rounded-2xl p-4 md:p-6 mb-4 md:mb-6 border-2 border-yellow-100">
                <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
                  <span className="text-lg md:text-xl">📋</span>
                  <p className="text-xs md:text-sm font-semibold text-yellow-800">رابط فاتورة الطلب</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  <input 
                    type="text" 
                    value={orderLink}
                    readOnly
                    className="flex-1 text-xs md:text-sm bg-yellow-50 border-2 border-yellow-200 rounded-xl px-3 md:px-4 py-2 md:py-3 text-yellow-900 select-all focus:outline-none focus:border-yellow-500"
                  />
                  <button
                    onClick={copyOrderLink}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 md:px-4 py-2 md:py-3 rounded-xl text-xs md:text-sm font-semibold transition-colors shadow-md hover:shadow-lg cursor-pointer"
                  >
                    📋 نسخ الرابط
                  </button>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="space-y-3 md:space-y-4">
              <button
                onClick={onContinueShopping}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-2xl text-base md:text-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2 md:gap-3 cursor-pointer"
              >
                <span className="text-lg md:text-xl">🛍️</span>
                متابعة التسوق
              </button>
              {orderNumber && (
                <a
                  href={orderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-semibold py-3 md:py-4 px-4 md:px-6 rounded-2xl text-base md:text-lg transition-colors shadow-md hover:shadow-lg block text-center flex items-center justify-center gap-2 md:gap-3 cursor-pointer"
                >
                  <span className="text-lg md:text-xl">📄</span>
                  عرض تفاصيل الطلب
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};