import React from 'react';
import { Languages } from 'lucide-react';
import { useStorefrontLocale, StorefrontLocale } from '@/contexts/StorefrontLocaleContext';

const OPTIONS: { code: StorefrontLocale; label: string }[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'he', label: 'עברית' },
  { code: 'en', label: 'English' },
];

export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale } = useStorefrontLocale();

  return (
    <div
      className="fixed bottom-4 left-4 z-[9999] flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 p-1 shadow-lg backdrop-blur-sm"
      role="group"
      aria-label="Language"
    >
      <Languages className="h-4 w-4 mx-1 text-gray-400" />
      {OPTIONS.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => setLocale(option.code)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            locale === option.code
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
