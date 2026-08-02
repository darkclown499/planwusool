import React, { useEffect } from 'react';
import { User, ShoppingBag, X } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onLogin: () => void;
  onContinueAsGuest: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin, onContinueAsGuest }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-stone-200" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="relative bg-stone-700 p-4 sm:p-5 flex-shrink-0">
            <button 
              onClick={onClose}
              className="absolute top-3 left-3 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center text-white">
              <div className="w-12 h-12 bg-stone-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold mb-1">مستعد لإتمام الطلب؟</h2>
              <p className="text-stone-200 text-xs sm:text-sm">اختر كيف تريد المتابعة مع طلبك</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            <button
              onClick={onLogin}
              className="w-full bg-stone-700 hover:bg-stone-800 text-white font-bold py-4 px-6 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <User className="w-5 h-5" />
              <span className="font-serif text-lg">تسجيل الدخول إلى حسابك</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-stone-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-stone-500 font-medium">أو</span>
              </div>
            </div>

            <button
              onClick={onContinueAsGuest}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-4 px-6 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-3 border-2 border-stone-300 hover:border-stone-400"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="font-serif text-lg">المتابعة كضيف</span>
            </button>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gradient-to-r from-stone-50 to-stone-100 text-center border-t-2 border-stone-200">
            <p className="text-xs text-stone-500">
              بالمتابعة، فإنك توافق على شروط الخدمة وسياسة الخصوصية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};