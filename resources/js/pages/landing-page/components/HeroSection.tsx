import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, BadgeCheck, ShoppingCart } from 'lucide-react';
import StoreDevicePreview from '@/components/storefront/StoreDevicePreview';

interface HeroSectionProps {
  brandColor?: string;
  demoStoreUrl?: string;
  settings: any;
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

export default function HeroSection({
  settings,
  sectionData,
  brandColor = '#22c55e',
  demoStoreUrl = '',
  superadminLogoLight = '',
}: HeroSectionProps) {
  const title = sectionData.title || 'أنشئ متجرك خلال دقائق';
  const subtitle = sectionData.subtitle || 'منصة متقدمة لبناء وإدارة متجرك على واتساب بسهولة وأدوات احترافية تساعدك على النمو والتوسع';
  const primaryButtonText = sectionData.primary_button_text || 'ابدأ تجربة مجانية';
  const secondaryButtonText = sectionData.secondary_button_text || 'الدخول';

  const stats = sectionData.stats && sectionData.stats.length > 0 ? sectionData.stats : [
    { value: 'جاهز في دقائق', label: 'أنشئ متجرك دون تعقيد' },
    { value: 'أدوات تسويق مدمجة', label: 'حملات وعروض بلمسة واحدة' },
    { value: 'تحديثات مستمرة', label: 'المنصة تتطور مع متجرك' },
  ];

  const logo = superadminLogoLight || settings.config_sections?.theme?.logo_light || window.appSettings?.logo || '/images/logos/hero-logo.png';
  const displayLogo = logo ? (
    logo.startsWith('http') ? logo :
    logo.startsWith('/') ? `${window.appSettings?.baseUrl || window.location.origin}${logo}` : logo
  ) : '';

  return (
    <section
      id="hero"
      dir="rtl"
      className="relative z-10 bg-gray-950 pb-12 pt-[96px] sm:pt-[110px] md:pb-16 md:pt-[120px] lg:pb-0 lg:pt-[140px]"
      style={{ fontFamily: "'Tajawal', 'Segoe UI', sans-serif" }}
    >
      {/* ── Backdrop layer (clipped to the hero box) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
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

        {/* Soft green glow behind the phone (tracks the device position) */}
        <div
          className="absolute left-1/2 top-[46%] h-[420px] w-[680px] -translate-x-1/2 rounded-full opacity-30 blur-[100px] lg:top-[62%] lg:h-[520px] lg:w-[820px]"
          style={{ background: `radial-gradient(ellipse, ${brandColor}, transparent 70%)` }}
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
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          {/* ── Logo (order 2) ── */}
          {displayLogo && (
            <img
              src={displayLogo}
              alt={settings.company_name || 'Wusool'}
              className="order-2 mb-5 h-[40px] w-auto object-contain sm:h-[42px] lg:h-[46px]"
              style={{ filter: 'drop-shadow(0 6px 24px rgba(16,183,127,0.35))' }}
            />
          )}

          {/* ── Title (order 3) ── */}
          <h1
            className="order-3 text-[40px] font-extrabold leading-[1.15] text-white sm:text-[44px] lg:text-[60px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            {title}
          </h1>

          {/* ── Subtitle (order 4) ── */}
          <p className="order-4 mt-4 max-w-xl text-[15px] leading-relaxed text-white/55 sm:text-base lg:mt-5 lg:text-lg">
            {subtitle}
          </p>

          {/* ── Phone preview (order 5 on mobile, 7 on tablet+desktop) ── */}
          <div className="order-5 mt-8 w-full md:order-7 md:mt-10 lg:-mb-[72px]">
            <div className="relative">
              <StoreDevicePreview storeUrl={demoStoreUrl} brandColor={brandColor} />

              {/* ── Floating accent card: incoming WhatsApp order (desktop only) ── */}
              <div className="card-float-1 pointer-events-none absolute right-0 top-[8%] z-20 translate-x-20 hidden lg:block">
                <div className="w-60 rounded-2xl border border-white/10 bg-gray-900/85 p-3.5 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: '#25D366', boxShadow: '0 4px 16px #25D36660' }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white/90">طلب جديد عبر واتساب</p>
                      <p className="truncate text-[11px] text-white/40">سماعات لاسلكية Air Pro</p>
                    </div>
                    <span className="mr-auto text-[10px] font-semibold" style={{ color: brandColor }}>الآن</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span className="text-[10px] text-white/45">إجمالي الطلب</span>
                    <span className="text-sm font-bold text-white">٣٢٠ ر.س</span>
                  </div>
                </div>
              </div>

              {/* ── Floating accent card: today sales (desktop only) ── */}
              <div className="card-float-2 pointer-events-none absolute left-0 bottom-[8%] z-20 -translate-x-20 hidden lg:block">
                <div className="w-60 rounded-2xl border border-white/10 bg-gray-900/85 p-3.5 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${brandColor}26`, color: brandColor }}
                    >
                      <ShoppingCart className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-[11px] text-white/45">مبيعات اليوم</p>
                      <p className="text-lg font-extrabold text-white">+١٢٥ طلب</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                      <BadgeCheck className="h-3.5 w-3.5" style={{ color: brandColor }} />
                      <span className="text-[10px] font-bold text-white/70">+١٪</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CTA buttons (order 6 on mobile, 5 on tablet+desktop) ── */}
          <div className="order-6 mt-7 flex w-full flex-col items-stretch gap-3 md:order-5 md:mt-9 md:w-auto md:flex-row md:items-center md:gap-4">
            <Link
              href={route('register')}
              className="group inline-flex items-center justify-center gap-2.5 rounded-full px-9 py-4 text-[16px] font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] md:w-auto"
              style={{
                backgroundColor: brandColor,
                boxShadow: `0 12px 40px ${brandColor}55, 0 0 80px ${brandColor}30`,
              }}
            >
              {primaryButtonText}
              <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            </Link>
            <Link
              href={route('login')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-[15px] font-semibold text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white md:w-auto"
            >
              {secondaryButtonText}
            </Link>
          </div>

          {/* ── Stats (order 7 on mobile, 6 on tablet+desktop) ── */}
          <div className="order-7 mt-8 grid w-full grid-cols-3 gap-2.5 md:order-6 md:mt-12 md:flex md:w-auto md:justify-center md:gap-14">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/10 bg-white/5 px-2 py-4 md:border-0 md:bg-transparent md:px-0 md:py-0"
              >
                <div className="text-base font-extrabold text-white sm:text-lg lg:text-xl">{stat.value}</div>
                <div className="mt-1 text-[11px] font-medium text-white/45 sm:text-[12px] lg:text-[13px]">{stat.label}</div>
              </div>
            ))}
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
        @keyframes cardFloat1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(-0.4deg); }
        }
        @keyframes cardFloat2 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(12px) rotate(0.4deg); }
        }
        .card-float-1 { animation: cardFloat1 7s ease-in-out infinite; }
        .card-float-2 { animation: cardFloat2 8.5s ease-in-out 1.2s infinite; }
        @media (prefers-reduced-motion: reduce) {
          .card-float-1, .card-float-2 { animation: none; }
        }
      `}</style>
    </section>
  );
}
