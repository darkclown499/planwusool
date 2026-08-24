import React from 'react';
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Twitter, Youtube } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { css } from '@/builder/sections/helpers';
import type { BuilderSectionProps } from '@/builder/sections/helpers';

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
};

const platformKeys = ['whatsapp', 'instagram', 'facebook', 'twitter', 'youtube'];

/**
 * modern-minimal Footer — light, not the near-black block the generic
 * footer uses: a plain top hairline, quiet gray type, thin dividers
 * between columns on desktop instead of card chrome. Reads as the last
 * bit of whitespace on the page, not a bold closing statement.
 */
export const Footer: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const { config, store } = useStorefrontCore();
  const storeName = config?.storeName || store?.name || storeData?.name || 'متجري';
  const pages = (storeData?.pages || []) as Array<{ slug: string; title: string }>;
  const social = config?.socialMedia && typeof config.socialMedia === 'object' ? (config.socialMedia as Record<string, string>) : {};

  const toSocialUrl = (key: string, raw?: string): string => {
    let v = String(raw || '').trim().replace(/^\/+/, '');
    if (!v) return '';
    if (key === 'whatsapp' && !/^https?:\/\//i.test(v)) {
      const digits = v.replace(/\D/g, '');
      return digits ? `https://wa.me/${digits}` : '';
    }
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    return v;
  };

  const socialLinks = platformKeys
    .map((k) => ({ key: k, url: toSocialUrl(k, social[k] || social[`${k}_url`]) }))
    .filter((s) => s.url.length > 0);

  const border = css('--twc-border', '#e2e8f0');
  const textPrimary = css('--twc-text-primary', '#0f172a');
  const textSecondary = css('--twc-text-secondary', '#64748b');

  return (
    <footer className="w-full border-t" style={{ background: css('--twc-background', '#ffffff'), borderColor: border }}>
      <div className="container mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-3 flex items-center gap-2.5">
              {config?.logo ? (
                <img src={config.logo} alt={storeName} className="h-8 w-8 object-contain" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold" style={{ border: `1px solid ${border}`, color: textPrimary }}>
                  {storeName.slice(0, 1)}
                </span>
              )}
              <span className="text-base font-semibold tracking-tight" style={{ color: textPrimary, fontFamily: css('--twf-heading-font', 'inherit') }}>
                {storeName}
              </span>
            </div>
            {String(config?.description || '').trim() && (
              <p className="max-w-sm text-sm leading-relaxed" style={{ color: textSecondary }}>
                {config.description}
              </p>
            )}
            {socialLinks.length > 0 && (
              <div className="mt-5 flex gap-4">
                {socialLinks.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.key}
                    className="transition hover:opacity-60"
                    style={{ color: textSecondary }}
                  >
                    {SOCIAL_ICONS[s.key]}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-4 text-xs font-medium uppercase tracking-[0.14em]" style={{ color: textPrimary }}>
              روابط
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="/" className="text-sm transition hover:opacity-60" style={{ color: textSecondary }}>
                  الرئيسية
                </a>
              </li>
              <li>
                <a href="#template-products" className="text-sm transition hover:opacity-60" style={{ color: textSecondary }}>
                  المنتجات
                </a>
              </li>
              {pages.map((p) => (
                <li key={p.slug}>
                  <a href={`/page/${p.slug}`} className="text-sm transition hover:opacity-60" style={{ color: textSecondary }}>
                    {p.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {props.show_contact !== false && (
            <div>
              <h4 className="mb-4 text-xs font-medium uppercase tracking-[0.14em]" style={{ color: textPrimary }}>
                تواصل معنا
              </h4>
              <ul className="space-y-3 text-sm" style={{ color: textSecondary }}>
                {config?.address && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {config.address}
                  </li>
                )}
                {config?.contactEmail && (
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0" />
                    {config.contactEmail}
                  </li>
                )}
                {(config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp) && (
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0" />
                    {config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs sm:flex-row" style={{ borderColor: border, color: textSecondary }}>
          <span>جميع الحقوق محفوظة © {new Date().getFullYear()} {storeName}</span>
          <span>مدعوم بواسطة Wusool</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
