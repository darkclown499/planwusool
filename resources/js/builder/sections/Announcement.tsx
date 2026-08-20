import React from 'react';
import { Megaphone } from 'lucide-react';
import { css } from './helpers';
import type { BuilderSectionProps } from './helpers';

export const AnnouncementSection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const content = storeData?.content?.announcement || {};
  const text = props.text || content.text || '🎉 شحن سريع لجميع مناطق المملكة';
  const link = props.link || content.link || '';

  return (
    <div
      className="w-full overflow-hidden"
      style={{ background: css('--twc-primary', '#0f8a5f') }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2.5">
        <Megaphone className="h-4 w-4 shrink-0 text-white/80" />
        {link ? (
          <a href={link} className="text-sm font-semibold text-white hover:underline">
            {text}
          </a>
        ) : (
          <span className="text-sm font-semibold text-white">{text}</span>
        )}
      </div>
    </div>
  );
};