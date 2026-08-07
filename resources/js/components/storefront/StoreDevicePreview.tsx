import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getStoreThemes } from '@/data/storeThemes';

const PREVIEW_THEMES = ['gadgets', 'fashion', 'supermarket', 'bakery'];

/**
 * Realistic iPhone-style transparent frame (SVG).
 * The screen hole is transparent so the real store render shows through edge-to-edge.
 */
function PhoneFrame() {
  return (
    <svg
      viewBox="0 0 375 812"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      style={{ overflow: 'visible', filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.35))' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="titaniumFrame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a4a4e" />
          <stop offset="50%" stopColor="#2b2b2f" />
          <stop offset="100%" stopColor="#1a1a1d" />
        </linearGradient>
      </defs>

      {/* Frame ring with transparent screen cutout */}
      <path
        fillRule="evenodd"
        fill="url(#titaniumFrame)"
        d="M 55 0 L 320 0 A 55 55 0 0 1 375 55 L 375 757 A 55 55 0 0 1 320 812 L 55 812 A 55 55 0 0 1 0 757 L 0 55 A 55 55 0 0 1 55 0 Z M 56 12 L 319 12 A 47 47 0 0 1 366 59 L 366 753 A 47 47 0 0 1 319 800 L 56 800 A 47 47 0 0 1 9 753 L 9 59 A 47 47 0 0 1 56 12 Z"
      />

      {/* Inner glass edge highlight */}
      <rect x="9" y="12" width="357" height="788" rx="47" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />

      {/* Dynamic Island */}
      <rect x="124.5" y="15" width="126" height="37" rx="18.5" fill="#050505" />
      <rect x="140" y="23" width="36" height="12" rx="6" fill="#0f0f12" />

      {/* Side buttons */}
      <rect x="-3" y="176" width="6" height="26" rx="3" fill="#26262a" />
      <rect x="-3" y="252" width="6" height="40" rx="3" fill="#26262a" />
      <rect x="-3" y="300" width="6" height="40" rx="3" fill="#26262a" />
      <rect x="372" y="250" width="6" height="52" rx="3" fill="#26262a" />

      {/* Home indicator */}
      <rect x="127.5" y="797" width="120" height="5" rx="2.5" fill="rgba(0,0,0,0.35)" />
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
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
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

      {/* ── Device ── */}
      <div className="relative">
        {/* Soft layered glow behind the phone */}
        <div
          className="pointer-events-none absolute -inset-10 rounded-full opacity-60 blur-3xl sm:-inset-14"
          style={{ background: `radial-gradient(circle, ${brandColor}66, transparent 70%)` }}
        />
        <div
          className="pointer-events-none absolute -inset-3 rounded-full opacity-50 blur-2xl"
          style={{ background: `radial-gradient(circle, ${brandColor}3d, transparent 65%)` }}
        />
        {/* Floor reflection */}
        <div
          className="pointer-events-none absolute -bottom-7 left-1/2 h-7 w-[85%] -translate-x-1/2 rounded-[100%] blur-xl"
          style={{ background: `${brandColor}40` }}
        />

        {/* Screen: real store render, edge-to-edge inside the transparent frame */}
        <div className="relative aspect-[375/812] w-[268px] [--pz:0.714] sm:w-[285px] sm:[--pz:0.76] lg:w-[300px] lg:[--pz:0.8] xl:w-[318px] xl:[--pz:0.848]">
          {/* Clipped screen window (rounded corners) — re-mounted on theme change for a smooth fade */}
          <div
            key={themeId}
            className="absolute inset-0 overflow-hidden bg-white rounded-[34px] sm:rounded-[36px] lg:rounded-[38px] xl:rounded-[40px]"
            style={{ animation: 'previewFade 0.35s ease-out' }}
          >
            {/* Real mobile store render scaled to fill the screen exactly */}
            <div
              className="h-[812px] w-[375px] origin-top-left"
              style={{ transform: 'scale(var(--pz))' }}
            >
              <iframe
                src={previewUrl}
                title={t('Live store preview')}
                loading="lazy"
                className="pointer-events-none block h-[812px] w-[375px] border-0 bg-white"
              />
            </div>
          </div>

          {/* Realistic iPhone frame overlay */}
          <PhoneFrame />
        </div>
      </div>

      {/* ── Open the real store ── */}
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-white/70 transition-colors hover:text-white"
      >
        {t('Open real store')}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <style>{`
        @keyframes previewFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
