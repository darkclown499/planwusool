import { useForm, usePage } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import AuthLayout from '@/layouts/auth-layout';
import AuthButton from '@/components/auth/auth-button';
import Recaptcha, { executeRecaptcha } from '@/components/recaptcha';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';

export default function ForgotPassword({ status }: { status?: string }) {
 const { t } = useTranslation();
 const [recaptchaToken, setRecaptchaToken] = useState<string>('');
 const { themeColor, customColor } = useBrand();
 const { settings = {} } = usePage().props as any;
 const recaptchaEnabled = settings.recaptchaEnabled === 'true' || settings.recaptchaEnabled === true || settings.recaptchaEnabled === 1 || settings.recaptchaEnabled === '1';
 const primaryColor = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS];
 const { data, setData, post, processing, errors, transform } = useForm<{ email: string; recaptcha_token?: string }>({
 email: '',
 recaptcha_token: '',
 });

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
 post(route('password.email'));
 return;
 } catch {
 alert(t('reCAPTCHA verification failed. Please try again.'));
 return;
 }
 }

 post(route('password.email'));
 };

 return (
 <AuthLayout
 title={t("Forgot your password?")}
 description={t("Enter your email to receive a password reset link")}
 status={status}
 >
 <form noValidate onSubmit={submit}>
 <div className="space-y-4">
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
 autoFocus
 tabIndex={1}
 autoComplete="email"
 value={data.email}
 onChange={(e) => setData('email', e.target.value)}
 placeholder="email@example.com"
 className="w-full ps-10 pe-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 placeholder-gray-400 bg-gray-50 focus:bg-white"
 style={{ '--tw-ring-color': `${primaryColor}33` } as React.CSSProperties}
 />
 </div>
 <InputError message={errors.email} />
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

 <div className="mt-6">
 <AuthButton
 tabIndex={2}
 processing={processing}
 >
 {t("Email password reset link")}
 </AuthButton>
 </div>

 <div className="text-center text-sm text-gray-500 mt-5">
 {t("Remember your password?")}{' '}
 <TextLink
 href={route('login')}
 className="font-semibold hover:underline"
 style={{ color: primaryColor }}
 tabIndex={3}
 >
 {t("Back to login")}
 </TextLink>
 </div>
 </form>
 </AuthLayout>
 );
}
