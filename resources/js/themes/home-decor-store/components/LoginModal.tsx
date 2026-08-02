import React from 'react';
import { AuthFormProvider, useAuthForm } from '../../../contexts/AuthFormContext';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (customer?: any) => void;
  storeSlug?: string;
}

const LoginModalContent: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess, storeSlug }) => {
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-amber-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-amber-100 bg-amber-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-amber-900">استعادة كلمة المرور</h2>
              </div>
              <button onClick={onClose} className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-2">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني" 
                    required 
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white ${
                      errors.email ? 'border-red-500' : 'border-amber-200'
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isLoading 
                      ? 'bg-amber-300 cursor-not-allowed' 
                      : 'bg-amber-600 hover:bg-amber-700'
                  } text-white`}
                >
                  {isLoading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                </button>
                <p className="text-center text-sm text-amber-700">
                  تذكرت كلمة المرور؟ 
                  <button 
                    onClick={() => setShowForgot(false)}
                    type="button" 
                    className="text-amber-600 hover:text-amber-800 font-medium mr-1"
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-amber-100" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-amber-100 bg-amber-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-amber-900">{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2>
            </div>
            <button onClick={onClose} className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-amber-800 mb-2">الاسم الأول</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="أدخل اسمك الأول" 
                      required 
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white ${
                        errors.first_name ? 'border-red-500' : 'border-amber-200'
                      }`}
                    />
                    {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-amber-800 mb-2">اسم العائلة</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="أدخل اسم عائلتك" 
                      required 
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white ${
                        errors.last_name ? 'border-red-500' : 'border-amber-200'
                      }`}
                    />
                    {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-2">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني" 
                  required 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white ${
                    errors.email ? 'border-red-500' : 'border-amber-200'
                  }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-2">رقم الهاتف</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 1234567890" 
                    required 
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white" 
                  />
                  <p className="text-xs text-amber-600 mt-1">يرجى استخدام رمز الدولة (مثال: 970+)</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-2">كلمة المرور</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور" 
                  required 
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white ${
                    errors.password ? 'border-red-500' : 'border-amber-200'
                  }`}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-amber-800 mb-2">تأكيد كلمة المرور</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أكد كلمة المرور" 
                    required 
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white ${
                      errors.password_confirmation ? 'border-red-500' : 'border-amber-200'
                    }`}
                  />
                  {errors.password_confirmation && <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>}
                </div>
              )}
              {isLogin && (
                <button 
                  onClick={() => setShowForgot(true)}
                  type="button" 
                  className="text-amber-600 hover:text-amber-800 text-sm"
                >
                  نسيت كلمة المرور؟
                </button>
              )}
              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  isLoading 
                    ? 'bg-amber-300 cursor-not-allowed' 
                    : 'bg-amber-600 hover:bg-amber-700'
                } text-white`}
              >
                {isLoading ? 'الرجاء الانتظار...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}
              </button>
              <p className="text-center text-sm text-amber-700">
                {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  type="button" 
                  className="text-amber-600 hover:text-amber-800 font-medium mr-1"
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
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <AuthFormProvider>
      <LoginModalContent {...props} />
    </AuthFormProvider>
  );
};