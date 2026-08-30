import React from 'react';
import { useStorefrontCore } from '../../shared/hooks';

interface AnnouncementBarProps {
  messages?: string[];
  /** Dynamic single text override (from Designer — announcement.text). */
  text?: string;
  /** Background color (announcement_bg_color). */
  bgColor?: string;
  /** Text/icon color (announcement_text_color). */
  textColor?: string;
  /** Visibility toggle (show_announcement). */
  visible?: boolean;
}

const DEFAULT_MESSAGES = [
  'عروض الصيف — تخفيضات حتى 40%',
  'شحن مجاني للطلبات فوق 250 ₪',
  'تشكيلات جديدة كل أسبوع',
];

/**
 * Atelier announcement marquee — a slim auto-scrolling ribbon (RTL).
 * Reads Designer config from content.announcement: items[] (one phrase per
 * line), a single text fallback, colors and an enable toggle. The track is
 * duplicated (content ≥ width) and animates translateX 0 → -50% for a
 * seamless loop; pauses on hover and honors reduced-motion.
 */
const MARQUEE_CSS = `
@keyframes atelierMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.atelier-marquee-track { animation: atelierMarquee 24s linear infinite; }
.atelier-marquee-track:hover { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .atelier-marquee-track { animation-duration: 80s; } }
`;
let marqueeCssInjected = false;
function ensureMarqueeCss() {
  if (marqueeCssInjected || typeof document === 'undefined') return;
  marqueeCssInjected = true;
  const tag = document.createElement('style');
  tag.textContent = MARQUEE_CSS;
  document.head.appendChild(tag);
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ messages, text, bgColor, textColor, visible }) => {
  // Bind to live store content when props are not explicitly passed (storefront rendering).
  const core = useStorefrontCore();
  const storeAnnouncement: any = (core as any)?.content?.announcement ?? {};

  // Resolve dynamic props: explicit prop > store content > defaults.
  const effectiveText = typeof text === 'string' ? text : (storeAnnouncement.text ?? storeAnnouncement.announcement_text ?? undefined);
  const effectiveBg = typeof bgColor === 'string' ? bgColor : (storeAnnouncement.bg_color ?? storeAnnouncement.announcement_bg_color ?? undefined);
  const effectiveTextColor = typeof textColor === 'string' ? textColor : (storeAnnouncement.text_color ?? storeAnnouncement.announcement_text_color ?? undefined);
  const effectiveVisible = typeof visible === 'boolean' ? visible : (typeof storeAnnouncement.enabled === 'boolean' ? storeAnnouncement.enabled : (typeof storeAnnouncement.show_announcement === 'boolean' ? storeAnnouncement.show_announcement : true));

  if (effectiveVisible === false) return null;

  // Phrase priority: explicit prop text → designer items[] → single text → messages prop → default preset.
  let items: string[];
  if (typeof text === 'string' && text.trim().length > 0) {
    items = [text.trim()];
  } else if (Array.isArray(storeAnnouncement.items) && storeAnnouncement.items.length) {
    items = storeAnnouncement.items.map((s: any) => String(s).trim()).filter(Boolean);
  } else if (typeof effectiveText === 'string' && (effectiveText as string).trim().length > 0) {
    items = [(effectiveText as string).trim()];
  } else if (messages && messages.length) {
    items = messages.filter(Boolean);
  } else {
    items = DEFAULT_MESSAGES;
  }
  if (!items.length) return null;

  if (typeof document !== 'undefined') ensureMarqueeCss();

  const barBg = effectiveBg && effectiveBg.trim() ? effectiveBg.trim() : 'linear-gradient(90deg,#2b2320,#4a3a33 50%,#2b2320)';
  const barColor = effectiveTextColor && effectiveTextColor.trim() ? effectiveTextColor.trim() : '#f5ede2';
  const isGradient = barBg.includes('gradient');

  // Repeat phrases so each half of the track is comfortably wider than any
  // viewport (guarantees a seamless loop when animating by -50%).
  const repeat = Math.max(2, Math.ceil(20 / items.length));
  const half: React.ReactNode[] = [];
  for (let r = 0; r < repeat; r++) {
    for (let i = 0; i < items.length; i++) {
      half.push(
        <span key={`${r}-${i}`} className="mx-5 inline-flex shrink-0 items-center gap-5 text-[12px] font-medium tracking-wide sm:text-[13px]" style={{ color: barColor }}>
          <span>{items[i]}</span>
          <span aria-hidden className="text-[8px] leading-none opacity-70">✦</span>
        </span>
      );
    }
  }
  const track: React.ReactNode[] = [...half, ...half];

  return (
    <div dir="rtl" className="relative z-40 w-full overflow-hidden" style={isGradient ? { background: barBg, color: barColor } : { backgroundColor: barBg, color: barColor }}>
      <div role="region" aria-label="إعلانات المتجر">
        <div className="aten-announce">
          <div className="atelier-marquee-track flex w-max items-center whitespace-nowrap py-2 will-change-transform">
            {track}
          </div>
        </div>
      </div>
      <span className="sr-only">{items.join(' · ')}</span>
    </div>
  );
};