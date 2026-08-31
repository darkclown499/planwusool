import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { V2Product } from '../../shared/hooks';
import { AtelierProductCard } from './AtelierProductCard';

interface AtelierRailProps {
  title: string;
  subtitle?: string;
  products: V2Product[];
  /** Optional href for the "عرض الكل" link. */
  viewAllHref?: string;
}

/**
 * A titled horizontal scroll of atelier product cards — the homepage's
 * merchandising rhythm ("وصل حديثاً" / "الأكثر مبيعاً"). Arrow buttons on
 * desktop, native momentum scrolling everywhere.
 */
export const AtelierRail: React.FC<AtelierRailProps> = ({ title, subtitle, products, viewAllHref }) => {
  const scroller = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRevealed(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  // Hide the mobile "اسحب للمزيد" cue as soon as the user actually scrolls the rail.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => setScrolled(true);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const nudge = (dir: number) => {
    const el = scroller.current;
    if (!el) return;
    // RTL: positive x scrolls toward later items visually on the left side.
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.7), behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  return (
    <section ref={railRef as any} className={`bg-[#faf7f2] pt-6 pb-0 sm:pt-8 sm:pb-2 transition-all duration-500 motion-reduce:transition-none ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-end justify-between gap-4 sm:mb-4">
          <div>
            <span className="mb-2 block h-px w-10 bg-[#b08d57]" />
            <h2 className="font-serif text-xl font-semibold text-stone-900 sm:text-2xl">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {viewAllHref && (
              <a href={viewAllHref} className="hidden text-[13px] font-semibold text-stone-600 underline-offset-4 transition hover:text-[#9d7463] hover:underline sm:block">
                عرض الكل
              </a>
            )}
            <div className="hidden gap-1 sm:flex">
              <button type="button" onClick={() => nudge(-1)} aria-label="السابق"
                className="rounded-full border border-stone-300 p-2 text-stone-600 transition hover:border-[#9d7463] hover:text-[#9d7463]">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => nudge(1)} aria-label="التالي"
                className="rounded-full border border-stone-300 p-2 text-stone-600 transition hover:border-[#9d7463] hover:text-[#9d7463]">
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile swipe cue — reserved slot keeps rail height stable; fades once the user scrolls */}
        {products.length > 4 && (
          <div className="min-h-[24px] overflow-hidden sm:hidden" aria-hidden>
            <p className={`mb-2 inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-stone-500 transition-opacity duration-300 ${scrolled ? 'opacity-0' : 'opacity-100'}`}>
              اسحب للمزيد
              <ChevronLeft className="h-3 w-3" />
            </p>
          </div>
        )}

        <div className="relative">
          <div
            ref={scroller}
            className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-6 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 sm:pb-6 sm:pt-2"
          >
            {products.map((p) => (
              <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23%] lg:w-[19%] min-[1400px]:w-[16%]">
                <AtelierProductCard product={p} />
              </div>
            ))}
          </div>
          </div>
      </div>
    </section>
  );
};
