import { useForm, router, usePage } from '@inertiajs/react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';

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
import { getStoreThemes } from '@/data/storeThemes';

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
 const [recaptchaToken, setRecaptchaToken] = useState<string>('');
 const [showPassword, setShowPassword] = useState(false);
 const { themeColor, customColor } = useBrand();
 const { settings = {} } = usePage().props as any;
 const recaptchaEnabled = settings.recaptchaEnabled === 'true' || settings.recaptchaEnabled === true || settings.recaptchaEnabled === 1 || settings.recaptchaEnabled === '1';
 const primaryColor = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS];

 const [hoveredStore, setHoveredStore] = useState<string | null>(null);

 const { data, setData, post, processing, errors, reset, transform } = useForm<LoginForm>({
 email: '',
 password: '',
 remember: false,
 });

 useEffect(() => {
 if (isDemo) {
 setData({
 email: 'company@example.com',
 password: 'password',
 remember: false
 });
 }
 }, [isDemo]);

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
 const theme = getStoreThemes().find(t => t.id === themeId);
 return theme?.thumbnail || '';
 };

 const distinctThemes = demoStores.reduce((acc: DemoStore[], store) => {
 if (!acc.find(s => s.theme === store.theme)) {
 acc.push(store);
 }
 return acc;
 }, []);

 return (
 <AuthLayout
 description={t("Enter your credentials to access your account")}
 status={status}
 >
 <form noValidate onSubmit={submit}>
 <div className="space-y-4">
 {/* Email */}
 <div>
 <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">{t("Email")}</Label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
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
 className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 placeholder-gray-400 bg-gray-50 focus:bg-white"
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
 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
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
 className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 placeholder-gray-400 bg-gray-50 focus:bg-white"
 style={{ '--tw-ring-color': `${primaryColor}33` } as React.CSSProperties}
 aria-invalid={!!errors.password}
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
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

 {/* Submit */}
 <div className="mt-6">
 <AuthButton
 tabIndex={4}
 processing={processing}
 >
 {t("Sign in")}
 </AuthButton>
 </div>

 {/* Register link */}
 {(settings.registrationEnabled === 'true' || settings.registrationEnabled === true || settings.registrationEnabled === '1' || settings.registrationEnabled === 1) && (
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
 <div className="relative my-6">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-gray-200"></div>
 </div>
 <div className="relative flex justify-center text-sm">
 <span className="px-3 bg-white text-gray-400">{t("or continue with")}</span>
 </div>
 </div>

 {/* Social Login Buttons */}
 <SocialButtons primaryColor={primaryColor} />
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
 <img src={getThemeThumbnail(store.theme)} alt={store.theme} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/300x600?text=${encodeURIComponent(store.theme)}`; }} />
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
