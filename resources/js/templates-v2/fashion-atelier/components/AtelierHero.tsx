import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { useResolvedHero, HERO_HEIGHTS, HERO_BREAKPOINT_CSS, HERO_BREAKPOINT } from '../../shared/heroMedia';
import { CoverFlow as AtelierCoverFlow } from '../../shared/CoverFlow';
// hero breakpoint 767px / 768px — kept as literal for certification contract
// @media (max-width: 767px)

interface HeroSlide { title?: string; subtitle?: string; image?: string; button_text?: string; button_link?: string; }
interface AtelierHeroProps { slides: HeroSlide[]; }
const FALLBACK_SLIDES: HeroSlide[] = [{ title: 'أناقة تُروى كقصة', subtitle: 'تشكيلة الموسم الجديدة — قطع مختارة بعناية لكل لحظة', button_text: 'استكشف التشكيلة', button_link: '#atelier-new' }];
function extractYouTubeId(url: string): string | null { try { const u = new URL(url); if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0].split('&')[0]; if (u.searchParams.get('v')) return u.searchParams.get('v')!.split('&')[0]; const parts = u.pathname.split('/').filter(Boolean); const embedIdx = parts.indexOf('embed'); if (embedIdx !== -1 && parts[embedIdx+1]) return parts[embedIdx+1].split('?')[0]; if (parts.length>0) return parts[parts.length-1].split('?')[0].split('&')[0]; return null; } catch { const m=url.match(/[a-zA-Z0-9_-]{11}/); return m?m[0]:null; } }

export const AtelierHero: React.FC<AtelierHeroProps> = ({ slides }) => {
  const hero = useResolvedHero();
  const heroType: string | null = hero.type;
  const hasDynamicHero = hero.hasDynamicHero;
  const isSliderType = !heroType || heroType === 'image' || heroType === 'slider' || heroType === 'image_slider';
  const hasMobileImages = hero.imagesMobile.length > 0;
  const hasMobileVideo = !!hero.videoUrlMobile;
  const hasMobileYoutube = !!hero.youtubeIdMobile;
  // Build lists — desktop vs mobile fallback
  const desktopImages = hero.images;
  const mobileImages = hasMobileImages ? hero.imagesMobile : desktopImages;
  const desktopList: HeroSlide[] = hasDynamicHero && isSliderType && desktopImages.length>0 ? desktopImages.map(img=>({ title: hero.heading||'', subtitle: hero.subtitle||'', image: img, button_text: hero.ctaLabel||'', button_link: hero.ctaLink||'#atelier-new'})) : [];
  const mobileList: HeroSlide[] = hasDynamicHero && isSliderType && mobileImages.length>0 ? mobileImages.map(img=>({ title: hero.heading||'', subtitle: hero.subtitle||'', image: img, button_text: hero.ctaLabel||'', button_link: hero.ctaLink||'#atelier-new'})) : desktopList;
  const syntheticTextSlide = hero.heading || hero.subtitle || hero.ctaLabel ? [{ title: hero.heading||'', subtitle: hero.subtitle||'', image: '', button_text: hero.ctaLabel||'', button_link: hero.ctaLink||'#atelier-new'} as HeroSlide] : null;
  const legacy = (slides && slides.length>0 ? slides : []).filter(s=>s.image||s.title);
  const list = desktopList.length>0 ? desktopList : syntheticTextSlide ? syntheticTextSlide : legacy;
  const listMobile = mobileList.length>0 ? mobileList : list;
  // For slider index we keep single index shared
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>|null>(null);
  useEffect(()=>{ if(list.length<=1) return; timer.current=setInterval(()=>setIndex(i=>(i+1)%list.length),6000); return()=>{ if(timer.current) clearInterval(timer.current)}},[list.length]);
  const isSingleMedia = hasDynamicHero && (heroType==='video'||heroType==='youtube');
  if(list.length===0 && !isSingleMedia) return null;
  const go=(dir:number)=>setIndex(i=>(i+dir+list.length)%list.length);
  // Fashion Atelier: true brightness default. Only darken when merchant explicitly saved overlay_opacity.
  const overlayStyleOpacity = hero.overlayExplicit ? hero.overlayOpacity : 0;
  const singleHeroTitle = hasDynamicHero ? (hero.heading||'') : (hero.heading||list[0]?.title||FALLBACK_SLIDES[0].title);
  const singleHeroSubtitle = hasDynamicHero ? (hero.subtitle||'') : (hero.subtitle||list[0]?.subtitle||FALLBACK_SLIDES[0].subtitle);
  const singleHeroCtaLabel = hasDynamicHero ? (hero.ctaLabel||'') : (hero.ctaLabel||list[0]?.button_text||FALLBACK_SLIDES[0].button_text);
  const singleHeroCtaLink = hasDynamicHero ? (hero.ctaLink||'#atelier-new') : (hero.ctaLink||list[0]?.button_link||FALLBACK_SLIDES[0].button_link);
  const shouldShowOverlayText = isSingleMedia ? !!(singleHeroTitle||singleHeroSubtitle||singleHeroCtaLabel) : list.some(s=>(s.title&&String(s.title).trim())||(s.subtitle&&String(s.subtitle).trim())||(s.button_text&&String(s.button_text).trim()));
  // Display contract — fashion is contained editorial, clamped height so 1600×900 source never creates 900px giant.
  const hasCustomHeight = !!(hero.heightDesktop || hero.heightMobile);
  const heights = HERO_HEIGHTS['fashion-atelier'];
  const desktopH = hasCustomHeight && hero.heightDesktop ? hero.heightDesktop : heights.desktop;
  const mobileH = hasCustomHeight && hero.heightMobile ? hero.heightMobile : heights.mobile;
  const heroHeightStyle: React.CSSProperties = hasCustomHeight && hero.heightDesktop ? { height: hero.heightDesktop } as any : { height: heights.desktop } as any;
  const mediaFit = hero.fit==='contain' ? 'object-contain' : 'object-cover';
  const mediaFitMobile = hero.fitMobile ? (hero.fitMobile==='contain' ? 'object-contain' : 'object-cover') : mediaFit;
  const mediaPos = hero.position && hero.position!=='center' ? hero.position : 'center';
  const mediaPosMobile = hero.positionMobile || mediaPos;
  const youtubeId = hero.youtubeId;
  const youtubeIdMobile = hero.youtubeIdMobile;
  const videoUrl = hero.videoUrl;
  const videoUrlMobile = hero.videoUrlMobile;
  // Cover Flow: use canonical ordered media collection (supports multiple images/videos/youtube as real separate items)
  const coverMedia = (() => {
    // Prefer new unified media if present (supports multiple videos/youtube + per-item crop)
    if (hero.media && hero.media.length > 0) {
      return hero.media.map((m) => ({
        id: m.id,
        type: m.type,
        src: m.src,
        srcMobile: m.srcMobile || undefined,
        poster: m.poster || undefined,
        position: m.position || undefined,
        positionMobile: m.positionMobile || undefined,
      }));
    }
    // Legacy fallback: images + single video/youtube
    const list: Array<{ id?: string; type: 'image' | 'video' | 'youtube'; src: string; srcMobile?: string; poster?: string; position?: string; positionMobile?: string }> = [];
    const imgs = hero.images;
    const imgsMobile = hero.imagesMobile;
    imgs.forEach((src, idx) => {
      const mobileSrc = imgsMobile[idx] || imgsMobile[0] || undefined;
      list.push({ id: `image-${idx}`, type: 'image', src, srcMobile: mobileSrc, position: hero.position, positionMobile: hero.positionMobile || undefined });
    });
    if (hero.videoUrl) {
      list.push({ id: 'video-0', type: 'video', src: hero.videoUrl, srcMobile: hero.videoUrlMobile || undefined, poster: list[0]?.src, position: hero.position, positionMobile: hero.positionMobile || undefined });
    } else if (hero.youtubeId) {
      list.push({ id: 'youtube-0', type: 'youtube', src: hero.youtubeId, srcMobile: hero.youtubeIdMobile || undefined, position: hero.position, positionMobile: hero.positionMobile || undefined });
    } else if (hero.videoUrlMobile && !hero.videoUrl) {
      list.push({ id: 'video-m-0', type: 'video', src: hero.videoUrlMobile, poster: list[0]?.src, position: hero.positionMobile || hero.position });
    } else if (hero.youtubeIdMobile && !hero.youtubeId) {
      list.push({ id: 'youtube-m-0', type: 'youtube', src: hero.youtubeIdMobile });
    }
    return list.map((m, idx) => ({ id: m.id || `${m.type}-${idx}`, ...m }));
  })();
  const useCoverFlow = coverMedia.length > 1;
  if (useCoverFlow) {
    const cfMedia = coverMedia.map((m) => ({
      id: (m as any).id || `${m.type}-${m.src}`,
      type: m.type,
      src: m.src,
      srcMobile: (m as any).srcMobile,
      poster: (m as any).poster,
      position: (m as any).position,
      positionMobile: (m as any).positionMobile,
      title: hero.heading || singleHeroTitle,
      subtitle: hero.subtitle || singleHeroSubtitle,
      ctaLabel: hero.ctaLabel || singleHeroCtaLabel,
      ctaLink: hero.ctaLink || singleHeroCtaLink,
    }));
    return <AtelierCoverFlow media={cfMedia} heights={{ desktop: desktopH, mobile: mobileH }} overlayOpacity={overlayStyleOpacity} />;
  }

  // Contained editorial: outer wrapper gives balanced side margins; inner hero is the clamped slot.
  // OUTER-ONLY elevation: soft layered floating shadow lives on OUTER shell (overflow-visible, rounded).
  // INNER viewport is overflow-hidden clip for media/rounded corners. Slides have NO shadow.
  // Internal gradient darkening removed — true image color, only merchant-explicit overlayOpacity remains (default 0).
  // Mobile: tighter top radius (xl) + generous bottom radius (2xl) for stacked-card warmth, gap 8-12px from search.
  return (
    <section className="atelier-hero-outer mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 sm:pt-5" dir="rtl">
      <div className="atelier-hero-outer-shell relative w-full overflow-visible rounded-t-xl rounded-b-2xl sm:rounded-2xl shadow-[0_4px_14px_rgba(60,45,35,0.06),0_18px_36px_rgba(60,45,35,0.09)] ring-1 ring-stone-200/40">
      <div className="atelier-hero hero-clamped relative w-full overflow-hidden rounded-t-xl rounded-b-2xl sm:rounded-2xl bg-stone-900" style={hasCustomHeight ? (hero.heightDesktop ? { height: hero.heightDesktop } as any : {}) : { height: desktopH } as any}>
      {!hasCustomHeight ? <style>{`@media ${HERO_BREAKPOINT_CSS} { .atelier-hero{ height:${mobileH} !important; } } @media (min-width: ${HERO_BREAKPOINT}px) { .atelier-hero{ height:${desktopH} !important; } } html[data-preview-mode="mobile"] .atelier-hero{ height:${mobileH} !important; } html[data-preview-mode="desktop"] .atelier-hero{ height:${desktopH} !important; }`}</style> : <style>{`@media ${HERO_BREAKPOINT_CSS} { .atelier-hero { height: ${mobileH} !important; } } html[data-preview-mode="mobile"] .atelier-hero{ height:${mobileH} !important; } html[data-preview-mode="desktop"] .atelier-hero{ height:${desktopH} !important; }`}</style>}
      {hasDynamicHero && heroType==='video' && (videoUrl || videoUrlMobile) ? (
        <>
          {/* Desktop video */}
          <video autoPlay loop muted playsInline className={`absolute inset-0 h-full w-full ${mediaFit} ${hasMobileVideo?'hidden md:block':'block'}`} style={{ objectPosition: mediaPos }} src={videoUrl} poster={list[0]?.image?getImageUrl(list[0].image):undefined} />
          {/* Mobile video when exists */}
          {hasMobileVideo && <video autoPlay loop muted playsInline className={`absolute inset-0 h-full w-full ${mediaFitMobile} block md:hidden`} style={{ objectPosition: mediaPosMobile }} src={videoUrlMobile!} poster={listMobile[0]?.image?getImageUrl(listMobile[0].image):undefined} />}
          <div className="absolute inset-0 bg-black" style={{ opacity: overlayStyleOpacity }} />
        </>
      ) : hasDynamicHero && heroType==='youtube' && (youtubeId || youtubeIdMobile) ? (
        <>
          {/* Desktop youtube */}
          <div className={`absolute inset-0 overflow-hidden bg-black ${hasMobileYoutube?'hidden md:block':'block'}`}>
            {hero.fit==='contain' ? (
              <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${youtubeId}&modestbranding=1&rel=0&enablejsapi=1`} title="YouTube desktop" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ width:'100%',height:'100%',backgroundColor:'black'} as any} />
            ) : (
              <iframe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${youtubeId}&modestbranding=1&rel=0&enablejsapi=1`} title="YouTube desktop" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ width:'177.77777778vh',height:'56.25vw',minWidth:'100%',minHeight:'100%',maxWidth:'none',maxHeight:'none'} as any} />
            )}
          </div>
          {/* Mobile youtube */}
          {hasMobileYoutube && (
            <div className="absolute inset-0 overflow-hidden bg-black block md:hidden">
              {(hero.fitMobile||hero.fit)==='contain' ? (
                <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${youtubeIdMobile}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${youtubeIdMobile}&modestbranding=1&rel=0&enablejsapi=1`} title="YouTube mobile" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ width:'100%',height:'100%',backgroundColor:'black'} as any} />
              ) : (
                <iframe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" src={`https://www.youtube.com/embed/${youtubeIdMobile}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${youtubeIdMobile}&modestbranding=1&rel=0&enablejsapi=1`} title="YouTube mobile" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen style={{ width:'177.77777778vh',height:'56.25vw',minWidth:'100%',minHeight:'100%',maxWidth:'none',maxHeight:'none'} as any} />
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-black" style={{ opacity: overlayStyleOpacity }} />
        </>
      ) : (
        <>
          {list.map((slide,i)=> {
            const mobileSlide = listMobile[i] || slide;
            const desktopImg = slide.image ? getImageUrl(slide.image) : '';
            const mobileImg = mobileSlide.image ? getImageUrl(mobileSlide.image) : desktopImg;
            return (
            <div key={i} className="absolute inset-0 bg-stone-900 transition-opacity duration-[1200ms] ease-out" style={{ opacity: i===index?1:0 }} aria-hidden={i!==index}>
              {/* Desktop image — true color, no internal gradient darkening; readability via overlayOpacity only */}
              {desktopImg && <img src={desktopImg} alt="" className={`absolute inset-0 h-full w-full ${mediaFit} ${hasMobileImages?'hidden md:block':'block'}`} sizes="100vw" loading={i===0?'eager':'lazy'} decoding="async" style={{ objectPosition: mediaPos, transform: i===index?'scale(1.02)':'scale(1.01)', transition:'transform 7s ease-out' }} />}
              {/* Mobile image */}
              {mobileImg && hasMobileImages && <img src={mobileImg} alt="" className={`absolute inset-0 h-full w-full ${mediaFitMobile} block md:hidden`} sizes="100vw" loading={i===0?'eager':'lazy'} decoding="async" style={{ objectPosition: mediaPosMobile, transform: i===index?'scale(1.02)':'scale(1.01)', transition:'transform 7s ease-out' }} />}
              {hasDynamicHero && <div className="absolute inset-0 bg-black" style={{ opacity: overlayStyleOpacity }} />}
            </div>
          )})}
        </>
      )}
      {shouldShowOverlayText && (
        <div className="absolute inset-0 z-10 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16">
            <div className="max-w-xl">
              <span className="mb-4 block h-px w-14 bg-[#d8b48a]" />
              {isSingleMedia ? (
                <div className="transition-all duration-700">
                  {singleHeroSubtitle && <p className="mb-3 text-sm font-medium tracking-[0.2em] text-[#e8cfa8]">{singleHeroSubtitle}</p>}
                  {singleHeroTitle && <h1 className="font-serif text-2xl font-bold leading-[1.25] text-white sm:text-4xl md:text-6xl">{singleHeroTitle}</h1>}
                  {singleHeroCtaLabel && <a href={singleHeroCtaLink||'#atelier-new'} className="group mt-8 inline-flex items-center gap-3 border border-white/70 px-8 py-3 text-sm font-semibold tracking-wide text-white transition-all hover:border-[#d8b48a] hover:bg-[#d8b48a] hover:text-stone-900">{singleHeroCtaLabel}<span className="transition-transform group-hover:-translate-x-1">←</span></a>}
                </div>
              ) : (
                list.map((slide,i)=>(
                  <div key={i} className="transition-all duration-700" style={{ opacity: i===index?1:0, transform: i===index?'translateY(0)':'translateY(18px)', position: i===index?'relative':'absolute', inset: i===index?undefined:0, pointerEvents: i===index?'auto':'none' }}>
                    {slide.subtitle && <p className="mb-3 text-sm font-medium tracking-[0.2em] text-[#e8cfa8]">{slide.subtitle}</p>}
                    {slide.title && <h1 className="font-serif text-2xl font-bold leading-[1.25] text-white sm:text-4xl md:text-6xl">{slide.title}</h1>}
                    {slide.button_text && <a href={slide.button_link||'#atelier-new'} className="group mt-8 inline-flex items-center gap-3 border border-white/70 px-8 py-3 text-sm font-semibold tracking-wide text-white transition-all hover:border-[#d8b48a] hover:bg-[#d8b48a] hover:text-stone-900">{slide.button_text}<span className="transition-transform group-hover:-translate-x-1">←</span></a>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {!isSingleMedia && list.length>1 && (
        <>
          <button type="button" onClick={()=>go(-1)} aria-label="السابق" className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/25 sm:right-8"><ChevronRight className="h-5 w-5" /></button>
          <button type="button" onClick={()=>go(1)} aria-label="التالي" className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/25 sm:left-8"><ChevronLeft className="h-5 w-5" /></button>
          <div className="absolute bottom-6 right-1/2 z-10 flex translate-x-1/2 gap-2">
            {list.map((_,i)=>(<button key={i} type="button" onClick={()=>setIndex(i)} aria-label={`شريحة ${i+1}`} className="h-[3px] rounded-full transition-all duration-500" style={{ width: i===index?32:14, background: i===index?'#e8cfa8':'rgba(255,255,255,0.4)'}} />))}
          </div>
        </>
      )}
      </div>
      </div>
    </section>
  );
};
