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
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="absolute inset-0 flex items-center justify-center p-2 md:p-4">
        <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 md:p-8 text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <svg className="w-8 h-8 md:w-10 md:h-10 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">تم إتمام الطلب بنجاح!</h2>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">شكراً لطلبك. سنقوم بمعالجته قريباً.</p>
            
            {/* Order Number */}
            <div className="bg-rose-50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
              <p className="text-xs md:text-sm text-gray-600 mb-1">رقم الطلب</p>
              <p className="text-base md:text-lg font-semibold text-gray-900">{orderNumber}</p>
            </div>
            
            {/* Order Invoice Link */}
            {orderNumber && (
              <div className="bg-rose-50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                <p className="text-xs md:text-sm text-rose-600 mb-2">رابط فاتورة الطلب</p>
                <div className="flex flex-col md:flex-row gap-2">
                  <input 
                    type="text" 
                    value={orderLink}
                    readOnly
                    className="flex-1 text-xs md:text-sm bg-white border border-rose-200 rounded px-2 md:px-3 py-2 text-gray-700 select-all"
                  />
                  <button
                    onClick={copyOrderLink}
                    className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded text-xs md:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    نسخ الرابط
                  </button>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="space-y-2 md:space-y-3">
              <button
                onClick={onContinueShopping}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 rounded-lg md:rounded-xl text-sm md:text-base transition-colors cursor-pointer"
              >
                متابعة التسوق
              </button>
              {orderNumber && (
                <a
                  href={orderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 md:py-3 px-4 md:px-6 rounded-lg md:rounded-xl text-sm md:text-base transition-colors cursor-pointer block text-center"
                >
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