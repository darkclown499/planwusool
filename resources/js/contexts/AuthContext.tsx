import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { router, usePage } from '@inertiajs/react';
import { generateStoreUrl } from '@/utils/store-url-helper';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface CustomerAddress {
  id: string;
  type: 'billing' | 'shipping';
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  is_default: boolean;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  customer: Customer | null;
  customerAddress: CustomerAddress[];
  userProfile: UserProfile;
  showLoginModal: boolean;
  showProfileModal: boolean;
  showOrdersModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  setShowProfileModal: (show: boolean) => void;
  setShowOrdersModal: (show: boolean) => void;
  updateUserProfile: (profile: UserProfile) => void;
  logout: (storeSlug?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  isLoggedIn?: boolean;
  customer?: Customer | null;
  customerAddress?: CustomerAddress[];
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children, 
  isLoggedIn = false, 
  customer = null, 
  customerAddress = [] 
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);

  const billingAddress = customerAddress?.find(addr => addr.type === 'billing' && addr.is_default) || 
                        customerAddress?.find(addr => addr.type === 'billing');
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: billingAddress?.address || '',
    city: billingAddress?.city || '',
    state: billingAddress?.state || '',
    country: billingAddress?.country || '',
    postalCode: billingAddress?.postal_code || ''
  });

  // Update userProfile when customer or customerAddress props change
  useEffect(() => {
    const updatedBillingAddress = customerAddress?.find(addr => addr.type === 'billing' && addr.is_default) || 
                                 customerAddress?.find(addr => addr.type === 'billing');

    setUserProfile({
      first_name: customer?.first_name || '',
      last_name: customer?.last_name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: updatedBillingAddress?.address || '',
      city: updatedBillingAddress?.city || '',
      state: updatedBillingAddress?.state || '',
      country: updatedBillingAddress?.country || '',
      postalCode: updatedBillingAddress?.postal_code || ''
    });
  }, [customer, customerAddress]);

  const updateUserProfile = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  const { store } = usePage<any>().props;

  const logout = () => {
    router.post(generateStoreUrl('store.logout', store), {}, {
      onSuccess: () => {
        const isCustomDomain = store?.enable_custom_domain || store?.enable_custom_subdomain;
        if (isCustomDomain) {
          const protocol = window.location.protocol;
          const host = window.location.hostname;
          window.location.href = `${protocol}//${host}`;
        } else {
          // Refresh the page to get new CSRF token for default domains
          window.location.reload();
        }
      }
    });
  };

  const value: AuthContextType = {
    isLoggedIn,
    customer,
    customerAddress,
    userProfile,
    showLoginModal,
    showProfileModal,
    showOrdersModal,
    setShowLoginModal,
    setShowProfileModal,
    setShowOrdersModal,
    updateUserProfile,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};