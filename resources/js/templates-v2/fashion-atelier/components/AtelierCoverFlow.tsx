import React, { useEffect, useRef, useState } from 'react';
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

export const AtelierCoverFlow: React.FC<AtelierCoverFlowProps> = ({ media, heights, overlayOpacity }) => {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Autoplay active video, pause others, respect reduced motion and visibility
  useEffect(() => {
    if (reducedMotion) return;
    videoRefs.current.forEach((vid, i) => {
      if (i === index && media[i]?.type === 'video') {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [index, media, reducedMotion]);

  // Pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) videoRefs.current.forEach((v) => v.pause());
      else if (!reducedMotion && media[index]?.type === 'video') videoRefs.current.get(index)?.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [index, media, reducedMotion]);

  // Auto-advance every 5s if not reduced motion and user not interacting
  const pausedRef = useRef(false);
  useEffect(() => {
    if (reducedMotion || media.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      setIndex((i) => (i + 1) % media.length);
    }, 5000);
    return () => clearInterval(id);
  }, [media.length, reducedMotion]);

  const go = (dir: number) => setIndex((i) => (i + dir + media.length) % media.length);

  // Sync scroll position to active index (RTL-aware)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement | undefined;
    if (child) child.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  }, [index, reducedMotion]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    // Find closest to center
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const cc = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(cc - center);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    if (best !== index && bestDist < 80) setIndex(best);
  };

  if (media.length === 0) return null;
  if (media.length === 1) {
    const m = media[0];
    return (
      <section className="atelier-hero-outer mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 sm:pt-5" dir="rtl">
        <div className="relative w-full overflow-hidden rounded-t-xl rounded-b-2xl sm:rounded-2xl bg-stone-900 shadow-[0_4px_14px_rgba(60,45,35,0.06),0_18px_36px_rgba(60,45,35,0.09)] ring-1 ring-stone-200/40" style={{ height: heights.desktop } as any}>
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
      </section>
    );
  }

  return (
    <section className="atelier-hero-outer mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 sm:pt-5" dir="rtl">
      <div className="relative w-full" style={{ height: heights.desktop } as any}>
        <style>{`@media (max-width: 767px){ .atelier-cover-viewport{ height:${heights.mobile} !important; } } @media (min-width: 768px){ .atelier-cover-viewport{ height:${heights.desktop} !important; } } html[data-preview-mode="mobile"] .atelier-cover-viewport{ height:${heights.mobile} !important; } html[data-preview-mode="desktop"] .atelier-cover-viewport{ height:${heights.desktop} !important; } html[data-preview-mode="mobile"] .atelier-cover-viewport{ direction: rtl; }`}</style>
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
          onTouchStart={() => { pausedRef.current = true; }}
          onTouchEnd={() => setTimeout(() => { pausedRef.current = false; }, 2000)}
          className="atelier-cover-viewport flex h-full snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden scroll-smooth px-4 sm:gap-4 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {media.map((m, i) => {
            const isActive = i === index;
            return (
              <div
                key={i}
                onClick={() => setIndex(i)}
                className={`relative shrink-0 snap-center overflow-hidden rounded-2xl bg-stone-900 shadow-[0_4px_14px_rgba(60,45,35,0.06),0_18px_36px_rgba(60,45,35,0.09)] ring-1 ring-stone-200/40 transition-all duration-400 ${isActive ? 'w-[84%] sm:w-[68%] opacity-100 scale-100' : 'w-[68%] sm:w-[56%] opacity-70 scale-[0.96]'}`}
                style={{ height: '100%' }}
                role="button"
                tabIndex={0}
                aria-label={`شريحة ${i + 1}`}
                onKeyDown={(e) => { if (e.key === 'Enter') setIndex(i); }}
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
                  />
                ) : m.type === 'youtube' ? (
                  <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${m.src}?mute=1&controls=0&playsinline=1&modestbranding=1&rel=0${isActive ? '&autoplay=1' : ''}`} title="YouTube" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen />
                ) : (
                  <img src={getImageUrl(m.src)} alt="" className="absolute inset-0 h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
                )}
                <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity * (isActive ? 1 : 0.55) }} />
                {(m.title || m.subtitle) && (
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                    {m.subtitle && <p className="text-[11px] font-bold tracking-[0.16em] text-[#e8cfa8]">{m.subtitle}</p>}
                    {m.title && <h3 className={`font-serif font-bold leading-tight text-white ${isActive ? 'text-lg sm:text-2xl' : 'text-base sm:text-xl'}`}>{m.title}</h3>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Arrows desktop */}
        <button type="button" onClick={() => go(-1)} aria-label="السابق" className="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2.5 text-stone-700 shadow backdrop-blur hover:bg-white sm:flex sm:right-4"><ChevronRight className="h-5 w-5" /></button>
        <button type="button" onClick={() => go(1)} aria-label="التالي" className="absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2.5 text-stone-700 shadow backdrop-blur hover:bg-white sm:flex sm:left-4"><ChevronLeft className="h-5 w-5" /></button>
        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {media.map((_, i) => (
            <button key={i} type="button" onClick={() => setIndex(i)} aria-label={`الانتقال إلى ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />
          ))}
        </div>
      </div>
    </section>
  );
};
