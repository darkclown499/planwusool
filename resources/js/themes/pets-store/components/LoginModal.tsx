import React from 'react';
import { X, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { AuthFormProvider, useAuthForm } from '../../../contexts/AuthFormContext';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: (customer?: any) => void;
  storeSlug?: string;
}

const LoginModalContent: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess, storeSlug }) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

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

  // Prevent background scrolling
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
        <div className="flex items-end md:items-center justify-center h-full p-0 md:p-4">
          <div 
            className="bg-white w-full h-[70vh] md:h-auto md:max-h-[90vh] md:max-w-md md:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b bg-orange-50">
              <h2 className="text-xl font-bold text-gray-900">استعادة كلمة المرور</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-orange-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-gray-600">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="أدخل بريدك الإلكتروني" 
                      required 
                      className={`w-full pr-10 pl-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors ${
                    isLoading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-orange-600 hover:bg-orange-700'
                  } text-white`}
                >
                  {isLoading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                </button>

                <button 
                  onClick={() => setShowForgot(false)}
                  type="button" 
                  className="w-full text-center text-orange-600 hover:text-orange-700 font-medium py-2"
                >
                  → العودة إلى تسجيل الدخول
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div className="flex items-end md:items-center justify-center h-full p-0 md:p-4">
        <div 
          className="bg-white w-full h-[90vh] md:h-auto md:max-h-[90vh] md:max-w-md md:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b bg-orange-50">
            <h2 className="text-xl font-bold text-gray-900">{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-orange-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-gray-600">
                {isLogin ? 'سجّل الدخول إلى حسابك للمتابعة' : 'انضم إلينا لبدء تجربة تسوق ممتعة'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الأول</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="أدخل اسمك الأول" 
                      required 
                      className={`w-full px-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors.first_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">اسم العائلة</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="أدخل اسم عائلتك" 
                      required 
                      className={`w-full px-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors.last_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني" 
                    required 
                    className={`w-full pr-10 pl-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+970 59 1234567" 
                      required 
                      className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" 
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">يرجى استخدام رمز الدولة (مثال: 970+)</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور" 
                    required 
                    className={`w-full pr-10 pl-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أكد كلمة المرور" 
                      required 
                      className={`w-full pr-10 pl-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors.password_confirmation ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password_confirmation && <p className="text-red-500 text-sm mt-1">{errors.password_confirmation}</p>}
                </div>
              )}

              {isLogin && (
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowForgot(true)}
                    type="button" 
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-orange-600 hover:bg-orange-700'
                } text-white`}
              >
                {isLoading ? 'الرجاء الانتظار...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}
              </button>

              <div className="text-center">
                <span className="text-gray-600 text-sm">
                  {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
                </span>
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  type="button" 
                  className="text-orange-600 hover:text-orange-700 font-semibold mr-2 text-sm"
                >
                  {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
                </button>
              </div>
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