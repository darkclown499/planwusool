import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Clock, MapPin, Phone, UtensilsCrossed } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { MenuCard, PromoStrip, SectionHeading, TestimonialsSection, getVar } from './ui';

/**
 * Food — restaurant / café menu page.
 * App-style compact header, quick category pills, menu-list products.
 */
const FoodPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config: ctxConfig } = useStorefrontCore();
    const cfg = ctxConfig || storeData?.config || {};
    const identity = storeIdentity(cfg, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const warm = getVar('--twc-primary-600', '#b45309');

    return (
        <div className="min-h-screen" style={{ background: 'var(--twc-background,#fffdf7)' }}>
            <PromoStrip text="🔥 عرض خاص: اطلب وجبتين واحصل على الثالثة مجاناً" />

            {/* App-style header */}
            <header
                className="sticky top-0 z-40 hidden border-b bg-white/95 backdrop-blur-md md:block"
                style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
            >
                <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: warm }}>
                            <UtensilsCrossed className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-extrabold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                            {identity.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(160deg, var(--twc-primary-600,#92400e), var(--twc-primary-500,#d97706))' }}
                />
                <div
                    className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 2px, transparent 2px)', backgroundSize: '28px 28px' }}
                />
                <div className="relative mx-auto max-w-3xl px-4 py-14 text-center md:py-20">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-4 py-1 text-xs font-bold text-white">
                        <Clock className="h-3.5 w-3.5" /> مفتوح الآن — نفتح يومياً من 8 صباحاً حتى 12 منتصف الليل
                    </span>
                    <h1 className="mt-4 text-3xl font-black text-white md:text-5xl">تذوق أجمل النكهات</h1>
                    <p className="mx-auto mt-3 max-w-md text-sm text-white/90 md:text-base">
                        {identity.name} — وجبات طازجة تُحضّر بعناية، اطلب الآن واستمتع
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                        {[
                            { icon: <MapPin className="h-4 w-4" />, label: 'شارع التسوق الرئيسي' },
                            { icon: <Phone className="h-4 w-4" />, label: identity.phone || 'رقم التوصيل' },
                        ].map((item) => (
                            <span
                                key={item.label}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white"
                            >
                                {item.icon} {item.label}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <main className="mx-auto max-w-3xl px-4 py-10">
                {/* Category pills */}
                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white shadow' : 'border hover:bg-white'}`}
                        style={
                            cat === 'all'
                                ? { background: warm }
                                : { borderColor: 'var(--twc-border,#e5e7eb)', color: 'var(--twc-text-primary,#111827)' }
                        }
                    >
                        القائمة الكاملة
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`rounded-full px-4 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white shadow' : 'border hover:bg-white'}`}
                            style={
                                cat === c.id
                                    ? { background: warm }
                                    : { borderColor: 'var(--twc-border,#e5e7eb)', color: 'var(--twc-text-primary,#111827)' }
                            }
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                {/* Menu list */}
                <SectionHeading title="قائمة الطعام" subtitle="اختر ما يناسبك من تشكيلتنا" align="start" />
                <div className="rounded-3xl border bg-white p-3 md:p-5" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                    {products.length === 0 ? (
                        <p className="py-12 text-center text-sm font-semibold" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                            لا توجد أصناف بعد — أضف منتجاتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => <MenuCard key={p.id || i} product={p} />)
                    )}
                </div>

                {/* Testimonials */}
                <div className="mt-12">
                    <SectionHeading title="آراء زوّارنا" subtitle="ماذا قالوا عن أطباقنا" />
                    <TestimonialsSection />
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-4 border-t bg-white" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-8 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: warm }}>
                        <UtensilsCrossed className="h-5 w-5" />
                    </span>
                    <p className="font-extrabold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                        {identity.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                        © {new Date().getFullYear()} — جميع الحقوق محفوظة • نستقبل الطلبات يومياً
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default FoodPage;
