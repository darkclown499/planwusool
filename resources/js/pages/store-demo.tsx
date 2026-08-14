import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Briefcase, DollarSign, Grid3X3, Image, Layout, Mail, MessageSquare, Minus, MousePointer, Navigation, Play, Shield, Star, Users, Zap } from 'lucide-react';
import storeLayout from '@/data/store-landing-layout.json';

const iconMap: { [key: string]: any } = {
  Layout,
  Grid3X3,
  MousePointer,
  Star,
  Zap,
  Shield,
  Navigation,
  Users,
  Briefcase,
  MessageSquare,
  Mail,
  Image,
  Play,
  DollarSign,
  Minus,
};

const glassCardClass =
  'group relative overflow-hidden rounded-[28px] border border-white/70 bg-white/70 p-6 shadow-[0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-slate-200/80 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]';

export default function StoreDemo() {
  const [layout] = useState(storeLayout);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('rtl');
  const [locale, setLocale] = useState('ar');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedLocale = window.localStorage.getItem('i18nextLng') || window.localStorage.getItem('language') || 'ar';
    const nextLocale = savedLocale.toLowerCase();
    // Arabic-first: direction is always RTL.
    const nextDirection = 'rtl';

    setLocale(nextLocale);
    setDirection(nextDirection);
    document.documentElement.dir = nextDirection;
    document.documentElement.lang = nextLocale;
  }, []);

  const handleLanguageChange = (value: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextLocale = value.toLowerCase();
    // Arabic-first: direction is always RTL.
    const nextDirection = 'rtl';

    window.localStorage.setItem('i18nextLng', nextLocale);
    window.localStorage.setItem('language', nextLocale);
    setLocale(nextLocale);
    setDirection(nextDirection);
    document.documentElement.dir = nextDirection;
    document.documentElement.lang = nextLocale;
  };

  const typographyStyle = {
    fontFamily: direction === 'rtl' ? 'Tajawal, "IBM Plex Sans Arabic", Inter, sans-serif' : 'Inter, "Segoe UI", sans-serif',
  };

  const renderBlock = (block: any) => {
    const { config } = block;

    switch (block.type) {
      case 'header':
        return (
          <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 px-4 py-3 backdrop-blur-xl lg:px-6" style={typographyStyle}>
            <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-4">
              <a href="#" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-900 text-sm font-semibold text-white">
                  W
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-semibold tracking-tight text-slate-900">wusool.ps</span>
                  <span className="text-[11px] uppercase tracking-[0.32em] text-slate-500">modern storefront</span>
                </div>
              </a>

              <nav className="hidden items-center gap-6 lg:flex">
                {config.menuItems?.map((item: string, index: number) => (
                  <a key={index} href="#" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                    {item}
                  </a>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <select
                  value={locale}
                  onChange={(event) => handleLanguageChange(event.target.value)}
                  className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 outline-none backdrop-blur-xl"
                  aria-label="Select language"
                >
                  <option value="en">EN</option>
                  <option value="ar">AR</option>
                  <option value="he">HE</option>
                  <option value="ru">RU</option>
                </select>
                <Button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                  {config.buttonText}
                </Button>
              </div>
            </div>
          </header>
        );

      case 'hero':
        return (
          <section className="relative overflow-hidden px-4 py-12 lg:px-6 lg:py-20" style={typographyStyle}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_25%)]" />
            <div className="relative mx-auto grid max-w-screen-xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-sm font-medium text-slate-600 backdrop-blur-xl">
                  <SparklesIcon />
                  {config.announcement || 'Fresh layout, refined experience'}
                </div>
                <h1 className="mb-5 text-4xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-6xl">
                  {config.title}
                </h1>
                <p className="mb-8 max-w-xl text-lg leading-8 text-slate-600">
                  {config.subtitle}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700">
                    {config.buttonText}
                    <ArrowRight className="ms-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="rounded-full border-slate-200/80 bg-white/70 px-6 py-3 text-sm font-medium text-slate-700 backdrop-blur-xl hover:bg-slate-50">
                    <Play className="me-2 h-4 w-4" />
                    Watch demo
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className={`${glassCardClass} p-6 sm:p-8`}>
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.6),rgba(255,255,255,0.2))]" />
                  <div className="relative">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Live preview</p>
                        <p className="text-xl font-semibold text-slate-900">wusool.ps storefront</p>
                      </div>
                      <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                        online
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200/70 bg-slate-950/95 p-5 text-white">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <div className="text-sm text-slate-400">Today&apos;s focus</div>
                          <div className="text-lg font-semibold">Clear, calm commerce</div>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-300">
                          24/7 ready
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                          <div className="text-sm text-slate-400">Customers</div>
                          <div className="mt-1 text-2xl font-semibold">1.8k</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                          <div className="text-sm text-slate-400">Conversion</div>
                          <div className="mt-1 text-2xl font-semibold">+18%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'features':
        return (
          <section className="px-4 py-16 lg:px-6 lg:py-20" style={typographyStyle}>
            <div className="mx-auto max-w-screen-xl">
              <div className="mb-10 max-w-3xl">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">{config.title}</p>
                <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-4xl">
                  Experience the calm, modern toolkit behind every polished storefront.
                </h2>
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {config.items?.map((item: any, index: number) => {
                  const Icon = iconMap[item.icon] || Star;
                  return (
                    <div key={index} className={`${glassCardClass} flex flex-col`}>
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-900/95 text-white">
                        <div className="relative h-8 w-8 rounded-full border border-white/20 bg-gradient-to-br from-slate-400 via-slate-200 to-slate-400 p-1">
                          <div className="absolute inset-0 rounded-full border border-slate-900/20" />
                          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900/90" />
                        </div>
                      </div>
                      <h3 className="mb-2 text-xl font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm leading-7 text-slate-600">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );

      case 'themes':
        return (
          <section className="px-4 py-16 lg:px-6 lg:py-20" style={typographyStyle}>
            <div className="mx-auto max-w-screen-xl">
              <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">Themes</p>
                  <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-4xl">{config.title}</h2>
                  <p className="mt-3 text-lg leading-8 text-slate-600">{config.subtitle}</p>
                </div>
              </div>
              <div className="grid gap-5 lg:grid-cols-3">
                {config.items?.map((item: any, index: number) => (
                  <div key={index} className={`${glassCardClass} flex flex-col`}>
                    <div className={`h-32 rounded-[22px] bg-gradient-to-br ${item.accent || 'from-slate-900 to-slate-600'}`} />
                    <div className="mt-5">
                      <h3 className="text-xl font-semibold text-slate-900">{item.name}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'about':
        return (
          <section className="px-4 py-16 lg:px-6 lg:py-20" style={typographyStyle}>
            <div className="mx-auto max-w-screen-xl rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,252,0.78))] p-8 shadow-[0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl lg:p-12">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">About</p>
                  <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-4xl">{config.title}</h2>
                  <p className="mt-4 text-lg leading-8 text-slate-600">{config.description}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <div className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700">
                      Modern by default
                    </div>
                    <div className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700">
                      Multi-language ready
                    </div>
                  </div>
                </div>
                <div className="rounded-[26px] border border-slate-200/70 bg-white/70 p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">Core values</p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-900">The principles behind the experience</h3>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {config.coreValues?.map((value: any, index: number) => (
                      <div key={index} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white">
                            <Star className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900">{value.title}</h4>
                            <p className="mt-1 text-sm leading-7 text-slate-600">{value.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'services':
        return (
          <section className="px-4 py-16 lg:px-6 lg:py-20" style={typographyStyle}>
            <div className="mx-auto max-w-screen-xl">
              <div className="mx-auto mb-8 max-w-screen-md text-center">
                <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-4xl">{config.title}</h2>
                <p className="mt-3 text-lg leading-8 text-slate-600">Start free and scale as you grow.</p>
              </div>
              <div className="grid gap-5 lg:grid-cols-3">
                {config.services?.map((service: any, index: number) => (
                  <div key={index} className={`${glassCardClass} flex flex-col text-start`}>
                    <h3 className="text-xl font-semibold text-slate-900">{service.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{service.description}</p>
                    <div className="mt-6 flex items-baseline gap-2">
                      <span className="text-4xl font-semibold text-slate-900">{service.price}</span>
                      {service.price !== 'Free' && <span className="text-sm text-slate-500">/month</span>}
                    </div>
                    <ul className="mt-6 space-y-3 text-sm text-slate-600">
                      {service.features?.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-900" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'testimonials':
        return (
          <section className="px-4 py-16 lg:px-6 lg:py-20" style={typographyStyle}>
            <div className="mx-auto max-w-screen-xl">
              <div className="mx-auto mb-8 max-w-screen-md text-center">
                <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-4xl">{config.title}</h2>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                {config.testimonials?.map((testimonial: any, index: number) => (
                  <div key={index} className={`${glassCardClass}`}>
                    <p className="text-sm leading-7 text-slate-600">“{testimonial.content}”</p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {testimonial.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{testimonial.name}</div>
                        <div className="text-sm text-slate-500">{testimonial.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'cta':
        return (
          <section className="px-4 py-16 lg:px-6 lg:py-20" style={typographyStyle}>
            <div className="mx-auto max-w-screen-xl rounded-[32px] border border-white/70 bg-slate-900 px-8 py-12 text-white shadow-[0_1px_0_rgba(255,255,255,0.1)] lg:px-12">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">{config.title}</h2>
                <p className="mt-4 text-lg leading-8 text-slate-300">{config.description}</p>
                <Button className="mt-8 rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-900 hover:bg-slate-100">
                  {config.buttonText}
                </Button>
              </div>
            </div>
          </section>
        );

      case 'contact':
        return (
          <section className="px-4 py-16 lg:px-6 lg:py-20" style={typographyStyle}>
            <div className="mx-auto max-w-screen-xl rounded-[32px] border border-white/70 bg-white/70 p-8 backdrop-blur-xl lg:p-12">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">Contact</p>
                  <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-4xl">{config.title}</h2>
                  <p className="mt-4 text-lg leading-8 text-slate-600">{config.description}</p>
                  <div className="mt-8 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-slate-900" />
                      <span>{config.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 text-slate-900" />
                      <span>{config.phone}</span>
                    </div>
                  </div>
                </div>
                <form className="space-y-4">
                  <Input placeholder="Your email" />
                  <Input placeholder="Subject" />
                  <Textarea placeholder="Tell us about your project" rows={6} />
                  <Button className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700">
                    Send message
                  </Button>
                </form>
              </div>
            </div>
          </section>
        );

      case 'footer':
        return (
          <footer className="px-4 pb-10 pt-4 lg:px-6" style={typographyStyle}>
            <div className="mx-auto flex max-w-screen-xl flex-col gap-4 rounded-[28px] border border-white/70 bg-white/70 px-6 py-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900">{config.companyName}</div>
                <div className="text-sm text-slate-600">{config.description}</div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                {config.links?.map((link: any, index: number) => (
                  <a key={index} href={link.url} className="transition hover:text-slate-900">
                    {link.title}
                  </a>
                ))}
              </div>
            </div>
          </footer>
        );

      default:
        return <div className="rounded-2xl border border-dashed border-slate-300 p-4">Unknown block type: {block.type}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(248,250,252,0.9))] text-slate-900">
      <div className="space-y-0">
        {layout.map((block: any) => (
          <div key={block.id}>{renderBlock(block)}</div>
        ))}
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/90 text-[10px] font-semibold text-white">
      ✦
    </div>
  );
}
