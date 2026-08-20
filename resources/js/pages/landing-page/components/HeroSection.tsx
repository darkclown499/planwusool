import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Megaphone, RefreshCw, Star, Zap } from 'lucide-react';
import ProductShowcase from './ProductShowcase';

interface HeroSectionProps {
  brandColor?: string;
  settings: { company_name?: string };
  superadminLogoLight?: string;
  sectionData: {
    title?: string;
    subtitle?: string;
    announcement_text?: string;
    primary_button_text?: string;
    secondary_button_text?: string;
    stats?: Array<{ value: string; label: string }>;
  };
}

const FEATURE_ICONS = [Zap, Megaphone, RefreshCw];

export default function HeroSection({
  settings,
  sectionData,
  brandColor = '#22c55e',
}: HeroSectionProps) {
  const title = sectionData.title || 'ابدأ متجرك خلال دقائق';
  const subtitle = sectionData.subtitle || 'منصة متقدمة لبناء وإدارة متجرك على واتساب بسهولة وأدوات احترافية تساعدك على النمو والتوسع';
  const primaryButtonText = sectionData.primary_button_text || 'ابدأ تجربة مجانية';
  const secondaryButtonText = sectionData.secondary_button_text || 'الدخول';

  const stats = sectionData.stats && sectionData.stats.length > 0 ? sectionData.stats : [
    { value: 'جاهز في دقائق', label: 'أنشئ متجرك دون تعقيد' },
    { value: 'أدوات تسويق مدمجة', label: 'حملات وعروض بلمسة واحدة' },
    { value: 'تحديثات مستمرة', label: 'المنصة تتطور مع متجرك' },
  ];

  const logo = '/images/logos/hero-logo.png';
  const displayLogo = logo ? (
    logo.startsWith('http') ? logo :
    logo.startsWith('/') ? `${window.appSettings?.baseUrl || window.location.origin}${logo}` : logo
  ) : '';

  return (
    <section
      id="hero"
      dir="rtl"
      className="relative z-10 bg-slate-50 pb-16 pt-14 text-slate-900 sm:pb-20 sm:pt-16 md:pb-24 md:pt-20 lg:pt-24"
      style={{ fontFamily: "'Tajawal', 'Segoe UI', sans-serif" }}
    >
      {/* ── Backdrop layer (clipped to the hero box) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Subtle light mesh dots */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] opacity-70 [background-size:20px_20px]"
        />
        {/* Animated gradient orbs */}
        <div
          className="absolute -left-40 -top-40 h-[700px] w-[700px] rounded-full opacity-20 blur-[120px]"
          style={{
            background: `radial-gradient(circle, ${brandColor}, transparent 70%)`,
            animation: 'orbFloat1 18s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full opacity-15 blur-[100px]"
          style={{
            background: `radial-gradient(circle, ${brandColor}aa, transparent 70%)`,
            animation: 'orbFloat2 22s ease-in-out infinite',
          }}
        />
        <div
          className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full opacity-10 blur-[80px]"
          style={{
            background: `radial-gradient(circle, ${brandColor}66, transparent 70%)`,
            animation: 'orbFloat3 15s ease-in-out infinite',
          }}
        />

        {/* Side vertical glows to fill the empty dark margins on desktop screens */}
        <div
          className="absolute top-1/2 -left-40 hidden h-[560px] w-[560px] -translate-y-1/2 rounded-full opacity-40 blur-[120px] lg:block"
          style={{ background: `radial-gradient(circle, ${brandColor}, transparent 70%)` }}
        />
        <div
          className="absolute top-1/2 -right-40 hidden h-[560px] w-[560px] -translate-y-1/2 rounded-full opacity-40 blur-[120px] lg:block"
          style={{ background: `radial-gradient(circle, ${brandColor}, transparent 70%)` }}
        />

        {/* Fine horizontal light sheen across the hero */}
        <div className="absolute inset-x-0 top-[58%] hidden bg-gradient-to-r from-transparent via-white/10 to-transparent lg:block" style={{ height: '1px' }} />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(${brandColor}40 1px, transparent 1px),
              linear-gradient(90deg, ${brandColor}40 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Dark overlay gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${brandColor}18 0%, transparent 40%, ${brandColor}0a 100%)`,
          }}
        />

        {/* ── Four-pointed star decorations in the corners ── */}
        {[
          { top: 14, left: '6%', size: 34, delay: '0s' },
          { top: 10, right: '8%', size: 22, delay: '1.4s' },
          { bottom: 20, right: '5%', size: 30, delay: '0.8s' },
          { bottom: 12, left: '12%', size: 20, delay: '2.2s' },
        ].map((star, index) => (
          <svg
            key={index}
            viewBox="0 0 24 24"
            fill="none"
            className="hero-star absolute hidden lg:block"
            style={{
              width: star.size,
              height: star.size,
              top: star.top !== undefined ? `${star.top}%` : undefined,
              right: star.right,
              bottom: star.bottom !== undefined ? `${star.bottom}%` : undefined,
              left: star.left,
              color: brandColor,
              opacity: 0.35,
              animationDelay: star.delay,
              filter: `drop-shadow(0 0 8px ${brandColor}aa)`,
            }}
            aria-hidden="true"
          >
            <path
              d="M12 2c.6 5.2 2.4 8.4 10 10-7.6 1.6-9.4 4.8-10 10-.6-5.2-2.4-8.4-10-10 7.6-1.6 9.4-4.8 10-10z"
              fill="currentColor"
            />
          </svg>
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          {/* ── Logo ── */}
          {displayLogo && (
            <img
              src={displayLogo}
              alt={settings.company_name || 'Wusool'}
              width={320}
              height={64}
              fetchPriority="high"
              className="mb-5 h-[40px] w-auto object-contain sm:h-[42px] lg:h-[46px]"
              style={{ filter: 'drop-shadow(0 6px 24px rgba(16,183,127,0.35))' }}
            />
          )}

          {/* ── Pulsating announcement badge ── */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[13px] font-semibold text-emerald-700 animate-pulse">
            <Zap size={14} className="text-emerald-600" />
            المنصة الأولى لإدارة متاجر الواتساب في فلسطين
          </div>

          {/* ── Title ── */}
          <h1 className="mt-4 mb-4 text-4xl font-black leading-[1.15] tracking-tight text-slate-900 sm:text-6xl">
            {title}
          </h1>

          {/* ── Subtitle ── */}
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {subtitle}
          </p>

          {/* ── CTA buttons ── */}
          <div className="mt-7 flex w-full flex-col items-stretch gap-3 md:mt-9 md:w-auto md:flex-row md:items-center md:gap-4">
            <div className="group relative inline-flex">
              <span aria-hidden="true" className="absolute -inset-1 rounded-full bg-emerald-500/15 blur-lg" />
              <Link
                href={route('register')}
                className="relative inline-flex items-center justify-center gap-2.5 rounded-full bg-emerald-600 px-9 py-4 text-[16px] font-bold text-white shadow-lg shadow-emerald-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-emerald-700 md:w-auto"
              >
                {primaryButtonText}
                <ArrowLeft size={18} className="transition-transform duration-300 group-hover:-translate-x-1.5 group-hover:scale-110" />
              </Link>
            </div>
            <Link
              href={route('login')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-4 text-[15px] font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 md:w-auto"
            >
              {secondaryButtonText}
            </Link>
          </div>

          {/* ── Social proof badge ── */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
            <Star size={16} className="fill-amber-400 text-amber-400" />
            <span>
              انضم لأكثر من <span dir="ltr" className="font-bold text-emerald-600">+500</span> متجر نشط على المنصة
            </span>
          </div>

          {/* ── Product showcase — directly under the CTA buttons ── */}
          <div className="mt-14 w-full">
            <ProductShowcase brandColor={brandColor} appName={settings.company_name || 'وصول'} />
          </div>
        </div>
      </div>

      {/* ── Feature cards under the computer (inside the dark zone) ── */}
      <div className="relative z-10 mx-auto mt-12 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {stats.map((stat, index) => {
            const Icon = FEATURE_ICONS[index] || Zap;
            return (
              <div
                key={index}
                className="group rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-xl"
              >
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110"
                >
                  <Icon size={20} />
                </div>
                <div className="text-sm font-extrabold text-slate-900 sm:text-[15px]">{stat.value}</div>
                <div className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500 sm:text-[12px]">
                  {stat.label}
                </div>
              </div>
            );
          })}
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
        @keyframes sparkleTwinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.7) rotate(0deg); }
          50% { opacity: 0.55; transform: scale(1.12) rotate(25deg); }
        }
        .hero-star { animation: sparkleTwinkle 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-star { animation: none; }
        }
      `}</style>
    </section>
  );
}
