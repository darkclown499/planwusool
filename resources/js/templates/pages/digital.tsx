import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Check, Download, FileCode, ShieldCheck, Zap } from 'lucide-react';
import React from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { FAQSection, ProductImage, SectionHeading } from './ui';

/**
 * Digital — dark premium downloads store.
 * CTA-heavy hero, feature list, download product cards, FAQ.
 */
const DigitalPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const products = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];

    const accent = 'var(--twc-primary-500, #8b5cf6)';
    const accentDeep = 'var(--twc-primary-600, #7c3aed)';

    return (
        <div className="min-h-screen" style={{ background: '#111018' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-[#111018]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <span
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#111018]"
                            style={{ background: `linear-gradient(135deg, ${accentDeep}, ${accent})` }}
                        >
                            <FileCode className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-extrabold text-white">{identity.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 80% 0%, ${'#7c3aed'}33 0%, transparent 55%)` }} />
                <div className="relative mx-auto max-w-6xl px-4 py-16 text-center md:py-24">
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-xs font-bold"
                        style={{ color: accent }}
                    >
                        <Zap className="h-3.5 w-3.5" /> جاهز للتسليم الفوري
                    </span>
                    <h1 className="mx-auto mt-5 max-w-2xl text-3xl leading-tight font-black text-white md:text-5xl">
                        منتجات رقمية احترافية
                        <br />
                        <span
                            style={{
                                background: `linear-gradient(90deg, ${accent}, ${accentDeep})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            تسليم فوري وضمان الجودة
                        </span>
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-sm md:text-base" style={{ color: '#a1a1aa' }}>
                        من {identity.name} — ملفات، قوالب وأدوات رقمية جاهزة للاستخدام مباشرة بعد الشراء
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <a
                            href="#store"
                            className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-90"
                            style={{ background: `linear-gradient(135deg, ${accentDeep}, ${accent})` }}
                        >
                            <Download className="h-4 w-4" /> تصفح المنتجات
                        </a>
                        <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: '#a1a1aa' }}>
                            <ShieldCheck className="h-4 w-4" style={{ color: accent }} /> ضمان استرجاع الأموال
                        </span>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="mx-auto max-w-6xl px-4 pb-10">
                <div className="grid gap-3 md:grid-cols-3">
                    {[
                        { icon: <Zap className="h-5 w-5" />, title: 'تسليم فوري', desc: 'المنتج يصلك فور إتمام الدفع' },
                        { icon: <FileCode className="h-5 w-5" />, title: 'جودة احترافية', desc: 'منتجات مطوّرة بمعايير عالية' },
                        { icon: <ShieldCheck className="h-5 w-5" />, title: 'دعم مستمر', desc: 'تحديثات ومساعدة بعد الشراء' },
                    ].map((f) => (
                        <div key={f.title} className="rounded-2xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <span
                                className="flex h-11 w-11 items-center justify-center rounded-xl"
                                style={{ background: 'var(--twc-primary-600, #7c3aed)22', color: accent }}
                            >
                                {f.icon}
                            </span>
                            <h3 className="mt-3 font-bold text-white">{f.title}</h3>
                            <p className="mt-1 text-sm" style={{ color: '#a1a1aa' }}>
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Products */}
            <section id="store" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10">
                <SectionHeading title="متجر المنتجات الرقمية" subtitle="اختر ما يناسبك واحصل عليه فوراً" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm font-semibold" style={{ color: '#a1a1aa' }}>
                            لا توجد منتجات بعد — أضف منتجاتك الرقمية من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article
                                key={p.id || i}
                                className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 transition hover:border-white/30"
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                                onClick={() => product.handleProductClick(p)}
                            >
                                <div className="relative">
                                    <ProductImage product={p} className="aspect-video" />
                                    <span
                                        className="absolute start-3 top-3 rounded-lg px-2.5 py-1 text-[10px] font-black text-white"
                                        style={{ background: accent }}
                                    >
                                        رقمي
                                    </span>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-white">{p.name}</h3>
                                    <p className="mt-1 line-clamp-2 text-sm" style={{ color: '#a1a1aa' }}>
                                        {p.description}
                                    </p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-lg font-black" style={{ color: accent }}>
                                            {p.price} {identity.currency}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                product.handleProductClick(p);
                                            }}
                                            className="inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                                            style={{ background: `linear-gradient(135deg, ${accentDeep}, ${accent})` }}
                                        >
                                            <Download className="h-3.5 w-3.5" /> اشترِ الآن
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Why us */}
            <section className="mx-auto max-w-6xl px-4 py-8">
                <div
                    className="grid items-center gap-6 rounded-3xl border border-white/10 p-8 md:grid-cols-2"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                    <div>
                        <h2 className="text-2xl font-black text-white">لماذا {identity.name}؟</h2>
                        <p className="mt-2 text-sm" style={{ color: '#a1a1aa' }}>
                            منتجات مجرّبة ومدعومة، مع فريق جاهز لمساعدتك في كل خطوة
                        </p>
                    </div>
                    <ul className="space-y-2">
                        {['شحن فوري بعد الدفع مباشرة', 'دعم فني على مدار الساعة', 'تحديثات مجانية مدى الحياة', 'ضمان استرجاع خلال 30 يوماً'].map(
                            (item) => (
                                <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                                    <span
                                        className="flex h-5 w-5 items-center justify-center rounded-full"
                                        style={{ background: `${accent}22`, color: accent }}
                                    >
                                        <Check className="h-3 w-3" />
                                    </span>
                                    {item}
                                </li>
                            ),
                        )}
                    </ul>
                </div>
            </section>

            {/* FAQ */}
            <section className="mx-auto max-w-3xl px-4 py-10">
                <SectionHeading title="أسئلة شائعة" />
                <FAQSection />
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 md:flex-row">
                    <p className="font-extrabold text-white">{identity.name}</p>
                    <p className="text-xs" style={{ color: '#a1a1aa' }}>
                        © {new Date().getFullYear()} — جميع الحقوق محفوظة
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default DigitalPage;
