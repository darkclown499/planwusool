import React, { useEffect, useState, useRef } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { Mail, Phone, MapPin, CheckCircle, ArrowLeft, Globe, ChevronDown } from 'lucide-react';
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram, FaYoutube, FaTiktok, FaWhatsapp, FaTelegram, FaGithub } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useBrand } from '@/contexts/BrandContext';
import languageData from '@/../../resources/lang/language.json';

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

  const currentLocale = (i18n.language || 'en').split('-')[0];
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
      { name: 'القوالب', href: '#' },
      { name: 'التكاملات', href: '#' },
    ],
    company: [
      { name: 'عن وصول', href: '/about' },
      { name: 'المميزات', href: '/features' },
      { name: 'وظائف', href: '#' },
      { name: 'اتصل بنا', href: '#contact' },
    ],
    support: [
      { name: 'مركز المساعدة', href: '#' },
      { name: 'التوثيق', href: '#' },
      { name: 'واجهة برمجة التطبيقات', href: '#' },
      { name: 'حالة النظام', href: '#' },
    ],
    legal: [
      { name: 'سياسة الخصوصية', href: '/privacy' },
      { name: 'اتفاقية المستخدم', href: '/terms' },
      { name: 'حماية البيانات', href: '#' },
    ],
  };

  const iconMap: Record<string, any> = {
    Facebook: FaFacebook,
    Twitter: FaTwitter,
    LinkedIn: FaLinkedin,
    Instagram: FaInstagram,
    YouTube: FaYoutube,
    Tiktok: FaTiktok,
    WhatsApp: FaWhatsapp,
    Telegram: FaTelegram,
    Github: FaGithub,
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
            {t('انضم إلى آلاف أصحاب المتاجر الذين يبنون حضورهم الرقمي مع منصتنا.')}
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
                const logoUrl = superadminLogoLight || window.appSettings?.logo;
                const displayUrl = logoUrl ? (
                  logoUrl.startsWith('http') ? logoUrl :
                  logoUrl.startsWith('/storage/') ? `${window.appSettings?.baseUrl || window.location.origin}${logoUrl}` :
                  logoUrl.startsWith('/') ? `${window.appSettings?.baseUrl || window.location.origin}${logoUrl}` : logoUrl
                ) : '';

                return displayUrl ? (
                  <img src={displayUrl} alt={settings.company_name} className="h-7 w-auto max-w-[140px] object-scale-down" />
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: brandColor }}>W</div>
                    <span className="text-lg font-bold tracking-tight text-white">{settings.company_name}</span>
                  </div>
                );
              })()}
            </Link>
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-gray-400">
              {t('بنا و أدر متاجرك عبر واتساب بأدوات احترافية. بسيطة، قوية، وجاهزة للتوسع.')}
            </p>

            <div className="mt-6 space-y-3 text-[13px] text-gray-400">
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{settings.contact_email || 'info@wusool.ps'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-gray-500" />
                <span dir="ltr">{settings.contact_phone || '+970 59 123 4567'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-gray-500" />
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
                  const IconComponent = iconMap[social.icon] || FaFacebook;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/10 hover:text-white"
                      aria-label={social.name}
                    >
                      <IconComponent className="h-[18px] w-[18px]" />
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
