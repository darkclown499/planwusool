import { AuthFormProvider, useAuthForm } from '@/contexts/AuthFormContext';
import { Eye, EyeOff, Lock, Mail, Phone, ShoppingBag, User, UserCheck, User as UserIcon, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useStore } from '@/contexts/StoreContext';

/**
 * Token-aware auth modals shared by all templates.
 * - TemplateAuthGate: shown before checkout when the customer is a guest.
 * - TemplateAuthForm: login / register / forgot-password flow.
 */

const primary = 'var(--twc-primary-600, #059669)';
const primarySoft = 'var(--twc-primary-50, #ecfdf5)';

const ModalShell: React.FC<{ children: React.ReactNode; onClose: () => void; wide?: boolean }> = ({ children, onClose, wide = false }) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
            <div className="flex min-h-full items-end justify-center md:items-center md:p-4">
                <div
                    className={`w-full ${wide ? 'max-w-md' : 'max-w-sm'} max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl md:rounded-3xl`}
                    style={{ background: 'var(--twc-surface, #ffffff)', paddingBottom: 'env(safe-area-inset-bottom)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};

interface AuthGateProps {
    onClose: () => void;
    onLogin: () => void;
    onContinueAsGuest: () => void;
}

export const TemplateAuthGate: React.FC<AuthGateProps> = ({ onClose, onLogin, onContinueAsGuest }) => {
    return (
        <ModalShell onClose={onClose}>
            <div className="relative p-6 text-center" style={{ background: primarySoft }}>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="إغلاق"
                    className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/10"
                >
                    <X className="h-5 w-5" />
                </button>
                <div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg"
                    style={{ background: primary }}
                >
                    <ShoppingBag className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                    مستعد لإتمام الطلب؟
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                    اختر كيف تريد المتابعة مع طلبك
                </p>
            </div>
            <div className="space-y-3 p-6">
                <button
                    type="button"
                    onClick={onLogin}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white transition hover:opacity-90"
                    style={{ background: primary }}
                >
                    <User className="h-5 w-5" />
                    تسجيل الدخول إلى حسابك
                </button>
                <div className="relative py-1 text-center">
                    <span className="bg-white px-4 text-sm font-bold" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                        أو
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3.5 font-bold transition hover:opacity-90"
                    style={{ background: 'var(--twc-background, #ffffff)', borderColor: primary, color: primary }}
                >
                    <UserCheck className="h-5 w-5" />
                    المتابعة كضيف
                </button>
            </div>
        </ModalShell>
    );
};

interface AuthFormProps {
    onClose: () => void;
    onLoginSuccess: (customer?: any) => void;
    storeSlug?: string;
}

const AuthFormContent: React.FC<AuthFormProps> = ({ onClose, onLoginSuccess, storeSlug }) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const otpRefs = useRef<Array<HTMLInputElement|null>>([]);

    const {
        email,
        setEmail,
        password,
        setPassword,
        firstName,
        setFirstName,
        lastName,
        setLastName,
        phone,
        setPhone,
        confirmPassword,
        setConfirmPassword,
        isLogin,
        setIsLogin,
        showForgot,
        setShowForgot,
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
        handleLogin,
        handleRegister,
        handleForgotPassword,
    } = useAuthForm();
    const { behavior } = useStore();
    const customerAccountsEnabled = behavior?.customer_accounts_enabled !== false;
    const registerEnabled = customerAccountsEnabled && behavior?.enable_customer_registration !== false;
    const loginEnabled = customerAccountsEnabled && behavior?.enable_customer_login !== false;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (showForgot) {
            handleForgotPassword(storeSlug!);
        } else if (isLogin) {
            handleLogin(storeSlug!, () => {
                onLoginSuccess();
                onClose();
            });
        } else {
            handleRegister(storeSlug!, () => {
                onLoginSuccess();
                onClose();
            });
        }
    };

    const inputClass = 'w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2';
    const labelClass = 'mb-1.5 block text-sm font-semibold';

    // OTP pane
    if (otpStep === 'otp') {
        const digits = (otpCode || '').padEnd(6, ' ').split('').slice(0,6);
        const handleOtpInput = (idx:number, val:string) => {
            const v = val.replace(/[^0-9]/g,'').slice(-1);
            const arr = otpCode.split('');
            while(arr.length<6) arr.push('');
            arr[idx]=v;
            const next = arr.join('').slice(0,6);
            setOtpCode(next);
            if (v && idx<5) otpRefs.current[idx+1]?.focus();
        };
        const handleOtpPaste = (e:React.ClipboardEvent) => {
            const text = e.clipboardData.getData('text').replace(/[^0-9]/g,'').slice(0,6);
            if (text.length===6) { e.preventDefault(); setOtpCode(text); otpRefs.current[5]?.focus(); }
        };
        const handleOtpKeyDown = (idx:number,e:React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key==='Backspace' && !otpCode[idx] && idx>0) otpRefs.current[idx-1]?.focus();
        };
        return (
            <ModalShell onClose={onClose}>
                <div className="flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: primary }}><Mail className="h-5 w-5" /></div>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>تأكيد البريد الإلكتروني</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4 p-5 text-center">
                    <p className="text-sm" style={{ color:'var(--twc-text-muted,#6b7280)' }}>أرسلنا رمز تحقق إلى <span className="font-bold" dir="ltr">{otpEmail}</span></p>
                    <div className="flex justify-center gap-1.5 sm:gap-2" dir="ltr" onPaste={handleOtpPaste}>
                        {[0,1,2,3,4,5].map((i)=>(
                            <input key={i} ref={(el)=>{otpRefs.current[i]=el}} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={1} value={digits[i]?.trim()||''} onChange={(e)=>handleOtpInput(i,e.target.value)} onKeyDown={(e)=>handleOtpKeyDown(i,e)} className="h-12 w-10 rounded-xl border text-center text-lg font-bold focus:outline-none focus:ring-2 sm:h-12 sm:w-11" style={{ borderColor:'var(--twc-border,#e5e7eb)' }} />
                        ))}
                    </div>
                    {otpError && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{otpError}</div>}
                    {errors && Object.keys(errors).length>0 && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{Object.entries(errors).map(([k,m])=> <p key={k}>{String(m)}</p>)}</div>}
                    <button type="button" disabled={isLoading || otpCode.length!==6} onClick={()=>handleVerifyOtp(storeSlug!, ()=>{ onLoginSuccess(); onClose(); })} className="w-full rounded-xl py-3.5 font-bold text-white disabled:opacity-60" style={{ background:primary }}>{isLoading?'جاري التحقق...':'تأكيد الحساب'}</button>
                    <div className="flex items-center justify-between text-sm">
                        <button type="button" disabled={resendIn>0 || isLoading} onClick={()=>handleResendOtp(storeSlug!)} className="font-semibold disabled:opacity-50 hover:underline" style={{ color:primary }}>{resendIn>0 ? `إعادة الإرسال بعد ${resendIn} ثانية` : 'إعادة إرسال الرمز'}</button>
                        <button type="button" onClick={()=>{ setOtpStep('form'); setOtpCode(''); }} className="font-semibold hover:underline" style={{ color:'var(--twc-text-muted,#6b7280)' }}>العودة</button>
                    </div>
                </div>
            </ModalShell>
        );
    }

    return (
        <ModalShell onClose={onClose}>
            <div className="flex items-center justify-between border-b p-4" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: primary }}>
                        <UserIcon className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                        {showForgot ? 'استعادة كلمة المرور' : isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="إغلاق"
                    className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/5"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {!customerAccountsEnabled ? (
                <div className="p-6 text-center">
                    <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">حسابات العملاء غير مفعلة في هذا المتجر.</p>
                    <p className="mt-2 text-xs" style={{ color:'var(--twc-text-muted,#6b7280)' }}>يمكنك المتابعة كضيف لإتمام الطلب.</p>
                </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
                {showForgot ? (
                    <div>
                        <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                            البريد الإلكتروني
                        </label>
                        <div className="relative">
                            <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className={`${inputClass} ps-10`}
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        {!isLogin && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        الاسم الأول
                                    </label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        placeholder="محمد"
                                        className={inputClass}
                                        style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        اسم العائلة
                                    </label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        placeholder="أحمد"
                                        className={inputClass}
                                        style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                البريد الإلكتروني
                            </label>
                            <div className="relative">
                                <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className={`${inputClass} ps-10`}
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                />
                            </div>
                        </div>
                        {!isLogin && (
                            <div>
                                <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                    رقم الهاتف
                                </label>
                                <div className="relative">
                                    <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="05xxxxxxxx"
                                        className={`${inputClass} ps-10`}
                                        style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                كلمة المرور
                            </label>
                            <div className="relative">
                                <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className={`${inputClass} ps-10 pe-10`}
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    aria-label="إظهار كلمة المرور"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        {!isLogin && (
                            <div>
                                <label className={labelClass} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                    تأكيد كلمة المرور
                                </label>
                                <div className="relative">
                                    <Lock className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        className={`${inputClass} ps-10 pe-10`}
                                        style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((v) => !v)}
                                        className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        aria-label="إظهار كلمة المرور"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        )}
                        {isLogin && (
                            <div className="text-end">
                                <button
                                    type="button"
                                    onClick={() => setShowForgot(true)}
                                    className="text-sm font-semibold hover:underline"
                                    style={{ color: primary }}
                                >
                                    نسيت كلمة المرور؟
                                </button>
                            </div>
                        )}
                    </>
                )}

                {errors && Object.keys(errors).length > 0 && (
                    <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                        {Object.entries(errors).map(([key, msg]) => (
                            <p key={key}>{String(msg)}</p>
                        ))}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-xl py-3.5 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                    style={{ background: primary }}
                >
                    {isLoading ? 'جاري التحميل...' : showForgot ? 'إرسال رابط الاستعادة' : isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
                </button>

                <div className="text-center text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                    {showForgot ? (
                        <button
                            type="button"
                            onClick={() => setShowForgot(false)}
                            className="font-semibold hover:underline"
                            style={{ color: primary }}
                        >
                            العودة لتسجيل الدخول
                        </button>
                    ) : !registerEnabled && isLogin ? (
                        <span className="text-xs">التسجيل غير متاح حالياً</span>
                    ) : !loginEnabled && !isLogin ? (
                        <span className="text-xs">تسجيل الدخول غير متاح</span>
                    ) : (
                        <>
                            {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className={`font-semibold hover:underline ${!registerEnabled || !loginEnabled ? 'opacity-50 pointer-events-none' : ''}`}
                                style={{ color: primary }}
                                disabled={!registerEnabled && isLogin ? true : !loginEnabled && !isLogin ? true : false}
                            >
                                {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
                            </button>
                        </>
                    )}
                </div>
            </form>
            )}
        </ModalShell>
    );
};

export const TemplateAuthForm: React.FC<AuthFormProps> = (props) => (
    <AuthFormProvider>
        <AuthFormContent {...props} />
    </AuthFormProvider>
);
