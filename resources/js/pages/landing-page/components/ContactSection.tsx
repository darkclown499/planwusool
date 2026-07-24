import React from 'react';
import { useForm } from '@inertiajs/react';
import { Mail, Phone, MapPin, Send, CheckCircle, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ContactSectionProps {
  brandColor?: string;
  flash?: {
    success?: string;
    error?: string;
  };
  settings?: {
    contact_email?: string;
    contact_phone?: string;
    contact_address?: string;
  };
  sectionData?: {
    title?: string;
    subtitle?: string;
    form_title?: string;
    info_title?: string;
    info_description?: string;
    faqs?: Array<{
      question: string;
      answer: string;
    }>;
  };
}

export default function ContactSection({ flash, settings, sectionData, brandColor = '#10b77f' }: ContactSectionProps) {
  const { t } = useTranslation();
  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('landing-page.contact'), {
      preserveScroll: true,
      onSuccess: () => {
        setIsSubmitted(true);
        reset();
        setTimeout(() => setIsSubmitted(false), 3000);
      }
    });
  };

  return (
    <section id="contact" className="py-12 sm:py-16 lg:py-20 bg-gray-50" dir="rtl" style={{ fontFamily: "'Tajawal', 'Segoe UI', sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t(sectionData?.title || 'تواصل معنا')}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed font-medium">
            {t(sectionData?.subtitle || 'لديك أسئلة حول وصول؟ نحب أن نسمع منك. أرسل لنا رسالة وسنرد في أقرب وقت ممكن.')}
          </p>
        </div>

        {/* Split Card Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 rounded-2xl shadow-xl overflow-hidden">
          {/* Contact Information - Green Side (Left in RTL) */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute top-1/2 -right-10 h-32 w-32 rounded-full bg-white/[0.03]" />

            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-3">
                {t(sectionData?.info_title || 'معلومات التواصل')}
              </h3>
              <p className="text-emerald-100 text-[15px] leading-relaxed mb-10">
                {t(sectionData?.info_description || 'نحن هنا لمساعدتك والإجابة على أي سؤال لديك. نتطلع لسماع منك.')}
              </p>

              <div className="space-y-7" dir="rtl">
                {/* Email */}
                <div className="flex items-center gap-4 justify-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-emerald-100 text-[13px] mb-0.5">{t('البريد الإلكتروني')}</p>
                    <p className="text-white font-semibold text-[15px] truncate">{settings?.contact_email || 'info@wusool.ps'}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-4 justify-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-emerald-100 text-[13px] mb-0.5">{t('الهاتف')}</p>
                    <p className="text-white font-semibold text-[15px]" dir="ltr">{settings?.contact_phone || '+970 59 123 4567'}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center gap-4 justify-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-emerald-100 text-[13px] mb-0.5">{t('العنوان')}</p>
                    <p className="text-white font-semibold text-[15px]">{settings?.contact_address || 'وكالة بلانكتون، قلقيلية، فلسطين'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom decorative element */}
            <div className="relative z-10 mt-10 pt-8 border-t border-white/20">
              <div className="flex items-center gap-3 justify-start">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <p className="text-emerald-100 text-[13px]">
                  {t('نتواصل معك خلال ٢٤ ساعة')}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form - White Side (Right in RTL) */}
          <div className="bg-white p-8 lg:p-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {t(sectionData?.form_title || 'أرسل لنا رسالة')}
            </h3>
            <p className="text-gray-500 text-[14px] mb-8">
              {t('املأ النموذج أدناه وسنرد عليك في أقرب وقت')}
            </p>

            {isSubmitted && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium">{t('شكراً لرسالتك. سنتواصل معك قريباً!')}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" role="form" aria-label="Contact form" dir="rtl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="text-red-500 ml-1">*</span>{t('الاسم الكامل')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-right text-[14px]"
                    placeholder={t("اسمك الكامل")}
                    required
                    dir="rtl"
                    disabled={processing}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-xs mt-1 text-right">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="text-red-500 ml-1">*</span>{t('البريد الإلكتروني')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-right text-[14px]"
                    placeholder={t("بريدك@الإلكتروني.com")}
                    required
                    dir="rtl"
                    disabled={processing}
                  />
                  {errors.email && (
                    <p className="text-red-600 text-xs mt-1 text-right">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="text-red-500 ml-1">*</span>{t('الموضوع')}
                </label>
                <input
                  type="text"
                  id="subject"
                  value={data.subject}
                  onChange={(e) => setData('subject', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-right text-[14px]"
                  placeholder={t("ما موضوع رسالتك؟")}
                  required
                  dir="rtl"
                  disabled={processing}
                />
                {errors.subject && (
                  <p className="text-red-600 text-xs mt-1 text-right">{errors.subject}</p>
                )}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="text-red-500 ml-1">*</span>{t('الرسالة')}
                </label>
                <textarea
                  id="message"
                  rows={5}
                  value={data.message}
                  onChange={(e) => setData('message', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all resize-none disabled:bg-gray-100 disabled:cursor-not-allowed text-right text-[14px]"
                  placeholder={t("اكتب تفاصيل رسالتك هنا...")}
                  required
                  dir="rtl"
                  disabled={processing}
                />
                {errors.message && (
                  <p className="text-red-600 text-xs mt-1 text-right">{errors.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full text-white px-8 py-3.5 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-lg shadow-md transition-all"
                style={{ backgroundColor: brandColor }}
                aria-label={processing ? t('جاري الإرسال') : t('إرسال الرسالة')}
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('جاري الإرسال...')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t('إرسال الرسالة')}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
