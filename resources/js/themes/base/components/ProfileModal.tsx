import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, User, Mail, Phone, MapPin, Save, Loader2, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface BaseProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
  };
  onSave?: (data: any) => Promise<void>;
  onLogout?: () => void;
  className?: string;
  isLoading?: boolean;
}

export const BaseProfileModal: React.FC<BaseProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  onLogout,
  className,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      onSave(form);
    }
  };

  const inputClass = "w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

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

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-gray-400" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t('My Profile')}</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <User className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('Full Name')}
              className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
              required
            />
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail className="h-5 w-5" />
            </div>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t('Email')}
              className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
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
              placeholder={t('Phone')}
              className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
            />
          </div>

          <Button
            type="submit"
            className="w-full py-3"
            disabled={isLoading}
            style={{ backgroundColor: 'var(--theme-color)' }}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('Save Changes')}
              </>
            )}
          </Button>
        </form>

        {onLogout && (
          <Button variant="outline" className="w-full mt-3" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {t('Logout')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default BaseProfileModal;
