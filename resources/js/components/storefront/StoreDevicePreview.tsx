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
      viewBox="0 0 428 926"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      style={{ overflow: 'visible', filter: 'drop-shadow(0 34px 70px rgba(0,0,0,0.5))' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="steelFrame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9ccd2" />
          <stop offset="22%" stopColor="#7b7e85" />
          <stop offset="50%" stopColor="#3a3b41" />
          <stop offset="78%" stopColor="#6e7077" />
          <stop offset="100%" stopColor="#2a2b31" />
        </linearGradient>
        <radialGradient id="cameraLens" cx="0.35" cy="0.35" r="0.9">
          <stop offset="0%" stopColor="#5aacff" />
          <stop offset="45%" stopColor="#16263f" />
          <stop offset="100%" stopColor="#04060b" />
        </radialGradient>
        <linearGradient id="rimHighlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.30)" />
        </linearGradient>
        <linearGradient id="glassReflection" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Stainless-steel body ring with the iPhone 13 Pro Max proportions */}
      <path
        fillRule="evenodd"
        fill="url(#steelFrame)"
        d="M 0 60 L 0 866 A 60 60 0 0 0 60 926 L 368 926 A 60 60 0 0 0 428 866 L 428 60 A 60 60 0 0 0 368 0 L 60 0 A 60 60 0 0 0 0 60 Z M 7 52 L 7 874 A 52 52 0 0 0 59 926 L 369 926 A 52 52 0 0 0 421 874 L 421 52 A 52 52 0 0 0 369 0 L 59 0 A 52 52 0 0 0 7 52 Z"
      />

      {/* Outer metallic rim highlight (brushed steel) */}
      <path
        d="M 60 1.5 L 368 1.5 A 58.5 58.5 0 0 1 426.5 60 L 426.5 866 A 58.5 58.5 0 0 1 368 924.5 L 60 924.5 A 58.5 58.5 0 0 1 1.5 866 L 1.5 60 A 58.5 58.5 0 0 1 60 1.5 Z"
        fill="none"
        stroke="url(#rimHighlight)"
        strokeWidth="1.4"
      />

      {/* Inner chamfered glass edge */}
      <rect x="8" y="8" width="412" height="910" rx="51" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" />

      {/* Soft glass reflection across the top of the screen */}
      <rect x="14" y="14" width="400" height="150" rx="45" fill="url(#glassReflection)" opacity="0.3" />

      {/* Notch (iPhone 13 Pro Max — wide) */}
      <rect x="139" y="14" width="150" height="34" rx="17" fill="#030308" />
      <rect x="139" y="14" width="150" height="34" rx="17" fill="none" stroke="rgba(90,95,105,0.4)" strokeWidth="1" />
      <circle cx="159" cy="31" r="5" fill="url(#cameraLens)" />
      <circle cx="181" cy="30.5" r="2.6" fill="#0b0b12" />

      {/* Side buttons — brushed steel */}
      <rect x="1.2" y="244" width="3" height="34" rx="1.5" fill="#b6b9c0" />
      <rect x="1.2" y="326" width="3" height="54" rx="1.5" fill="#86898f" />
      <rect x="1.2" y="386" width="3" height="54" rx="1.5" fill="#86898f" />
      <rect x="423.8" y="326" width="3" height="66" rx="1.5" fill="#b6b9c0" />

      {/* Antenna seams (metal frame) */}
      <rect x="0.6" y="150" width="2.2" height="9" rx="1.1" fill="#20232b" />
      <rect x="0.6" y="680" width="2.2" height="9" rx="1.1" fill="#20232b" />
      <rect x="425.2" y="170" width="2.2" height="9" rx="1.1" fill="#20232b" />
      <rect x="425.2" y="700" width="2.2" height="9" rx="1.1" fill="#20232b" />

      {/* Home indicator */}
      <rect x="149" y="909" width="130" height="5" rx="2.5" fill="rgba(0,0,0,0.55)" />
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
            <div className="relative aspect-[428/926] w-[min(90vw,360px)] sm:w-[360px] lg:w-[400px]">
              {/* Clipped screen window (rounded corners) — re-mounted on theme change for a smooth fade */}
              <div
                key={themeId}
                className="absolute inset-[7px] overflow-hidden rounded-[40px] bg-white sm:rounded-[44px] lg:rounded-[48px]"
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