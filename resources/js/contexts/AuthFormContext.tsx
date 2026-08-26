import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
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
  // OTP verification
  otpStep: 'form' | 'otp';
  otpEmail: string | null;
  otpCode: string;
  otpError: string | null;
  resendIn: number;
  setOtpCode: (code: string) => void;
  setOtpStep: (step: 'form' | 'otp') => void;
  handleVerifyOtp: (storeSlug: string, onSuccess: () => void) => void;
  handleResendOtp: (storeSlug: string) => void;
  
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
  // OTP state
  const [otpStep, setOtpStep] = useState<'form' | 'otp'>('form');
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const resendTimer = useRef<number | null>(null);
  useEffect(() => {
    if (resendIn <= 0) return;
    resendTimer.current = window.setTimeout(() => setResendIn((v) => v - 1), 1000) as any;
    return () => { if (resendTimer.current) clearTimeout(resendTimer.current); };
  }, [resendIn]);
  
  // Profile state
  const [profile, setProfile] = useState(initialProfile || {});
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const getCsrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const handleLogin = (storeSlug: string, onSuccess: () => void) => {
    setIsLoading(true);
    setErrors({});
    setOtpError(null);
    const url = generateStoreUrl('store.login', store);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type':'application/json','Accept':'application/json','X-CSRF-TOKEN':getCsrf(),'X-Requested-With':'XMLHttpRequest' },
      body: JSON.stringify({ email, password, remember:false }),
    }).then(async (res) => {
      const data = await res.json().catch(()=> ({}));
      if (res.ok) {
        try { document.cookie = `wusool_customer=1; domain=.wusool.ps; path=/; SameSite=Lax`; } catch {}
        router.reload({ only:['isLoggedIn','customer','customer_address'] });
        onSuccess();
        return;
      }
      // Unverified case: 401 with requires_verification
      if (data?.requires_verification || data?.email_verification_required) {
        setOtpEmail(data.email || email);
        setOtpStep('otp');
        setOtpCode('');
        setResendIn(60);
        setIsLoading(false);
        return;
      }
      // Validation errors
      if (res.status===422 && data?.errors) setErrors(data.errors);
      else if (data?.message) setErrors({ email:[data.message] });
      else setErrors({ email:['بيانات الدخول غير صحيحة'] });
      setIsLoading(false);
    }).catch(()=>{ setErrors({ email:['تعذر الاتصال'] }); setIsLoading(false); });
  };

  const handleRegister = (storeSlug: string, onSuccess: () => void) => {
    setIsLoading(true);
    setErrors({});
    setOtpError(null);
    const url = generateStoreUrl('store.register', store);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type':'application/json','Accept':'application/json','X-CSRF-TOKEN':getCsrf(),'X-Requested-With':'XMLHttpRequest' },
      body: JSON.stringify({ first_name:firstName, last_name:lastName, email, phone, password, password_confirmation:confirmPassword }),
    }).then(async (res) => {
      const data = await res.json().catch(()=> ({}));
      if (data?.registration_disabled) {
        setErrors({ email:[data.message || 'إنشاء الحسابات غير متاح في هذا المتجر.'] });
        setIsLoading(false);
        return;
      }
      if (data?.requires_verification) {
        setOtpEmail(data.email || email);
        setOtpStep('otp');
        setOtpCode('');
        setResendIn(60);
        setIsLoading(false);
        return;
      }
      if (res.ok && data?.success!==false) {
        // Verification none: direct login
        try { document.cookie = `wusool_customer=1; domain=.wusool.ps; path=/; SameSite=Lax`; } catch {}
        router.reload({ only:['isLoggedIn','customer','customer_address'] });
        onSuccess();
        return;
      }
      if (res.status===422 && data?.errors) setErrors(data.errors);
      else if (data?.message) setErrors({ email:[data.message] });
      else setErrors({ email:['تعذر إنشاء الحساب'] });
      setIsLoading(false);
    }).catch(()=>{ setErrors({ email:['تعذر الاتصال'] }); setIsLoading(false); });
  };

  const handleVerifyOtp = (storeSlug: string, onSuccess: () => void) => {
    if (!otpEmail || otpCode.length!==6) { setOtpError('أدخل رمزاً مكوناً من 6 أرقام'); return; }
    setIsLoading(true); setOtpError(null);
    const url = generateStoreUrl('store.verify-email', store);
    fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json','Accept':'application/json','X-CSRF-TOKEN':getCsrf(),'X-Requested-With':'XMLHttpRequest' },
      body: JSON.stringify({ email:otpEmail, code:otpCode })
    }).then(async (res)=>{
      const data= await res.json().catch(()=>({}));
      if (res.ok) {
        try { document.cookie = `wusool_customer=1; domain=.wusool.ps; path=/; SameSite=Lax`; } catch {}
        setOtpStep('form'); setOtpCode(''); setOtpEmail(null);
        router.reload({ only:['isLoggedIn','customer','customer_address'] });
        onSuccess();
        return;
      }
      setOtpError(data?.message || 'رمز التحقق غير صحيح');
      setIsLoading(false);
    }).catch(()=>{ setOtpError('تعذر الاتصال'); setIsLoading(false); });
  };
  const handleResendOtp = (storeSlug: string) => {
    if (!otpEmail || resendIn>0) return;
    setIsLoading(true); setOtpError(null);
    const url = generateStoreUrl('store.verify-email.resend', store);
    fetch(url,{
      method:'POST',
      headers:{ 'Content-Type':'application/json','Accept':'application/json','X-CSRF-TOKEN':getCsrf(),'X-Requested-With':'XMLHttpRequest' },
      body: JSON.stringify({ email:otpEmail })
    }).then(async (res)=>{
      const data= await res.json().catch(()=>({}));
      if (res.ok) { setResendIn(60); setIsLoading(false); return; }
      setOtpError(data?.message || 'تعذر إعادة الإرسال');
      if (res.status===429) setResendIn(60);
      setIsLoading(false);
    }).catch(()=>{ setOtpError('تعذر الاتصال'); setIsLoading(false); });
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
      setErrors({ password_confirmation: ['كلمتا المرور غير متطابقتين'] });
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
    otpStep,
    otpEmail,
    otpCode,
    otpError,
    resendIn,
    setOtpCode,
    setOtpStep,
    handleVerifyOtp,
    handleResendOtp,
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