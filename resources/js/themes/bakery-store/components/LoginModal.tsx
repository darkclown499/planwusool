import React, { useEffect } from 'react';
import { AuthFormProvider, useAuthForm } from '../../../contexts/AuthFormContext';
import { User, Lock, X } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (customer?: any) => void;
  storeSlug?: string;
}

const LoginModalContent: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess, storeSlug }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  const {
    email, setEmail,
    password, setPassword,
    firstName, setFirstName,
    lastName, setLastName,
    phone, setPhone,
    confirmPassword, setConfirmPassword,
    isLogin, setIsLogin,
    showForgot, setShowForgot,
    isLoading,
    errors,
    handleLogin,
    handleRegister,
    handleForgotPassword
  } = useAuthForm();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (showForgot) {
      handleForgotPassword(storeSlug!);
    } else if (isLogin) {
      handleLogin(storeSlug!, () => {
        onLoginSuccess();
        onClose();
      });
    } else {
      handleRegister(storeSlug!, () => {
        onLoginSuccess();
        onClose();
      });
    }
  };

  if (showForgot) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-stone-200" onClick={(e) => e.stopPropagation()}>
            <div className="relative bg-stone-700 p-4 sm:p-5 flex-shrink-0">
              <button 
                onClick={onClose}
                className="absolute top-3 left-3 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center text-white">
                <div className="w-12 h-12 bg-stone-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold mb-1">استعادة كلمة المرور</h2>
                <p className="text-stone-200 text-xs sm:text-sm">أعد تعيين كلمة مرور حسابك</p>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني" 
                    required 
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 transition-colors ${
                      errors.email ? 'border-red-500' : 'border-stone-300'
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    isLoading 
                      ? 'bg-stone-400 cursor-not-allowed' 
                      : 'bg-stone-700 hover:bg-stone-800 cursor-pointer'
                  } text-white`}
                >
                  {isLoading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                </button>
                <p className="text-center text-sm text-stone-600">
                  تذكرت كلمة المرور؟ 
                  <button 
                    onClick={() => setShowForgot(false)}
                    type="button" 
                    className="text-stone-700 hover:text-stone-900 font-medium ml-1 transition-colors cursor-pointer"
                  >
                    تسجيل الدخول
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-stone-200" onClick={(e) => e.stopPropagation()}>
          <div className="relative bg-stone-700 p-4 sm:p-5 flex-shrink-0">
            <button 
              onClick={onClose}
              className="absolute top-3 left-3 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center text-white">
              <div className="w-12 h-12 bg-stone-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold mb-1">{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2>
              <p className="text-stone-200 text-xs sm:text-sm">{isLogin ? 'مرحباً بعودتك إلى متجرنا' : 'أنشئ حسابك'}</p>
            </div>
          </div>
          <div className="p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">الاسم الأول</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="أدخل اسمك الأول" 
                      required 
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 transition-colors ${
                        errors.first_name ? 'border-red-500' : 'border-stone-300'
                      }`}
                    />
                    {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">اسم العائلة</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="أدخل اسم عائلتك" 
                      required 
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 transition-colors ${
                        errors.last_name ? 'border-red-500' : 'border-stone-300'
                      }`}
                    />
                    {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني" 
                  required 
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 transition-colors ${
                    errors.email ? 'border-red-500' : 'border-stone-300'
                  }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">رقم الهاتف</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+970 59 1234567" 
                    required 
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 transition-colors" 
                  />
                  <p className="text-xs text-stone-500 mt-1">يرجى استخدام رمز الدولة (مثال: 970+)</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">كلمة المرور</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور" 
                  required 
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 transition-colors ${
                    errors.password ? 'border-red-500' : 'border-stone-300'
                  }`}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">تأكيد كلمة المرور</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أكد كلمة المرور" 
                    required 
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 transition-colors ${
                      errors.password_confirmation ? 'border-red-500' : 'border-stone-300'
                    }`}
                  />
                  {errors.password_confirmation && <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>}
                </div>
              )}
              {isLogin && (
                <button 
                  onClick={() => setShowForgot(true)}
                  type="button" 
                  className="text-stone-700 hover:text-stone-900 text-sm transition-colors cursor-pointer"
                >
                  نسيت كلمة المرور؟
                </button>
              )}
              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isLoading 
                    ? 'bg-stone-400 cursor-not-allowed' 
                    : 'bg-stone-700 hover:bg-stone-800 cursor-pointer'
                } text-white`}
              >
                {isLoading ? 'الرجاء الانتظار...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}
              </button>
              <p className="text-center text-sm text-stone-600">
                {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  type="button" 
                  className="text-stone-700 hover:text-stone-900 font-medium ml-1 transition-colors cursor-pointer"
                >
                  {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LoginModal: React.FC<LoginModalProps> = (props) => {
  return (
    <AuthFormProvider>
      <LoginModalContent {...props} />
    </AuthFormProvider>
  );
};