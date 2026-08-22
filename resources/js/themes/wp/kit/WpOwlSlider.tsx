import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface WpSlide {
  title: string;
  text?: string;
  image: string;
}

interface WpOwlSliderProps {
  slides: WpSlide[];
  buttonLabel: string;
}

/**
 * owl-carousel port — full-width cover image with vertically-centered
 * overlay copy on the start side, round bordered prev/next arrows and
 * dots, auto-advancing every 5.5s exactly like the originals.
 */
export const WpOwlSlider: React.FC<WpOwlSliderProps> = ({ slides, buttonLabel }) => {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(() => setIndex((v) => (v + 1) % count), 5500);
    return () => window.clearInterval(id);
  }, [count]);

  if (!count) return null;

  return (
    <div className="wpt-slider">
      <div className="wpt-slider__frame">
        {slides.map((slide, i) => (
          <div key={i} className={`wpt-slide ${i === index ? 'is-active' : ''}`}>
            <img src={slide.image} alt={slide.title} loading={i === 0 ? 'eager' : 'lazy'} />
            <div className="wpt-slide__position">
              <div className="wpt-container">
                <div className="wpt-slide__box">
                  <h2 className="wpt-slide__title">{slide.title}</h2>
                  {slide.text && <p className="wpt-slide__text">{slide.text}</p>}
                  <a href="#wpt-products" className="wpt-btn no-underline">
                    {buttonLabel}
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}

        {count > 1 && (
          <>
            <button type="button" className="wpt-arrow wpt-arrow--next" onClick={() => go(index + 1)} aria-label="التالي">
              <ChevronLeft size={20} />
            </button>
            <button type="button" className="wpt-arrow wpt-arrow--prev" onClick={() => go(index - 1)} aria-label="السابق">
              <ChevronRight size={20} />
            </button>
            <div className="wpt-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`wpt-dot ${i === index ? 'is-active' : ''}`}
                  onClick={() => go(i)}
                  aria-label={`الشريحة ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
