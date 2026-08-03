import React from 'react';
import { useMasalahTheme } from '../MasalahThemeProvider';
import { useStorefrontLocale } from '../../../contexts/StorefrontLocaleContext';

interface SidebarProps {
  categories: { id: string; name: string }[];
  activeCategory: string;
  onCategoryClick: (id: string) => void;
  phone: string;
  address?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
    email?: string;
  };
  onClose?: () => void;
}

const socialLinks: { key: string; label: string; path: string }[] = [
  { key: 'facebook', label: 'فيسبوك', path: 'M13.5 9H16V6h-2.5C11.57 6 10 7.57 10 9.5V11H8v3h2v7h3v-7h2.5l.5-3h-3V9.5c0-.28.22-.5.5-.5z' },
  { key: 'instagram', label: 'انستغرام', path: 'M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM12 5c2.2 0 2.5.01 3.4.05a4.9 4.9 0 011.6.3 3 3 0 011.7 1.7c.18.5.26 1.04.3 1.6.04.9.05 1.2.05 3.4s-.01 2.5-.05 3.4a4.9 4.9 0 01-.3 1.6 3 3 0 01-1.7 1.7c-.5.18-1.04.26-1.6.3-.9.04-1.2.05-3.4.05s-2.5-.01-3.4-.05a4.9 4.9 0 01-1.6-.3 3 3 0 01-1.7-1.7 4.9 4.9 0 01-.3-1.6C5 14.5 5 14.2 5 12s.01-2.5.05-3.4a4.9 4.9 0 01.3-1.6 3 3 0 011.7-1.7c.5-.18 1.04-.26 1.6-.3C9.5 5.01 9.8 5 12 5zm0 2.3c-2.15 0-3.9 1.75-3.9 3.9s1.75 3.9 3.9 3.9 3.9-1.75 3.9-3.9-1.75-3.9-3.9-3.9zm5.1-.55a.9.9 0 11-1.8 0 .9.9 0 011.8 0z' },
  { key: 'twitter', label: 'تويتر', path: 'M8.5 5h3l2.8 3.9L17.5 5h2l-4.3 4.9L20 19h-3l-3.1-4.3L10 19H8l4.6-5.3L8.5 5z' },
  { key: 'whatsapp', label: 'واتساب', path: 'M12 4a8 8 0 00-6.9 12l-1.1 4 4.1-1.1A8 8 0 1012 4zm0 2a6 6 0 11-3.1 11.1l-.3-.2-1.9.5.5-1.9-.2-.3A6 6 0 0112 6zm-2.5 3.5c.1 0 .2.1.3.2l1 1.5c.1.1.1.3 0 .4l-.4.5c-.1.1-.1.2 0 .4.3.5.9 1.3 1.6 1.9.7.6 1.5 1 2.1 1.2.2.1.4 0 .5-.1l.6-.6c.1-.1.3-.1.4 0l1.5 1c.1.1.2.2.2.3 0 .2 0 .5-.1.7-.1.3-.3.5-.5.7-.3.3-.6.5-.9.5-.9.2-2.6.1-4.6-1.5-1.3-1.1-2.3-2.5-2.6-3.3-.2-.5-.2-.9-.1-1.2.1-.3.2-.5.5-.8.2-.2.5-.4.8-.4z' }
];

export const Sidebar: React.FC<SidebarProps> = ({
  categories,
  activeCategory,
  onCategoryClick,
  phone,
  address,
  socialMedia,
  onClose
}) => {
  const theme = useMasalahTheme();
  const { t } = useStorefrontLocale();

  const handleCategoryClick = (id: string) => {
    onCategoryClick(id);
    if (onClose) onClose();
  };

  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className={theme.layout.stickySidebar ? 'md:sticky md:top-20' : ''}>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div
            className="px-4 py-3 text-white font-bold text-sm"
            style={{ background: theme.colors.primary }}
          >
             {t('الأقسام')}
          </div>
          <nav className="py-2">
            {categories.map((category) => {
              const active = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="w-full text-right px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer transition-colors"
                  style={{
                    color: active ? theme.colors.primary : '#374151',
                    background: active ? theme.colors.primarySoft : 'transparent',
                    borderInlineStart: active ? `3px solid ${theme.colors.primary}` : '3px solid transparent'
                  }}
                >
                  <span className="font-medium">{category.name}</span>
                  <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
           <h3 className="text-sm font-bold text-gray-800 mb-3">{t('تواصل معنا')}</h3>
          {phone && (
            <a
              href={`tel:${phone}`}
              dir="ltr"
              className="flex items-center gap-2 text-sm text-gray-600 mb-2 hover:text-blue-600"
            >
              <svg className="w-4 h-4" style={{ color: theme.colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.2 3.6a1 1 0 01-.27 1.06l-1.45 1.45a12.05 12.05 0 005.64 5.64l1.45-1.45a1 1 0 011.06-.27l3.6 1.2a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C10.02 21 3 13.98 3 5z" />
              </svg>
              <span className="font-mono text-xs">{phone}</span>
            </a>
          )}
          {address && (
            <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: theme.colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243A8 8 0 1117.657 16.657zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs">{address}</span>
            </div>
          )}
          {socialMedia && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              {socialLinks.map((social) => {
                const url = socialMedia[social.key as keyof typeof socialMedia];
                if (!url) return null;
                return (
                  <a
                    key={social.key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title={t(social.label)}
                    className="p-2 rounded-lg text-gray-500 hover:text-white transition-colors"
                    style={{ background: theme.colors.primarySoft }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={social.path} />
                    </svg>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
