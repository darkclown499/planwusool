import React, { useEffect } from 'react';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { AuthFormProvider, useAuthForm } from '../../../contexts/AuthFormContext';
import { Lock, X, Mail } from 'lucide-react';

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
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
      <div className="absolute inset-0 bg-purple-900/50"></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border-4 border-purple-200">
          <div className="relative bg-purple-100 p-6 flex-shrink-0 border-b-2 border-purple-200">
            <button 
              onClick={() => router.visit(route('store.home', { storeSlug }))}
              className="absolute top-3 right-3 p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center text-purple-800">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
              <p className="text-purple-600 text-sm font-medium">Create a new password for your account</p>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-purple-700 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl text-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-colors"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-purple-700 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl text-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-colors"
                    placeholder="Enter new password"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-purple-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-5 h-5" />
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl text-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-colors"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                className="w-full py-3 px-4 rounded-xl font-bold transition-all bg-purple-500 hover:bg-purple-600 text-white shadow-md transform hover:scale-105"
              >
                Reset Password
              </button>
              
              <p className="text-center text-sm text-purple-600">
                Remember your password? 
                <button 
                  onClick={onClose}
                  type="button" 
                  className="text-purple-700 hover:text-purple-900 font-bold ml-1 transition-colors"
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
  return (
    <AuthFormProvider>
      <ResetPasswordModalContent {...props} />
    </AuthFormProvider>
  );
};