import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { useStorefrontCore } from '../shared/hooks';
import { ensureBazaarInteractionsStyle, prefersReducedMotion } from './bazaarInteractions';

/* ============================================================ */
/* Bazaar Announcement / Offers Ticker — merchant-configurable  */
/* Controlled via content.bazaar_announcement                   */
/* ============================================================ */

export const BAZAAR_ANNOUNCEMENT_SPEED_MAP: Record<string, number> = {
  slow: 6000,
  medium: 4000,
  fast: 3000,
};

export function normalizeBazaarMessages(raw: any): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const out: string[] = [];
  for (const item of arr) {
    if (item === null || item === undefined) continue;
    // Support per-message link objects { text, url, enabled }
    if (typeof item === 'object' && item !== null && 'text' in (item as any)) {
      const t = String((item as any).text ?? '').trim();
      if (t) out.push(t);
      continue;
    }
    const s = String(item).trim();
    if (s) out.push(s);
  }
  return out;
}

export function coerceBazaarBoolean(value: any): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const s = String(value).trim().toLowerCase();
    if (s === '' ) return false;
    if (['true', '1', 'yes', 'on', 'enabled'].includes(s)) return true;
    if (['false', '0', 'no', 'off', 'disabled'].includes(s)) return false;
    const n = Number(s);
    if (Number.isFinite(n)) return n !== 0;
    // Fallback: treat non-empty unknown string as true only if it is not explicitly false
    return s.length > 0 ? s !== 'false' && s !== '0' : false;
  }
  if (typeof value === 'number') return value !== 0;
  return !!value;
}

export function getBazaarAnnouncementConfig(content: any) {
  // Canonical bazaar path
  const raw: any = content?.bazaar_announcement ?? content?.bazaar_announcement_bar ?? {};
  // Also accept legacy flat keys for robustness
  const enabledRaw = raw.enabled ?? raw.show ?? content?.bazaar_announcement_enabled;
  const hasExplicitEnabled = enabledRaw !== undefined && enabledRaw !== null;
  // Use strict boolean normalizer — covers "true"/"false"/"1"/"0"/1/0
  const isEnabled = hasExplicitEnabled ? coerceBazaarBoolean(enabledRaw) : false;

  let messages: string[] = [];
  if (Array.isArray(raw.messages) && raw.messages.length) {
    messages = normalizeBazaarMessages(raw.messages);
  } else if (Array.isArray(raw.items) && raw.items.length) {
    messages = normalizeBazaarMessages(raw.items);
  } else if (typeof raw.text === 'string' && raw.text.trim()) {
    messages = [raw.text.trim()];
  } else if (typeof raw.message === 'string' && raw.message.trim()) {
    messages = [raw.message.trim()];
  }
  // Filter empty and cap
  messages = messages.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);

  const autoplayRaw = raw.autoplay ?? raw.auto_play ?? raw.autoRotate ?? true;
  const autoplay = coerceBazaarBoolean(autoplayRaw);

  let speedRaw = String(raw.speed ?? raw.interval ?? 'medium').toLowerCase().trim();
  if (!['slow', 'medium', 'fast'].includes(speedRaw)) {
    // numeric interval mapping
    const n = Number(speedRaw);
    if (Number.isFinite(n)) {
      if (n >= 5500) speedRaw = 'slow';
      else if (n <= 3200) speedRaw = 'fast';
      else speedRaw = 'medium';
    } else speedRaw = 'medium';
  }
  const interval = BAZAAR_ANNOUNCEMENT_SPEED_MAP[speedRaw] ?? 4000;

  const bgColor = typeof raw.bg_color === 'string' ? raw.bg_color.trim() : typeof raw.background === 'string' ? raw.background.trim() : '';
  const textColor = typeof raw.text_color === 'string' ? raw.text_color.trim() : typeof raw.color === 'string' ? raw.color.trim() : '';

  // Optional per-message links
  const links: (string | null)[] = (() => {
    if (!Array.isArray(raw.messages)) return messages.map(() => null);
    return raw.messages.map((m: any) => {
      if (m && typeof m === 'object' && 'url' in m && typeof (m as any).url === 'string') {
        const u = String((m as any).url).trim();
        try {
          const parsed = new URL(u);
          if (['https:', 'http:'].includes(parsed.protocol) && parsed.hostname.includes('.')) return u;
        } catch {}
      }
      return null;
    });
  })();

  return { enabled: isEnabled, messages, autoplay, speed: speedRaw as 'slow'|'medium'|'fast', interval, bgColor, textColor, links };
}

export function isBazaarAnnouncementVisible(content: any): boolean {
  const cfg = getBazaarAnnouncementConfig(content);
  return cfg.enabled && cfg.messages.length > 0;
}

export const BazaarAnnouncementBar: React.FC = () => {
  const { content } = useStorefrontCore() as any;
  const cfg = useMemo(() => getBazaarAnnouncementConfig(content), [content]);
  const { enabled, messages, autoplay, interval } = cfg;
  const count = messages.length;

  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => { ensureBazaarInteractionsStyle(); }, []);
  useEffect(() => {
    try { setReduced(prefersReducedMotion()); } catch { setReduced(false); }
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(m.matches);
    m.addEventListener?.('change', handler);
    return () => m.removeEventListener?.('change', handler);
  }, []);
  // Reset index when messages change
  useEffect(() => { setIndex(0); }, [count]);
  // Clamp index
  useEffect(() => { if (index >= count) setIndex(0); }, [index, count]);

  const shouldAutoplay = enabled && count > 1 && autoplay && !reduced;

  useEffect(() => {
    if (!shouldAutoplay) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      setIndex((v) => (v + 1) % count);
    }, interval);
    return () => clearInterval(t);
  }, [shouldAutoplay, count, interval]);

  if (!enabled || count === 0) return null;

  const goPrev = () => setIndex((v) => (v - 1 + count) % count);
  const goNext = () => setIndex((v) => (v + 1) % count);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || count <= 1) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 44) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  const currentMsg = messages[index] ?? messages[0];
  const currentLink = (cfg.links[index] ?? null) as string | null;
  const single = count === 1;

  // Manual controls shown only if multiple
  const showControls = count > 1;

  return (
    <div
      className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8"
      dir="rtl"
      data-testid="bazaar-announcement-bar"
      data-bazaar-announcement
    >
      <div
        className="bazaar-announcement relative flex items-center gap-2 overflow-hidden rounded-2xl border border-slate-100 bg-white px-3 py-2.5 sm:gap-3 sm:px-4"
        style={{ boxShadow: 'var(--bazaar-shadow-sm)' } as any}
        role="region"
        aria-label="شريط العروض والإعلانات"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Accent label — uses store primary */}
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black leading-none text-white sm:text-xs"
          style={{ background: 'var(--store-primary, #0d9488)' } as any}
          aria-hidden
        >
          <Megaphone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">عروض</span>
          <span className="sm:hidden">•</span>
        </span>

        {/* Message area — single or sliding */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {single ? (
            <p className="truncate text-center text-[13px] font-bold leading-snug text-slate-800 sm:text-sm" dir="rtl">
              {currentLink ? (
                <a href={currentLink} className="hover:underline" style={{ color: 'inherit' }}>
                  {currentMsg}
                </a>
              ) : currentMsg}
            </p>
          ) : (
            <div className="relative flex items-center justify-center overflow-hidden">
              {/* Keyed sliding message — compact, no aggressive marquee */}
              <div
                key={index}
                className={reduced ? '' : 'bazaar-announcement-slide'}
                style={reduced ? undefined : { animation: 'bazaarAnnouncementIn 280ms var(--bazaar-ease)' } as any}
              >
                <p className="truncate px-1 text-center text-[13px] font-bold leading-snug text-slate-800 sm:text-sm" dir="rtl">
                  {currentLink ? (
                    <a href={currentLink} className="hover:underline" style={{ color: 'inherit' }}>
                      {currentMsg}
                    </a>
                  ) : currentMsg}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Manual controls — compact arrows */}
        {showControls && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              aria-label="الرسالة السابقة"
              data-testid="bazaar-announcement-prev"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 active:scale-95"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="الرسالة التالية"
              data-testid="bazaar-announcement-next"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 active:scale-95"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Dots indicator for multiple — minimal */}
        {showControls && (
          <div className="hidden shrink-0 items-center gap-1 sm:flex" aria-hidden>
            {messages.slice(0, 8).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4' : 'w-1.5 bg-slate-200'}`}
                style={i === index ? ({ background: 'var(--store-primary, #0d9488)' } as any) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Announcement micro-animation keyframes injected via bazaarInteractions but fallback here */}
      <style>{`@keyframes bazaarAnnouncementIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.bazaar-announcement-slide{animation:none!important}}`}</style>
    </div>
  );
};

export default BazaarAnnouncementBar;
