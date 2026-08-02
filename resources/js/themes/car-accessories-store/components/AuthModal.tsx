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
    <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose}>
      <div className="flex items-center justify-center h-full p-2 sm:p-4">
        <div 
          className="bg-slate-800 w-full max-w-sm sm:max-w-md overflow-hidden shadow-2xl border-2 border-red-600"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-4 sm:p-8 text-center bg-black border-b-2 border-red-600">
            <button 
              onClick={onClose}
              className="absolute top-2 left-2 sm:top-4 sm:left-4 p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-600 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            
            <h2 className="text-lg sm:text-2xl font-bold text-white mb-2">مستعد لإتمام الطلب؟</h2>
            <p className="text-sm sm:text-base text-slate-300 font-medium">اختر كيف تريد المتابعة مع طلبك</p>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
            {/* Login Button */}
            <button
              onClick={onLogin}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 transition-all border-2 border-red-600 hover:border-red-500 flex items-center justify-center gap-2 sm:gap-3 group text-sm sm:text-base"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              <span>تسجيل الدخول إلى حسابك</span>
            </button>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-slate-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-slate-800 text-slate-400 font-bold">أو</span>
              </div>
            </div>

            {/* Guest Checkout Button */}
            <button
              onClick={onContinueAsGuest}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 transition-all border-2 border-slate-600 hover:border-slate-500 flex items-center justify-center gap-2 sm:gap-3 group text-sm sm:text-base"
            >
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              <span>المتابعة كضيف</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};