import React, { useState } from 'react';
import { MousePointerClick } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getStoreThemes } from '@/data/storeThemes';

const PREVIEW_THEMES = ['gadgets', 'fashion', 'supermarket', 'bakery'];

/**
 * Realistic iPhone-style titanium frame (SVG).
 * The screen hole is transparent so the real store render shows through edge-to-edge.
 */
function PhoneFrame() {
  return (
    <svg
      viewBox="0 0 375 812"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      style={{ overflow: 'visible', filter: 'drop-shadow(0 28px 60px rgba(0,0,0,0.45))' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="titaniumFrame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5b5b61" />
          <stop offset="50%" stopColor="#2d2d33" />
          <stop offset="100%" stopColor="#141417" />
        </linearGradient>
        <radialGradient id="cameraLens" cx="0.35" cy="0.35" r="0.9">
          <stop offset="0%" stopColor="#4a9eff" />
          <stop offset="45%" stopColor="#15263f" />
          <stop offset="100%" stopColor="#04060b" />
        </radialGradient>
        <linearGradient id="glassReflection" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Frame ring with transparent screen cutout */}
      <path
        fillRule="evenodd"
        fill="url(#titaniumFrame)"
        d="M 55 0 L 320 0 A 55 55 0 0 1 375 55 L 375 757 A 55 55 0 0 1 320 812 L 55 812 A 55 55 0 0 1 0 757 L 0 55 A 55 55 0 0 1 55 0 Z M 56 12 L 319 12 A 47 47 0 0 1 366 59 L 366 753 A 47 47 0 0 1 319 800 L 56 800 A 47 47 0 0 1 9 753 L 9 59 A 47 47 0 0 1 56 12 Z"
      />

      {/* Outer edge highlight */}
      <path
        d="M 55 1.5 L 320 1.5 A 53.5 53.5 0 0 1 373.5 55 L 373.5 757 A 53.5 53.5 0 0 1 320 810.5 L 55 810.5 A 53.5 53.5 0 0 1 1.5 757 L 1.5 55 A 53.5 53.5 0 0 1 55 1.5 Z"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
      />

      {/* Inner glass edge highlight */}
      <rect x="9" y="12" width="357" height="788" rx="47" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />

      {/* Soft glass reflection across the top of the screen */}
      <rect x="13" y="14" width="349" height="150" rx="45" fill="url(#glassReflection)" opacity="0.35" />

      {/* Dynamic Island */}
      <rect x="124.5" y="15" width="126" height="37" rx="18.5" fill="#050505" />
      <circle cx="170" cy="33.5" r="6.5" fill="url(#cameraLens)" />
      <circle cx="190" cy="33.5" r="4" fill="#121317" />

      {/* Side buttons */}
      <rect x="-3.5" y="180" width="7" height="28" rx="3.5" fill="#43434a" />
      <rect x="-3.5" y="258" width="7" height="42" rx="3.5" fill="#38383e" />
      <rect x="-3.5" y="308" width="7" height="42" rx="3.5" fill="#38383e" />
      <rect x="371.5" y="252" width="7" height="56" rx="3.5" fill="#43434a" />

      {/* Antenna lines */}
      <rect x="0.5" y="76" width="2.5" height="10" rx="1.25" fill="#202026" />
      <rect x="0.5" y="360" width="2.5" height="10" rx="1.25" fill="#202026" />
      <rect x="0.5" y="642" width="2.5" height="10" rx="1.25" fill="#202026" />
      <rect x="372" y="96" width="2.5" height="10" rx="1.25" fill="#202026" />
      <rect x="372" y="420" width="2.5" height="10" rx="1.25" fill="#202026" />
      <rect x="372" y="704" width="2.5" height="10" rx="1.25" fill="#202026" />

      {/* Home indicator */}
      <rect x="127.5" y="798" width="120" height="5" rx="2.5" fill="rgba(0,0,0,0.45)" />
    </svg>
  );
}

interface StoreDevicePreviewProps {
  storeUrl: string;
  brandColor?: string;
  className?: string;
}

export default function StoreDevicePreview({ storeUrl, brandColor = '#10b77f', className = '' }: StoreDevicePreviewProps) {
  const { t } = useTranslation();
  const [themeId, setThemeId] = useState(PREVIEW_THEMES[0]);

  const previewUrl = `${storeUrl}?theme=${themeId}`;
  const allThemes = getStoreThemes();
  const themeName = (id: string) => allThemes.find((th) => th.id === id)?.name || id;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* ── Store category chips (above the phone) ── */}
      <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
        {PREVIEW_THEMES.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setThemeId(id)}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors sm:px-4 sm:py-2 sm:text-[13px] ${
              themeId === id
                ? 'border-transparent text-white'
                : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:text-white'
            }`}
            style={themeId === id ? { backgroundColor: brandColor, boxShadow: `0 0 16px ${brandColor}55` } : undefined}
          >
            {themeName(id)}
          </button>
        ))}
      </div>

      {/* ── Device (positioning context for the hint badge) ── */}
      <div className="phone-enter relative">
        {/* Interactivity hint floating above the phone */}
        <div className="absolute -top-3.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-gray-950/90 px-3.5 py-1.5 text-[11px] font-medium text-white/70 shadow-lg backdrop-blur-sm">
          <MousePointerClick className="ml-1 inline h-3.5 w-3.5 -translate-y-[1px]" />
          اسحب لاستكشاف المتجر الحقيقي
        </div>

        {/* Subtle tilt on desktop only (straightens on hover) */}
        <div className="rotate-0 transition-transform duration-500 ease-out will-change-transform lg:rotate-[6deg] lg:hover:rotate-0">
          {/* Gentle float on desktop only */}
          <div className="phone-float relative">
            {/* Soft layered glow behind the phone */}
            <div
              className="pointer-events-none absolute -inset-12 rounded-full opacity-70 blur-3xl"
              style={{ background: `radial-gradient(circle, ${brandColor}80, transparent 70%)` }}
            />
            <div
              className="pointer-events-none absolute -inset-3 rounded-full opacity-50 blur-2xl"
              style={{ background: `radial-gradient(circle, ${brandColor}3d, transparent 65%)` }}
            />

            {/* Screen: real store render, edge-to-edge, fluid to the wrapper width */}
            <div className="relative aspect-[375/812] w-[min(92vw,360px)] sm:w-[340px] lg:w-[375px]">
              {/* Clipped screen window (rounded corners) — re-mounted on theme change for a smooth fade */}
              <div
                key={themeId}
                className="absolute inset-0 overflow-hidden rounded-[30px] bg-white sm:rounded-[34px] lg:rounded-[47px]"
                style={{ animation: 'previewFade 0.35s ease-out' }}
              >
                <iframe
                  src={previewUrl}
                  title={t('Live store preview')}
                  loading="lazy"
                  className="block h-full w-full border-0 bg-white"
                />
              </div>

              {/* Realistic iPhone frame overlay */}
              <PhoneFrame />
            </div>

            {/* Floor reflection (desktop only — avoids overlapping content on mobile) */}
            <div
              className="pointer-events-none absolute -bottom-8 left-1/2 hidden h-8 w-[92%] -translate-x-1/2 rounded-[100%] blur-xl lg:block"
              style={{ background: `${brandColor}45` }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes previewFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes phoneFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes phoneEnter {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .phone-enter {
          animation: phoneEnter 0.6s ease-out both;
        }
        @media (min-width: 1024px) {
          .phone-float {
            animation: phoneFloat 6s ease-in-out infinite;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .phone-enter {
            animation: none;
          }
          .phone-float {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}