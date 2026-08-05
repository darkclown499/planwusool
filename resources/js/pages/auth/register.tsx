import { useForm, usePage, router } from '@inertiajs/react';
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { FormEventHandler, useState, useRef, useEffect, useCallback } from 'react';

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

type RegisterForm = {
 name: string;
 email: string;
 password: string;
 password_confirmation: string;
 terms: boolean;
 recaptcha_token?: string;
 plan_id?: string;
 referral_code?: string;
};

interface RegisterProps {
 referralCode?: string;
 planId?: string;
}

export default function Register({ referralCode, planId }: RegisterProps) {
 const { t } = useTranslation();
 const [recaptchaToken, setRecaptchaToken] = useState<string>('');
 const [showPassword, setShowPassword] = useState(false);
 const [showConfirmPassword, setShowConfirmPassword] = useState(false);
 const { themeColor, customColor } = useBrand();
 const { settings = {}, authProviders = [] } = usePage().props as any;
 const recaptchaEnabled = settings.recaptchaEnabled === 'true' || settings.recaptchaEnabled === true || settings.recaptchaEnabled === 1 || settings.recaptchaEnabled === '1';
 const primaryColor = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS];

 // OTP state
 const [step, setStep] = useState<'form' | 'otp'>('form');
 const [otpEmail, setOtpEmail] = useState('');
 const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
 const [otpError, setOtpError] = useState('');
 const [otpSuccess, setOtpSuccess] = useState('');
 const [otpProcessing, setOtpProcessing] = useState(false);
 const [resendCooldown, setResendCooldown] = useState(0);
 const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

 const { data, setData, post, processing, errors, reset, transform } = useForm<RegisterForm>({
 name: '',
 email: '',
 password: '',
 password_confirmation: '',
 terms: false,
 plan_id: planId,
 referral_code: referralCode,
 recaptcha_token: '',
 });

 // Cooldown timer for resend
 useEffect(() => {
 if (resendCooldown <= 0) return;
 const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
 return () => clearTimeout(timer);
 }, [resendCooldown]);

 const submit: FormEventHandler = async (e) => {
 e.preventDefault();
 setOtpError('');

 const sendOtp = async (recaptchaTokenVal?: string) => {
 try {
 const payload: any = {
 name: data.name,
 email: data.email,
 password: data.password,
 password_confirmation: data.password_confirmation,
 terms: data.terms ? '1' : '0',
 plan_id: data.plan_id || '',
 referral_code: data.referral_code || '',
 };
 if (recaptchaTokenVal) {
 payload.recaptcha_token = recaptchaTokenVal;
 }

 const res = await fetch('/otp/send', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'X-Requested-With': 'XMLHttpRequest',
 'X-XSRF-TOKEN': decodeURIComponent(
 document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''
 ),
 },
 body: JSON.stringify(payload),
 });

 const json = await res.json();

 if (res.ok && json.success) {
 setOtpEmail(json.email);
 setStep('otp');
 setResendCooldown(60);
 } else {
 const errMsg = json.errors
 ? Object.values(json.errors).flat().join(' ')
 : json.message || 'حدث خطأ أثناء إرسال رمز التحقق.';
 setOtpError(errMsg);
 }
 } catch {
 setOtpError('حدث خطأ في الاتصال بالخادم.');
 }
 };

 if (recaptchaEnabled) {
 try {
 const token = await executeRecaptcha();
 if (!token) {
 alert(t('Please complete the reCAPTCHA verification'));
 return;
 }
 setRecaptchaToken(token);
 await sendOtp(token);
 } catch {
 alert(t('reCAPTCHA verification failed. Please try again.'));
 }
 } else {
 await sendOtp();
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

 const handleOtpSubmit = async () => {
 const code = otpValues.join('');
 if (code.length !== 6) {
 setOtpError('أدخل الرمز المكون من 6 أرقام.');
 return;
 }

 setOtpProcessing(true);
 setOtpError('');

 try {
 const res = await fetch('/otp/verify', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'X-Requested-With': 'XMLHttpRequest',
 'X-XSRF-TOKEN': decodeURIComponent(
 document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''
 ),
 },
 body: JSON.stringify({ email: otpEmail, code }),
 });

 const json = await res.json();

 if (res.ok && json.success) {
 window.location.href = json.redirect;
 } else {
 setOtpError(json.message || 'رمز التحقق غير صحيح.');
 }
 } catch {
 setOtpError('حدث خطأ في الاتصال بالخادم.');
 } finally {
 setOtpProcessing(false);
 }
 };

 const handleResend = async () => {
 if (resendCooldown > 0) return;
 setOtpError('');
 setOtpSuccess('');

 try {
 const res = await fetch('/otp/resend', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'X-Requested-With': 'XMLHttpRequest',
 'X-XSRF-TOKEN': decodeURIComponent(
 document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''
 ),
 },
 body: JSON.stringify({ email: otpEmail }),
 });

 const json = await res.json();
 if (res.ok && json.success) {
 setOtpSuccess(json.message);
 setResendCooldown(60);
 setOtpValues(['', '', '', '', '', '']);
 otpRefs.current[0]?.focus();
 } else {
 setOtpError(json.message || 'حدث خطأ أثناء إعادة الإرسال.');
 }
 } catch {
 setOtpError('حدث خطأ في الاتصال بالخادم.');
 }
 };

 const handleBackToForm = () => {
 setStep('form');
 setOtpValues(['', '', '', '', '', '']);
 setOtpError('');
 setOtpSuccess('');
 };

 // ==================== OTP STEP ====================
 if (step === 'otp') {
 return (
 <AuthLayout
 title={t("Verify your email")}
 description={`${t("We sent a 6-digit code to")} ${otpEmail}`}
 >
 <div className="space-y-6">
 {/* Back button */}
 <button
 type="button"
 onClick={handleBackToForm}
 className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
 >
 <ArrowLeft size={16} className={usePage().props.rtl ? 'rotate-180' : ''} />
 {t("Back to registration")}
 </button>

 {/* OTP icon */}
 <div className="flex justify-center">
 <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
 <ShieldCheck size={32} style={{ color: primaryColor }} />
 </div>
 </div>

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
 onClick={handleOtpSubmit}
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
 {t("Verify & Create Account")}
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
 onClick={handleResend}
 className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:underline"
 style={{ color: primaryColor }}
 >
 <RefreshCw size={14} />
 {t("Resend code")}
 </button>
 )}
 </div>
 </div>
 </AuthLayout>
 );
 }

 // ==================== FORM STEP ====================
 return (
 <AuthLayout
 title={t("Create your account")}
 description={t("Start building your online store empire today")}
 >
 <form noValidate onSubmit={submit}>
 <div className="space-y-4">
 {/* Name */}
 <div>
 <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">{t("Full name")}</Label>
 <div className="relative">
 <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
 <User className="h-4 w-4 text-gray-400" />
 </div>
 <Input
 id="name"
 type="text"
 required
 autoFocus
 tabIndex={1}
 autoComplete="name"
 value={data.name}
 onChange={(e) => setData('name', e.target.value)}
 placeholder={t("John Doe")}
 className="w-full ps-10 pe-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 placeholder-gray-400 bg-gray-50 focus:bg-white"
 style={{ '--tw-ring-color': `${primaryColor}33` } as React.CSSProperties}
 aria-invalid={!!errors.name}
 />
 </div>
 <InputError message={errors.name} />
 </div>

 {/* Email */}
 <div>
 <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">{t("Email address")}</Label>
 <div className="relative">
 <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
 <Mail className="h-4 w-4 text-gray-400" />
 </div>
 <Input
 id="email"
 type="email"
 required
 tabIndex={2}
 autoComplete="email"
 value={data.email}
 onChange={(e) => setData('email', e.target.value)}
 placeholder="email@example.com"
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
 tabIndex={3}
 autoComplete="new-password"
 value={data.password}
 onChange={(e) => setData('password', e.target.value)}
 placeholder="••••••••"
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

 {/* Confirm Password */}
 <div>
 <Label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-1.5">{t("Confirm password")}</Label>
 <div className="relative">
 <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
 <Lock className="h-4 w-4 text-gray-400" />
 </div>
 <Input
 id="password_confirmation"
 type={showConfirmPassword ? 'text' : 'password'}
 required
 tabIndex={4}
 autoComplete="new-password"
 value={data.password_confirmation}
 onChange={(e) => setData('password_confirmation', e.target.value)}
 placeholder="••••••••"
 className="w-full ps-10 pe-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 placeholder-gray-400 bg-gray-50 focus:bg-white"
 style={{ '--tw-ring-color': `${primaryColor}33` } as React.CSSProperties}
 aria-invalid={!!errors.password_confirmation}
 />
 <button
 type="button"
 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
 className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
 >
 {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 </button>
 </div>
 <InputError message={errors.password_confirmation} />
 </div>

 {/* Terms */}
 <div className="flex items-start pt-1">
 <Checkbox
 id="terms"
 name="terms"
 checked={data.terms}
 onCheckedChange={(checked) => setData('terms', !!checked)}
 tabIndex={5}
 className="w-4 h-4 rounded border-gray-300 mt-0.5"
 style={{ color: primaryColor } as React.CSSProperties}
 aria-invalid={!!errors.terms}
 />
 <Label htmlFor="terms" className="ms-2 text-sm text-gray-600">
 {t("I agree to the")}{' '}
 <a
 href={route('page.terms')}
 target="_blank"
 rel="noopener noreferrer"
 className="font-medium hover:underline"
 style={{ color: primaryColor }}
 >
 {t("Terms and Conditions")}
 </a>
 {' '}{t("and the")}{' '}
 <a
 href={route('page.privacy')}
 target="_blank"
 rel="noopener noreferrer"
 className="font-medium hover:underline"
 style={{ color: primaryColor }}
 >
 {t("Privacy Policy")}
 </a>
 </Label>
 </div>
 <InputError message={errors.terms} />
 </div>

 {recaptchaEnabled && (
 <div className="mt-4">
 <Recaptcha
 onVerify={(token) => {
 setRecaptchaToken(token);
 setData('recaptcha_token', token);
 }}
 onExpired={() => {
 setRecaptchaToken('');
 setData('recaptcha_token', '');
 }}
 onError={() => {
 setRecaptchaToken('');
 setData('recaptcha_token', '');
 }}
 />
 </div>
 )}
 <InputError message={errors.recaptcha_token} />

 {/* Form-level OTP error */}
 {otpError && step === 'form' && (
 <div className="mt-4 text-center text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2.5">
 {otpError}
 </div>
 )}

 {/* Submit */}
 <div className="mt-6">
 <AuthButton
 tabIndex={6}
 processing={processing}
 >
 {t("Create account")}
 </AuthButton>
 </div>

 {/* Login link */}
 <div className="text-center text-sm text-gray-500 mt-5">
 {t("Already have an account?")}{' '}
 <TextLink
 href={route('login')}
 className="font-semibold hover:underline"
 style={{ color: primaryColor }}
 tabIndex={7}
 >
 {t("Log in")}
 </TextLink>
 </div>

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
 </form>
 </AuthLayout>
 );
}
