import React from 'react';
import { getImageUrl } from '../../../utils/image-helper';

interface FooterProps {
  storeName: string;
  logo?: string;
  email?: string;
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

export const Footer: React.FC<FooterProps> = ({
  storeName,
  logo,
  email,
  copyrightText
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-amber-800 text-amber-100 py-6">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center md:items-center space-y-4 md:space-y-0">
        <div className="text-center md:text-right">
          {logo ? (
            <img src={getImageUrl(logo)} alt={storeName} className="max-w-28 object-contain mb-2" />
          ) : (
            <h3 className="text-lg font-serif font-bold text-amber-200">{storeName}</h3>
          )}
          {email && <p className="text-amber-300 text-sm">{email}</p>}
        </div>
        <p className="text-amber-200 text-sm text-center md:text-left">
          {copyrightText || `© ${currentYear} ${storeName}. جميع الحقوق محفوظة.`}
        </p>
      </div>
    </footer>
  );
};