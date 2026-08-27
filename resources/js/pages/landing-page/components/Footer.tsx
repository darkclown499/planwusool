import React, { useEffect, useState, useRef } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Mail, Phone, MapPin, CheckCircle, ArrowLeft, Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrand } from '@/contexts/BrandContext';
import languageData from '@/../../resources/lang/language.json';

// Lightweight inline brand icons (replaces the ~790KB react-icons dependency
// so the landing page no longer ships a giant icon library for 9 social links).
const SocialIcon = ({ name, className }: { name: string; className?: string }) => {
  const paths: Record<string, React.ReactNode> = {
    Facebook: <path d="M13.5 9H15V6.5h-1.5c-1.93 0-3.5 1.57-3.5 3.5v1.5H8V14h2v6h2.5v-6h2l.5-2.5h-2.5V10c0-.55.45-1 1-1z" />,
    Twitter: <path d="M17.75 4h2.9l-6.34 7.24L21.5 20h-5.84l-4.57-5.98L6 20H3.1l6.78-7.75L2.5 4h5.99l4.13 5.46L17.75 4zm-1.02 14.38h1.6L7.32 5.55h-1.72l11.13 12.83z" />,
    LinkedIn: <path d="M6.94 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM3.5 8h2.88V20H3.5V8zm5.88 0h2.76v1.64h.04c.38-.73 1.33-1.5 2.74-1.5 2.93 0 3.47 1.93 3.47 4.44V20h-2.88v-5.83c0-1.39-.03-3.18-1.94-3.18-1.94 0-2.24 1.51-2.24 3.08V20H9.38V8z" />,
    Instagram: <path d="M7.75 4h8.5A3.75 3.75 0 0 1 20 7.75v8.5A3.75 3.75 0 0 1 16.25 20h-8.5A3.75 3.75 0 0 1 4 16.25v-8.5A3.75 3.75 0 0 1 7.75 4zm0 1.5A2.25 2.25 0 0 0 5.5 7.75v8.5A2.25 2.25 0 0 0 7.75 18.5h8.5a2.25 2.25 0 0 0 2.25-2.25v-8.5A2.25 2.25 0 0 0 16.25 5.5h-8.5zm4.25 2.25a4.25 4.25 0 1 1 0 8.5 4.25 4.25 0 0 1 0-8.5zm0 1.5a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5zm5.25-.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />,
    YouTube: <path d="M20.5 8.25a2.5 2.5 0 0 0-1.76-1.77C17.36 6 12 6 12 6s-5.36 0-6.74.48A2.5 2.5 0 0 0 3.5 8.25 26 26 0 0 0 3.25 12a26 26 0 0 0 .25 3.75 2.5 2.5 0 0 0 1.76 1.77C6.64 18 12 18 12 18s5.36 0 6.74-.48a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 20.75 12a26 26 0 0 0-.25-3.75zM10.5 15V9l5 3-5 3z" />,
    Tiktok: <path d="M15.75 3.5h.1c.08 1.05.5 2.08 1.19 2.9.69.8 1.61 1.35 2.66 1.56v2.8c-1.23.04-2.4-.36-3.4-1.1v5.87a5.06 5.06 0 1 1-5.06-5.06c.28 0 .56.02.83.07v2.92a2.16 2.16 0 1 0 1.53 2.07V3.5h2.25z" />,
    WhatsApp: <path d="M12 3.5a8.5 8.5 0 0 0-7.33 12.76L3.5 20.5l4.32-1.13A8.5 8.5 0 1 0 12 3.5zm0 1.6a6.9 6.9 0 1 1-3.5 12.85l-.25-.15-2.56.67.68-2.5-.16-.26A6.9 6.9 0 0 1 12 5.1zm-2.4 3.2c-.13 0-.34.05-.52.24-.18.2-.7.68-.7 1.66s.71 1.92.81 2.05c.1.13 1.4 2.14 3.4 3 1.17.5 1.63.54 2.2.47.34-.04 1.1-.45 1.25-.89.16-.43.16-.8.11-.88-.05-.08-.18-.13-.38-.23s-1.18-.58-1.36-.65c-.18-.06-.31-.1-.44.1-.13.19-.5.64-.61.77-.11.13-.23.15-.42.05-.2-.1-.84-.31-1.6-.99-.59-.53-.99-1.18-1.1-1.38-.12-.2-.01-.31.09-.41.09-.09.2-.23.3-.35.1-.12.13-.2.2-.34.06-.13.03-.25-.02-.35-.05-.1-.44-1.05-.6-1.44-.16-.38-.32-.33-.44-.34h-.37z" />,
    Telegram: <path d="M21.2 4.1c-.23-.9-.76-1.15-1.54-.85L3.64 9.9c-1.48.58-1.47 1.42-.27 1.8l4.5 1.4 1.75 5.4c.2.5.1.9.68.9.46 0 .67-.21.93-.47l2.16-2.08 4.48 3.31c.83.46 1.42.22 1.63-.76l2.98-14.02c.3-1.2-.1-1.86-1.28-1.48zM7.4 12.5l10.3-6.5c.5-.3.96-.13.59.18l-8.44 7.62-.32 3.06-2.13-4.36z" />,
    Github: <path d="M12 3a9 9 0 0 0-2.84 17.54c.45.08.62-.2.62-.44v-1.55c-2.55.55-3.09-1.23-3.09-1.23-.42-1.06-1.02-1.35-1.02-1.35-.83-.57.06-.56.06-.56.92.07 1.4.95 1.4.95.82 1.4 2.15 1 2.67.76.08-.6.32-1 .58-1.23-2.02-.23-4.15-1.01-4.15-4.5 0-1 .36-1.8.94-2.44-.1-.23-.41-1.16.09-2.42 0 0 .76-.25 2.5.93a8.7 8.7 0 0 1 4.55 0c1.74-1.18 2.5-.93 2.5-.93.5 1.26.19 2.19.09 2.42.58.64.94 1.45.94 2.44 0 3.5-2.13 4.26-4.16 4.49.33.28.62.84.62 1.7V20c0 .24.17.52.63.44A9 9 0 0 0 12 3z" />,
  };
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      {paths[name] || paths.Facebook}
    </svg>
  );
};

interface FooterProps {
  brandColor?: string;
  settings: {
    company_name: string;
    contact_email: string;
    contact_phone: string;
    contact_address: string;
  };
  sectionData?: {
    description?: string;
    newsletter_title?: string;
    newsletter_subtitle?: string;
    links?: any;
    social_links?: Array<{ name: string; icon: string; href: string }>;
    section_titles?: { product: string; company: string; support: string; legal: string };
  };
  superadminLogoLight?: string;
}

export default function Footer({ settings, sectionData = {}, brandColor = '#10b77f', superadminLogoLight }: FooterProps) {
  const { t, i18n } = useTranslation();
  const { footerText } = useBrand();
  const currentYear = new Date().getFullYear();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const currentLocale = (i18n.language || 'ar').split('-')[0];
  const isRtl = ['ar', 'he'].includes(currentLocale);

  useEffect(() => {
    // Arabic-first: direction is always RTL, never derived from language.
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data, setData, post, processing, errors, reset } = useForm({ email: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('landing-page.subscribe'), {
      preserveScroll: true,
      onSuccess: () => {
        setIsSubmitted(true);
        reset();
        setTimeout(() => setIsSubmitted(false), 3000);
      },
    });
  };

  const footerLinks = sectionData.links || {
    product: [
      { name: 'الميزات', href: '#features' },
      { name: 'الأسعار', href: '#pricing' },
      { name: 'القوالب', href: '#features' },
      { name: 'التكاملات', href: '#features' },
    ],
    company: [
      { name: 'عن وصول', href: '/about' },
      { name: 'المميزات', href: '/features' },
      { name: 'اتصل بنا', href: '#contact' },
    ],
    support: [
      { name: 'مركز المساعدة', href: '/features' },
      { name: 'اتصل بنا', href: '#contact' },
    ],
    legal: [
      { name: 'سياسة الخصوصية', href: '/privacy' },
      { name: 'اتفاقية المستخدم', href: '/terms' },
    ],
  };

  const iconMap: Record<string, string> = {
    Facebook: 'Facebook',
    Twitter: 'Twitter',
    LinkedIn: 'LinkedIn',
    Instagram: 'Instagram',
    YouTube: 'YouTube',
    Tiktok: 'Tiktok',
    WhatsApp: 'WhatsApp',
    Telegram: 'Telegram',
    Github: 'Github',
  };

  const socialLinks = sectionData.social_links || [
    { name: 'Facebook', icon: 'Facebook', href: '#' },
    { name: 'Twitter', icon: 'Twitter', href: '#' },
    { name: 'LinkedIn', icon: 'Linkedin', href: '#' },
    { name: 'Instagram', icon: 'Instagram', href: '#' },
  ];

  const handleLanguageChange = async (nextLocale: string) => {
    await i18n.changeLanguage(nextLocale);
    localStorage.setItem('i18nextLng', nextLocale);
    // Direction stays RTL regardless of the chosen language.
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = nextLocale;
    setLangOpen(false);
  };

  const currentLang = languageData.find(l => l.code === currentLocale);

  return (
    <footer className="border-t border-white/10 bg-slate-950" style={{ fontFamily: isRtl ? 'Tajawal, "IBM Plex Sans Arabic", Inter, sans-serif' : 'Inter, "Segoe UI", sans-serif' }}>
      {/* CTA Banner */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-800 px-8 py-12 text-center sm:px-12 sm:py-16">
          <h3 className="text-2xl font-bold text-white sm:text-3xl">{t('جاهز للبدء؟')}</h3>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-emerald-50">
            {t('ابدأ متجرك اليوم واستقبل طلباتك عبر واتساب بأدوات جاهزة ومتكاملة.')}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={route('register')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-[15px] font-semibold text-emerald-700 transition-all hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-lg"
            >
              {t('ابدأ تجربة مجانية')} <ArrowLeft size={16} />
            </Link>
            <Link
              href={route('login')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-7 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-white/10 hover:-translate-y-0.5"
            >
              {t('الدخول')}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href={route('home')} className="inline-flex items-center gap-2.5">
              {(() => {
                const logoUrl = superadminLogoLight || window.appSettings?.logo || '/images/logos/wusool.png';
                const displayUrl = logoUrl ? (
                  logoUrl.startsWith('http') ? logoUrl :
                  logoUrl.startsWith('/storage/') ? `${window.appSettings?.baseUrl || window.location.origin}${logoUrl}` :
                  logoUrl.startsWith('/') ? `${window.appSettings?.baseUrl || window.location.origin}${logoUrl}` : logoUrl
                ) : '';

                return displayUrl ? (
                  <img src={displayUrl} alt={settings.company_name} width={320} height={145} className="h-7 w-auto max-w-[140px] object-scale-down" />
                ) : (
                  <img src="/images/logos/wusool.png" alt={settings.company_name} width={320} height={145} className="h-7 w-auto max-w-[140px] object-scale-down" />
                );
              })()}
            </Link>
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-gray-400">
              {t('بنا و أدر متاجرك عبر واتساب بأدوات احترافية. بسيطة، قوية، وجاهزة للتوسع.')}
            </p>

            <div className="mt-6 space-y-3 text-[13px] text-gray-400">
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-gray-500 shrink-0" />
                <a
                  href={`mailto:${settings.contact_email || 'support@wusool.ps'}`}
                  className="hover:text-white transition-colors"
                >
                  {settings.contact_email || 'support@wusool.ps'}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-gray-500 shrink-0" />
                <a
                  href={`tel:${(settings.contact_phone || '+972559886886').replace(/[^+\d]/g, '')}`}
                  className="hover:text-white transition-colors"
                  dir="ltr"
                >
                  {settings.contact_phone || '+972559886886'}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
                <span>{settings.contact_address || 'وكالة بلانكتون، قلقيلية، فلسطين'}</span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {(['product', 'company', 'support', 'legal'] as const).map((group) => (
            <div key={group}>
              <h4 className="text-[14px] font-semibold text-white">
                {t(sectionData.section_titles?.[group] || (
                  group === 'product' ? 'المنتج' :
                  group === 'company' ? 'الشركة' :
                  group === 'support' ? 'الدعم' : 'قانوني'
                ))}
              </h4>
              <ul className="mt-4 space-y-3">
                {(footerLinks[group] || []).map((link: any) => {
                  const isInternal = link.href?.startsWith('/') && !link.href?.startsWith('//');
                  const Component = isInternal ? Link : 'a';
                  const props = isInternal ? { href: link.href } : { href: link.href, target: '_blank', rel: 'noopener noreferrer' };
                  return (
                    <li key={link.name}>
                      <Component {...props} className="text-[14px] text-gray-400 transition-all hover:text-emerald-400 hover:-translate-x-2 inline-block">
                        {t(link.name, { defaultValue: link.name })}
                      </Component>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-white/10 py-8 sm:flex-row">
          <div className="text-[13px] text-gray-500">
            <span>{footerText || `© ${currentYear} ${settings.company_name}. ${t('جميع الحقوق محفوظة.')}`}</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Language dropdown */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[13px] text-gray-400 transition-all hover:border-white/20 hover:text-white"
              >
                <Globe className="h-4 w-4" />
                <span>{currentLang?.name || currentLocale.toUpperCase()}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute bottom-full mb-2 left-0 min-w-[180px] rounded-xl border border-white/10 bg-slate-900 py-2 shadow-2xl z-50">
                  {languageData.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-[13px] transition-colors ${
                        currentLocale === lang.code
                          ? 'bg-white/10 text-white font-medium'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="w-5 text-center text-[11px] font-bold opacity-60">{lang.code.toUpperCase()}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => {
                  const iconName = iconMap[social.icon] || 'Facebook';
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/10 hover:text-white"
                      aria-label={social.name}
                    >
                      <SocialIcon name={iconName} className="h-[18px] w-[18px]" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
