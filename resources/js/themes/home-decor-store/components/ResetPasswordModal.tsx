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
        toast.success('Password has been reset successfully!');
        router.visit(route('store.home', { storeSlug }));
      },
      (errors) => {
        if (errors.token) {
          toast.error('Reset link has expired or is invalid. Please request a new one.');
          onClose();
        } else if (errors.email) {
          toast.error(errors.email);
        } else if (errors.password) {
          toast.error(errors.password);
        } else {
          toast.error('Failed to reset password. Please try again.');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-amber-100">
          <div className="flex items-center justify-between p-6 border-b border-amber-100 bg-amber-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-amber-900">Reset Password</h2>
            </div>
            <button 
              onClick={() => router.visit(route('store.home', { storeSlug }))} 
              className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-2">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-2">New Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-2">Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Confirm new password"
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full py-3 px-4 rounded-lg font-semibold transition-colors bg-amber-600 hover:bg-amber-700 text-white"
              >
                Reset Password
              </button>
              
              <p className="text-center text-sm text-amber-700">
                Remember your password? 
                <button 
                  onClick={onClose}
                  type="button" 
                  className="text-amber-600 hover:text-amber-800 font-medium ml-1"
                >
                  Login
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
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <AuthFormProvider>
      <ResetPasswordModalContent {...props} />
    </AuthFormProvider>
  );
};