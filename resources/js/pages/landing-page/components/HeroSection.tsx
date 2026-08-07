import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import StoreDevicePreview from '@/components/storefront/StoreDevicePreview';

interface HeroSectionProps {
  brandColor?: string;
  demoStoreUrl?: string;
  settings: any;
  sectionData: {
    title?: string;
    subtitle?: string;
    announcement_text?: string;
    primary_button_text?: string;
    secondary_button_text?: string;
    stats?: Array<{ value: string; label: string }>;
  };
}

export default function HeroSection({ settings, sectionData, brandColor = '#22c55e', demoStoreUrl = '' }: HeroSectionProps) {
  const title = sectionData.title || 'وصول';
  const subtitle = sectionData.subtitle || 'منصة متقدمة لبناء و إدارة متجرك على واتساب بسهولة وأدوات احترافية تساعدك على النمو والتوسع';
  const announcement = sectionData.announcement_text || 'موثوق من أكثر من ١٠,٠٠٠ متجر حول العالم';
  const primaryButtonText = sectionData.primary_button_text || 'ابدأ تجربة مجانية';
  const secondaryButtonText = sectionData.secondary_button_text || 'الدخول';

  return (
    <section
      id="hero"
      dir="rtl"
      className="relative overflow-hidden bg-gray-950 pt-[120px] pb-16 sm:pt-[140px] sm:pb-20 lg:pt-[160px] lg:pb-28"
      style={{ fontFamily: "'Tajawal', 'Segoe UI', sans-serif" }}
    >
      {/* ── Animated gradient orbs ── */}
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-[700px] w-[700px] rounded-full opacity-20 blur-[120px]"
        style={{
          background: `radial-gradient(circle, ${brandColor}, transparent 70%)`,
          animation: 'orbFloat1 18s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full opacity-15 blur-[100px]"
        style={{
          background: `radial-gradient(circle, ${brandColor}aa, transparent 70%)`,
          animation: 'orbFloat2 22s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full opacity-10 blur-[80px]"
        style={{
          background: `radial-gradient(circle, ${brandColor}66, transparent 70%)`,
          animation: 'orbFloat3 15s ease-in-out infinite',
        }}
      />

      {/* ── Subtle grid pattern ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(${brandColor}40 1px, transparent 1px),
            linear-gradient(90deg, ${brandColor}40 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Dark overlay gradient ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${brandColor}18 0%, transparent 40%, ${brandColor}0a 100%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

          {/* ═══════════ LEFT: Content ═══════════ */}
          <div className="text-center lg:text-start">
            {/* Trust badge */}
            <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-medium text-white/70 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ backgroundColor: brandColor }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: brandColor }}
                />
              </span>
              {announcement}
            </div>

            {/* Logo */}
            <div className="mb-6">
              <img
                src="/images/logos/hero-logo.png"
                alt="Wusool"
                className="mx-auto lg:mx-0 h-24 sm:h-32 md:h-40 w-auto object-contain"
                style={{
                  filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.15))',
                  animation: 'logoFloat 4s ease-in-out infinite',
                }}
              />
            </div>

            {/* Subtitle */}
            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-white/50 sm:text-xl lg:mx-0 lg:max-w-xl">
              {subtitle}
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href={route('register')}
                className="group btn-green inline-flex items-center gap-2.5 rounded-xl px-8 py-4 text-[16px] font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02]"
                style={{
                  backgroundColor: brandColor,
                  boxShadow: `0 4px 24px ${brandColor}50, 0 0 60px ${brandColor}20`,
                }}
              >
                {primaryButtonText}
                <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
              </Link>
              <Link
                href={route('login')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-[16px] font-semibold text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/10 hover:text-white"
              >
                {secondaryButtonText}
              </Link>
            </div>

            {/* Stats row */}
            {sectionData.stats && sectionData.stats.length > 0 ? (
              <div className="mt-14 grid grid-cols-3 gap-6 border-t border-white/10 pt-10">
                {sectionData.stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</div>
                    <div className="mt-1.5 text-[12px] font-medium text-white/40 sm:text-[13px]">{stat.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-14 grid grid-cols-3 gap-6 border-t border-white/10 pt-10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white sm:text-3xl">٥ دقائق</div>
                  <div className="mt-1.5 text-[12px] font-medium text-white/40 sm:text-[13px]">لإعداد متجرك</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white sm:text-3xl">24/7</div>
                  <div className="mt-1.5 text-[12px] font-medium text-white/40 sm:text-[13px]">دعم فني مستمر</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white sm:text-3xl">٩٩.٩٪</div>
                  <div className="mt-1.5 text-[12px] font-medium text-white/40 sm:text-[13px]">وقت تشغيل</div>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════ RIGHT: Real store preview ═══════════ */}
          <div className="relative flex items-center justify-center lg:justify-start">
            <StoreDevicePreview storeUrl={demoStoreUrl} brandColor={brandColor} />
          </div>
        </div>
      </div>

      {/* ═══════════ KEYFRAMES ═══════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');

        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, -40px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.95); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, 30px) scale(1.05); }
          66% { transform: translate(40px, -20px) scale(0.9); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50% { transform: translate(-50%, -30px) scale(1.15); }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes dashboardFloat {
          0%, 100% { transform: rotateY(-8deg) rotateX(4deg) translateY(0); }
          50% { transform: rotateY(-8deg) rotateX(4deg) translateY(-12px); }
        }
        @keyframes cardPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.92; transform: scale(1.005); }
        }
        @keyframes barGrow {
          from { transform: scaleY(0); transform-origin: bottom; }
          to { transform: scaleY(1); transform-origin: bottom; }
        }
        @keyframes floatingCard1 {
          0%, 100% { transform: translateZ(40px) translateY(0); }
          50% { transform: translateZ(40px) translateY(-8px); }
        }
        @keyframes floatingCard2 {
          0%, 100% { transform: translateZ(40px) translateY(0); }
          50% { transform: translateZ(40px) translateY(-10px); }
        }
        @keyframes floatingCard3 {
          0%, 100% { transform: translateZ(40px) translateY(0); }
          50% { transform: translateZ(40px) translateY(-6px); }
        }
      `}</style>
    </section>
  );
}
