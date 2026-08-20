import React from 'react';
import { FileText } from 'lucide-react';
import { css } from './helpers';
import type { BuilderSectionProps } from './helpers';

export const CustomSection: React.FC<BuilderSectionProps> = ({ section, page }) => {
  const props = section.props || {};

  // `page` mode: render a full custom store page (served HTML content).
  if (page) {
    return (
      <section
        className="mx-auto max-w-4xl px-4 py-12"
        style={{ color: css('--twc-text-primary', '#0f172a') }}
      >
        {page.title && (
          <h1
            className="mb-6 text-3xl font-black sm:text-4xl"
            style={{ fontFamily: css('--twf-heading-font', 'inherit') }}
          >
            {page.title}
          </h1>
        )}
        <div
          className="prose-custom space-y-4 text-base leading-relaxed"
          style={{ color: css('--twc-text-secondary', '#475569') }}
          dangerouslySetInnerHTML={{ __html: page.content || '' }}
        />
        <style>{`.prose-custom img{max-width:100%;height:auto;border-radius:1rem}.prose-custom a{font-weight:700;text-decoration:underline;text-decoration-thickness:2px}`}</style>
      </section>
    );
  }

  // Home mode: free-form custom HTML/embed block.
  const html = props.html;
  if (!html) {
    return (
      <section className="w-full px-4 py-10" style={{ background: css('--twc-background', '#ffffff') }}>
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 text-center" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
          <FileText className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold" style={{ color: css('--twc-text-secondary', '#475569') }}>
            قسم مخصص — أضف محتوى HTML أو كوداً مدمجاً من المحرر.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full px-4 py-10" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="prose-custom2 mx-auto max-w-5xl" dangerouslySetInnerHTML={{ __html: html }} />
      <style>{`.prose-custom2 img{max-width:100%;height:auto;border-radius:1rem}.prose-custom2 iframe{max-width:100%}`}</style>
    </section>
  );
};