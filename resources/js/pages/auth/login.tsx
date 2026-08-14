import { useForm, router, usePage } from '@inertiajs/react';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, RefreshCw, ArrowLeft, KeyRound } from 'lucide-react';
import { FormEventHandler, useState, useEffect, useRef, useCallback } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import AuthLayout from '@/layouts/auth-layout';
import AuthButton from '@/components/auth/auth-button';
import SocialButtons from '@/components/auth/SocialButtons';
import Recaptcha, { executeRecaptcha } from '@/components/recaptcha';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';
import type { AuthPageProps } from '@/types';

type LoginForm = {
 email: string;
 password: string;
 remember: boolean;
 recaptcha_token?: string;
};

interface DemoStore {
 id: number;
 name: string;
 slug: string;
 theme: string;
}

interface LoginProps {
 status?: string;
 canResetPassword: boolean;
 isDemo?: boolean;
 demoStores?: DemoStore[];
}

export default function Login({ status, canResetPassword, isDemo = false, demoStores = [] }: LoginProps) {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const { themeColor, customColor } = useBrand();
    const { settings = {}, authProviders = [], rtl } = usePage<AuthPageProps>().props;
 const recaptchaEnabled = settings.recaptchaEnabled === 'true' || settings.recaptchaEnabled === true || settings.recaptchaEnabled === 1 || settings.recaptchaEnabled === '1';
 const primaryColor = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS];

 const [hoveredStore, setHoveredStore] = useState<string | null>(null);

 const { data, setData, post, processing, errors, reset, transform } = useForm<LoginForm>({
 email: '',
 password: '',
 remember: false,
 });

 // Passwordless OTP state
 const [mode, setMode] = useState<'password' | 'otp'>('password');
 const [otpStep, setOtpStep] = useState<'send' | 'verify'>('send');
 const [otpEmail, setOtpEmail] = useState('');
 const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
 const [otpError, setOtpError] = useState('');
 const [otpSuccess, setOtpSuccess] = useState('');
 const [otpProcessing, setOtpProcessing] = useState(false);
 const [resendCooldown, setResendCooldown] = useState(0);
 const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

 useEffect(() => {
 if (isDemo) {
 setData({
 email: 'company@example.com',
 password: 'password',
 remember: false
 });
 }
    }, [isDemo, setData]);

 // Cooldown timer for resend
 useEffect(() => {
 if (resendCooldown <= 0) return;
 const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
 return () => clearTimeout(timer);
 }, [resendCooldown]);

 const submit: FormEventHandler = async (e) => {
 e.preventDefault();

 if (recaptchaEnabled) {
 try {
 const token = await executeRecaptcha();
 if (!token) {
 alert(t('Please complete the reCAPTCHA verification'));
 return;
 }
 transform((data) => ({
 ...data,
 recaptcha_token: token,
 }));
 post(route('login'), {
 onFinish: () => reset('password'),
 });
 return;
 } catch {
 alert(t('reCAPTCHA verification failed. Please try again.'));
 return;
 }
 }

 post(route('login'), {
 onFinish: () => reset('password'),
 });
 };

 const openStoreInNewTab = (storeSlug: string, e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();
 const url = route('store.home', storeSlug);
 window.open(url, '_blank');
 };

    const getThemeThumbnail = (themeId: string) => {
        return `https://placehold.co/300x600?text=${encodeURIComponent(themeId)}`;
    };

 const distinctThemes = demoStores.reduce((acc: DemoStore[], store) => {
 if (!acc.find(s => s.theme === store.theme)) {
 acc.push(store);
 }
 return acc;
 }, []);

 const registrationEnabled = settings.registrationEnabled === 'true' || settings.registrationEnabled === true || settings.registrationEnabled === '1' || settings.registrationEnabled === 1;

 // Passwordless login is only usable when outbound email is configured
 // (an OTP cannot be delivered otherwise).
 const mailConfigured = settings.mailConfigured !== false;

 // ==================== OTP METHODS ====================
 const openOtpMode = () => {
 setOtpError('');
 setOtpSuccess('');
 setOtpValues(['', '', '', '', '', '']);
 setOtpStep('send');
 setOtpEmail(data.email);
 setMode('otp');
 };

 const backToPassword = () => {
 setMode('password');
 setOtpError('');
 setOtpSuccess('');
 setOtpValues(['', '', '', '', '', '']);
 };

 const handleOtpSend = async () => {
 setOtpProcessing(true);
 setOtpError('');
 setOtpSuccess('');

 const email = otpEmail.trim();

 if (!email) {
 setOtpError(t('Please enter your email address'));
 setOtpProcessing(false);
 return;
 }

 try {
 const res = await fetch(route('login.otp.send'), {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Accept': 'application/json',
 'X-Requested-With': 'XMLHttpRequest',
 'X-XSRF-TOKEN': decodeURIComponent(
 document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''
 ),
 },
 body: JSON.stringify({ email }),
 });

 const json = await res.json();

 if (res.ok && json.success) {
 setOtpEmail(email);
 setOtpStep('verify');
 setResendCooldown(60);
 setOtpSuccess(json.message || t('If an account exists for this email, a login code has been sent.'));
 } else {
 const errMsg = json.errors
 ? Object.values(json.errors).flat().join(' ')
 : json.message || t('Something went wrong. Please try again.');
 setOtpError(errMsg);
 }
 } catch {
 setOtpError(t('Connection error. Please try again.'));
 } finally {
 setOtpProcessing(false);
 }
 };

 const handleOtpChange = useCallback((index: number, value: string) => {
 if (!/^\d*$/.test(value)) return;
 const digit = value.slice(-1);
 const newValues = [...otpValues];
 newValues[index] = digit;
 setOtpValues(newValues);
 setOtpError('');

 if (digit && index < 5) {
 otpRefs.current[index + 1]?.focus();
 }
 }, [otpValues]);

 const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
 if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
 otpRefs.current[index - 1]?.focus();
 const newValues = [...otpValues];
 newValues[index - 1] = '';
 setOtpValues(newValues);
 }
 }, [otpValues]);

 const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
 e.preventDefault();
 const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
 if (pasted.length === 0) return;
 const newValues = [...otpValues];
 for (let i = 0; i < 6; i++) {
 newValues[i] = pasted[i] || '';
 }
 setOtpValues(newValues);
 const focusIndex = Math.min(pasted.length, 5);
 otpRefs.current[focusIndex]?.focus();
 }, [otpValues]);

 const handleOtpVerify = async () => {
 const code = otpValues.join('');
 if (code.length !== 6) {
 setOtpError(t('Enter the 6-digit code'));
 return;
 }

 setOtpProcessing(true);
 setOtpError('');
 setOtpSuccess('');

 try {
 const res = await fetch(route('login.otp.verify'), {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Accept': 'application/json',
 'X-Requested-With': 'XMLHttpRequest',
 'X-XSRF-TOKEN': decodeURIComponent(
 document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''
 ),
 },
 body: JSON.stringify({ email: otpEmail.trim(), code }),
 });

 const json = await res.json();

 if (res.ok && json.success) {
 window.location.href = json.redirect;
 } else {
 const errMsg = json.errors
 ? Object.values(json.errors).flat().join(' ')
 : json.message || t('Invalid or expired code.');
 setOtpError(errMsg);
 }
 } catch {
 setOtpError(t('Connection error. Please try again.'));
 } finally {
 setOtpProcessing(false);
 }
 };

 const handleOtpResend = async () => {
 if (resendCooldown > 0) return;
 setOtpError('');
 setOtpSuccess('');

 try {
 const res = await fetch(route('login.otp.send'), {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Accept': 'application/json',
 'X-Requested-With': 'XMLHttpRequest',
 'X-XSRF-TOKEN': decodeURIComponent(
 document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''
 ),
 },
 body: JSON.stringify({ email: otpEmail.trim() }),
 });

 const json = await res.json();
 if (res.ok && json.success) {
 setOtpSuccess(json.message || t('If an account exists for this email, a login code has been sent.'));
 setResendCooldown(60);
 setOtpValues(['', '', '', '', '', '']);
 otpRefs.current[0]?.focus();
 } else {
 setOtpError(json.message || t('Something went wrong. Please try again.'));
 }
 } catch {
 setOtpError(t('Connection error. Please try again.'));
 }
 };

 // ==================== OTP MODE VIEW ====================
 if (mode === 'otp') {
 return (
 <AuthLayout
 title={t("Login")}
 description={t("Login with a code")}
 >
 <div className="space-y-6">
 {/* Back button */}
 <button
 type="button"
 onClick={backToPassword}
 className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
 >
 <ArrowLeft size={16} className={rtl ? 'rotate-180' : ''} />
 {t("Back to password login")}
 </button>

 {/* OTP icon */}
 <div className="flex justify-center">
 <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
 <ShieldCheck size={32} style={{ color: primaryColor }} />
 </div>
 </div>

 {otpStep === 'send' ? (
 <>
 <p className="text-sm text-gray-500 text-center leading-relaxed">
 {t("We'll email you a one-time code to sign in without a password.")}
 </p>

 {/* Email */}
 <div>
 <Label htmlFor="otp-email" className="block text-sm font-medium text-gray-700 mb-1.5">{t("Email")}</Label>
 <div className="relative">
 <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
 <Mail className="h-4 w-4 text-gray-400" />
 </div>
 <Input
 id="otp-email"
 type="email"
 required
 autoFocus
 autoComplete="email"
 value={otpEmail}
 onChange={(e) => setOtpEmail(e.target.value)}
 placeholder={t("Enter your email")}
 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleOtpSend(); } }}
 className="w-full ps-10 pe-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 placeholder-gray-400 bg-gray-50 focus:bg-white"
 style={{ '--tw-ring-color': `${primaryColor}33` } as React.CSSProperties}
 />
 </div>
 <InputError message={otpError} />
 </div>

 {/* Send button */}
 <div>
 <button
 type="button"
 onClick={handleOtpSend}
 disabled={otpProcessing}
 className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
 style={{ backgroundColor: primaryColor }}
 >
 {otpProcessing ? (
 <>
 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 {t("Sending...")}
 </>
 ) : (
 <>
 <KeyRound size={18} />
 {t("Send code")}
 </>
 )}
 </button>
 </div>
 </>
 ) : (
 <>
 <p className="text-sm text-gray-500 text-center">
 {t("We sent a code to")} <span className="font-medium text-gray-700">{otpEmail}</span>
 </p>

 <button
 type="button"
 onClick={() => setOtpStep('send')}
 className="mx-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors -mt-2"
 >
 <Mail size={12} />
 {t("Use a different email")}
 </button>

 <p className="text-xs text-gray-400 text-center -mt-2">
 {t("Enter the 6-digit code below")}
 </p>

 {/* OTP inputs */}
 <div className="flex justify-center gap-2.5 sm:gap-3" dir="ltr">
 {otpValues.map((val, i) => (
 <input
 key={i}
 ref={(el) => { otpRefs.current[i] = el; }}
 type="text"
 inputMode="numeric"
 maxLength={1}
 value={val}
 onChange={(e) => handleOtpChange(i, e.target.value)}
 onKeyDown={(e) => handleOtpKeyDown(i, e)}
 onPaste={handleOtpPaste}
 autoFocus={i === 0}
 className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200 focus:outline-none"
 style={{
 borderColor: val ? primaryColor : undefined,
 backgroundColor: val ? `${primaryColor}10` : undefined,
 '--tw-ring-color': `${primaryColor}33`,
 color: val ? primaryColor : undefined,
 } as React.CSSProperties}
 />
 ))}
 </div>

 {/* Error */}
 {otpError && (
 <div className="text-center text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2.5">
 {otpError}
 </div>
 )}

 {/* Success */}
 {otpSuccess && (
 <div className="text-center text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2.5">
 {otpSuccess}
 </div>
 )}

 {/* Verify button */}
 <div>
 <button
 type="button"
 onClick={handleOtpVerify}
 disabled={otpProcessing || otpValues.join('').length !== 6}
 className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
 style={{ backgroundColor: primaryColor }}
 >
 {otpProcessing ? (
 <>
 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 {t("Verifying...")}
 </>
 ) : (
 <>
 <ShieldCheck size={18} />
 {t("Verify & Login")}
 </>
 )}
 </button>
 </div>

 {/* Resend */}
 <div className="text-center">
 {resendCooldown > 0 ? (
 <p className="text-sm text-gray-400">
 {t("Resend code in")} <span className="font-medium text-gray-500">{resendCooldown}s</span>
 </p>
 ) : (
 <button
 type="button"
 onClick={handleOtpResend}
 className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:underline"
 style={{ color: primaryColor }}
 >
 <RefreshCw size={14} />
 {t("Resend code")}
 </button>
 )}
 </div>
 </>
 )}

 {/* Register link */}
 {registrationEnabled && (
 <div className="text-center text-sm text-gray-500 mt-5">
 {t("Don't have an account?")}{' '}
 <TextLink
 href={route('register')}
 className="font-semibold hover:underline"
 style={{ color: primaryColor }}
 >
 {t("Create one")}
 </TextLink>
 </div>
 )}

 {/* Divider */}
 {authProviders.length > 0 && (
 <div className="relative my-6">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-gray-200"></div>
 </div>
 <div className="relative flex justify-center text-sm">
 <span className="px-3 bg-white text-gray-400">{t("or continue with")}</span>
 </div>
 </div>
 )}

 {/* Social Login Buttons */}
 <SocialButtons primaryColor={primaryColor} availableProviders={authProviders} />
 </div>
 </AuthLayout>
 );
 }

 return (
  <AuthLayout
  title={t("Login")}
  description={t("Enter your credentials to access your account")}
  status={status}
  >
 <form noValidate onSubmit={submit}>
 <div className="space-y-4">
 {/* Email */}
 <div>
 <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">{t("Email")}</Label>
 <div className="relative">
 <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
 <Mail className="h-4 w-4 text-gray-400" />
 </div>
 <Input
 id="email"
 type="email"
 required
 autoFocus
 tabIndex={1}
 autoComplete="email"
 value={data.email}
 onChange={(e) => setData('email', e.target.value)}
 placeholder={t("Enter your email")}
 className="w-full ps-10 pe-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 placeholder-gray-400 bg-gray-50 focus:bg-white"
 style={{ '--tw-ring-color': `${primaryColor}33` } as React.CSSProperties}
 aria-invalid={!!errors.email}
 />
 </div>
 <InputError message={errors.email} />
 </div>

 {/* Password */}
 <div>
 <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">{t("Password")}</Label>
 <div className="relative">
 <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
 <Lock className="h-4 w-4 text-gray-400" />
 </div>
 <Input
 id="password"
 type={showPassword ? 'text' : 'password'}
 required
 tabIndex={2}
 autoComplete="current-password"
 value={data.password}
 onChange={(e) => setData('password', e.target.value)}
 placeholder={t("Enter your password")}
 className="w-full ps-10 pe-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 placeholder-gray-400 bg-gray-50 focus:bg-white"
 style={{ '--tw-ring-color': `${primaryColor}33` } as React.CSSProperties}
 aria-invalid={!!errors.password}
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
 >
 {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 </button>
 </div>
 <InputError message={errors.password} />
 </div>

 {/* Remember me + Forgot password */}
 <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
 <label
 htmlFor="remember"
 className="flex items-center gap-2.5 cursor-pointer group"
 >
 <Checkbox
 id="remember"
 name="remember"
 checked={data.remember}
 onCheckedChange={(checked) => setData('remember', !!checked)}
 tabIndex={3}
 className="w-[18px] h-[18px] rounded-lg border-2 border-gray-300 data-[state=checked]:border-transparent transition-all duration-200"
 style={data.remember ? { backgroundColor: primaryColor, borderColor: primaryColor } as React.CSSProperties : {}}
 />
 <span className="text-sm text-gray-600 select-none group-hover:text-gray-800 transition-colors">{t("Remember me")}</span>
 </label>
 {canResetPassword && (
 <TextLink
 href={route('password.request')}
 className="text-xs font-medium hover:underline transition-colors duration-200 whitespace-nowrap"
 style={{ color: primaryColor }}
 tabIndex={5}
 >
 {t("Forgot password?")}
 </TextLink>
 )}
 </div>
 </div>

 {recaptchaEnabled && (
 <div className="mt-4">
    <Recaptcha
        onVerify={(token) => {
            setData('recaptcha_token', token);
        }}
        onExpired={() => {
            setData('recaptcha_token', '');
        }}
        onError={() => {
            setData('recaptcha_token', '');
        }}
    />
 </div>
 )}
 <InputError message={errors.recaptcha_token} />

 {/* Submit */}
 <div className="mt-6">
 <AuthButton
 tabIndex={4}
 processing={processing}
 >
 {t("Sign in")}
 </AuthButton>
 </div>

 {/* Passwordless login link */}
 {mailConfigured && (
 <div className="text-center text-sm mt-3">
 <button
 type="button"
 onClick={openOtpMode}
 className="inline-flex items-center gap-1.5 font-medium hover:underline transition-colors"
 style={{ color: primaryColor }}
 >
 <KeyRound size={14} />
 {t("Login with a code")}
 </button>
 </div>
 )}

 {/* Register link */}
 {registrationEnabled && (
 <div className="text-center text-sm text-gray-500 mt-5">
 {t("Don't have an account?")}{' '}
 <TextLink
 href={route('register')}
 className="font-semibold hover:underline"
 style={{ color: primaryColor }}
 tabIndex={6}
 >
 {t("Create one")}
 </TextLink>
 </div>
 )}

 {/* Divider */}
 {authProviders.length > 0 && (
 <div className="relative my-6">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-gray-200"></div>
 </div>
 <div className="relative flex justify-center text-sm">
 <span className="px-3 bg-white text-gray-400">{t("or continue with")}</span>
 </div>
 </div>
 )}

 {/* Social Login Buttons */}
 <SocialButtons primaryColor={primaryColor} availableProviders={authProviders} />
 {isDemo && (
 <div className="mb-5">
 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={async () => {
 if (recaptchaEnabled) {
 try {
 const token = await executeRecaptcha();
 if (!token) { alert(t('Please complete the reCAPTCHA verification')); return; }
 router.post(route('login'), { email: 'superadmin@example.com', password: 'password', remember: false, recaptcha_token: token });
 } catch { alert(t('reCAPTCHA verification failed.')); }
 } else {
 router.post(route('login'), { email: 'superadmin@example.com', password: 'password', remember: false });
 }
 }}
 className="flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-gray-200 text-sm font-semibold text-gray-700 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
 >
 <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: primaryColor }}>SA</span>
 {t('Super Admin')}
 </button>
 <button
 type="button"
 onClick={async () => {
 if (recaptchaEnabled) {
 try {
 const token = await executeRecaptcha();
 if (!token) { alert(t('Please complete the reCAPTCHA verification')); return; }
 router.post(route('login'), { email: 'company@example.com', password: 'password', remember: false, recaptcha_token: token });
 } catch { alert(t('reCAPTCHA verification failed.')); }
 } else {
 router.post(route('login'), { email: 'company@example.com', password: 'password', remember: false });
 }
 }}
 className="flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-gray-200 text-sm font-semibold text-gray-700 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
 >
 <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: '#10b981' }}>SO</span>
 {t('Shop Owner')}
 </button>
 </div>

 {distinctThemes && distinctThemes.length > 0 && (
 <div className="mt-5">
 <p className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center mb-3">{t('Store Themes')}</p>
 <div className="grid grid-cols-2 gap-2">
 {distinctThemes.map((store, index) => (
 <div
 key={store.id}
 className={`relative group ${distinctThemes.length % 2 !== 0 && index === distinctThemes.length - 1 ? 'col-span-2' : ''}`}
 >
 <button
 onClick={(e) => openStoreInNewTab(store.slug, e)}
 className="w-full py-2 px-3 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all duration-200 rounded-lg border border-gray-200 hover:border-gray-300 font-medium"
 onMouseEnter={() => setHoveredStore(store.theme)}
 onMouseLeave={() => setHoveredStore(null)}
 >
 {store.theme.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
 </button>
 {hoveredStore === store.theme && (
 <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white p-1.5 rounded-lg shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 w-44 pointer-events-none">
 <div className="rounded overflow-hidden bg-gray-50 aspect-[16/10]">
    <img src={getThemeThumbnail(store.theme)} alt={store.theme} className="w-full h-full object-cover" />
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </form>
 </AuthLayout>
 );
}