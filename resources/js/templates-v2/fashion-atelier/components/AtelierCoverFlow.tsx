import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';

interface CoverMedia {
  id?: string;
  type: 'image' | 'video' | 'youtube';
  src: string;
  srcMobile?: string;
  poster?: string;
  position?: string | null;
  positionMobile?: string | null;
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
  const isDraggingRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const startX = useRef(0);
  const startY = useRef(0);
  const axisLocked = useRef<'x' | 'y' | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  const registerVideo = useCallback((el: HTMLVideoElement | null, id: string | undefined) => {
    if (!id) return;
    if (el) videoRefs.current.set(String(id), el);
    else videoRefs.current.delete(String(id));
  }, []);

  // Element-level retry: when a video becomes playable, start it IF it is the current
  // active slide. Covers play() attempts made before data arrived — a pending play()
  // promise can be AbortError-rejected by the pause sweep with nothing re-attempting it.
  // reducedMotion must NOT gate playback (it only affects visual transition easing).
  const tryPlayIfActive = useCallback((id: string | undefined) => {
    if (document.hidden || !id) return;
    const cur = media[index];
    if (!cur || cur.type !== 'video' || String((cur as any)?.id) !== String(id)) return;
    videoRefs.current.get(String(id))?.play().catch(() => {});
  }, [media, index]);

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

  // Video autoplay: only active plays, paused others, respects visibility — keyed by stable media id.
  // reducedMotion must NOT disable media playback (it only affects visual transition easing).
  useEffect(() => {
    if (document.hidden) {
      videoRefs.current.forEach((v) => v.pause());
      return;
    }
    const item = media[index];
    const activeId = item?.type === 'video' ? String((item as any)?.id ?? '') : '';
    videoRefs.current.forEach((vid, id) => {
      if (activeId && id === activeId) {
        // Only play when data is already playable; otherwise the element's canplay
        // handler starts it once data arrives. play() at readyState 0 leaves a pending
        // promise that the pause sweep can AbortError with no later re-attempt.
        if (vid.readyState >= 2) vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [index, media]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        videoRefs.current.forEach((v) => v.pause());
      } else if (media[index]?.type === 'video') {
        // reducedMotion must not block restoring active playback on visibility return.
        const aid = String((media[index] as any)?.id ?? '');
        const vid = aid ? videoRefs.current.get(aid) : undefined;
        if (vid && vid.readyState >= 2) vid.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [index, media]);

  // Auto-advance — desktop only, single-item, pause on drag/hidden tab; reducedMotion no longer disables autoplay (only reduces motion)
  useEffect(() => {
    if (media.length <= 1 || isMobile) return;
    const id = setInterval(() => {
      if (pausedRef.current || document.hidden || isDraggingRef.current) return;
      setIndex((prev) => (prev + 1) % media.length);
    }, 5000);
    return () => clearInterval(id);
  }, [media.length, isMobile]);

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
    const singleSrc = isMobile && (m as any).srcMobile ? (m as any).srcMobile as string : m.src;
    const singlePos = isMobile ? ((m as any).positionMobile || (m as any).position || 'center') : ((m as any).position || 'center');
    const singlePosNorm = singlePos && String(singlePos).trim() ? String(singlePos).trim() : 'center';
    return (
      <section className="atelier-hero-outer mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8" dir="rtl">
        <div className="atelier-cover-outer relative w-full overflow-visible rounded-t-xl rounded-b-2xl sm:rounded-2xl shadow-[0_4px_14px_rgba(60,45,35,0.06),0_18px_36px_rgba(60,45,35,0.09)] ring-1 ring-stone-200/40">
          <div className="relative w-full overflow-hidden rounded-t-xl rounded-b-2xl sm:rounded-2xl bg-stone-900" style={{ height: heights.desktop } as any}>
            <style>{`@media (max-width: 767px){ .atelier-hero-single{ height:${heights.mobile} !important; } } html[data-preview-mode="mobile"] .atelier-hero-single{ height:${heights.mobile} !important; } html[data-preview-mode="desktop"] .atelier-hero-single{ height:${heights.desktop} !important; }`}</style>
            <div className="atelier-hero-single absolute inset-0">
              {m.type === 'video' ? (
                <video autoPlay={false} loop muted playsInline poster={m.poster} src={singleSrc} ref={(el) => registerVideo(el, m.id)} onCanPlay={() => tryPlayIfActive(m.id)} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: singlePosNorm }} />
              ) : m.type === 'youtube' ? (
                <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${singleSrc}?mute=1&controls=0&playsinline=1&modestbranding=1&rel=0`} title="YouTube" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen />
              ) : (
                <img src={getImageUrl(singleSrc)} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: singlePosNorm }} />
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

  // Stage hugs composition: height derived from WIDTH only (stable), not cqh — avoids circular sizing. Cards are absolute, so parent cannot use height:auto.
  return (
    <section className="atelier-hero-outer mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-3" dir="rtl">
      <div className="atelier-cover-outer relative w-full overflow-visible" style={{ containerType: 'inline-size', height: `calc(min(60cqw, 760px) / 1.5 + 20px)`, background: 'transparent' } as any}>
        <style>{`@media (max-width: 767px){ .atelier-cover-outer{ height: calc(min(84cqw, 420px) / 1.333333 + 24px) !important; } } html[data-preview-mode="mobile"] .atelier-cover-outer{ height: calc(min(84cqw, 420px) / 1.333333 + 24px) !important; } html[data-preview-mode="desktop"] .atelier-cover-outer{ height: calc(min(60cqw, 760px) / 1.5 + 20px) !important; }`}</style>

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
          className="absolute inset-0 overflow-visible select-none touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-[#d8b48a]/60"
          style={{ touchAction: 'pan-y', background: 'transparent' } as any}
        >
          {/* subtle perspective context */}
          <div className="absolute inset-0 overflow-visible" style={{ perspective: '1400px', perspectiveOrigin: '50% 50%', background: 'transparent' } as any} />

          {(() => {
            const occ = new Map<string, number>();
            return media.map((m, i) => {
            const off = circularOffset(i, index, media.length);
            const abs = Math.abs(off);
            const isActive = off === 0;
            const isNeighbor = abs === 1;
            const isSecond = abs === 2;
            const isHidden = abs > 2;

            // Geometry — premium Cover Flow: neighbors derived FROM active width (WIDTH as stable truth, no cqh circular).
            // Desktop true 3:2 (1200×800), mobile banner 4:3 (1200×900) — stage height derived from width, not cqh.
            let basePct = 0;
            let scale = 1;
            let opacity = 1;
            let z = 30;
            let shadow = '0 18px 40px rgba(60,45,35,0.18), 0 6px 14px rgba(60,45,35,0.12)';
            let blur: string | undefined;
            // Active widths: width is stable source — min(cqw, maxPx) preserves 3:2 / 4:3 without cqh
            // Stable base width for reliable transform animation — width does not change between states, visual size via scale
            let cardWidth = isMobile ? 'min(84cqw, 420px)' : 'min(60cqw, 760px)';

            if (isActive) {
              basePct = 0;
              scale = 1;
              opacity = 1;
              z = 30;
              blur = undefined;
              cardWidth = isMobile ? 'min(84cqw, 420px)' : 'min(60cqw, 760px)';
            } else if (isNeighbor) {
              basePct = isMobile ? 20 : 17;
              scale = isMobile ? 1 : 0.72;
              opacity = isMobile ? 0.88 : 0.90;
              z = 20;
              // Mobile keeps width-based hierarchy (frozen), desktop uses stable base + scale for reliable motion
              cardWidth = isMobile ? 'calc(min(84cqw, 420px) * 0.71)' : 'min(60cqw, 760px)';
              shadow = '0 10px 26px rgba(60,45,35,0.14), 0 3px 10px rgba(60,45,35,0.08)';
              blur = isMobile ? '2px' : '3px';
            } else if (isSecond) {
              basePct = isMobile ? 45 : 48;
              scale = isMobile ? 1 : 0.56;
              opacity = 0.52;
              z = 10;
              cardWidth = isMobile ? 'calc(min(84cqw, 420px) * 0.54)' : 'min(60cqw, 760px)';
              shadow = '0 6px 16px rgba(60,45,35,0.10)';
              blur = isMobile ? '3px' : '4px';
            } else {
              opacity = 0;
              z = 0;
              blur = isMobile ? '4px' : '5px';
              cardWidth = isMobile ? 'calc(min(84cqw, 420px) * 0.54)' : 'min(60cqw, 760px)';
              scale = isMobile ? 1 : 0.56;
            }

            // drag follows pointer directly; settle after release is 300ms (Fashion easing)
            const dragInfluence = isActive ? 1 : isNeighbor ? 0.34 : 0.14;
            const dragPx = isHidden ? 0 : dragOffset * dragInfluence;
            const offsetPct = off * basePct * sign;
            const tx = isMobile
              ? `calc(-50% + ${offsetPct}% + ${dragPx}px)`
              : `calc(-50% + ${offsetPct}cqw + ${dragPx}px)`;
            const normalTransition =
              'transform 320ms cubic-bezier(0.22,0.9,0.3,1), width 320ms cubic-bezier(0.22,0.9,0.3,1), opacity 320ms cubic-bezier(0.22,0.9,0.3,1), filter 320ms cubic-bezier(0.22,0.9,0.3,1), box-shadow 320ms cubic-bezier(0.22,0.9,0.3,1)';
            const reducedTransition =
              'transform 140ms ease-out, width 140ms ease-out, opacity 140ms ease-out, filter 140ms ease-out, box-shadow 140ms ease-out';
            const transition = isDragging ? 'none' : reducedMotion ? reducedTransition : normalTransition;

            const baseKey = `${m.type}:${m.src}`;
            const n = occ.get(baseKey) ?? 0;
            occ.set(baseKey, n + 1);
            const stableKey = (m as any).id ? String((m as any).id) : `${baseKey}#${n}`;
            const displaySrc = isMobile && (m as any).srcMobile ? (m as any).srcMobile as string : m.src;
            const perItemPos = isMobile ? ((m as any).positionMobile || (m as any).position || 'center') : ((m as any).position || 'center');
            const perItemPosNorm = perItemPos && String(perItemPos).trim() ? String(perItemPos).trim() : 'center';
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
                className={`absolute overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/40 ${isHidden ? 'pointer-events-none' : 'cursor-pointer'} ${isActive ? '' : 'hover:brightness-[1.02]'}`}
                style={
                  isMobile
                    ? ({
                        left: '50%',
                        top: '50%',
                        width: cardWidth,
                        maxWidth: '420px',
                        aspectRatio: '4 / 3',
                        transform: `translateX(${tx}) translateY(-50%) scale(${scale})`,
                        transformOrigin: 'center center',
                        zIndex: z,
                        opacity: isHidden ? 0 : opacity,
                        boxShadow: isHidden ? 'none' : shadow,
                        filter: blur ? `blur(${blur})` : undefined,
                        transition,
                        willChange: 'transform, opacity',
                      } as any)
                    : ({
                        left: '50%',
                        top: '50%',
                        width: cardWidth,
                        maxWidth: '760px',
                        aspectRatio: '3 / 2',
                        transform: `translateX(${tx}) translateY(-50%) scale(${scale})`,
                        transformOrigin: 'center center',
                        zIndex: z,
                        opacity: isHidden ? 0 : opacity,
                        boxShadow: isHidden ? 'none' : shadow,
                        filter: blur ? `blur(${blur})` : undefined,
                        transition,
                        willChange: 'transform, opacity',
                      } as any)
                }
              >
                {m.type === 'video' ? (
                  <video
                    ref={(el) => registerVideo(el, m.id)}
                    onCanPlay={() => tryPlayIfActive(m.id)}
                    src={displaySrc}
                    poster={m.poster}
                    loop
                    muted
                    playsInline
                    preload={isActive ? 'auto' : 'metadata'}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: perItemPosNorm }}
                    draggable={false}
                  />
                ) : m.type === 'youtube' ? (
                  isActive ? (
                    <iframe
                      className="absolute inset-0 h-full w-full"
                      src={`https://www.youtube.com/embed/${displaySrc}?mute=1&controls=0&playsinline=1&modestbranding=1&rel=0&autoplay=1`}
                      title="YouTube"
                      frameBorder="0"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                  ) : (
                    <div className="absolute inset-0 bg-black">
                      <img src={`https://img.youtube.com/vi/${displaySrc}/hqdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: perItemPosNorm }} onError={(e) => ((e.currentTarget.style.display = 'none'))} />
                      <div className="absolute inset-0 bg-black/20" />
                      <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-900 shadow">▶</span>
                    </div>
                  )
                ) : (
                  <img
                    src={getImageUrl(displaySrc)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: perItemPosNorm }}
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

          {/* Arrows — desktop only, RTL semantics: right=prev, left=next, positioned 20-36px outside visible composition; hidden for single media */}
          {media.length > 1 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} onPointerDown={(e) => e.stopPropagation()} aria-label="السابق" className="absolute top-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-stone-700 shadow backdrop-blur hover:bg-white sm:flex z-40 pointer-events-auto" style={{ left: 'calc(50% + 38.6cqw + 20px)' } as any}>
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          {media.length > 1 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} onPointerDown={(e) => e.stopPropagation()} aria-label="التالي" className="absolute top-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-stone-700 shadow backdrop-blur hover:bg-white sm:flex z-40 pointer-events-auto" style={{ left: 'calc(50% - 38.6cqw - 20px)' } as any}>
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Dots — hidden for single media to avoid meaningless single-dot */}
          {media.length > 1 && (
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
          )}
        </div>
      </div>
    </section>
  );
};
