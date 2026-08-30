import React, { useEffect, useRef, useState } from 'react';
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

const SPEED_PX_PER_SEC = 55;

/**
 * Atelier announcement marquee — a calm auto-scrolling ribbon (RTL).
 *
 * JS-driven (requestAnimationFrame) with a two-copy track. The track is two
 * identical segments laid right-to-left; each frame we move the whole track
 * left by a fixed pixel-speed. Once the leading segment has fully exited the
 * viewport we slide the track back by exactly one segment width — because the
 * segments are identical this produces ZERO visible jump: no teleport, no
 * "text disappears and starts over" glitch, and a constant calm speed that is
 * identical on phone and desktop.
 *
 * Reads Designer config from content.announcement: items[] (one phrase per
 * line), a single text fallback, colors and an enable toggle. Pauses on hover
 * and respects prefers-reduced-motion (static strip).
 */
export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ messages, text, bgColor, textColor, visible }) => {
  // Bind to live store content when props are not explicitly passed (storefront rendering).
  const core = useStorefrontCore();
  const storeAnnouncement: any = (core as any)?.content?.announcement ?? {};

  // Resolve dynamic props: explicit prop > store content > defaults.
  const effectiveText = typeof text === 'string' ? text : (storeAnnouncement.text ?? storeAnnouncement.announcement_text ?? undefined);
  const effectiveBg = typeof bgColor === 'string' ? bgColor : (storeAnnouncement.bg_color ?? storeAnnouncement.announcement_bg_color ?? undefined);
  const effectiveTextColor = typeof textColor === 'string' ? textColor : (storeAnnouncement.text_color ?? storeAnnouncement.announcement_text_color ?? undefined);
  const effectiveVisible = typeof visible === 'boolean' ? visible : (typeof storeAnnouncement.enabled === 'boolean' ? storeAnnouncement.enabled : (typeof storeAnnouncement.show_announcement === 'boolean' ? storeAnnouncement.show_announcement : true));

  const [reduceMotion, setReduceMotion] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener ? mq.addEventListener('change', onChange) : (mq as any).addEventListener && (mq as any).addEventListener('change', onChange);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', onChange) : (mq as any).removeEventListener && (mq as any).removeEventListener('change', onChange); };
  }, []);

  useEffect(() => {
    const outer = outerRef.current;
    const track = trackRef.current;
    const seg = segmentRef.current;
    if (!outer || !track || !seg) return;
    if (reduceMotion) return; // static strip — no animation needed

    let raf = 0;
    let last = performance.now();
    let x = 0;
    let hovering = false;
    let segW = seg.offsetWidth;

    const onEnter = () => { hovering = true; };
    const onLeave = () => { hovering = false; };
    outer.addEventListener('pointerenter', onEnter);
    outer.addEventListener('pointerleave', onLeave);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(256, now - last);
      last = now;
      if (hovering) return;
      segW = seg.offsetWidth || segW;
      if (!segW) return;
      x -= (SPEED_PX_PER_SEC * dt) / 1000;
      // Wrap by exactly one segment width — segments are identical, so the
      // visible pixels continue without any jump or empty gap.
      if (x <= -segW) x += segW;
      track.style.transform = `translate3d(${x}px,0,0)`;
    };
    last = performance.now();
    raf = requestAnimationFrame(tick);

    const onVisibility = () => { if (!document.hidden) last = performance.now(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      outer.removeEventListener('pointerenter', onEnter);
      outer.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduceMotion]);

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

  // Repeat phrases so a single segment is comfortably wider than any viewport.
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
        <div ref={trackRef} className="atelier-marquee-track flex w-max items-center whitespace-nowrap py-2 will-change-transform" style={{ transform: 'translate3d(0,0,0)' }}>
          {/* Two identical segments — identical content guarantees a jump-free wrap */}
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