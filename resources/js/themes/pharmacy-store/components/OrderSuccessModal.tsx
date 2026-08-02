import React from 'react';
import { toast } from '@/components/custom-toast';
import { CheckCircle, Copy, ShoppingBag, Eye, X } from 'lucide-react';
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

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-60 bg-black/50" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-end md:items-center justify-center min-h-full p-0 md:p-4">
        <div
          className="bg-white w-full max-h-[100vh] md:max-h-[90vh] md:max-w-lg md:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 md:p-8 text-center bg-gradient-to-br from-emerald-50 to-emerald-100">
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-emerald-200 rounded-full transition-colors md:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Success Animation */}
            <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg animate-pulse">
              <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">تم إتمام الطلب بنجاح!</h2>
            <p className="text-gray-600 mb-4">شكراً لطلبك. سنقوم بمعالجته قريباً.</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            {/* Order Number Card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="text-center">
                <p className="text-sm text-emerald-700 font-medium mb-1">رقم الطلب</p>
                <p className="text-xl font-bold text-emerald-800">#{orderNumber}</p>
              </div>
            </div>

            {/* Order Invoice Link */}
            {orderNumber && (
              <div className="bg-gray-50 rounded-2xl p-4 pb-0">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-medium text-gray-700">رابط فاتورة الطلب</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={orderLink}
                    readOnly
                    className="flex-1 text-sm bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={copyOrderLink}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    نسخ الرابط
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex-shrink-0 p-6 md:p-8 pt-0 space-y-3">
            <button
              onClick={onContinueShopping}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              متابعة التسوق
            </button>

            {orderNumber && (
              <a
                href={orderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye className="w-5 h-5" />
                عرض تفاصيل الطلب
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};