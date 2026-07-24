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
      <div className="fixed inset-0 z-50 bg-purple-900/50" onClick={onClose}>
        <div className="flex items-center justify-center h-full p-4">
          <div 
            className="bg-white w-full max-w-md overflow-hidden shadow-2xl rounded-2xl border-4 border-purple-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-purple-100 border-b-2 border-purple-200">
              <h2 className="text-xl font-bold text-purple-800">Reset Password</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-purple-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-purple-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <p className="text-purple-700 font-medium">Enter your email to reset password</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-purple-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email" 
                      required 
                      className={`w-full pl-10 pr-4 py-3 bg-purple-50 border-2 rounded-xl text-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                        errors.email ? 'border-red-400' : 'border-purple-200'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-sm mt-1 font-medium">{errors.email}</p>}
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`w-full py-3 px-4 font-bold rounded-xl transition-all ${
                    isLoading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-purple-500 hover:bg-purple-600 transform hover:scale-105'
                  } text-white shadow-md`}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button 
                  onClick={() => setShowForgot(false)}
                  type="button" 
                  className="w-full text-center text-purple-600 hover:text-purple-800 font-bold py-2 transition-colors"
                >
                  ← Back to Login
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-purple-900/50" onClick={onClose}>
      <div className="flex items-center justify-center h-full p-4">
        <div 
          className="bg-white w-full max-w-md overflow-hidden shadow-2xl rounded-2xl border-4 border-purple-200 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-purple-100 border-b-2 border-purple-200">
            <h2 className="text-xl font-bold text-purple-800">{isLogin ? 'Welcome Back!' : 'Join the Fun!'}</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-purple-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-purple-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <p className="text-purple-700 font-medium">
                {isLogin ? 'Login to your account' : 'Create your toy account'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-purple-700 mb-2">First Name</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name" 
                      required 
                      className={`w-full px-3 py-3 bg-purple-50 border-2 rounded-xl text-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                        errors.first_name ? 'border-red-400' : 'border-purple-200'
                      }`}
                    />
                    {errors.first_name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.first_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-purple-700 mb-2">Last Name</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name" 
                      required 
                      className={`w-full px-3 py-3 bg-purple-50 border-2 rounded-xl text-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                        errors.last_name ? 'border-red-400' : 'border-purple-200'
                      }`}
                    />
                    {errors.last_name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.last_name}</p>}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-purple-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email" 
                    required 
                    className={`w-full pl-10 pr-4 py-3 bg-purple-50 border-2 rounded-xl text-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                      errors.email ? 'border-red-400' : 'border-purple-200'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-1 font-medium">{errors.email}</p>}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-bold text-purple-700 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 1234567890" 
                      required 
                      className="w-full pl-10 pr-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl text-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300" 
                    />
                  </div>
                  <p className="text-xs text-purple-500 mt-1 font-medium">Include country code</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-purple-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password" 
                    required 
                    className={`w-full pl-10 pr-12 py-3 bg-purple-50 border-2 rounded-xl text-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                      errors.password ? 'border-red-400' : 'border-purple-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1 font-medium">{errors.password}</p>}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-bold text-purple-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                    <input 
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password" 
                      required 
                      className={`w-full pl-10 pr-12 py-3 bg-purple-50 border-2 rounded-xl text-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                        errors.password_confirmation ? 'border-red-400' : 'border-purple-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password_confirmation && <p className="text-red-500 text-sm mt-1 font-medium">{errors.password_confirmation}</p>}
                </div>
              )}

              {isLogin && (
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowForgot(true)}
                    type="button" 
                    className="text-purple-600 hover:text-purple-800 text-sm font-bold transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className={`w-full py-3 px-4 font-bold rounded-xl transition-all ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-purple-500 hover:bg-purple-600 transform hover:scale-105'
                } text-white shadow-md`}
              >
                {isLoading ? 'Please Wait...' : (isLogin ? 'Login' : 'Create Account')}
              </button>

              <div className="text-center">
                <span className="text-purple-600 text-sm font-medium">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                </span>
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  type="button" 
                  className="text-purple-700 hover:text-purple-900 font-bold ml-2 text-sm transition-colors"
                >
                  {isLogin ? 'Sign Up' : 'Login'}
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