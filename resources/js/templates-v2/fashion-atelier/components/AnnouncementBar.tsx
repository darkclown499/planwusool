import React from 'react';
import { Sparkles } from 'lucide-react';
import { useRotatingAnnouncement, useStorefrontCore } from '../../shared/hooks';

interface AnnouncementBarProps {
  messages?: string[];
  /** Dynamic single text override (from Designer — announcement_text). */
  text?: string;
  /** Background color (announcement_bg_color). */
  bgColor?: string;
  /** Text/icon color (announcement_text_color). */
  textColor?: string;
  /** Visibility toggle (show_announcement). */
  visible?: boolean;
}

const DEFAULT_MESSAGES = [
  'توصيل سريع لجميع المناطق — والدفع عند الاستلام متاح',
  'شحن مجاني للطلبات فوق 250 ₪',
  'تشكيلات جديدة كل أسبوع — كوني الأولى بمن تراها',
];

/**
 * Atelier announcement ribbon — a slim editorial strip above the header.
 * Fixed overlap: icons and text are now inline flex with gap-2, no absolute
 * stacking. Rotates between messages when multiple are supplied; when a single
 * dynamic `text` is passed it renders inline without collision.
 */
export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  messages,
  text,
  bgColor,
  textColor,
  visible,
}) => {
  // Bind to live store content when props are not explicitly passed (storefront rendering).
  const core = useStorefrontCore();
  const storeAnnouncement: any = (core as any)?.content?.announcement ?? {};

  // Resolve dynamic props: explicit prop > store content > defaults.
  const effectiveText = typeof text === 'string' ? text : (storeAnnouncement.text ?? storeAnnouncement.announcement_text ?? undefined);
  const effectiveBg = typeof bgColor === 'string' ? bgColor : (storeAnnouncement.bg_color ?? storeAnnouncement.announcement_bg_color ?? undefined);
  const effectiveTextColor = typeof textColor === 'string' ? textColor : (storeAnnouncement.text_color ?? storeAnnouncement.announcement_text_color ?? undefined);
  const effectiveVisible = typeof visible === 'boolean' ? visible : (typeof storeAnnouncement.enabled === 'boolean' ? storeAnnouncement.enabled : (typeof storeAnnouncement.show_announcement === 'boolean' ? storeAnnouncement.show_announcement : true));

  if (effectiveVisible === false) return null;

  const hasSingleText = typeof effectiveText === 'string' && (effectiveText as string).trim().length > 0;
  // When merchant has not set announcement text and no explicit messages prop is
  // passed (live storefront: <AnnouncementBar />), hide instead of leaking demo copy.
  if (!hasSingleText && (!messages || messages.length === 0)) return null;
  const items = hasSingleText
    ? [(effectiveText as string).trim()]
    : (messages && messages.length > 0 ? messages.filter(Boolean) : DEFAULT_MESSAGES);
  const index = useRotatingAnnouncement(items.length);
  const current = items[index] ?? items[0] ?? '';

  const barBg = effectiveBg && (effectiveBg as string).trim() ? (effectiveBg as string).trim() : 'linear-gradient(90deg,#2b2320,#4a3a33 50%,#2b2320)';
  const barColor = effectiveTextColor && (effectiveTextColor as string).trim() ? (effectiveTextColor as string).trim() : '#f5ede2';
  const isGradient = barBg.includes('gradient');

  return (
    <div
      dir="rtl"
      className="relative z-40 flex items-center justify-center gap-2 overflow-hidden px-4 py-2 text-center"
      style={isGradient ? { background: barBg, color: barColor } : { backgroundColor: barBg, color: barColor }}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: barColor, opacity: 0.9 }} aria-hidden />
      <span className="min-w-0 whitespace-nowrap text-center text-[12px] font-medium tracking-wide" style={{ color: barColor }}>
        {current}
      </span>
      <Sparkles className="h-3.5 w-3.5 shrink-0 scale-x-[-1]" style={{ color: barColor, opacity: 0.9 }} aria-hidden />
    </div>
  );
};
