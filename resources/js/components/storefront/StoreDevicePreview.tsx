import React, { useState } from 'react';
import { ExternalLink, Lock, Monitor, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getStoreThemes } from '@/data/storeThemes';

const PREVIEW_THEMES = ['gadgets', 'fashion', 'supermarket', 'bakery'];

interface StoreDevicePreviewProps {
  storeUrl: string;
  brandColor?: string;
  className?: string;
}

export default function StoreDevicePreview({ storeUrl, brandColor = '#10b77f', className = '' }: StoreDevicePreviewProps) {
  const { t } = useTranslation();
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone');
  const [themeId, setThemeId] = useState(PREVIEW_THEMES[0]);

  const previewUrl = `${storeUrl}?theme=${themeId}`;
  const allThemes = getStoreThemes();
  const themeName = (id: string) => allThemes.find((th) => th.id === id)?.name || id;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* ── Device frame ── */}
      <div className="relative">
        {/* Glow behind the device */}
        <div
          className="pointer-events-none absolute -inset-10 rounded-full opacity-30 blur-3xl"
          style={{ background: `radial-gradient(circle, ${brandColor}, transparent 70%)` }}
        />

        {device === 'phone' ? (
          <div className="relative w-[250px] sm:w-[264px]">
            {/* Side buttons */}
            <div className="absolute -start-[3px] top-24 h-10 w-[3px] rounded-l bg-gray-900/80" />
            <div className="absolute -start-[3px] top-40 h-6 w-[3px] rounded-l bg-gray-900/80" />
            <div className="absolute -end-[3px] top-32 h-14 w-[3px] rounded-r bg-gray-900/80" />
            {/* Phone frame */}
            <div className="relative overflow-hidden rounded-[2.8rem] border-[8px] border-gray-900 bg-gray-900 shadow-2xl">
              {/* Dynamic island */}
              <div className="absolute left-1/2 top-2.5 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
              {/* Real mobile store render (375px viewport) scaled to the phone screen */}
              <div className="pointer-events-none bg-white [zoom:0.62] sm:[zoom:0.66]">
                <iframe
                  src={previewUrl}
                  title={t('Live store preview')}
                  loading="lazy"
                  className="block h-[812px] w-[375px] border-0 bg-white"
                />
              </div>
              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-gray-900/70" />
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Browser chrome */}
            <div className="flex items-center gap-2.5 border-b border-gray-200 bg-gray-100 px-3 py-2">
              <span className="flex shrink-0 gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[10px] text-gray-600">
                <Lock className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
                <span className="truncate" dir="ltr">{previewUrl}</span>
              </div>
            </div>
            {/* Real desktop store render (1200px viewport) scaled to the frame */}
            <div className="pointer-events-none bg-white [zoom:0.4] sm:[zoom:0.46]">
              <iframe
                src={previewUrl}
                title={t('Live store preview')}
                loading="lazy"
                className="block h-[800px] w-[1200px] border-0 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="relative mt-6 flex w-full flex-col items-center gap-3">
        {/* Device toggle */}
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-sm">
          {([
            { id: 'phone', label: t('Phone'), icon: Smartphone },
            { id: 'desktop', label: t('Desktop'), icon: Monitor },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDevice(id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                device === id ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
              style={device === id ? { backgroundColor: brandColor } : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Theme switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {PREVIEW_THEMES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setThemeId(id)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                themeId === id
                  ? 'border-transparent text-white'
                  : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white/90'
              }`}
              style={themeId === id ? { backgroundColor: brandColor } : undefined}
            >
              {themeName(id)}
            </button>
          ))}
        </div>

        {/* Open the real store */}
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/70 transition-colors hover:text-white"
        >
          {t('Open real store')}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
