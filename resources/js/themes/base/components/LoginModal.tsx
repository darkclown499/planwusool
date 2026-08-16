import React from 'react';
import { cn } from '@/lib/utils';
import { BaseAuthModal } from './AuthModal';

interface BaseLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (data: { email: string; password: string }) => Promise<void>;
  onNavigateRegister?: () => void;
  socialLogin?: boolean;
  className?: string;
  isLoading?: boolean;
}

export const BaseLoginModal: React.FC<BaseLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onNavigateRegister,
  socialLogin = false,
  className,
  isLoading,
}) => {
  return (
    <BaseAuthModal
      isOpen={isOpen}
      onClose={onClose}
      mode="login"
      onModeChange={(mode) => {
        if (mode === 'register' && onNavigateRegister) {
          onNavigateRegister();
        }
      }}
      onLogin={onLogin}
      socialLogin={socialLogin}
      className={className}
      isLoading={isLoading}
    />
  );
};

export default BaseLoginModal;
