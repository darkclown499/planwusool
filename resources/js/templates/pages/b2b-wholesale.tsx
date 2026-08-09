import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { Building2, Factory, FileText, MessageCircle, Search, Users } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { SectionHeading, getVar } from './ui';

/**
 * B2BWholesale — utilitarian, data-forward wholesale storefront.
 * Category chips, dense professional product cards with wholesale pricing.
 */
const B2BWholesalePage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');
    const [query, setQuery] = useState('');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const runSearch = (q: string) => {
        setQuery(q);
        product.handleSearch(q);
    };

    const blue = getVar('--twc-primary-500', '#3b82f6');
    const blueDeep = getVar('--twc-primary-600', '#2563eb');

    const whatsappPhone = config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';
    const quoteUrl = whatsappPhone ? createWhatsAppUrl(whatsappPhone, `مرحباً، أرغب بطلب عرض سعر جملة من ${identity.name}`) : '';

    return (
        <div className="min-h-screen bg-slate-50" style={{ color: '#0f172a' }}>
            {/* Top strip */}
            <div className="hidden border-b border-slate-200 bg-white md:block" style={{ borderColor: 'var(--twc-border,#e2e8f0)' }}>
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs text-slate-500">
                    <span>جملة وتجزئة — تسليم فوري داخل المدن الرئيسية</span>
                    <span>سجل تجاري معتمد • فواتير ضريبية متوافقة</span>
                </div>
            </div>

            {/* Header */}
            <header
                className="sticky top-0 z-40 hidden border-b border-slate-200 bg-white md:block"
                style={{ borderColor: 'var(--twc-border,#e2e8f0)' }}
            >
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: blueDeep }}>
                            <Building2 className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-base leading-none font-extrabold" style={{ color: '#0f172a' }}>
                                {identity.name}
                            </p>
                            <p className="text-[11px] text-slate-500">توريد الجملة • B2B</p>
                        </div>
                    </div>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query}
                            onChange={(e) => runSearch(e.target.value)}
                            placeholder="ابحث عن منتج جملة..."
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 ps-4 pe-9 text-sm outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Mobile search */}
            <div className="relative border-b border-slate-200 bg-white px-4 py-2 md:hidden">
                <Search className="absolute start-7 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    value={query}
                    onChange={(e) => runSearch(e.target.value)}
                    placeholder="ابحث عن منتج جملة..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 ps-11 pe-4 text-sm outline-none"
                />
            </div>

            {/* Hero */}
            <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${blueDeep}, #1d4ed8)` }}>
                <div
                    className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'linear-gradient(45deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
                />
                <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20">
                    <div className="max-w-2xl">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
                            <Users className="h-3.5 w-3.5" /> أكثر من 500 عميل تجاري
                        </span>
                        <h1 className="mt-4 text-3xl leading-tight font-black text-white md:text-5xl">
                            موردك الموثوق
                            <br />
                            للجملة والتوريد
                        </h1>
                        <p className="mt-3 max-w-md text-sm text-blue-100 md:text-base">
                            أسعار جملة تنافسية، تسليم سريع، وفواتير معتمدة. من {identity.name} إلى نشاطك التجاري.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <a
                                href="#catalog"
                                className="rounded-lg bg-white px-7 py-3 text-sm font-black transition hover:opacity-90"
                                style={{ color: blueDeep }}
                            >
                                تصفح الكتالوج
                            </a>
                            {quoteUrl && (
                                <a
                                    href={quoteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/10 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                                >
                                    <MessageCircle className="h-4 w-4" /> اطلب عرض سعر واتساب
                                </a>
                            )}
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white">
                                <Factory className="h-4 w-4" /> توريد للمشاريع
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="border-b border-slate-200 bg-white">
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4">
                    {[
                        { num: '500+', label: 'عميل تجاري' },
                        { num: '24h', label: 'معالجة الطلب' },
                        { num: '98%', label: 'نسبة الالتزام' },
                        { num: '1:1', label: 'دعم مخصص' },
                    ].map((s) => (
                        <div key={s.label} className="text-center">
                            <p className="text-2xl font-black" style={{ color: blueDeep }}>
                                {s.num}
                            </p>
                            <p className="text-xs text-slate-500">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <main className="mx-auto max-w-7xl px-4 py-10">
                {/* Category chips */}
                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`rounded-lg px-4 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white' : 'border border-slate-200 bg-white hover:bg-slate-100'}`}
                        style={cat === 'all' ? { background: blue } : { color: '#0f172a' }}
                    >
                        الكل
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white' : 'border border-slate-200 bg-white hover:bg-slate-100'}`}
                            style={cat === c.id ? { background: blue } : { color: '#0f172a' }}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                {/* Catalog */}
                <div id="catalog" className="scroll-mt-24">
                    <SectionHeading title="كتالوج الجملة" subtitle="حدد الكمية المطلوبة واحصل على سعر التوريد" align="start" />
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-100 text-start text-xs tracking-wide text-slate-500 uppercase">
                                    <th className="px-4 py-3 text-start font-bold">المنتج</th>
                                    <th className="px-4 py-3 text-start font-bold">القسم</th>
                                    <th className="hidden px-4 py-3 text-start font-bold sm:table-cell">التوفر</th>
                                    <th className="px-4 py-3 text-end font-bold">سعر الجملة</th>
                                    <th className="px-4 py-3 text-end font-bold">إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-14 text-center text-slate-500">
                                            لا توجد منتجات بعد — أضف منتجاتك من لوحة التحكم
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((p: any, i: number) => (
                                        <tr
                                            key={p.id || i}
                                            className="border-t border-slate-100 transition hover:bg-blue-50/50"
                                            onClick={() => product.handleProductClick(p)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className="flex h-10 w-10 items-center justify-center rounded-lg text-base font-black"
                                                        style={{ background: 'var(--twc-surface,#f1f5f9)', color: blueDeep }}
                                                    >
                                                        {p.name?.charAt(0)}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold" style={{ color: '#0f172a' }}>
                                                            {p.name}
                                                        </p>
                                                        <p className="line-clamp-1 text-xs text-slate-400">{p.description}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">{p.category || 'عام'}</td>
                                            <td className="hidden px-4 py-3 sm:table-cell">
                                                <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">متوفر</span>
                                            </td>
                                            <td className="px-4 py-3 text-end font-black" style={{ color: blueDeep }}>
                                                {p.price} {identity.currency}
                                            </td>
                                            <td className="px-4 py-3 text-end">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        product.handleProductClick(p);
                                                    }}
                                                    className="rounded-lg px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                                                    style={{ background: blue }}
                                                >
                                                    طلب توريد
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info cards */}
                <div className="mt-10 grid gap-4 md:grid-cols-3">
                    {[
                        { icon: <FileText className="h-5 w-5" />, title: 'فاتورة ضريبية', desc: 'فواتير متوافقة مع متطلبات ضريبة القيمة المضافة' },
                        { icon: <Factory className="h-5 w-5" />, title: 'توريد مشاريع', desc: 'خطط توريد خاصة بالمشاريع والشركات' },
                        { icon: <Users className="h-5 w-5" />, title: 'مدير حساب', desc: 'ممثل مبيعات مخصص لكل عميل تجاري' },
                    ].map((c) => (
                        <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-5">
                            <span
                                className="flex h-10 w-10 items-center justify-center rounded-lg"
                                style={{ background: `${blue}22`, color: blueDeep }}
                            >
                                {c.icon}
                            </span>
                            <h3 className="mt-3 font-bold" style={{ color: '#0f172a' }}>
                                {c.title}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">{c.desc}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 md:flex-row">
                    <p className="font-extrabold" style={{ color: '#0f172a' }}>
                        {identity.name}
                    </p>
                    <p className="text-xs text-slate-500">© {new Date().getFullYear()} — توريد جملة للشركات والمؤسسات</p>
                </div>
            </footer>
        </div>
    );
};

export default B2BWholesalePage;
