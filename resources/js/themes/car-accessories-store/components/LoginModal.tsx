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
      <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose}>
        <div className="flex items-center justify-center h-full p-4">
          <div 
            className="bg-slate-800 w-full max-w-md overflow-hidden shadow-2xl border-2 border-red-600 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-red-600 bg-black">
              <h2 className="text-xl font-bold text-white">استعادة كلمة المرور</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-red-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-600 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <p className="text-slate-300 font-medium">أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-white mb-2">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="أدخل بريدك الإلكتروني" 
                      required 
                      className={`w-full pr-10 pl-4 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                        errors.email ? 'border-red-500' : 'border-slate-600'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-red-400 text-sm mt-1 font-medium">{errors.email}</p>}
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`w-full py-3 px-4 font-bold transition-colors ${
                    isLoading 
                      ? 'bg-slate-600 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white border-2 border-red-600`}
                >
                  {isLoading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                </button>

                <button 
                  onClick={() => setShowForgot(false)}
                  type="button" 
                  className="w-full text-center text-red-400 hover:text-red-300 font-bold py-2"
                >
                  → العودة لتسجيل الدخول
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose}>
      <div className="flex items-center justify-center h-full p-4">
        <div 
          className="bg-slate-900 w-full max-w-md overflow-hidden shadow-2xl border-2 border-red-600 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b-2 border-red-600 bg-black">
            <h2 className="text-xl font-bold text-white">{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400 hover:text-red-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-600 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <p className="text-slate-300 font-medium">
                {isLogin ? 'تسجيل الدخول إلى حسابك' : 'انضم إلى مجتمع السيارات'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">الاسم الأول</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="أدخل اسمك الأول" 
                      required 
                      className={`w-full px-3 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                        errors.first_name ? 'border-red-500' : 'border-slate-600'
                      }`}
                    />
                    {errors.first_name && <p className="text-red-400 text-xs mt-1 font-medium">{errors.first_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">اسم العائلة</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="أدخل اسم عائلتك" 
                      required 
                      className={`w-full px-3 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                        errors.last_name ? 'border-red-500' : 'border-slate-600'
                      }`}
                    />
                    {errors.last_name && <p className="text-red-400 text-xs mt-1 font-medium">{errors.last_name}</p>}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-white mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني" 
                    required 
                    className={`w-full pr-10 pl-4 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      errors.email ? 'border-red-500' : 'border-slate-600'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-red-400 text-sm mt-1 font-medium">{errors.email}</p>}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-bold text-white mb-2">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 1234567890" 
                      required 
                      className="w-full pr-10 pl-4 py-3 bg-slate-800 border-2 border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500" 
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">قم بتضمين رمز الدولة</p>
                </div>
              )}

              <div>
                  <label className="block text-sm font-bold text-white mb-2">كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور" 
                    required 
                    className={`w-full pl-10 pr-12 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      errors.password ? 'border-red-500' : 'border-slate-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-red-400"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-sm mt-1 font-medium">{errors.password}</p>}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-bold text-white mb-2">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أكد كلمة المرور" 
                      required 
                      className={`w-full pr-10 pl-12 py-3 bg-slate-800 border-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                        errors.password_confirmation ? 'border-red-500' : 'border-slate-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-red-400"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password_confirmation && <p className="text-red-400 text-sm mt-1 font-medium">{errors.password_confirmation}</p>}
                </div>
              )}

              {isLogin && (
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowForgot(true)}
                    type="button" 
                    className="text-red-400 hover:text-red-300 text-sm font-bold"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-3 px-4 font-bold transition-colors ${
                  isLoading 
                    ? 'bg-slate-600 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white border-2 border-red-600`}
              >
                {isLoading ? 'الرجاء الانتظار...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}
              </button>

              <div className="text-center">
                <span className="text-slate-400 text-sm font-medium">
                  {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
                </span>
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  type="button" 
                  className="text-red-400 hover:text-red-300 font-bold mr-2 text-sm"
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