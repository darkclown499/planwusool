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
      style={{ overflow: 'visible', filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.5))' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="titaniumFrame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6b6b72" />
          <stop offset="50%" stopColor="#2e2e35" />
          <stop offset="100%" stopColor="#121216" />
        </linearGradient>
        <radialGradient id="cameraLens" cx="0.35" cy="0.35" r="0.9">
          <stop offset="0%" stopColor="#4aa2ff" />
          <stop offset="45%" stopColor="#16263f" />
          <stop offset="100%" stopColor="#04060b" />
        </radialGradient>
        <linearGradient id="edgeHighlight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="9%" stopColor="rgba(255,255,255,0)" />
          <stop offset="91%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.35)" />
        </linearGradient>
        <linearGradient id="glassReflection" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Titanium body ring with a slim bezel (iPhone 15 Pro style) */}
      <path
        fillRule="evenodd"
        fill="url(#titaniumFrame)"
        d="M 0 51 L 0 758 A 54 54 0 0 0 54 812 L 321 812 A 54 54 0 0 0 375 758 L 375 54 A 54 54 0 0 0 321 0 L 54 0 A 54 54 0 0 0 0 54 Z M 6 44 L 6 768 A 38 38 0 0 0 44 806 L 331 806 A 38 38 0 0 0 369 768 L 369 44 A 38 38 0 0 0 331 6 L 44 6 A 38 38 0 0 0 6 44 Z"
      />

      {/* Outer metallic edge highlight */}
      <path
        d="M 54 2 L 321 2 A 52 52 0 0 1 373 54 L 373 758 A 52 52 0 0 1 321 810 L 54 810 A 52 52 0 0 1 2 758 L 2 54 A 52 52 0 0 1 54 2 Z"
        fill="none"
        stroke="url(#edgeHighlight)"
        strokeWidth="1.4"
      />

      {/* Chamfered inner edge highlight (bright on left, subtle on right) */}
      <path
        d="M 6 41 L 6 770 A 38 38 0 0 0 44 806 L 331 806 A 38 38 0 0 0 369 768 L 369 41 A 38 38 0 0 0 331 3 L 44 3 A 38 38 0 0 0 6 41 Z"
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1.2"
      />

      {/* Soft glass reflection across the top of the screen */}
      <rect x="12" y="12" width="350" height="120" rx="30" fill="url(#glassReflection)" opacity="0.32" />

      {/* Dynamic Island (compact pill) */}
      <rect x="128.5" y="27" width="118" height="32" rx="16" fill="#05040a" />
      <rect x="128.5" y="27" width="118" height="32" rx="16" fill="none" stroke="rgba(120,120,130,0.35)" strokeWidth="1" />
      <circle cx="141.5" cy="47" r="3.4" fill="url(#cameraLens)" />
      <circle cx="180" cy="46" r="1.8" fill="#0e0e12" />

      {/* Side buttons — slim, just off the body edge */}
      <rect x="1.5" y="72" width="3.5" height="26" rx="1.75" fill="#46464d" />
      <rect x="1.5" y="252" width="3.5" height="44" rx="1.75" fill="#3a403d" />
      <rect x="1.5" y="302" width="3.5" height="44" rx="1.75" fill="#3a403d" />
      <rect x="370" y="252" width="3.5" height="54" rx="1.75" fill="#46464d" />

      {/* Home indicator */}
      <rect x="119" y="794" width="107" height="5" rx="2.5" fill="rgba(0,0,0,0.5)" />
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
        {/* Interactivity hint as a floating pill beside the phone (desktop only) */}
        <div className="pointer-events-none absolute left-0 top-[10%] z-20 hidden -translate-x-20 lg:block">
          <div className="hint-bob flex items-center gap-2.5 rounded-2xl border border-white/10 bg-gray-950/85 py-3 pl-3 pr-3 shadow-2xl backdrop-blur-md">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: brandColor }}
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
            <div className="whitespace-nowrap">
              <p className="text-[11px] font-bold leading-tight text-white/90">اسحب لاستكشاف</p>
              <p className="text-[9px] leading-tight text-white/45">المتجر الحقيقي تفاعليًا</p>
            </div>
            <MousePointerClick className="h-4 w-4 -translate-y-[1px]" style={{ color: brandColor }} />
          </div>
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
                className="absolute inset-[6px] overflow-hidden rounded-[34px] bg-white sm:rounded-[36px] lg:rounded-[38px]"
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
        @keyframes hintBob {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(8px, -3px); }
        }
        .hint-bob {
          animation: hintBob 4s ease-in-out 1s infinite;
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
          .hint-bob {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}