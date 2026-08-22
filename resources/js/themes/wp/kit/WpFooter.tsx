import React from 'react';
import { Facebook, Instagram, Mail, MapPin, Phone, Twitter } from 'lucide-react';
import type { WpThemeConfig } from '../types';

interface WpFooterProps {
  config: WpThemeConfig;
  /** Real store name — wins over the theme placeholder. */
  storeName?: string;
  categories: any[];
}

/**
 * Faithful family footer: widget columns (about / quick links / categories /
 * contact) over a copyright bar — the originals' footer.php layout,
 * translated to Arabic.
 */
export const WpFooter: React.FC<WpFooterProps> = ({ config, storeName, categories }) => {
  const { footer, header } = config;
  const brandName = storeName || config.name;

  return (
    <footer className="wpt-footer">
      <div className="wpt-container wpt-footer__cols">
        <div>
          <h4>عن المتجر</h4>
          <p className="wpt-footer__about">{footer.about}</p>
        </div>

        <div>
          <h4>روابط سريعة</h4>
          <ul>
            {header.menu.slice(0, 4).map((m) => (
              <li key={m}>
                <a href="#" className="no-underline">{m}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4>أقسامنا</h4>
          <ul>
            {categories.slice(0, 4).map((c) => (
              <li key={c.id}>
                <a href="#wpt-categories" className="no-underline">{c.name}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4>تواصل معنا</h4>
          <ul style={{ display: 'grid', gap: 12 }}>
            {header.phone && (
              <li className="flex items-center gap-2">
                <Phone size={14} />
                <span dir="ltr">{header.phone}</span>
              </li>
            )}
            {header.email && (
              <li className="flex items-center gap-2">
                <Mail size={14} />
                {header.email}
              </li>
            )}
            <li className="flex items-center gap-2">
              <MapPin size={14} />
              المملكة العربية السعودية
            </li>
          </ul>
          {header.socials && (
            <div className="mt-4 flex gap-3">
              {[Facebook, Twitter, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="no-underline inline-flex items-center justify-center rounded-full"
                  style={{
                    width: 36,
                    height: 36,
                    background: 'rgba(255,255,255,.08)',
                    color: '#fff',
                  }}
                  aria-label="تواصل اجتماعي"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="wpt-footer__bar">
        © {new Date().getFullYear()} {brandName} — جميع الحقوق محفوظة · يعمل بواسطة وصول
      </div>
    </footer>
  );
};
