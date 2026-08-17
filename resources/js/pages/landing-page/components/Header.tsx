import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import { Menu, X, Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrand } from '@/contexts/BrandContext';
import ReactCountryFlag from 'react-country-flag';
import languageData from '@/../../resources/lang/language.json';

interface CustomPage {
  id: number;
  title: string;
  slug: string;
}

interface HeaderProps {
  brandColor?: string;
  settings: { company_name: string };
  sectionData?: any;
  customPages?: CustomPage[];
  user?: any;
  superadminLogoDark?: string;
  superadminLogoLight?: string;
}

export default function Header({ settings, sectionData, customPages = [], brandColor = '#3b82f6', user, superadminLogoDark, superadminLogoLight }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  const currentLocale = (i18n.language || 'ar').split('-')[0];
  const isRtl = ['ar', 'he'].includes(currentLocale);
  const currentLang = languageData.find(l => l.code === currentLocale) || languageData[0];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Arabic-first: direction is always RTL, never derived from language.
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = customPages.map((page) => ({
    name: page.title,
    href: route('custom-page.show', page.slug),
  }));

  const handleLanguageChange = async (nextLocale: string) => {
    await i18n.changeLanguage(nextLocale);
    localStorage.setItem('i18nextLng', nextLocale);
    // Direction stays RTL regardless of the chosen language.
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = nextLocale;
    setIsLangOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border-b border-gray-100'
            : 'bg-white/80 backdrop-blur-md'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[72px] items-center justify-between">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href={route('home')} className="flex items-center gap-2.5">
                {(() => {
                  const logoUrl = superadminLogoDark || window.appSettings?.logo || '/images/logos/wusool.png';
                  const displayUrl = logoUrl ? (
                    logoUrl.startsWith('http') ? logoUrl :
                    logoUrl.startsWith('/storage/') ? `${window.appSettings?.baseUrl || window.location.origin}${logoUrl}` :
                    logoUrl.startsWith('/') ? `${window.appSettings?.baseUrl || window.location.origin}${logoUrl}` : logoUrl
                  ) : '';

                  return displayUrl ? (
                    <img src={displayUrl} alt={settings.company_name} width={320} height={145} className="h-8 w-auto max-w-[180px] object-scale-down" />
                  ) : (
                    <img src="/images/logos/wusool.png" alt={settings.company_name} width={320} height={145} className="h-8 w-auto max-w-[180px] object-scale-down" />
                  );
                })()}
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden items-center gap-1 md:flex">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="relative rounded-lg px-4 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  {item.name}
                </Link>
              ))}
              <Link href="/about" className="relative rounded-lg px-4 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                {t('عن وصول')}
              </Link>
              <Link href="#features" className="relative rounded-lg px-4 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                {t('المميزات')}
              </Link>
              <Link href="#pricing" className="relative rounded-lg px-4 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                {t('الأسعار')}
              </Link>
              <Link href="/terms" className="relative rounded-lg px-4 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                {t('اتفاقية المستخدم')}
              </Link>
              <Link href="/privacy" className="relative rounded-lg px-4 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                {t('سياسة الخصوصية')}
              </Link>
            </nav>

            {/* Right side */}
            <div className="hidden items-center gap-3 md:flex">
              {/* Language Switcher */}
              <div ref={langRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
                >
                  <Globe className="h-4 w-4 text-gray-500" />
                  <ReactCountryFlag countryCode={currentLang.countryCode} svg style={{ width: '1.1em', height: '1.1em' }} />
                  <span className="hidden lg:inline">{currentLang.code.toUpperCase()}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    <div className="p-1.5">
                      {languageData.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                            currentLocale === lang.code
                              ? 'bg-gray-50 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <ReactCountryFlag countryCode={lang.countryCode} svg style={{ width: '1.2em', height: '1.2em' }} />
                          <span className="flex-1 text-start">{lang.name}</span>
                          {currentLocale === lang.code && <Check className="h-4 w-4" style={{ color: brandColor }} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Auth buttons */}
              {user ? (
                <Link
                  href={route('dashboard')}
                  className="btn-green rounded-lg px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: brandColor }}
                >
                  {t('Dashboard')}
                </Link>
              ) : (
                <>
                  <Link
                    href={route('login')}
                    className="rounded-lg px-4 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    {t('Login')}
                  </Link>
                  <Link
                    href={route('register')}
                    className="btn-green rounded-lg px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: brandColor }}
                  >
                    {t('Get Started')}
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition md:hidden ${isMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile menu */}
      <div
        className={`fixed top-0 z-50 flex h-full w-[85vw] max-w-sm flex-col border-r border-gray-200 bg-white shadow-2xl transition-transform duration-300 md:hidden ${
          isRtl ? 'right-0' : 'left-0'
        } ${isMenuOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'}`}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <span className="text-lg font-bold text-gray-900">{t('Menu')}</span>
          <button onClick={() => setIsMenuOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Mobile language selector */}
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t('Language')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {languageData.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all ${
                  currentLocale === lang.code
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <ReactCountryFlag countryCode={lang.countryCode} svg style={{ width: '1em', height: '1em' }} />
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile nav links */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link href="/about" className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
              {t('عن وصول')}
            </Link>
            <Link href="#features" className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
              {t('المميزات')}
            </Link>
            <Link href="#pricing" className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
              {t('الأسعار')}
            </Link>
            <Link href="/terms" className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
              {t('اتفاقية المستخدم')}
            </Link>
            <Link href="/privacy" className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
              {t('سياسة الخصوصية')}
            </Link>
          </div>
        </div>

        {/* Mobile auth buttons */}
        <div className="border-t border-gray-100 px-5 py-4 space-y-3">
          {user ? (
            <Link
              href={route('dashboard')}
              className="block w-full rounded-lg bg-gray-900 px-4 py-3 text-center text-sm font-semibold text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('Dashboard')}
            </Link>
          ) : (
            <>
              <Link
                href={route('login')}
                className="block w-full rounded-lg border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('Login')}
              </Link>
              <Link
                href={route('register')}
                className="block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: brandColor }}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('Get Started')}
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
