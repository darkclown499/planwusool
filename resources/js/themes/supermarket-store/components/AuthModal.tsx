import React from 'react';
import { X, User, UserCheck, ShoppingCart } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onLogin: () => void;
  onContinueAsGuest: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin, onContinueAsGuest }) => {
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div className="flex items-end md:items-center justify-center h-full p-0 md:p-4">
        <div 
          className="bg-white w-full h-auto md:max-w-md md:rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 md:p-8 text-center bg-gradient-to-br from-green-50 to-green-100">
            <button 
              onClick={onClose}
              aria-label="إغلاق النافذة"
              className="absolute top-4 left-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-green-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">هل أنت مستعد لإتمام عملية الشراء؟</h2>
            <p className="text-gray-600">اختر كيف تفضل إتمام طلبك من المنتجات الطازجة</p>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-4">
            {/* Login Button */}
            <button
              onClick={onLogin}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 group"
            >
              <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>تسجيل الدخول إلى حسابك</span>
            </button>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-sm text-gray-500 font-medium">أو</span>
              </div>
            </div>

            {/* Guest Checkout Button */}
            <button
              onClick={onContinueAsGuest}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-2xl transition-all border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center gap-3 group"
            >
              <UserCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>المتابعة كضيف</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};