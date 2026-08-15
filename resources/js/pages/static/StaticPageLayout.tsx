import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Menu, X, Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactCountryFlag from 'react-country-flag';
import languageData from '@/../../resources/lang/language.json';

interface StaticPageLayoutProps {
  title: string;
  children: React.ReactNode;
  brandColor?: string;
}

export default function StaticPageLayout({
  title,
  children,
  brandColor = '#10b77f'
}: StaticPageLayoutProps) {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language || 'ar').split('-')[0];
  const isRtl = ['ar', 'he'].includes(currentLocale);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

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

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setIsLangOpen(false);
  };

  return (
    <div
      className="min-h-screen bg-gray-950"
      dir="rtl"
      style={{ fontFamily: isRtl ? 'Tajawal, "IBM Plex Sans Arabic", Inter, sans-serif' : 'Inter, "Segoe UI", sans-serif' }}
    >
      {/* Header — matches landing page */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'border-b border-white/10 bg-gray-950/90 backdrop-blur-xl shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[72px] items-center justify-between">
            {/* Logo */}
            <Link href={route('home')} className="flex items-center gap-2.5">
              <img src="/images/logos/wusool-Tlogo.png" alt="Wusool" className="h-8 w-auto" />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden items-center gap-1 md:flex">
              <Link href={route('home')} className="rounded-lg px-4 py-2 text-[13px] font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
                {isRtl ? 'الرئيسية' : 'Home'}
              </Link>
              <Link href="/about" className="rounded-lg px-4 py-2 text-[13px] font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
                {t('عن وصول')}
              </Link>
              <Link href="/terms" className="rounded-lg px-4 py-2 text-[13px] font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
                {t('اتفاقية المستخدم')}
              </Link>
              <Link href="/privacy" className="rounded-lg px-4 py-2 text-[13px] font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
                {t('سياسة الخصوصية')}
              </Link>
            </nav>

            {/* Right side */}
            <div className="hidden items-center gap-3 md:flex">
              {/* Language Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-medium text-gray-300 transition-all hover:border-white/20 hover:bg-white/10"
                >
                  <Globe className="h-4 w-4 text-gray-400" />
                  <ReactCountryFlag countryCode={currentLang.countryCode} svg style={{ width: '1.1em', height: '1.1em' }} />
                  <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-2xl">
                    <div className="p-1.5">
                      {languageData.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                            currentLocale === lang.code
                              ? 'bg-white/10 text-white'
                              : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <ReactCountryFlag countryCode={lang.countryCode} svg style={{ width: '1.2em', height: '1.2em' }} />
                          <span className="flex-1 text-start">{lang.name}</span>
                          {currentLocale === lang.code && <Check className="h-4 w-4 text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link
                href={route('home')}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-emerald-700"
              >
                <ArrowLeft size={16} className={isRtl ? 'rotate-180' : ''} />
                {isRtl ? 'العودة' : 'Home'}
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition md:hidden ${isMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setIsMenuOpen(false)} />
      <div className={`fixed top-0 z-50 flex h-full w-[85vw] max-w-sm flex-col border-l border-white/10 bg-gray-950 shadow-2xl transition-transform duration-300 md:hidden ${isRtl ? 'right-0' : 'left-0'} ${isMenuOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <img src="/images/logos/wusool-Tlogo.png" alt="Wusool" className="h-7 w-auto" />
          <button onClick={() => setIsMenuOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-white/10"><X size={20} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <Link href={route('home')} className="block rounded-lg px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">{isRtl ? 'الرئيسية' : 'Home'}</Link>
          <Link href="/about" className="block rounded-lg px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">{t('عن وصول')}</Link>
          <Link href="/terms" className="block rounded-lg px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">{t('اتفاقية المستخدم')}</Link>
          <Link href="/privacy" className="block rounded-lg px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">{t('سياسة الخصوصية')}</Link>
        </nav>
      </div>

      {/* Title banner */}
      <div className="relative pt-[72px]">
        <div className="bg-gradient-to-b from-emerald-900/20 to-gray-950 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{title}</h1>
            <div className="mt-4 h-1 w-20 mx-auto rounded-full bg-gradient-to-r from-emerald-500 to-teal-600" />
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-gray-950 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-[13px] text-gray-500">
            &copy; {new Date().getFullYear()} Wusool. {isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
