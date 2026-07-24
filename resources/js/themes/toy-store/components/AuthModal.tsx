import React from 'react';
import { X, User, UserCheck, ShoppingBag } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-purple-900/50" onClick={onClose}>
      <div className="flex items-center justify-center h-full p-4">
        <div 
          className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border-4 border-purple-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 text-center bg-purple-100">
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-purple-800 mb-2">Ready to Shop?</h2>
            <p className="text-purple-600 text-sm">Choose how you'd like to get your toys!</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Login Button */}
            <button
              onClick={onLogin}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 group transform hover:scale-105"
            >
              <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Login to Account</span>
            </button>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-purple-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-sm text-purple-600 font-bold">or</span>
              </div>
            </div>

            {/* Guest Checkout Button */}
            <button
              onClick={onContinueAsGuest}
              className="w-full bg-green-400 hover:bg-green-500 text-white font-bold py-4 px-6 rounded-xl transition-all border-2 border-green-300 hover:border-green-400 flex items-center justify-center gap-3 group transform hover:scale-105"
            >
              <UserCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Shop as Guest</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};