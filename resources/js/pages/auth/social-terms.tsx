import { useForm } from '@inertiajs/react';
import { FileText, ShieldCheck } from 'lucide-react';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import InputError from '@/components/input-error';
import AuthLayout from '@/layouts/auth-layout';
import AuthButton from '@/components/auth/auth-button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';

export default function SocialTerms() {
 const { t } = useTranslation();
 const { themeColor, customColor } = useBrand();
 const primaryColor = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS];

 const { data, setData, post, processing, errors, setError } = useForm({
  terms: false,
 });

 const submit: FormEventHandler = (e) => {
  e.preventDefault();

  if (!data.terms) {
   setError('terms', t('Please accept the terms to continue.'));
   return;
  }

  post(route('social.terms.accept'));
 };

 return (
  <AuthLayout
   title={t("One last step")}
   description={t("Before you continue, please review and accept our Terms of Service and Privacy Policy.")}
  >
   <form noValidate onSubmit={submit}>
    <div className="space-y-6">
     {/* Icon */}
     <div className="flex justify-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
       <ShieldCheck size={32} style={{ color: primaryColor }} />
      </div>
     </div>

     <p className="text-sm text-gray-500 text-center leading-relaxed">
      {t("This step is required so you can continue using your account.")}
     </p>

     {/* Terms checkbox */}
     <div>
      <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
       <Checkbox
        id="terms"
        name="terms"
        checked={data.terms}
        onCheckedChange={(checked) => {
         setData('terms', !!checked);
         if (errors.terms) setError('terms', '');
        }}
        className="w-[18px] h-[18px] rounded-lg border-2 border-gray-300 data-[state=checked]:border-transparent transition-all duration-200 mt-0.5"
        style={data.terms ? { backgroundColor: primaryColor, borderColor: primaryColor } as React.CSSProperties : {}}
       />
       <Label
        htmlFor="terms"
        className="text-sm text-gray-600 leading-relaxed select-none cursor-pointer"
       >
        {t("I accept the")}{' '}
        <a
         href={route('page.terms')}
         target="_blank"
         rel="noopener noreferrer"
         className="inline-flex items-center gap-1 font-medium hover:underline"
         style={{ color: primaryColor }}
        >
         <FileText className="h-3.5 w-3.5" />
         {t("Terms of Service")}
        </a>
        {' '}{t("and the")}{' '}
        <a
         href={route('page.privacy')}
         target="_blank"
         rel="noopener noreferrer"
         className="inline-flex items-center gap-1 font-medium hover:underline"
         style={{ color: primaryColor }}
        >
         <FileText className="h-3.5 w-3.5" />
         {t("Privacy Policy")}
        </a>
       </Label>
      </div>
      <InputError message={errors.terms} />
     </div>

     {/* Submit */}
     <div>
      <AuthButton processing={processing}>
       {t("Accept & Continue")}
      </AuthButton>
     </div>
    </div>
   </form>
  </AuthLayout>
 );
}