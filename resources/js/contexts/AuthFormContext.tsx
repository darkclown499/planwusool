import React, { createContext, useContext, useState, ReactNode } from 'react';
import { router, usePage } from '@inertiajs/react';
import { generateStoreUrl } from '@/utils/store-url-helper';

interface AuthFormContextType {
  // Login/Register state
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  confirmPassword: string;
  isLogin: boolean;
  showForgot: boolean;
  isLoading: boolean;
  errors: any;
  
  // Profile state
  profile: any;
  activeTab: 'profile' | 'password';
  passwords: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  
  // Actions
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setFirstName: (name: string) => void;
  setLastName: (name: string) => void;
  setPhone: (phone: string) => void;
  setConfirmPassword: (password: string) => void;
  setIsLogin: (isLogin: boolean) => void;
  setShowForgot: (show: boolean) => void;
  setProfile: (profile: any) => void;
  setActiveTab: (tab: 'profile' | 'password') => void;
  setPasswords: (passwords: any) => void;
  
  // Form handlers
  handleLogin: (storeSlug: string, onSuccess: () => void) => void;
  handleRegister: (storeSlug: string, onSuccess: () => void) => void;
  handleForgotPassword: (storeSlug: string) => void;
  handleProfileUpdate: (storeSlug: string, onSuccess: (profile: any) => void) => void;
  handlePasswordUpdate: (storeSlug: string, onSuccess: () => void) => void;
  handleResetPassword: (storeSlug: string, token: string, onSuccess: () => void, onError: (errors: any) => void) => void;
}

const AuthFormContext = createContext<AuthFormContextType | undefined>(undefined);

interface AuthFormProviderProps {
  children: ReactNode;
  initialProfile?: any;
}

export const AuthFormProvider: React.FC<AuthFormProviderProps> = ({ 
  children, 
  initialProfile 
}) => {
  const { store } = usePage<any>().props;

  // Login/Register state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  
  // Profile state
  const [profile, setProfile] = useState(initialProfile || {});
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleLogin = (storeSlug: string, onSuccess: () => void) => {
    setIsLoading(true);
    setErrors({});

    router.post(generateStoreUrl('store.login', store), {
      email,
      password,
      remember: false
    }, {
      onSuccess: () => {
        // Force page reload to get updated auth data
        router.reload({
          only: ['isLoggedIn', 'customer', 'customer_address']
        });
        onSuccess();
      },
      onError: (errors) => {
        setErrors(errors);
        setIsLoading(false);
      },
      onFinish: () => {
        setIsLoading(false);
      }
    });
  };

  const handleRegister = (storeSlug: string, onSuccess: () => void) => {
    setIsLoading(true);
    setErrors({});

    router.post(generateStoreUrl('store.register', store), {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      password,
      password_confirmation: confirmPassword
    }, {
      onSuccess: () => {
        // Force page reload to get updated auth data
        router.reload({
          only: ['isLoggedIn', 'customer', 'customer_address']
        });
        onSuccess();
      },
      onError: (errors) => {
        setErrors(errors);
        setIsLoading(false);
      },
      onFinish: () => {
        setIsLoading(false);
      }
    });
  };

  const handleForgotPassword = (storeSlug: string) => {
    setIsLoading(true);
    setErrors({});

    router.post(generateStoreUrl('store.forgot-password', store), {
      email
    }, {
      onSuccess: () => {
        setShowForgot(false);
        setIsLoading(false);
      },
      onError: (errors) => {
        setErrors(errors);
        setIsLoading(false);
      },
      onFinish: () => {
        setIsLoading(false);
      },
      preserveState: true,
      preserveScroll: true
    });
  };

  const handleProfileUpdate = (storeSlug: string, onSuccess: (profile: any) => void) => {
    setIsLoading(true);
    setErrors({});

    router.post(generateStoreUrl('store.profile.update', store), {
      first_name: profile.firstName,
      last_name: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      postal_code: profile.postalCode,
      country: profile.country
    }, {
      onSuccess: () => {
        const updatedProfile = {
          first_name: profile.firstName,
          last_name: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          postalCode: profile.postalCode
        };
        onSuccess(updatedProfile);
      },
      onError: (errors) => {
        setErrors(errors);
        setIsLoading(false);
      },
      onFinish: () => {
        setIsLoading(false);
      }
    });
  };

  const handlePasswordUpdate = (storeSlug: string, onSuccess: () => void) => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      setErrors({ password_confirmation: ['New passwords do not match'] });
      return;
    }
    
    setIsLoading(true);
    setErrors({});

    router.post(generateStoreUrl('store.profile.password', store), {
      current_password: passwords.currentPassword,
      password: passwords.newPassword,
      password_confirmation: passwords.confirmPassword
    }, {
      onSuccess: () => {
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        onSuccess();
      },
      onError: (errors) => {
        setErrors(errors);
        setIsLoading(false);
      },
      onFinish: () => {
        setIsLoading(false);
      }
    });
  };

  const handleResetPassword = (storeSlug: string, token: string, onSuccess: () => void, onError: (errors: any) => void) => {
    router.post(generateStoreUrl('store.reset-password.update', store), {
      token,
      email,
      password,
      password_confirmation: confirmPassword
    }, {
      onSuccess,
      onError
    });
  };

  const value: AuthFormContextType = {
    email,
    password,
    firstName,
    lastName,
    phone,
    confirmPassword,
    isLogin,
    showForgot,
    isLoading,
    errors,
    profile,
    activeTab,
    passwords,
    setEmail,
    setPassword,
    setFirstName,
    setLastName,
    setPhone,
    setConfirmPassword,
    setIsLogin,
    setShowForgot,
    setProfile,
    setActiveTab,
    setPasswords,
    handleLogin,
    handleRegister,
    handleForgotPassword,
    handleProfileUpdate,
    handlePasswordUpdate,
    handleResetPassword
  };

  return (
    <AuthFormContext.Provider value={value}>
      {children}
    </AuthFormContext.Provider>
  );
};

export const useAuthForm = () => {
  const context = useContext(AuthFormContext);
  if (context === undefined) {
    throw new Error('useAuthForm must be used within an AuthFormProvider');
  }
  return context;
};