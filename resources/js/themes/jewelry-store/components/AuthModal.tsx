import React from 'react';

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
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-yellow-200" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="p-6 text-center border-b border-yellow-100 bg-yellow-50 relative">
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors"
              aria-label="إغلاق النافذة"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-yellow-200">
              <svg className="w-8 h-8 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-serif font-bold text-yellow-900 mb-2">مستعد لإتمام الطلب؟</h2>
            <p className="text-yellow-700 text-sm">اختر كيف تريد المتابعة مع طلبك</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <button
              onClick={onLogin}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              تسجيل الدخول إلى حسابك
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-yellow-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-yellow-600 font-medium">أو</span>
              </div>
            </div>

            <button
              onClick={onContinueAsGuest}
              className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-semibold py-4 px-6 rounded-xl transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              المتابعة كضيف
            </button>
          </div>

          {/* Footer */}
          <div className="p-4 bg-yellow-50 text-center border-t border-yellow-100">
            <p className="text-xs text-yellow-600">
              بالمتابعة، فإنك توافق على شروط الخدمة وسياسة الخصوصية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};