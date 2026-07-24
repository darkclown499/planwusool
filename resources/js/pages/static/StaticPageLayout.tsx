import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StaticPageLayoutProps {
  title: string;
  children: React.ReactNode;
  brandColor?: string;
}

export default function StaticPageLayout({ title, children, brandColor = '#10b77f' }: StaticPageLayoutProps) {
  const { i18n } = useTranslation();
  const currentLocale = (i18n.language || 'en').split('-')[0];
  const isRtl = ['ar', 'he'].includes(currentLocale);

  return (
    <div
      className="min-h-screen bg-white"
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ fontFamily: isRtl ? 'Tajawal, "IBM Plex Sans Arabic", Inter, sans-serif' : 'Inter, "Segoe UI", sans-serif' }}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={route('home')} className="flex items-center gap-2.5">
            <img src="/images/logos/wusool-Tlogo.png" alt="Wusool" className="h-7 w-auto" />
            <span className="text-lg font-bold tracking-tight text-gray-900">Wusool</span>
          </Link>
          <Link
            href={route('home')}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <ArrowLeft size={16} className={isRtl ? 'rotate-180' : ''} />
            {isRtl ? 'العودة للرئيسية' : 'Back to Home'}
          </Link>
        </div>
      </header>

      {/* Page title banner */}
      <div className="bg-gray-950 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">{title}</h1>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="prose prose-lg prose-gray max-w-none text-gray-600 leading-relaxed" dir={isRtl ? 'rtl' : 'ltr'}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-[13px] text-gray-400">
            &copy; {new Date().getFullYear()} Wusool. {isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
