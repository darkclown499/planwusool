import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';

interface CoverMedia {
  type: 'image' | 'video' | 'youtube';
  src: string;
  poster?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaLink?: string;
}

interface AtelierCoverFlowProps {
  media: CoverMedia[];
  heights: { desktop: string; mobile: string };
  overlayOpacity: number;
}

function circularOffset(idx: number, active: number, len: number): number {
  let d = idx - active;
  if (len <= 2) return d;
  if (d > len / 2) d -= len;
  if (d < -len / 2) d += len;
  return d;
}

export const AtelierCoverFlow: React.FC<AtelierCoverFlowProps> = ({ media, heights, overlayOpacity }) => {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const startX = useRef(0);
  const startY = useRef(0);
  const axisLocked = useRef<'x' | 'y' | null>(null);
  const pausedRef = useRef(false);

  // Clamp index when media length changes (Designer preview)
  useEffect(() => {
    setIndex((i) => (media.length === 0 ? 0 : Math.min(i, media.length - 1)));
  }, [media.length]);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const mq = window.matchMedia('(max-width: 767px)');
    const onMq = () => setIsMobile(mq.matches);
    onMq();
    mq.addEventListener('change', onMq);
    return () => mq.removeEventListener('change', onMq);
  }, []);

  // Video autoplay: only active plays, paused others, respects reducedMotion + visibility
  useEffect(() => {
    if (reducedMotion) {
      videoRefs.current.forEach((v) => v.pause());
      return;
    }
    videoRefs.current.forEach((vid, i) => {
      if (i === index && media[i]?.type === 'video') {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [index, media, reducedMotion]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) videoRefs.current.forEach((v) => v.pause());
      else if (!reducedMotion && media[index]?.type === 'video') videoRefs.current.get(index)?.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [index, media, reducedMotion]);

  // Auto-advance
  useEffect(() => {
    if (reducedMotion || media.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current || document.hidden || isDragging) return;
      setIndex((i) => (i + 1) % media.length);
    }, 5000);
    return () => clearInterval(id);
  }, [media.length, reducedMotion, isDragging]);

  const go = useCallback((dir: number) => {
    setIndex((i) => (i + dir + media.length) % media.length);
  }, [media.length]);

  // Pointer gesture with axis detection — horizontal takes over, vertical remains native scroll
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (media.length <= 1) return;
    // only primary pointer
    if ((e as any).button !== undefined && (e as any).button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    axisLocked.current = null;
    setIsDragging(true);
    pausedRef.current = true;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  }, [media.length]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!axisLocked.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisLocked.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axisLocked.current === 'y') {
        // let vertical scroll win — cancel horizontal drag
        setIsDragging(false);
        setDragOffset(0);
        return;
      }
    }
    if (axisLocked.current === 'x') {
      // clamp drag with soft resistance
      const el = stageRef.current;
      const w = el?.clientWidth || 360;
      const clamped = Math.max(Math.min(dx, w * 0.52), -w * 0.52);
      setDragOffset(clamped);
    }
  }, [isDragging]);

  const finishDrag = useCallback((dx: number) => {
    setIsDragging(false);
    setDragOffset(0);
    axisLocked.current = null;
    const el = stageRef.current;
    const w = el?.clientWidth || 360;
    const threshold = Math.max(56, w * 0.16);
    if (Math.abs(dx) > threshold) {
      // RTL-aware swipe: dragging left (dx negative) => next (index+1); dragging right => prev
      // Fashion Atelier is RTL (dir=rtl) but gesture physics remain: left swipe = next
      if (dx < 0) go(1);
      else go(-1);
    }
    setTimeout(() => { pausedRef.current = false; }, 1800);
  }, [go]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX.current;
    // if axis was Y, ignore
    if (axisLocked.current === 'y') {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    finishDrag(dx);
  }, [isDragging, finishDrag]);

  const onPointerCancel = useCallback(() => {
    setIsDragging(false);
    setDragOffset(0);
    axisLocked.current = null;
    setTimeout(() => { pausedRef.current = false; }, 1200);
  }, []);

  // Keyboard
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(-1); }
  }, [go]);

  if (media.length === 0) return null;

  // Single — clean hero, no fake carousel
  if (media.length === 1) {
    const m = media[0];
    return (
      <section className="atelier-hero-outer mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 sm:pt-5" dir="rtl">
        <div className="atelier-cover-outer relative w-full overflow-visible rounded-t-xl rounded-b-2xl sm:rounded-2xl shadow-[0_4px_14px_rgba(60,45,35,0.06),0_18px_36px_rgba(60,45,35,0.09)] ring-1 ring-stone-200/40">
          <div className="relative w-full overflow-hidden rounded-t-xl rounded-b-2xl sm:rounded-2xl bg-stone-900" style={{ height: heights.desktop } as any}>
            <style>{`@media (max-width: 767px){ .atelier-hero-single{ height:${heights.mobile} !important; } } html[data-preview-mode="mobile"] .atelier-hero-single{ height:${heights.mobile} !important; } html[data-preview-mode="desktop"] .atelier-hero-single{ height:${heights.desktop} !important; }`}</style>
            <div className="atelier-hero-single absolute inset-0">
              {m.type === 'video' ? (
                <video autoPlay={false} loop muted playsInline poster={m.poster} src={m.src} className="absolute inset-0 h-full w-full object-cover" />
              ) : m.type === 'youtube' ? (
                <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${m.src}?mute=1&controls=0&playsinline=1&modestbranding=1&rel=0`} title="YouTube" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen />
              ) : (
                <img src={getImageUrl(m.src)} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
              {(m.title || m.subtitle || m.ctaLabel) && (
                <div className="absolute inset-0 z-10 flex items-center">
                  <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
                    <div className="max-w-xl">
                      <span className="mb-4 block h-px w-14 bg-[#d8b48a]" />
                      {m.subtitle && <p className="mb-3 text-sm font-medium tracking-[0.2em] text-[#e8cfa8]">{m.subtitle}</p>}
                      {m.title && <h1 className="font-serif text-2xl font-bold leading-[1.25] text-white sm:text-4xl">{m.title}</h1>}
                      {m.ctaLabel && <a href={m.ctaLink || '#atelier-new'} className="mt-8 inline-flex items-center gap-3 border border-white/70 px-8 py-3 text-sm font-semibold text-white hover:bg-[#d8b48a] hover:text-stone-900">{m.ctaLabel} <span>←</span></a>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Cover flow — layered premium stack, RTL-aware
  // isRTL: fashion-atelier dir=rtl, so next (positive offset) appears to left (negative translate)
  const isRTL = true;
  const sign = isRTL ? -1 : 1;

  return (
    <section className="atelier-hero-outer mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 sm:pt-5" dir="rtl">
      <div className="atelier-cover-outer relative w-full overflow-visible rounded-2xl shadow-[0_4px_14px_rgba(60,45,35,0.06),0_18px_36px_rgba(60,45,35,0.09)] ring-1 ring-stone-200/40" style={{ height: heights.desktop } as any}>
        <style>{`@media (max-width: 767px){ .atelier-cover-outer{ height:${heights.mobile} !important; } } @media (min-width: 768px){ .atelier-cover-outer{ height:${heights.desktop} !important; } } html[data-preview-mode="mobile"] .atelier-cover-outer{ height:${heights.mobile} !important; } html[data-preview-mode="desktop"] .atelier-cover-outer{ height:${heights.desktop} !important; }`}</style>

        <div
          ref={stageRef}
          role="region"
          aria-roledescription="carousel"
          aria-label="معرض الصور"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerCancel}
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { if (!isDragging) pausedRef.current = false; }}
          className="absolute inset-0 overflow-hidden rounded-2xl bg-stone-900 select-none touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-[#d8b48a]/60"
          style={{ touchAction: 'pan-y' } as any}
        >
          {/* subtle perspective context */}
          <div className="absolute inset-0" style={{ perspective: '1400px', perspectiveOrigin: '50% 50%' } as any} />

          {(() => {
            const occ = new Map<string, number>();
            return media.map((m, i) => {
            const off = circularOffset(i, index, media.length);
            const abs = Math.abs(off);
            const isActive = off === 0;
            const isNeighbor = abs === 1;
            const isSecond = abs === 2;
            const isHidden = abs > 2;

            // Geometry — calm editorial, not 3D demo
            // card widths: mobile 82%, desktop 62% (active dominant but side peeks)
            // offsets: neighbor ~34% (mobile) / 38% (desktop), second ~60%/64%
            let basePct = 0;
            let scale = 1;
            let opacity = 1;
            let z = 30;
            let shadow = '0 18px 40px rgba(60,45,35,0.18), 0 6px 14px rgba(60,45,35,0.12)';
            let blur: string | undefined;

            if (isActive) {
              basePct = 0;
              scale = 1;
              opacity = 1;
              z = 30;
            } else if (isNeighbor) {
              basePct = isMobile ? 34 : 38;
              scale = 0.86;
              opacity = 0.92;
              z = 20;
              shadow = '0 10px 26px rgba(60,45,35,0.14), 0 3px 10px rgba(60,45,35,0.08)';
            } else if (isSecond) {
              basePct = isMobile ? 60 : 64;
              scale = 0.76;
              opacity = 0.52;
              z = 10;
              shadow = '0 6px 16px rgba(60,45,35,0.10)';
              blur = '0.3px';
            } else {
              opacity = 0;
              z = 0;
            }

            // translate logic: centered at 50%, then offset + drag
            // drag affects active fully, neighbors at 32% coupling for parallax
            const dragInfluence = isActive ? 1 : isNeighbor ? 0.34 : 0.14;
            const dragPx = isHidden ? 0 : dragOffset * dragInfluence;
            // Convert basePct to px-like offset via % of container; combine with dragPx
            // Use translateX calc: (-50% + basePct*sign) plus dragPx
            const tx = `calc(-50% + ${off * basePct * sign}% + ${dragPx}px)`;
            const transition = reducedMotion
              ? 'none'
              : isDragging
                ? 'none'
                : 'transform 300ms cubic-bezier(0.22,0.9,0.3,1), opacity 300ms cubic-bezier(0.22,0.9,0.3,1), filter 300ms cubic-bezier(0.22,0.9,0.3,1)';

            const baseKey = `${m.type}:${m.src}`;
            const n = occ.get(baseKey) ?? 0;
            occ.set(baseKey, n + 1);
            const stableKey = `${baseKey}#${n}`;
            return (
              <div
                key={stableKey}
                aria-hidden={!isActive}
                aria-roledescription="slide"
                aria-label={`شريحة ${i + 1} من ${media.length}`}
                onClick={() => { if (!isActive && Math.abs(dragOffset) < 8) setIndex(i); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isActive) setIndex(i); }}
                role={isActive ? 'group' : 'button'}
                tabIndex={isActive ? 0 : -1}
                className={`absolute top-0 bottom-0 overflow-hidden rounded-2xl bg-stone-900 ring-1 ring-white/10 ${isHidden ? 'pointer-events-none' : 'cursor-pointer'} ${isActive ? '' : 'hover:brightness-[1.02]'}`}
                style={{
                  left: '50%',
                  width: isMobile ? '78%' : '62%',
                  maxWidth: isMobile ? '520px' : '760px',
                  transform: `translateX(${tx}) scale(${scale})`,
                  transformOrigin: 'center center',
                  zIndex: z,
                  opacity: isHidden ? 0 : opacity,
                  boxShadow: isHidden ? 'none' : shadow,
                  filter: blur ? `blur(${blur})` : undefined,
                  transition,
                  willChange: 'transform, opacity',
                } as any}
              >
                {m.type === 'video' ? (
                  <video
                    ref={(el) => { if (el) videoRefs.current.set(i, el); else videoRefs.current.delete(i); }}
                    src={m.src}
                    poster={m.poster}
                    loop
                    muted
                    playsInline
                    preload={isActive ? 'auto' : 'metadata'}
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />
                ) : m.type === 'youtube' ? (
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube.com/embed/${m.src}?mute=1&controls=0&playsinline=1&modestbranding=1&rel=0${isActive ? '&autoplay=1' : ''}`}
                    title="YouTube"
                    frameBorder="0"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <img
                    src={getImageUrl(m.src)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable={false}
                  />
                )}
                {/* brightness guard: only merchant overlay, plus faint vignette for text legibility on active */}
                <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity * (isActive ? 1 : 0.52) }} />
                {isActive && overlayOpacity < 0.08 && (m.title || m.subtitle) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/22 via-transparent to-transparent pointer-events-none" />
                )}
                {/* Content overlay — active shows full CTA, neighbors show title peek only */}
                {(m.title || m.subtitle || m.ctaLabel) && (
                  <div className={`absolute inset-x-0 bottom-0 p-4 sm:p-6 ${isHidden ? 'hidden' : ''}`}>
                    <div className={`${isActive ? '' : 'opacity-95'}`}>
                      {m.subtitle && <p className={`font-medium tracking-[0.16em] text-[#e8cfa8] ${isActive ? 'text-[11px] sm:text-xs' : 'text-[10px] sm:text-[11px]'}`}>{m.subtitle}</p>}
                      {m.title && <h3 className={`font-serif font-bold leading-tight text-white ${isActive ? 'mt-1 text-lg sm:text-2xl' : 'mt-0.5 text-sm sm:text-base line-clamp-2'}`}>{m.title}</h3>}
                      {isActive && m.ctaLabel && (
                        <a
                          href={m.ctaLink || '#atelier-new'}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-3 inline-flex items-center gap-2 border border-white/70 bg-white/0 px-5 py-2 text-xs font-semibold tracking-wide text-white backdrop-blur-sm transition hover:border-[#d8b48a] hover:bg-[#d8b48a] hover:text-stone-900 sm:mt-4 sm:px-6 sm:py-2.5 sm:text-sm"
                        >
                          {m.ctaLabel} <span>←</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          });
          })()}

          {/* Arrows — desktop only, RTL semantics: right=prev, left=next */}
          <button type="button" onClick={() => go(-1)} aria-label="السابق" className="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full bg-white/85 p-2.5 text-stone-700 shadow backdrop-blur hover:bg-white sm:flex sm:right-4 z-40">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="التالي" className="absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full bg-white/85 p-2.5 text-stone-700 shadow backdrop-blur hover:bg-white sm:flex sm:left-4 z-40">
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`الانتقال إلى ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'}`}
                style={reducedMotion ? { transition: 'none' } as any : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
