import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { css } from './helpers';
import type { BuilderSectionProps } from './helpers';

export const NewsletterSection: React.FC<BuilderSectionProps> = ({ section }) => {
  const props = section.props || {};
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setDone(true);
  };

  return (
    <section className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
      <div
        className="mx-auto max-w-4xl overflow-hidden rounded-3xl text-white"
        style={{ background: `linear-gradient(135deg, ${css('--twc-primary', '#0f8a5f')}, ${css('--twc-secondary', '#0e7490')})` }}
      >
        <div className="flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-12">
          <h3 className="text-2xl font-black sm:text-3xl" style={{ fontFamily: css('--twf-heading-font', 'inherit') }}>
            {props.section_title || 'اشترك في نشرتنا البريدية'}
          </h3>
          <p className="max-w-lg text-sm text-white/90 sm:text-base">
            {props.subtitle || 'احصل على أحدث العروض والمنتجات أولاً بأول، مباشرة إلى بريدك الإلكتروني.'}
          </p>
          {done ? (
            <div className="flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-bold ring-1 ring-white/30">
              <CheckCircle2 className="h-5 w-5" />
              تم الاشتراك بنجاح، شكراً لك!
            </div>
          ) : (
            <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="بريدك الإلكتروني"
                className="w-full flex-1 rounded-full bg-white px-5 py-3 text-sm text-slate-800 outline-none ring-2 ring-transparent transition focus:ring-white/40"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold transition hover:opacity-90"
                style={{ color: css('--twc-primary', '#0f8a5f') }}
              >
                اشترك الآن
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};