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
 * Atelier announcement marquee — a calm, continuous loop with NO reset jump.
 *
 * Instead of a two-copy "-50%" CSS wrap (whose seam can look like the text
 * "finished, emptied and restarted"), this renders one long train of phrase
 * cells and moves it with a plain continuous translate3d. The moment the
 * leftmost cell is fully scrolled out of view it is moved to the right end —
 * an invisible, width-preserving recycle. The strip therefore never becomes
 * empty and the same phrases always come back around. Runs via rAF, never
 * pauses (no hover/touch pause), and prefers-reduced-motion only slows it
 * down (18px/s) instead of freezing it.
 */

interface CellMetric { o: number; w: number }

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ messages, text, bgColor, textColor, visible }) => {
  const core = useStorefrontCore();
  const storeAnnouncement: any = (core as any)?.content?.announcement ?? {};

  const effectiveText = typeof text === 'string' ? text : (storeAnnouncement.text ?? storeAnnouncement.announcement_text ?? undefined);
  const effectiveBg = typeof bgColor === 'string' ? bgColor : (storeAnnouncement.bg_color ?? storeAnnouncement.announcement_bg_color ?? undefined);
  const effectiveTextColor = typeof textColor === 'string' ? textColor : (storeAnnouncement.text_color ?? storeAnnouncement.announcement_text_color ?? undefined);
  const effectiveVisible = typeof visible === 'boolean' ? visible : (typeof storeAnnouncement.enabled === 'boolean' ? storeAnnouncement.enabled : (typeof storeAnnouncement.show_announcement === 'boolean' ? storeAnnouncement.show_announcement : true));

  const trackRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const outer = outerRef.current;
    if (!track || !outer) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let metrics: CellMetric[] = [];
    let x = 0;
    let last: number | null = null;
    let raf = 0;

    const coff = () => {
      metrics = Array.from(track.children).map((c) => {
        const el = c as HTMLElement;
        return { o: el.offsetLeft, w: el.offsetWidth };
      });
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (last === null) {
        last = now;
        coff();
        return;
      }
      let dt = now - last;
      last = now;
      if (dt < 0) dt = 0;
      if (dt > 250) dt = 250; // clamp background-tab jank, keep continuity

      const speed = reduce.matches ? SPEED_PX_PER_SEC_REDUCED : SPEED_PX_PER_SEC;
      x -= (speed * dt) / 1000;
      track.style.transform = `translate3d(${x}px,0,0)`;

      // Continuous recycle: once the leftmost cell is fully offscreen (RTL →
      // DOM-last child) move it back to the right end AND compensate the
      // transform by the cell's exact claimed width, measured from the real
      // geometry — so on-screen pixels never move, the right edge is always
      // fed and the strip never empties nor jumps.
      const trackW = track.offsetWidth || 0;
      if (metrics.length && trackW > 0) {
        const outerR = outer.getBoundingClientRect().right;
        const base = outerR - trackW; // screen left of track at x=0
        let guard = 0;
        while (guard++ < 80 && metrics.length >= 2) {
          const m = metrics[metrics.length - 1];
          if (base + x + m.o + m.w > 0) break; // still visible
          const l = track.lastElementChild as HTMLElement | null;
          if (!l) break;
          const nxt = track.children[track.children.length - 2] as HTMLElement | undefined;
          const beforeR = nxt ? nxt.getBoundingClientRect().right : outerR + x;
          track.insertBefore(l, track.firstChild);
          const afterR = nxt ? nxt.getBoundingClientRect().right : beforeR;
          x += afterR - beforeR; // invisible re-anchor
          x = Math.max(-trackW * 2, Math.min(trackW * 2, x));
          coff();
        }
      }
    };

    raf = requestAnimationFrame(tick);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => coff());
      ro.observe(track);
      ro.observe(outer);
    }
    window.addEventListener('resize', () => coff());
    (document as any)?.fonts?.ready?.then(() => coff()).catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, []);

  if (effectiveVisible === false) return null;

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

  // Total phrasings: make the train comfortably wider than any viewport
  // (≈5600px) so the strip always has content in view.
  const repeat = Math.max(4, Math.ceil(5600 / (items.length * 210)));
  const totalCells = repeat * items.length;
  const cells: React.ReactNode[] = [];
  for (let c = 0; c < totalCells; c++) {
    const phrase = items[c % items.length];
    cells.push(
      <span
        key={c}
        className="atelier-marquee-cell mx-5 inline-flex shrink-0 items-center gap-5 whitespace-nowrap text-[12px] font-medium tracking-wide sm:text-[13px]"
        style={{ color: barColor }}
      >
        <span>{phrase}</span>
        <span aria-hidden className="text-[8px] leading-none opacity-70">✦</span>
      </span>
    );
  }

  return (
    <div
      dir="rtl"
      ref={outerRef}
      className="atelier-marquee relative z-40 w-full overflow-hidden"
      style={isGradient ? { background: barBg, color: barColor } : { backgroundColor: barBg, color: barColor }}
    >
      <div role="region" aria-label="إعلانات المتجر">
        <div
          ref={trackRef}
          className="atelier-marquee-track flex w-max items-center whitespace-nowrap py-2 will-change-transform"
          style={{ transform: 'translate3d(0,0,0)' }}
        >
          {cells}
        </div>
      </div>
      <span className="sr-only">{items.join(' · ')}</span>
    </div>
  );
};