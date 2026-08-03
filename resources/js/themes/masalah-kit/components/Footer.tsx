import React from 'react';
import { useMasalahTheme } from '../MasalahThemeProvider';
import { useStorefrontLocale } from '../../../contexts/StorefrontLocaleContext';

interface FooterProps {
  storeName: string;
  logo?: string;
  email?: string;
  phone?: string;
  address?: string;
  copyrightText?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
    email?: string;
  };
}

const socialIcons: { key: string; label: string; path: string }[] = [
  { key: 'facebook', label: 'فيسبوك', path: 'M13.5 9H16V6h-2.5C11.57 6 10 7.57 10 9.5V11H8v3h2v7h3v-7h2.5l.5-3h-3V9.5c0-.28.22-.5.5-.5z' },
  { key: 'instagram', label: 'انستغرام', path: 'M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM12 5c2.2 0 2.5.01 3.4.05a4.9 4.9 0 011.6.3 3 3 0 011.7 1.7c.18.5.26 1.04.3 1.6.04.9.05 1.2.05 3.4s-.01 2.5-.05 3.4a4.9 4.9 0 01-.3 1.6 3 3 0 01-1.7 1.7c-.5.18-1.04.26-1.6.3-.9.04-1.2.05-3.4.05s-2.5-.01-3.4-.05a4.9 4.9 0 01-1.6-.3 3 3 0 01-1.7-1.7 4.9 4.9 0 01-.3-1.6C5 14.5 5 14.2 5 12s.01-2.5.05-3.4a4.9 4.9 0 01.3-1.6 3 3 0 011.7-1.7c.5-.18 1.04-.26 1.6-.3C9.5 5.01 9.8 5 12 5zm0 2.3c-2.15 0-3.9 1.75-3.9 3.9s1.75 3.9 3.9 3.9 3.9-1.75 3.9-3.9-1.75-3.9-3.9-3.9zm5.1-.55a.9.9 0 11-1.8 0 .9.9 0 011.8 0z' },
  { key: 'twitter', label: 'تويتر', path: 'M8.5 5h3l2.8 3.9L17.5 5h2l-4.3 4.9L20 19h-3l-3.1-4.3L10 19H8l4.6-5.3L8.5 5z' },
  { key: 'youtube', label: 'يوتيوب', path: 'M21.6 7.2a2.8 2.8 0 00-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 00-2 2A29 29 0 002 12a29 29 0 00.4 4.8 2.8 2.8 0 002 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 002-2A29 29 0 0022 12a29 29 0 00-.4-4.8zM10 15.2V8.8l6.2 3.2-6.2 3.2z' },
  { key: 'whatsapp', label: 'واتساب', path: 'M12 4a8 8 0 00-6.9 12l-1.1 4 4.1-1.1A8 8 0 1012 4zm0 2a6 6 0 11-3.1 11.1l-.3-.2-1.9.5.5-1.9-.2-.3A6 6 0 0112 6z' }
];

export const Footer: React.FC<FooterProps> = ({
  storeName,
  logo,
  email,
  phone,
  address,
  copyrightText,
  socialMedia
}) => {
  const theme = useMasalahTheme();
  const { t } = useStorefrontLocale();

  return (
    <footer className="mt-10 text-white">
      <div style={{ background: theme.colors.primaryDark }}>
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {logo ? (
                <img src={logo} alt={storeName} className="h-10 w-10 rounded-lg object-cover bg-white" />
              ) : (
                <span
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-lg font-bold"
                  style={{ background: theme.colors.primary }}
                >
                  {storeName.charAt(0)}
                </span>
              )}
              <span className="font-bold text-lg">{storeName}</span>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">{t(theme.copy.footerAbout)}</p>
          </div>

          <div>
            <h3 className="font-bold mb-3">{t('تواصل معنا')}</h3>
            <ul className="space-y-2 text-sm opacity-90">
              {phone && (
                <li className="flex items-center gap-2" dir="ltr">
                  <span className="opacity-70">{phone}</span>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{email}</span>
                </li>
              )}
              {address && (
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243A8 8 0 1117.657 16.657zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{address}</span>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-3">{t('تابعنا')}</h3>
            <div className="flex items-center gap-2">
              {socialIcons.map((social) => {
                const url = socialMedia?.[social.key as keyof typeof socialMedia];
                if (!url) return null;
                return (
                  <a
                    key={social.key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title={t(social.label)}
                    className="p-2.5 rounded-lg hover:bg-white/10 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={social.path} />
                    </svg>
                  </a>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {theme.copy.deliveryAreas.slice(0, 5).map((area) => (
                <span key={area} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="py-4 text-center text-xs opacity-80" style={{ background: theme.colors.primary }}>
        {copyrightText || `© ${new Date().getFullYear()} ${storeName} - ${t('جميع الحقوق محفوظة')}`}
      </div>
    </footer>
  );
};
