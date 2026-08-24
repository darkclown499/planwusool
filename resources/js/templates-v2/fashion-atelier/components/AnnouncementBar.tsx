import React from 'react';
import { Sparkles } from 'lucide-react';
import { useRotatingAnnouncement } from '../../shared/hooks';

interface AnnouncementBarProps {
  messages?: string[];
}

const DEFAULT_MESSAGES = [
  'توصيل سريع لجميع المناطق — والدفع عند الاستلام متاح',
  'شحن مجاني للطلبات فوق 250 ₪',
  'تشكيلات جديدة كل أسبوع — كوني الأولى بمن تراها',
];

/**
 * Atelier announcement ribbon — a slim editorial strip above the header.
 * Rotates between merchant-configurable messages (falls back to sensible
 * Arabic defaults) with a soft crossfade.
 */
export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ messages }) => {
  const items = messages && messages.length > 0 ? messages.filter(Boolean) : DEFAULT_MESSAGES;
  const index = useRotatingAnnouncement(items.length);

  return (
    <div
      className="relative z-40 overflow-hidden"
      style={{ background: 'linear-gradient(90deg,#2b2320,#4a3a33 50%,#2b2320)' }}
    >
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-2 px-4">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#d8b48a]" />
        <div className="relative h-full min-w-0 flex-1 sm:flex-none">
          {items.map((msg, i) => (
            <span
              key={i}
              className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-[12px] font-medium tracking-wide text-[#f5ede2] transition-all duration-500"
              style={{
                opacity: i === index ? 1 : 0,
                transform: `translateY(${i === index ? 0 : 8}px)`,
                pointerEvents: i === index ? 'auto' : 'none',
              }}
            >
              {msg}
            </span>
          ))}
        </div>
        <Sparkles className="h-3.5 w-3.5 shrink-0 scale-x-[-1] text-[#d8b48a]" />
      </div>
    </div>
  );
};
