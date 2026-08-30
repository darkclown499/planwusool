import React, { useEffect, useRef } from 'react';
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

// Calm baseline speed — identical on phone and desktop.
const SPEED_PX_PER_SEC = 26;
// Even calmer for users with reduced-motion, but still looping (never frozen).
const SPEED_PX_PER_SEC_REDUCED = 18;

/**
 * Atelier announcement marquee — a calm, continuously-looping ribbon (RTL).
 *
 * Pure CSS transform animation (runs on the compositor, unaffected by JS
 * throttling or page scroll): the track holds TWO identical segments and the
 * keyframes translate 0 → -50% (exactly one segment). Because the segments
 * are byte-identical, the moment one part scrolls out a matching part enters
 * from the other side — a seamless ring with no disappearance. Duration is
 * measured once from the real segment width so speed stays constant on every
 * device; prefers-reduced-motion only slows it down instead of freezing it.
 *
 * Reads Designer config from content.announcement: items[] (one phrase per
 * line), a single text fallback, colors and an enable toggle.
 */
const MARQUEE_CSS = `
@keyframes atelierMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.atelier-marquee-track { animation-name: atelierMarquee; animation-timing-function: linear; animation-iteration-count: infinite; }
.atelier-marquee-track:hover { animation-play-state: paused; }
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

  const trackRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  // Calibrate the animation duration to the real segment width once mounted,
  // and re-calibrate if the width changes (fonts load, resize, rotation).
  useEffect(() => {
    const seg = segmentRef.current;
    const track = trackRef.current;
    if (!seg || !track) return;
    ensureMarqueeCss();
    const apply = () => {
      const w = seg.offsetWidth;
      if (!w) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const speed = reduce ? SPEED_PX_PER_SEC_REDUCED : SPEED_PX_PER_SEC;
      track.style.animationDuration = `${Math.max(14, w / speed)}s`;
    };
    apply();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(apply);
      ro.observe(seg);
    }
    window.addEventListener('resize', apply);
    const fonts = (document as any)?.fonts;
    if (fonts?.ready) fonts.ready.then(apply).catch(() => {});
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, []);

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

  const barBg = effectiveBg && effectiveBg.trim() ? effectiveBg.trim() : 'linear-gradient(90deg,#2b2320,#4a3a33 50%,#2b2320)';
  const barColor = effectiveTextColor && effectiveTextColor.trim() ? effectiveTextColor.trim() : '#f5ede2';
  const isGradient = barBg.includes('gradient');

  // Repeat so each segment is comfortably wider than any viewport.
  const repeat = Math.max(2, Math.ceil(20 / items.length));
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < repeat; r++) {
    for (let i = 0; i < items.length; i++) {
      cells.push(
        <span key={`${r}-${i}`} className="mx-5 inline-flex shrink-0 items-center gap-5 text-[12px] font-medium tracking-wide sm:text-[13px]" style={{ color: barColor }}>
          <span>{items[i]}</span>
          <span aria-hidden className="text-[8px] leading-none opacity-70">✦</span>
        </span>
      );
    }
  }

  return (
    <div
      dir="rtl"
      ref={outerRef}
      className="atelier-marquee relative z-40 w-full overflow-hidden"
      style={isGradient ? { background: barBg, color: barColor } : { backgroundColor: barBg, color: barColor }}
    >
      <div role="region" aria-label="إعلانات المتجر">
        <div ref={trackRef} className="atelier-marquee-track flex w-max items-center whitespace-nowrap py-2 will-change-transform">
          {/* Two identical segments — the -50% wrap lands on the identical copy,
              so a part always enters from the opposite side as another exits. */}
          <div ref={segmentRef} className="flex items-center" aria-hidden>
            {cells}
          </div>
          <div className="flex items-center" aria-hidden>
            {cells}
          </div>
        </div>
      </div>
      <span className="sr-only">{items.join(' · ')}</span>
    </div>
  );
};