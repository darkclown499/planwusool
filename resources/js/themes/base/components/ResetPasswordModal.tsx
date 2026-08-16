import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Lock, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface BaseResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: { password: string; confirmPassword: string }) => Promise<void>;
  className?: string;
  isLoading?: boolean;
}

export const BaseResetPasswordModal: React.FC<BaseResetPasswordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  className,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return;
    }
    if (onSubmit) {
      onSubmit(form);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className={cn('relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8', className)}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={t('Close')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-white"
            style={{ backgroundColor: 'var(--theme-color)' }}
          >
            <KeyRound className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('Reset Password')}</h2>
          <p className="text-sm text-gray-500 mt-2">{t('Enter your new password below')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="h-5 w-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t('New Password')}
              className={inputClass}
              minLength={8}
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
              minLength={8}
              required
            />
          </div>

          {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
            <p className="text-sm text-red-500">{t('Passwords do not match')}</p>
          )}

          <Button
            type="submit"
            className="w-full py-3"
            disabled={isLoading || form.password !== form.confirmPassword || !form.password}
            style={{ backgroundColor: 'var(--theme-color)' }}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <KeyRound className="h-4 w-4 mr-2" />
            )}
            {t('Reset Password')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BaseResetPasswordModal;
