import React from 'react';
import {
  MessageCircle,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  MapPin,
  Mail,
  Phone,
} from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { css } from './helpers';
import type { BuilderSectionProps } from './helpers';

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-[18px] w-[18px]" />,
  instagram: <Instagram className="h-[18px] w-[18px]" />,
  facebook: <Facebook className="h-[18px] w-[18px]" />,
  twitter: <Twitter className="h-[18px] w-[18px]" />,
  youtube: <Youtube className="h-[18px] w-[18px]" />,
};

const platformKeys = ['whatsapp', 'instagram', 'facebook', 'twitter', 'youtube'];

export const FooterSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const { config, store } = useStorefrontCore();
  const storeName = config?.storeName || store?.name || storeData?.name || 'متجري';
  const pages = (storeData?.pages || []) as Array<{ slug: string; title: string }>;
  const social =
    config?.socialMedia && typeof config.socialMedia === 'object' ? (config.socialMedia as Record<string, string>) : {};

  const socialLinks = platformKeys
    .map((k) => ({ key: k, url: social[k] || social[`${k}_url`] }))
    .filter((s) => s.url && typeof s.url === 'string' && s.url.length > 0);

  return (
    <footer
      className="w-full border-t"
      style={{
        background: css('--twc-text-primary', '#0f172a'),
        borderColor: 'rgba(255,255,255,.08)',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 text-white">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              {config?.logo ? (
                <img src={config.logo} alt={storeName} className="h-9 w-9 rounded-xl bg-white object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-black" style={{ background: css('--twc-primary', '#0f8a5f') }}>
                  {storeName.slice(0, 1)}
                </span>
              )}
              <span className="text-lg font-extrabold" style={{ fontFamily: css('--twf-heading-font', 'inherit') }}>
                {storeName}
              </span>
            </div>
            {String(config?.description || '').trim() && (
              <p className="max-w-sm text-sm leading-relaxed text-white/70">{config.description}</p>
            )}
            {socialLinks.length > 0 && (
              <div className="mt-5 flex gap-2">
                {socialLinks.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.key}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20"
                  >
                    {SOCIAL_ICONS[s.key]}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-white/90">روابط سريعة</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="/" className="text-sm text-white/70 transition hover:text-white">الرئيسية</a>
              </li>
              <li>
                <a href="#template-products" className="text-sm text-white/70 transition hover:text-white">المنتجات</a>
              </li>
              {pages.map((p) => (
                <li key={p.slug}>
                  <a href={`/page/${p.slug}`} className="text-sm text-white/70 transition hover:text-white">
                    {p.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {props.show_contact !== false && (
            <div>
              <h4 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-white/90">تواصل معنا</h4>
              <ul className="space-y-3 text-sm text-white/70">
                {config?.address && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: css('--twc-primary', '#0f8a5f') }} />
                    {config.address}
                  </li>
                )}
                {config?.contactEmail && (
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0" style={{ color: css('--twc-primary', '#0f8a5f') }} />
                    {config.contactEmail}
                  </li>
                )}
                {(config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp) && (
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0" style={{ color: css('--twc-primary', '#0f8a5f') }} />
                    {config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
        <div
          className="mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-white/50 sm:flex-row"
          style={{ borderColor: 'rgba(255,255,255,.08)' }}
        >
          <span>جميع الحقوق محفوظة © {new Date().getFullYear()} {storeName}</span>
          <span>مدعوم بواسطة Wusool</span>
        </div>
      </div>
    </footer>
  );
};