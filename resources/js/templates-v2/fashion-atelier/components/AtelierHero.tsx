import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { useResolvedHero, HERO_DESKTOP_ASPECTS, HERO_MOBILE_ASPECT } from '../../shared/heroMedia';

interface HeroSlide { title?: string; subtitle?: string; image?: string; button_text?: string; button_link?: string; }
interface AtelierHeroProps { slides: HeroSlide[]; }
const FALLBACK_SLIDES: HeroSlide[] = [{ title: 'أناقة تُروى كقصة', subtitle: 'تشكيلة الموسم الجديدة — قطع مختارة بعناية لكل لحظة', button_text: 'اكتشفي التشكيلة', button_link: '#atelier-new' }];
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
  const overlayStyleOpacity = hasDynamicHero ? hero.overlayOpacity : 0.35;
  const singleHeroTitle = hasDynamicHero ? (hero.heading||'') : (hero.heading||list[0]?.title||FALLBACK_SLIDES[0].title);
  const singleHeroSubtitle = hasDynamicHero ? (hero.subtitle||'') : (hero.subtitle||list[0]?.subtitle||FALLBACK_SLIDES[0].subtitle);
  const singleHeroCtaLabel = hasDynamicHero ? (hero.ctaLabel||'') : (hero.ctaLabel||list[0]?.button_text||FALLBACK_SLIDES[0].button_text);
  const singleHeroCtaLink = hasDynamicHero ? (hero.ctaLink||'#atelier-new') : (hero.ctaLink||list[0]?.button_link||FALLBACK_SLIDES[0].button_link);
  const shouldShowOverlayText = isSingleMedia ? !!(singleHeroTitle||singleHeroSubtitle||singleHeroCtaLabel) : list.some(s=>(s.title&&String(s.title).trim())||(s.subtitle&&String(s.subtitle).trim())||(s.button_text&&String(s.button_text).trim()));
  // Aspect contract — fashion-atelier desktop 16:9, mobile 4:5. If merchant set custom height, respect it; otherwise use aspect.
  const hasCustomHeight = !!(hero.heightDesktop || hero.heightMobile);
  const desktopAspect = HERO_DESKTOP_ASPECTS['fashion-atelier'] || '16/9';
  const mobileAspect = HERO_MOBILE_ASPECT;
  const heroHeightStyle: React.CSSProperties = hasCustomHeight ? (hero.heightDesktop ? { height: hero.heightDesktop, minHeight:'360px', maxHeight:'520px' } : {}) : {};
  const aspectClass = hasCustomHeight ? '' : `aspect-[4/5] md:aspect-[${desktopAspect}]`.replace('16/9','16/9');
  // Use inline style aspectRatio with media query for robust Tailwind fallback
  const aspectStyle: React.CSSProperties = hasCustomHeight ? heroHeightStyle : { aspectRatio: desktopAspect } as any;
  const mediaFit = hero.fit==='contain' ? 'object-contain' : 'object-cover';
  const mediaFitMobile = hero.fitMobile ? (hero.fitMobile==='contain' ? 'object-contain' : 'object-cover') : mediaFit;
  const mediaPos = hero.position && hero.position!=='center' ? hero.position : 'center';
  const mediaPosMobile = hero.positionMobile || mediaPos;
  const youtubeId = hero.youtubeId;
  const youtubeIdMobile = hero.youtubeIdMobile;
  const videoUrl = hero.videoUrl;
  const videoUrlMobile = hero.videoUrlMobile;
  // Determine effective video/youtube per breakpoint via CSS swapping
  return (
    <section className={`atelier-hero relative w-full overflow-hidden bg-stone-900 ${hasCustomHeight?'':'hero-responsive'} ${aspectClass}`} style={hasCustomHeight ? heroHeightStyle : { ...aspectStyle }} dir="rtl">
      {!hasCustomHeight && <style>{`@media(max-width:767px){ .atelier-hero{ aspect-ratio:${mobileAspect} !important; } } @media(min-width:768px){ .atelier-hero{ aspect-ratio:${desktopAspect} !important; } }`}</style>}
      {hasCustomHeight && <style>{`@media (max-width: 767px) { .atelier-hero { height: ${hero.heightMobile || 'min(54vh, 380px)'} !important; min-height: 0 !important; max-height: none !important; } }`}</style>}
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
              {/* Desktop image */}
              {desktopImg && <img src={desktopImg} alt="" className={`absolute inset-0 h-full w-full ${mediaFit} ${hasMobileImages?'hidden md:block':'block'}`} sizes="100vw" loading={i===0?'eager':'lazy'} decoding="async" style={{ objectPosition: mediaPos, transform: i===index?'scale(1.02)':'scale(1.01)', transition:'transform 7s ease-out' }} />}
              {/* Mobile image */}
              {mobileImg && hasMobileImages && <img src={mobileImg} alt="" className={`absolute inset-0 h-full w-full ${mediaFitMobile} block md:hidden`} sizes="100vw" loading={i===0?'eager':'lazy'} decoding="async" style={{ objectPosition: mediaPosMobile, transform: i===index?'scale(1.02)':'scale(1.01)', transition:'transform 7s ease-out' }} />}
              <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-black/15 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
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
    </section>
  );
};
