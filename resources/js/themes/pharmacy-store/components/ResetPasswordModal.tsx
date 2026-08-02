import React from 'react';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { AuthFormProvider, useAuthForm } from '../../../contexts/AuthFormContext';
import { Lock, Mail, Eye, EyeOff, X } from 'lucide-react';

interface ResetPasswordModalProps {
  resetToken: string;
  storeSlug: string;
  onClose: () => void;
}

const ResetPasswordModalContent: React.FC<ResetPasswordModalProps> = ({
  resetToken,
  storeSlug,
  onClose
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  
  const {
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    handleResetPassword
  } = useAuthForm();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    handleResetPassword(
      storeSlug,
      resetToken,
      () => {
        toast.success('تمت إعادة تعيين كلمة المرور بنجاح!');
        router.visit(route('store.home', { storeSlug }));
      },
      (errors) => {
        if (errors.token) {
          toast.error('انتهت صلاحية رابط إعادة التعيين أو أنه غير صالح. يرجى طلب رابط جديد.');
          onClose();
        } else if (errors.email) {
          toast.error(errors.email);
        } else if (errors.password) {
          toast.error(errors.password);
        } else {
          toast.error('فشل إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => router.visit(route('store.home', { storeSlug }))}>
      <div className="flex items-center justify-center h-full p-4">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-emerald-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">إعادة تعيين كلمة المرور</h2>
                <p className="text-sm text-gray-600">أنشئ كلمة مرور جديدة</p>
              </div>
            </div>
            <button 
              onClick={() => router.visit(route('store.home', { storeSlug }))}
              className="p-2 hover:bg-emerald-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="أدخل بريدك الإلكتروني"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pr-10 pl-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="أدخل كلمة المرور الجديدة"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pr-10 pl-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="أكد كلمة المرور الجديدة"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                إعادة تعيين كلمة المرور
              </button>
              
              <p className="text-center text-sm text-gray-600">
                تذكرت كلمة المرور؟ 
                <button 
                  onClick={onClose}
                  type="button" 
                  className="text-emerald-600 hover:text-emerald-700 font-medium mr-1"
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
};

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = (props) => {
  return (
    <AuthFormProvider>
      <ResetPasswordModalContent {...props} />
    </AuthFormProvider>
  );
};