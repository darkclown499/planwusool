import React from 'react';
import { MessageCircle, Mail, MapPin, Clock } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { SectionHeading, css } from './helpers';
import type { BuilderSectionProps } from './helpers';

export const ContactSection: React.FC<BuilderSectionProps> = ({ section }) => {
  const props = section.props || {};
  const { config } = useStorefrontCore();
  const phone = config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';
  const email = config?.contactEmail || config?.email || '';
  const address = config?.address || '';
  const storeName = config?.storeName || 'متجرنا';

  const cards = [
    { icon: <MessageCircle className="h-5 w-5" />, title: 'واتساب', value: phone || '—', href: phone ? `https://wa.me/${String(phone).replace(/\D/g, '')}` : '' },
    { icon: <Mail className="h-5 w-5" />, title: 'البريد الإلكتروني', value: email || '—', href: email ? `mailto:${email}` : '' },
    { icon: <MapPin className="h-5 w-5" />, title: 'العنوان', value: address || storeName, href: '' },
    { icon: <Clock className="h-5 w-5" />, title: 'ساعات العمل', value: props.hours || 'طوال أيام الأسبوع 9ص - 11م', href: '' },
  ];

  return (
    <section className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-surface', '#f8fafc') }}>
      <div className="mx-auto max-w-5xl">
        <SectionHeading title={props.section_title || 'تواصل معنا'} subtitle={'فريقنا جاهز للرد على استفساراتك.'} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => {
            const inner = (
              <div className="flex flex-col items-center gap-3 rounded-2xl border bg-white p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: css('--twc-primary', '#0f8a5f') }}>
                  {c.icon}
                </span>
                <p className="text-sm font-bold" style={{ color: css('--twc-text-primary', '#0f172a') }}>
                  {c.title}
                </p>
                <p className="text-sm break-all" style={{ color: css('--twc-text-secondary', '#475569') }}>
                  {c.value}
                </p>
              </div>
            );
            return c.href ? (
              <a key={i} href={c.href} target="_blank" rel="noopener noreferrer" className="min-w-0">
                {inner}
              </a>
            ) : (
              <div key={i} className="min-w-0">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};