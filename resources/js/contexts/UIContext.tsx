import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UIContextType {
  showCart: boolean;
  showCheckout: boolean;
  showAuthModal: boolean;
  showResetPasswordModal: boolean;
  resetToken: string | null;
  setShowCart: (show: boolean) => void;
  setShowCheckout: (show: boolean) => void;
  setShowAuthModal: (show: boolean) => void;
  setShowResetPasswordModal: (show: boolean) => void;
  setResetToken: (token: string | null) => void;
  handleCartClick: () => void;
  handleCloseCart: () => void;
  action: string | null;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

interface UIProviderProps {
  children: ReactNode;
  showResetModal?: boolean;
  resetToken?: string;
  paymentStatus?: string;
  orderNumber?: string;
  action?: string | null;
}

export const UIProvider: React.FC<UIProviderProps> = ({ 
  children, 
  showResetModal = false, 
  resetToken: initialResetToken,
  paymentStatus,
  orderNumber: initialOrderNumber,
  action: initialAction = null
}) => {
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(!!showResetModal);
  const [resetToken, setResetToken] = useState<string | null>(initialResetToken || null);
  const [action, setAction] = useState<string | null>(initialAction);

  // Handle initial payment status and reset modal
  useEffect(() => {
    if (showResetModal && initialResetToken) {
      setShowResetPasswordModal(true);
      setResetToken(initialResetToken);
    }
    
    // Handle payment status from props
    if (paymentStatus === 'success' && initialOrderNumber) {
      // Use setTimeout to ensure state is ready
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('showOrderSuccess', {
            detail: { orderNumber: initialOrderNumber }
          });
          window.dispatchEvent(event);
        }
      }, 100);
    }
  }, [showResetModal, initialResetToken, paymentStatus, initialOrderNumber]);

  const handleCartClick = () => {
    setShowCart(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseCart = () => {
    setShowCart(false);
    document.body.style.overflow = 'unset';
  };

  const value: UIContextType = {
    showCart,
    showCheckout,
    showAuthModal,
    showResetPasswordModal,
    resetToken,
    setShowCart,
    setShowCheckout,
    setShowAuthModal,
    setShowResetPasswordModal,
    setResetToken,
    handleCartClick,
    handleCloseCart,
    action
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};