import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Mail, Lock, User, Phone, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface BaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'login' | 'register';
  onModeChange?: (mode: 'login' | 'register') => void;
  onLogin?: (data: { email: string; password: string }) => Promise<void>;
  onRegister?: (data: any) => Promise<void>;
  socialLogin?: boolean;
  className?: string;
  isLoading?: boolean;
}

export const BaseAuthModal: React.FC<BaseAuthModalProps> = ({
  isOpen,
  onClose,
  mode = 'login',
  onModeChange,
  onLogin,
  onRegister,
  socialLogin = false,
  className,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [localMode, setLocalMode] = useState<'login' | 'register'>(mode);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  if (!isOpen) return null;

  const activeMode = onModeChange ? mode : localMode;

  const switchMode = (newMode: 'login' | 'register') => {
    if (onModeChange) {
      onModeChange(newMode);
    } else {
      setLocalMode(newMode);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeMode === 'login' && onLogin) {
      onLogin({ email: form.email, password: form.password });
    } else if (activeMode === 'register' && onRegister) {
      onRegister(form);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  const renderFieldIcon = (icon: React.ReactNode, field: 'name' | 'email' | 'phone' | 'password') => (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </div>
      {field === 'password' && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label={showPassword ? t('Hide password') : t('Show password')}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className={cn(
        'relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8',
        className
      )}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={t('Close')}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: 'var(--theme-color)' }}
          >
            W
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {activeMode === 'login' ? t('Welcome Back') : t('Create Account')}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {activeMode === 'login'
              ? t('Login to access your account')
              : t('Join us and start shopping')}
          </p>
        </div>

        {/* Social login */}
        {socialLogin && (
          <div className="space-y-3 mb-6">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('Sign in with Google')}
            </button>
          </div>
        )}

        {socialLogin && (
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400">{t('or')}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeMode === 'register' && (
            <>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('Full Name')}
                  className={inputClass}
                  required
                />
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={t('Phone Number')}
                  className={inputClass}
                  required
                />
              </div>
            </>
          )}

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail className="h-5 w-5" />
            </div>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t('Email Address')}
              className={inputClass}
              required
            />
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="h-5 w-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t('Password')}
              className={inputClass}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? t('Hide password') : t('Show password')}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {activeMode === 'register' && (
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="h-5 w-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder={t('Confirm Password')}
                className={inputClass}
                required
              />
            </div>
          )}

          {activeMode === 'login' && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                className="text-sm font-medium hover:underline"
                style={{ color: 'var(--theme-color)' }}
              >
                {t('Forgot Password?')}
              </button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full py-3"
            size="lg"
            disabled={isLoading}
            style={{ backgroundColor: 'var(--theme-color)' }}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              activeMode === 'login' ? t('Login') : t('Create Account')
            )}
          </Button>
        </form>

        {/* Toggle mode */}
        <p className="text-sm text-gray-500 text-center mt-6">
          {activeMode === 'login'
            ? t('Don\'t have an account?')
            : t('Already have an account?')}{' '}
          <button
            onClick={() => switchMode(activeMode === 'login' ? 'register' : 'login')}
            className="font-medium hover:underline"
            style={{ color: 'var(--theme-color)' }}
          >
            {activeMode === 'login' ? t('Register') : t('Login')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default BaseAuthModal;
