import React from 'react';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { AuthFormProvider, useAuthForm } from '../../../contexts/AuthFormContext';

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
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-900">إعادة تعيين كلمة المرور</h2>
            <button 
              onClick={() => router.visit(route('store.home', { storeSlug }))} 
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل بريدك الإلكتروني"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الجديدة</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل كلمة المرور الجديدة"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تأكيد كلمة المرور</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="أكد كلمة المرور الجديدة"
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full py-2 px-4 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 cursor-pointer text-white"
              >
                إعادة تعيين كلمة المرور
              </button>
              
              <p className="text-center text-sm text-gray-600">
                تذكرت كلمة المرور؟ 
                <button 
                  onClick={onClose}
                  type="button" 
                  className="text-blue-600 hover:text-blue-700 font-medium mr-1 cursor-pointer"
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