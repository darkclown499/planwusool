import React from 'react';
import { cn } from '@/lib/utils';
import { Facebook, Twitter, Instagram, YouTube, Mail, Phone, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/contexts/StoreContext';
import { useBrand } from '@/hooks/use-brand';

interface BaseFooterProps {
  brandColor?: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  className?: string;
}

export const BaseFooter: React.FC<BaseFooterProps> = ({
  brandColor = '#10b77f',
  companyName = 'Wusool',
  contactEmail = 'support@wusool.com',
  contactPhone = '+1 234 567 890',
  contactAddress = '123 Business St, City, Country',
  socialLinks = {},
  className,
}) => {
  const { t } = useTranslation();
  const { config } = useStore();
  const { themeColor } = useBrand();

  const currentYear = new Date().getFullYear();
  const primaryColor = brandColor || '#10b77f';

  const socialItems = [
    { name: 'Facebook', icon: Facebook, href: socialLinks?.facebook, color: 'text-blue-600 hover:text-blue-700' },
    { name: 'Twitter', icon: Twitter, href: socialLinks?.twitter, color: 'text-sky-500 hover:text-sky-600' },
    { name: 'Instagram', icon: Instagram, href: socialLinks?.instagram, color: 'text-pink-600 hover:text-pink-700' },
    { name: 'YouTube', icon: YouTube, href: socialLinks?.youtube, color: 'text-red-600 hover:text-red-700' },
  ].filter(item => item.href);

  const footerLinks = {
    product: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Templates', href: '/templates' },
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
      { label: 'Press', href: '/press' },
    ],
    support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/api-docs' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookie-policy' },
      { label: 'Security', href: '/security' },
    ],
  };

  return (
    <footer
      className={cn(
        'bg-gray-50 border-t border-gray-200',
        className
      )}
      style={{ borderColor: 'var(--theme-color)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: 'var(--theme-color)' }}
              >
                W
              </div>
              <span className="text-xl font-bold text-gray-900">{companyName}</span>
            </div>
            <p className="text-gray-600 text-sm max-w-xs mb-6">
              {'Empowering businesses to build and grow their online presence with powerful e-commerce tools.'}
            </p>
            <div className="flex gap-4">
              <a
                href={socialLinks?.facebook || '#'}
                className="text-gray-400 hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.046V9.43c0-2.546 1.512-3.918 3.74-3.918 1.063 0 2.156.086 2.445.124v2.68h-1.67c-1.31 0-1.563.623-1.563 1.532v2.146h3.237l-.414 3.47H14.72V24c5.737-.9 10.125-5.864 10.125-11.854z"/></svg>
              </a>
              <a
                href={socialLinks.twitter || '#'}
                className="text-gray-400 hover:text-sky-500 transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
              </a>
              <a
                href={socialLinks.instagram || '#'}
                className="text-gray-400 hover:text-pink-600 transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a
                href={socialLinks.youtube || '#'}
                className="text-gray-400 hover:text-red-600 transition-colors"
                aria-label="YouTube"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.166 3.166 0 00-.255-1.597C22.312 3.477 19.778 3.02 12 3.02s-10.313.457-11.246 1.198a3.172 3.172 0 00-.266 1.59c0 2.339.403 3.998 1.385 5.174.793.945 2.536 1.76 5.257 1.76 2.71 0 4.462-.82 5.27-1.792.772-1.175 1.188-2.795 1.385-5.163.048-.496.074-1.046.074-1.537 0-2.475-.367-3.998-1.134-5.137-.447-.69-1.21-1.03-1.95-1.03-.73 0-1.48.34-1.965 1.03-.772 1.147-1.138 2.69-1.138 5.172 0 .673.026 1.23.06 1.533zM12 19c3.866 0 7-3.134 7-7s-3.134-7-7-7 3.134 7 7 7zm0-2c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-10c-1.654 0-3 1.346-3 3s1.346 3 3 3 3-1.346 3-3-1.346-3-3-3z"/></svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Product</h3>
            <ul className="space-y-3">
              {[
                { label: 'Features', href: '/features' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Templates', href: '/templates' },
                { label: 'Integrations', href: '/integrations' },
              ].map(link => (
                <li key={link.label}>
                  <a href={link.href} className="text-gray-600 hover:text-primary text-sm transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-3">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Careers', href: '/careers' },
                { label: 'Blog', href: '/blog' },
                { label: 'Press', href: '/press' },
              ].map(link => (
                <li key={link.label}>
                  <a href={link.href} className="text-gray-600 hover:text-primary text-sm transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-3">
              {[
                { label: 'Help Center', href: '/help' },
                { label: 'Contact Us', href: '/contact' },
                { label: 'Documentation', href: '/docs' },
                { label: 'API Reference', href: '/api-docs' },
              ].map(link => (
                <li key={link.label}>
                  <a href={link.href} className="text-gray-600 hover:text-primary text-sm transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-3">
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Cookie Policy', href: '/cookie-policy' },
                { label: 'Security', href: '/security' },
              ].map(link => (
                <li key={link.label}>
                  <a href={link.href} className="text-gray-600 hover:text-primary text-sm transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              {'© '}{new Date().getFullYear()}{' '}{'Wusool'}. {'All rights reserved.'}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <a href="/privacy" className="hover:text-primary transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-primary transition-colors">Terms</a>
              <a href="/cookie-policy" className="hover:text-primary transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default BaseFooter;