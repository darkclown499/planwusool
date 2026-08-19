import { FAQSection, FeatureGrid, NewsletterForm, TestimonialsSection } from '@/templates/pages/ui';
import { AccountButton, CartButton, WhatsAppButton, useStorefrontCore } from '@/templates/storefront';
import type { DesignTokens, TemplateLayoutConfig, TemplateSectionConfig } from '@/templates/types';
import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { ChevronLeft, LayoutPanelLeft, MessageCircle, Minus, PackageX, Plus, Search, ShoppingCart, Star } from 'lucide-react';
import React, { useState } from 'react';

export interface SectionProps {
    section: TemplateSectionConfig;
    storeData: any;
    designTokens?: DesignTokens | null;
    isPreview?: boolean;
    layout?: TemplateLayoutConfig;
}

export function getCssVar(name: string, fallback: string): string {
    if (typeof window !== 'undefined') {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name);
        return value?.trim() || fallback;
    }
    return fallback;
}

const storeSettingsOf = () => {
    const page = (typeof window !== 'undefined' && (window as any).page?.props) || {};
    return { storeSettings: page.storeSettings || {}, currencies: page.currencies || [] };
};

const GRID_CLASSES: Record<number, string> = {
    2: 'grid grid-cols-2 gap-3 sm:gap-4',
    3: 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4',
    4: 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4',
    5: 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5',
    6: 'grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6',
};

function buildProductWhatsAppUrl(config: any, product: any, quantity = 1): string {
    const phone = config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';
    if (!phone) return '';
    const message = `مرحباً! أرغب بطلب: ${product.name} - الكمية: ${quantity}`;
    return createWhatsAppUrl(phone, message);
}

/* ============================== HEADER ============================== */

export const HeaderSection: React.FC<SectionProps> = ({ section, storeData }) => {
    const props = section.props || {};
    const classes = section.classes || {};
    const { product, config } = useStorefrontCore();
    const [searchQuery, setSearchQuery] = useState('');

    const storeName = config?.storeName || storeData?.name || 'متجري';
    const logo = config?.logo || storeData?.logo;

    // Per-store behavior toggles (server-driven).
    const behavior = storeData?.behavior || {};
    const showSearch = props.show_search !== false && behavior.show_search !== false;
    const showCart = props.show_cart !== false && behavior.show_cart !== false;
    const showAuth = props.show_auth !== false && behavior.show_auth_button !== false;
    const showWhatsapp = props.show_whatsapp !== false && behavior.show_whatsapp_order_button !== false;

    const pages = (storeData?.pages || []) as { slug: string; title: string }[];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        product.handleSearch(searchQuery);
    };

    return (
        <div className="hidden md:block">
            <header className={classes.header || 'sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md'}>
                <div className={classes.container || 'mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4'}>
                    {/* Brand */}
                    <a href="/" className="flex min-w-0 items-center gap-2">
                        {logo ? (
                            <img src={getImageUrl(logo)} alt={storeName} className="h-10 w-10 rounded-xl object-cover" />
                        ) : (
                            <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                                style={{ background: 'var(--twc-primary-600, #059669)' }}
                            >
                                {storeName.charAt(0)}
                            </div>
                        )}
                        <span className="hidden truncate text-lg font-bold lg:inline" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                            {storeName}
                        </span>
                    </a>

                    {/* Nav links to custom pages */}
                    {pages.length > 0 && (
                        <nav className="hidden items-center gap-4 lg:flex">
                            {pages.map((pageItem) => (
                                <a
                                    key={pageItem.slug}
                                    href={`/page/${pageItem.slug}`}
                                    className="text-sm font-medium transition-colors hover:opacity-80"
                                    style={{ color: 'var(--twc-text-muted, #6b7280)' }}
                                >
                                    {pageItem.title}
                                </a>
                            ))}
                        </nav>
                    )}

                    {/* Search (desktop) */}
                    {showSearch && (
                        <form onSubmit={handleSearch} className="hidden flex-1 justify-center px-4 lg:flex">
                            <div className="relative w-full max-w-md">
                                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        product.handleSearch(e.target.value);
                                    }}
                                    placeholder="ابحث عن منتج..."
                                    className="h-10 w-full rounded-full border ps-9 pe-4 text-sm focus:ring-2 focus:outline-none"
                                    style={{
                                        borderColor: 'var(--twc-border, #e5e7eb)',
                                        background: 'var(--twc-surface, #ffffff)',
                                        color: 'var(--twc-text-primary, #111827)',
                                        ['--tw-ring-color' as any]: 'var(--twc-primary-500, #059669)',
                                    }}
                                />
                            </div>
                        </form>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {showWhatsapp && <WhatsAppButton className="hidden lg:flex" />}
                        {showCart && <CartButton />}
                        {showAuth && <AccountButton />}
                    </div>
                </div>
            </header>
        </div>
    );
};

/* ============================== HERO ============================== */

export const HeroSection: React.FC<SectionProps> = ({ section, storeData }) => {
    const props = section.props || {};
    const classes = section.classes || {};
    const { config } = useStorefrontCore();

    const storeName = props.title || config?.storeName || storeData?.name || 'متجرك الرائع';
    const description = props.subtitle || config?.description || storeData?.description || 'اكتشف منتجاتنا المميزة بأسعار تنافسية وخدمة استثنائية.';
    const welcome = props.badge || config?.welcomeMessage || '';

    const primary = 'var(--twc-primary-600, #059669)';

    return (
        <section
            className={`${classes.section || 'relative w-full overflow-hidden'} ${props.layout === 'fullscreen' ? 'min-h-[85vh]' : ''}`}
            style={{
                background:
                    props.layout === 'fullscreen'
                        ? `linear-gradient(135deg, var(--twc-primary-700, #047857) 0%, var(--twc-primary-500, #10b77f) 100%)`
                        : 'var(--twc-background, #ffffff)',
            }}
        >
            <div className={classes.container || 'mx-auto px-4 py-12 sm:py-16'}>
                <div className="mx-auto max-w-3xl text-center">
                    {welcome && (
                        <p className="mb-3 text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--twc-primary-600, #059669)' }}>
                            {welcome}
                        </p>
                    )}
                    <h1
                        className={`${classes.heading || 'text-3xl font-bold sm:text-5xl'} leading-tight`}
                        style={{
                            color: props.layout === 'fullscreen' ? '#ffffff' : 'var(--twc-text-primary, #111827)',
                            fontFamily: 'var(--twf-font-family, Tajawal)',
                        }}
                    >
                        {storeName}
                    </h1>
                    <p
                        className={`${classes.subheading || 'mx-auto mt-4 max-w-2xl text-lg'}`}
                        style={{ color: props.layout === 'fullscreen' ? 'rgba(255,255,255,0.9)' : 'var(--twc-text-muted, #6b7280)' }}
                    >
                        {description}
                    </p>

                    {props.show_search && (
                        <div className="mx-auto mt-8 max-w-md">
                            <input
                                type="text"
                                placeholder="ابحث عن منتج..."
                                className="w-full rounded-full border px-5 py-3 focus:ring-2 focus:outline-none"
                                style={{
                                    borderColor: 'var(--twc-border, #e5e7eb)',
                                    background: props.layout === 'fullscreen' ? 'rgba(255,255,255,0.15)' : 'var(--twc-surface, #ffffff)',
                                    color: 'var(--twc-text-primary, #111827)',
                                }}
                            />
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => document.getElementById('template-products')?.scrollIntoView({ behavior: 'smooth' })}
                        className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3 text-white shadow-lg transition hover:opacity-90"
                        style={{
                            background: props.layout === 'fullscreen' ? '#ffffff' : primary,
                            color: props.layout === 'fullscreen' ? primary : '#ffffff',
                        }}
                    >
                        تسوق الآن
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </section>
    );
};

/* ============================== CATEGORIES ============================== */

export const CategoriesSection: React.FC<SectionProps> = ({ section, storeData }) => {
    const props = section.props || {};
    const classes = section.classes || {};
    const { product } = useStorefrontCore();

    const categories = product.categories?.length ? product.categories : storeData?.categories || [];

    return (
        <section className={classes.section || 'w-full py-10 sm:py-12'} style={{ background: 'var(--twc-surface, #f1f5f9)' }}>
            <div className={classes.container || 'mx-auto max-w-7xl px-4'}>
                <h2 className={`${classes.heading || 'mb-6 text-2xl font-bold sm:text-3xl'}`} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                    {props.style === 'horizontal_scroll' ? 'قائمة الطعام' : 'التصنيفات'}
                </h2>

                {categories.length === 0 ? (
                    <div
                        className="rounded-2xl border border-dashed p-6 text-center text-sm"
                        style={{ borderColor: 'var(--twc-border, #e5e7eb)', color: 'var(--twc-text-muted, #6b7280)' }}
                    >
                        التصنيفات ستظهر هنا قريباً
                    </div>
                ) : props.style === 'horizontal_scroll' ? (
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {categories.map((category: any) => (
                            <button
                                key={category.id}
                                type="button"
                                onClick={() => product.handleCategoryClick(category.id)}
                                className="shrink-0 cursor-pointer rounded-2xl border bg-white p-4 text-center transition hover:shadow-md"
                                style={{ background: 'var(--twc-background, #ffffff)' }}
                            >
                                <div
                                    className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-3xl"
                                    style={{ background: 'var(--twc-primary-50, #ecfdf5)' }}
                                >
                                    {category.name?.charAt(0)}
                                </div>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                    {category.name}
                                </h3>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className={`${classes.grid || 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'}`}>
                        {props.show_all !== false && (
                            <button
                                type="button"
                                onClick={() => product.handleCategoryClick('all')}
                                className={`cursor-pointer rounded-2xl border p-4 text-center transition hover:shadow-md ${
                                    product.activeCategory === 'all' ? '' : 'opacity-80'
                                }`}
                                style={{
                                    background:
                                        product.activeCategory === 'all' ? 'var(--twc-primary-600, #059669)' : 'var(--twc-background, #ffffff)',
                                    color: product.activeCategory === 'all' ? '#ffffff' : 'var(--twc-text-primary, #111827)',
                                }}
                            >
                                <div
                                    className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-3xl"
                                    style={{
                                        background: product.activeCategory === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--twc-primary-50, #ecfdf5)',
                                    }}
                                >
                                    الكل
                                </div>
                                <h3 className="font-semibold">جميع المنتجات</h3>
                            </button>
                        )}
                        {categories.map((category: any) => {
                            const active = product.activeCategory === category.id;
                            return (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => product.handleCategoryClick(category.id)}
                                    className="cursor-pointer rounded-2xl border p-4 text-center transition hover:shadow-md"
                                    style={{
                                        background: active ? 'var(--twc-primary-600, #059669)' : 'var(--twc-background, #ffffff)',
                                        color: active ? '#ffffff' : 'var(--twc-text-primary, #111827)',
                                    }}
                                >
                                    <div
                                        className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-3xl"
                                        style={{ background: active ? 'rgba(255,255,255,0.2)' : 'var(--twc-primary-50, #ecfdf5)' }}
                                    >
                                        {category.name?.charAt(0)}
                                    </div>
                                    <h3 className="font-semibold">{category.name}</h3>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

/* ============================== PRODUCTS ============================== */

interface ProductCardProps {
    product: any;
    columns: number;
    isPreview?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isPreview }) => {
    const { cart, product: productCtx, config } = useStorefrontCore();
    const { storeSettings, currencies } = storeSettingsOf();

    const price = Number(product.price) || 0;
    const originalPrice = product.originalPrice ? Number(product.originalPrice) : 0;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    const outOfStock = product.availability === 'out_of_stock';
    const whatsappUrl = buildProductWhatsAppUrl(config, product);

    const openProduct = () => productCtx.handleProductClick(product);

    return (
        <div
            className="group overflow-hidden rounded-2xl border transition hover:shadow-lg"
            style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
        >
            <button type="button" onClick={openProduct} className="relative block aspect-square w-full overflow-hidden bg-gray-100">
                {discount > 0 && (
                    <span className="absolute start-2 top-2 z-10 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                        -{discount}%
                    </span>
                )}
                <img
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                />
                {outOfStock && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-bold text-white">غير متوفر</span>
                )}
            </button>
            <div className="p-3">
                <button type="button" onClick={openProduct} className="block w-full text-start">
                    <h3 className="line-clamp-1 text-sm font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                        {product.name}
                    </h3>
                </button>
                <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <span className="block truncate text-sm font-bold" style={{ color: 'var(--twc-primary-600, #059669)' }}>
                            {formatCurrency(price, storeSettings, currencies)}
                        </span>
                        {originalPrice > price && (
                            <span className="text-xs text-gray-400 line-through">{formatCurrency(originalPrice, storeSettings, currencies)}</span>
                        )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        {whatsappUrl && (
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="اطلب عبر واتساب"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:opacity-90"
                            >
                                <MessageCircle className="h-4 w-4" />
                            </a>
                        )}
                        <button
                            type="button"
                            disabled={outOfStock || isPreview}
                            onClick={() => cart.addToCart(product)}
                            aria-label="أضف للسلة"
                            className="flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                            style={{ background: 'var(--twc-primary-600, #059669)' }}
                        >
                            <ShoppingCart className="h-4 w-4" />
                            أضف
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EmptyProducts: React.FC = () => (
    <div
        className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center"
        style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}
    >
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--twc-primary-50, #ecfdf5)' }}>
            <PackageX className="h-8 w-8" style={{ color: 'var(--twc-primary-600, #059669)' }} />
        </div>
        <p className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
            لا توجد منتجات في هذا القسم
        </p>
        <p className="text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
            أضف منتجاتك من لوحة التحكم لتظهر هنا.
        </p>
    </div>
);

export const ProductsSection: React.FC<SectionProps> = ({ section, storeData, layout, isPreview }) => {
    const props = section.props || {};
    const classes = section.classes || {};
    const { product: productCtx, cart, config } = useStorefrontCore();

    // The storefront ProductProvider defaults to the first category for the
    // scroll-based themes; the template grid starts from "all products".
    React.useEffect(() => {
        productCtx.handleCategoryClick('all');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const products = productCtx.filteredProducts?.length ? productCtx.filteredProducts : storeData?.products || [];
    const activeCat = productCtx.activeCategory;
    const allVisible = activeCat && activeCat !== 'all' ? products.filter((p: any) => String(p.categoryId) === String(activeCat)) : products;

    // Honour the template's per_page setting so the homepage never renders the
    // entire catalog (which can be thousands of products) at once. A "load
    // more" button reveals additional products in chunks.
    const perPage = Math.max(Number(props.per_page) || 24, 8);
    const [visibleCount, setVisibleCount] = useState(perPage);
    const visibleProducts = allVisible.slice(0, visibleCount);

    // Reset pagination when the active category changes.
    React.useEffect(() => {
        setVisibleCount(perPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCat]);

    const columns = Math.min(Number(props.columns || layout?.columns || 4) || 4, 6);
    const gridClass = GRID_CLASSES[columns] || GRID_CLASSES[4];
    const layoutName = props.layout || 'grid';

    return (
        <section
            id="template-products"
            className={classes.section || 'w-full py-10 sm:py-12'}
            style={{ background: 'var(--twc-background, #ffffff)' }}
        >
            <div className={classes.container || 'mx-auto max-w-7xl px-4'}>
                <h2 className={`${classes.heading || 'mb-6 text-2xl font-bold sm:text-3xl'}`} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                    {props.bulk_order ? 'منتجات الجملة' : 'منتجاتنا'}
                </h2>

                {visibleProducts.length === 0 ? (
                    <EmptyProducts />
                ) : layoutName === 'menu_list' ? (
                    <div className="mx-auto max-w-3xl space-y-3">
                        {products.map((product: any) => {
                            const price = Number(product.price) || 0;
                            const whatsappUrl = buildProductWhatsAppUrl(config, product);
                            return (
                                <div
                                    key={product.id}
                                    className="flex items-center justify-between gap-3 rounded-2xl border p-3"
                                    style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => productCtx.handleProductClick(product)}
                                        className="flex min-w-0 items-center gap-3 text-start"
                                    >
                                        <img
                                            src={getImageUrl(product.image)}
                                            alt={product.name}
                                            className="h-14 w-14 shrink-0 rounded-xl object-cover"
                                        />
                                        <div className="min-w-0">
                                            <h3 className="truncate font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                                {product.name}
                                            </h3>
                                            <p className="text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                                {formatCurrency(price, storeSettingsOf().storeSettings, storeSettingsOf().currencies)}
                                            </p>
                                        </div>
                                    </button>
                                    <div className="flex shrink-0 items-center gap-2">
                                        {whatsappUrl && (
                                            <a
                                                href={whatsappUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label="اطلب واتساب"
                                                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white"
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                            </a>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => cart.addToCart(product)}
                                            className="rounded-full px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                                            style={{ background: 'var(--twc-primary-600, #059669)' }}
                                        >
                                            أضف للطلب
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : layoutName === 'list' ? (
                    <div className="space-y-4">
                        {visibleProducts.map((product: any) => (
                            <div
                                key={product.id}
                                className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center"
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                            >
                                <button
                                    type="button"
                                    onClick={() => productCtx.handleProductClick(product)}
                                    className="flex shrink-0 items-center gap-4 text-start"
                                >
                                    <img
                                        src={getImageUrl(product.image)}
                                        alt={product.name}
                                        className="h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28"
                                    />
                                </button>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        {product.name}
                                    </h3>
                                    {(product.short_description || product.description) && (
                                        <p className="mt-1 line-clamp-2 text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                            {product.short_description || product.description}
                                        </p>
                                    )}
                                    <p className="mt-2 font-bold" style={{ color: 'var(--twc-primary-600, #059669)' }}>
                                        {formatCurrency(Number(product.price) || 0, storeSettingsOf().storeSettings, storeSettingsOf().currencies)}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <a
                                        href={buildProductWhatsAppUrl(config, product)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white"
                                    >
                                        <MessageCircle className="h-5 w-5" />
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => cart.addToCart(product)}
                                        className="rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                                        style={{ background: 'var(--twc-primary-600, #059669)' }}
                                    >
                                        أضف للسلة
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : layoutName === 'masonry' ? (
                    <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
                        {visibleProducts.map((product: any) => (
                            <div key={product.id} className="mb-3 break-inside-avoid sm:mb-4">
                                <ProductCard product={product} columns={columns} isPreview={isPreview} />
                            </div>
                        ))}
                    </div>
                ) : layoutName === 'elegant_list' ? (
                    <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
                        {visibleProducts.map((product: any) => (
                            <div
                                key={product.id}
                                className="flex gap-4 rounded-2xl border p-4"
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                            >
                                <button
                                    type="button"
                                    onClick={() => productCtx.handleProductClick(product)}
                                    className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100"
                                >
                                    <img src={getImageUrl(product.image)} alt={product.name} className="h-full w-full object-cover" />
                                </button>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        {product.name}
                                    </h3>
                                    <p className="mt-1 font-bold" style={{ color: 'var(--twc-primary-600, #059669)' }}>
                                        {formatCurrency(Number(product.price) || 0, storeSettingsOf().storeSettings, storeSettingsOf().currencies)}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => cart.addToCart(product)}
                                        className="mt-2 rounded-full px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                                        style={{ background: 'var(--twc-primary-600, #059669)' }}
                                    >
                                        أضف للسلة
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : layoutName === 'bulk_table' ? (
                    <BulkTable products={visibleProducts} />
                ) : (
                    <div className={gridClass}>
                        {visibleProducts.map((product: any) => (
                            <ProductCard key={product.id} product={product} columns={columns} isPreview={isPreview} />
                        ))}
                    </div>
                )}

                {allVisible.length > visibleCount && (
                    <div className="mt-8 text-center">
                        <button
                            type="button"
                            onClick={() => setVisibleCount((prev) => prev + perPage)}
                            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                            style={{ background: 'var(--twc-primary-600, #059669)' }}
                        >
                            عرض المزيد من المنتجات
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

const BulkTable: React.FC<{ products: any[] }> = ({ products }) => {
    const { cart } = useStorefrontCore();
    const [quantities, setQuantities] = React.useState<Record<string, number>>({});
    const { storeSettings, currencies } = storeSettingsOf();

    return (
        <div
            className="overflow-x-auto rounded-2xl border"
            style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
        >
            <table className="w-full min-w-[560px] text-sm">
                <thead>
                    <tr className="text-start" style={{ background: 'var(--twc-surface, #f1f5f9)' }}>
                        <th className="px-4 py-3 text-start font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                            المنتج
                        </th>
                        <th className="px-4 py-3 text-start font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                            السعر
                        </th>
                        <th className="px-4 py-3 text-start font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                            الكمية
                        </th>
                        <th className="px-4 py-3 text-start font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                            المجموع
                        </th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product: any) => {
                        const qty = quantities[product.id] || 1;
                        const price = Number(product.price) || 0;
                        return (
                            <tr key={product.id} className="border-t" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <img src={getImageUrl(product.image)} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
                                        <span className="font-medium" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                            {product.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                    {formatCurrency(price, storeSettings, currencies)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setQuantities((q) => ({ ...q, [product.id]: Math.max(1, (q[product.id] || 1) - 1) }))}
                                            className="flex h-7 w-7 items-center justify-center rounded-full border"
                                            style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}
                                        >
                                            <Minus className="h-3.5 w-3.5" />
                                        </button>
                                        <span className="w-8 text-center font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                            {qty}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setQuantities((q) => ({ ...q, [product.id]: (q[product.id] || 1) + 1 }))}
                                            className="flex h-7 w-7 items-center justify-center rounded-full border"
                                            style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-bold" style={{ color: 'var(--twc-primary-600, #059669)' }}>
                                    {formatCurrency(price * qty, storeSettings, currencies)}
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        type="button"
                                        onClick={() => cart.addToCart({ ...product, quantity: qty })}
                                        className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                                    >
                                        أضف للطلب
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

/* ============================== REVIEWS ============================== */

export const ReviewsSection: React.FC<SectionProps> = ({ section, storeData }) => {
    const classes = section.classes || {};
    const content = storeData?.content || {};
    const reviews = content?.testimonials || [];

    if (reviews.length === 0) return null;

    return (
        <section className={classes.section || 'w-full py-10 sm:py-12'} style={{ background: 'var(--twc-surface, #f1f5f9)' }}>
            <div className={classes.container || 'mx-auto max-w-7xl px-4'}>
                <h2 className={`${classes.heading || 'mb-6 text-2xl font-bold sm:text-3xl'}`} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                    تقييمات العملاء
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {reviews.map((review: any, index: number) => {
                        const rating = Math.min(5, Math.max(0, Number(review.rating) || 5));
                        const name = review.customer_name || review.name || review.author || 'عميل';
                        const text = review.comment || review.content || review.text || '';
                        return (
                            <figure
                                key={review.id || index}
                                className="rounded-2xl border p-5"
                                style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                            >
                                <div className="mb-2 flex items-center gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star key={i} className={i < rating ? 'h-4 w-4 fill-yellow-400 text-yellow-400' : 'h-4 w-4 text-gray-300'} />
                                    ))}
                                </div>
                                <blockquote className="text-sm leading-relaxed" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                    {text}
                                </blockquote>
                                <figcaption className="mt-3 flex items-center gap-2">
                                    <span
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                                        style={{ background: 'var(--twc-primary-600, #059669)' }}
                                    >
                                        {name.charAt(0)}
                                    </span>
                                    <span className="text-sm font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        {name}
                                    </span>
                                </figcaption>
                            </figure>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

/* ============================== FOOTER ============================== */

export const FooterSection: React.FC<SectionProps> = ({ section, storeData }) => {
    const props = section.props || {};
    const classes = section.classes || {};
    const { config } = useStorefrontCore();

    const storeName = config?.storeName || storeData?.name || 'متجري';
    const copyright = config?.copyrightText || `© ${new Date().getFullYear()} ${storeName}. جميع الحقوق محفوظة`;
    const address = config?.address || storeData?.address;
    const social = config?.socialMedia || storeData?.socialMedia || {};

    const darkFooter = !!props.style && ['dark_elegant', 'soft_dark'].includes(props.style);
    const footerBg = darkFooter ? 'var(--twc-surface, #171717)' : 'var(--twc-primary-700, #047857)';
    const textColor = darkFooter ? 'var(--twc-text-primary, #fafafa)' : '#ffffff';
    const mutedColor = darkFooter ? 'var(--twc-text-muted, #a8a29e)' : 'rgba(255,255,255,0.8)';

    const socialLinks = [
        social.facebook && { label: 'فيسبوك', href: social.facebook },
        social.instagram && { label: 'انستغرام', href: social.instagram },
        social.twitter && { label: 'تويتر', href: social.twitter },
        social.youtube && { label: 'يوتيوب', href: social.youtube },
        social.whatsapp && { label: 'واتساب', href: social.whatsapp },
    ].filter(Boolean) as { label: string; href: string }[];

    return (
        <footer className={classes.section || 'w-full border-t'} style={{ background: footerBg }}>
            <div className={classes.container || 'mx-auto max-w-7xl px-4 py-12 sm:py-16'}>
                {props.show_newsletter && (
                    <div className="mb-10 rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <h3 className="text-lg font-bold" style={{ color: textColor }}>
                            اشترك في النشرة البريدية
                        </h3>
                        <div className="mx-auto mt-4 flex max-w-md gap-2">
                            <input
                                type="email"
                                placeholder="بريدك الإلكتروني"
                                className="flex-1 rounded-full px-4 py-2 text-gray-900 focus:outline-none"
                            />
                            <button type="button" className="rounded-full px-6 py-2 font-semibold" style={{ background: textColor, color: footerBg }}>
                                اشترك
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid gap-8 md:grid-cols-3">
                    {/* Brand */}
                    <div>
                        <h3 className="text-lg font-bold" style={{ color: textColor }}>
                            {storeName}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: mutedColor }}>
                            {config?.description || storeData?.description}
                        </p>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-sm font-bold" style={{ color: textColor }}>
                            تواصل معنا
                        </h4>
                        <ul className="mt-3 space-y-2 text-sm" style={{ color: mutedColor }}>
                            {config?.phoneNumber && <li>📞 {config.phoneNumber}</li>}
                            {config?.email && <li>✉️ {config.email}</li>}
                            {address && <li>📍 {address}</li>}
                        </ul>
                    </div>

                    {/* Links + social */}
                    <div>
                        <h4 className="text-sm font-bold" style={{ color: textColor }}>
                            روابط
                        </h4>
                        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: mutedColor }}>
                            <li className="cursor-pointer hover:underline">من نحن</li>
                            <li className="cursor-pointer hover:underline">تواصل معنا</li>
                            <li className="cursor-pointer hover:underline">سياسة الخصوصية</li>
                            {socialLinks.length > 0 && (
                                <li className="flex w-full gap-3 pt-1">
                                    {socialLinks.map((s) => (
                                        <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                            {s.label}
                                        </a>
                                    ))}
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                <div className="mt-10 border-t pt-6 text-center text-sm" style={{ borderColor: 'rgba(255,255,255,0.15)', color: mutedColor }}>
                    {copyright}
                </div>
            </div>
        </footer>
    );
};

/* ============================== FEATURED PRODUCTS ============================== */

export const FeaturedSection: React.FC<SectionProps> = ({ section, storeData, isPreview }) => {
    const props = section.props || {};
    const classes = section.classes || {};
    const { product: productCtx, cart } = useStorefrontCore();
    const { storeSettings, currencies } = storeSettingsOf();

    // Featured products come from real store content. Explicit IDs configured
    // in content.featured_products win; otherwise the newest active products
    // passed by ThemeController are used (there is no per-product flag yet).
    const content = storeData?.content || {};
    const featuredConfig = content?.featured_products || [];
    const storeProducts = storeData?.products || [];

    let productsToShow: any[] = [];
    if (Array.isArray(featuredConfig) && featuredConfig.length > 0) {
        const ids = new Set(featuredConfig.map((f: any) => String(f?.id ?? f)));
        productsToShow = storeProducts.filter((p: any) => ids.has(String(p.id)));
    }
    if (productsToShow.length === 0) {
        productsToShow = storeProducts.slice(0, Math.max(Number(props.per_page) || 8, 4));
    }

    if (productsToShow.length === 0) return null;

    const perPage = Math.max(Number(props.per_page) || 8, 4);
    const columns = Math.min(Math.max(Number(props.columns || 4), 2), 6);
    const gridClass = GRID_CLASSES[columns] || GRID_CLASSES[4];

    return (
        <section className={section.classes?.section || 'w-full py-10 sm:py-12'} style={{ background: 'var(--twc-background, #ffffff)' }}>
            <div className={classes.container || 'mx-auto max-w-7xl px-4'}>
                <h2 className="mb-6 text-center text-2xl font-bold sm:text-3xl" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                    {section.props?.title || 'منتجات مميزة'}
                </h2>
                <div className={gridClass}>
                    {productsToShow.slice(0, perPage).map((product: any) => (
                        <div key={product.id} className="group overflow-hidden rounded-2xl border transition hover:shadow-lg" style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}>
                            <button type="button" onClick={() => productCtx.handleProductClick(product)} className="relative block aspect-square w-full overflow-hidden bg-gray-100">
                                <img src={getImageUrl(product.image)} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                            </button>
                            <div className="p-3">
                                <button type="button" onClick={() => productCtx.handleProductClick(product)} className="block w-full text-start">
                                    <h3 className="line-clamp-1 text-sm font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                        {product.name}
                                    </h3>
                                </button>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <span className="block truncate text-sm font-bold" style={{ color: 'var(--twc-primary-600, #059669)' }}>
                                            {formatCurrency(Number(product.price) || 0, storeSettings, currencies)}
                                        </span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={isPreview}
                                            onClick={() => cart.addToCart(product)}
                                            className="flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                                            style={{ background: 'var(--twc-primary-600, #059669)' }}
                                        >
                                            <ShoppingCart className="h-4 w-4" />
                                            أضف
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

/* ============================== SIDEBAR ============================== */

export const SidebarSection: React.FC<SectionProps> = ({ section, storeData }) => {
    const props = section.props || {};
    const classes = section.classes || {};
    const { product } = useStorefrontCore();

    const categoriesList = product.categories?.length ? product.categories : storeData?.categories || [];
    const activeCategory = props.active_category || storeData?.activeCategory || product.activeCategory;

    if (categoriesList.length === 0) return null;

    return (
        <aside className={`${classes.aside || 'w-full lg:w-64 flex-shrink-0'} ${classes.sidebar || ''}`} aria-label="تصنيف المنتجات">
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                    <LayoutPanelLeft className="h-5 w-5" style={{ color: 'var(--twc-primary-600, #059669)' }} />
                    <h3 className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                        {props.title || 'التصنيفات'}
                    </h3>
                </div>
                <nav className="space-y-1" aria-label="تصنيف المنتجات">
                    <button
                        type="button"
                        onClick={() => product.handleCategoryClick('all')}
                        className={`w-full text-start rounded-lg px-3 py-2 text-sm font-medium transition ${!activeCategory || activeCategory === 'all' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        style={{
                            color: 'var(--twc-text-primary, #111827)',
                            backgroundColor: 'var(--twc-background, #ffffff)',
                        }}
                    >
                        جميع المنتجات
                    </button>
                    {categoriesList.map((category: any) => (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => product.handleCategoryClick(category.id)}
                            className={`w-full text-start rounded-lg px-3 py-2 text-sm transition ${product.activeCategory === category.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                            style={{
                                backgroundColor: 'var(--twc-background, #ffffff)',
                            }}
                        >
                            {category.name}
                            {category.products_count && (
                                <span className="ml-auto text-xs text-gray-400">({category.products_count})</span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>
        </aside>
    );
};


/* ============================== ANNOUNCEMENT (banner) ============================== */

export const AnnouncementSection: React.FC<SectionProps> = ({ section, storeData }) => {
    const props = section.props || {};
    const classes = section.classes || {};
    const content = storeData?.content || {};
    const announcement = { ...(content.announcement || {}), ...(props.announcement || {}) };

    const text = props.text || announcement.text || '🎉 شحن مجاني للطلبات فوق 200₪ — عروض حصرية كل أسبوع';
    if (announcement.enabled === false) return null;

    const inner = <span className="px-8 text-sm font-semibold text-white">{text}</span>;

    return (
        <div className={classes.section || 'w-full overflow-hidden'} style={{ background: props.background || 'var(--twc-primary-600,#059669)' }}>
            {announcement.link ? (
                <a href={announcement.link} target="_blank" rel="noopener noreferrer" className="animate-marquee flex py-2 whitespace-nowrap">
                    {[0, 1].map((n) => (
                        <span key={n}>{inner}</span>
                    ))}
                </a>
            ) : (
                <div className="animate-marquee flex py-2 whitespace-nowrap">
                    {[0, 1].map((n) => (
                        <span key={n}>{inner}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ============================== CONTENT (custom kinds) ============================== */

export const ContentSection: React.FC<SectionProps> = ({ section }) => {
    const props = section.props || {};
    const classes = section.classes || {};
    const kind = props.kind || section.id || 'custom';
    const title = props.title || '';

    const heading = title ? (
        <h2 className="mb-6 text-center text-2xl font-extrabold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
            {title}
        </h2>
    ) : null;

    if (kind === 'features') {
        return (
            <section className={classes.section || 'w-full py-10 sm:py-12'} style={{ background: 'var(--twc-background,#ffffff)' }}>
                <div className={classes.container || 'mx-auto max-w-7xl px-4'}>
                    {heading}
                    <FeatureGrid />
                </div>
            </section>
        );
    }

    if (kind === 'testimonials') {
        return (
            <section className={classes.section || 'w-full py-10 sm:py-12'} style={{ background: 'var(--twc-surface,#f1f5f9)' }}>
                <div className={classes.container || 'mx-auto max-w-7xl px-4'}>
                    {heading}
                    <TestimonialsSection />
                </div>
            </section>
        );
    }

    if (kind === 'faqs') {
        return (
            <section className={classes.section || 'w-full py-10 sm:py-12'} style={{ background: 'var(--twc-background,#ffffff)' }}>
                <div className={`${classes.container || 'mx-auto max-w-7xl px-4'} mx-auto max-w-3xl`}>
                    {heading}
                    <FAQSection />
                </div>
            </section>
        );
    }

    if (kind === 'newsletter') {
        return (
            <section className={classes.section || 'w-full py-10 sm:py-12'} style={{ background: 'var(--twc-surface,#f1f5f9)' }}>
                <div className="mx-auto max-w-3xl px-4 text-center">
                    {heading}
                    <NewsletterForm className="mx-auto" />
                </div>
            </section>
        );
    }

    // Unknown custom kinds have no configured content — render nothing
    // instead of a placeholder box.
    return null;
};

/* ============================== OFFERS ============================== */

export const OffersSection: React.FC<SectionProps> = ({ section, storeData }) => {
    const offers = (storeData?.offers || []) as any[];
    if (offers.length === 0) return null;

    const max = Number(section.props?.per_page ?? 6);
    const visible = offers.slice(0, max);

    return (
        <section className={section.classes?.section || 'w-full py-10 sm:py-12'}>
            <div className={section.classes?.container || 'mx-auto px-4'}>
                <h2 className="mb-6 text-center text-2xl font-bold sm:text-3xl" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                    {section.props?.title || 'عروضنا الحصرية'}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((offer: any) => (
                        <OfferCard key={offer.id} offer={offer} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export const OfferCard: React.FC<{ offer: any }> = ({ offer }) => {
    const target = offer.product_id
        ? `#product-${offer.product_id}`
        : offer.link || '#template-products';

    return (
        <a
            href={target}
            className="group relative flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-lg"
            style={{
                background: 'var(--twc-surface, #ffffff)',
                borderColor: 'var(--twc-border, #e5e7eb)',
            }}
        >
            {offer.image ? (
                <div className="aspect-[16/9] w-full overflow-hidden">
                    <img src={getImageUrl(offer.image)} alt={offer.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
            ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center" style={{ background: 'var(--twc-primary-100, #dff3e9)' }}>
                    <span className="text-4xl">🏷️</span>
                </div>
            )}
            <div className="flex flex-1 flex-col p-4">
                <h3 className="text-base font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                    {offer.title}
                </h3>
                {offer.subtitle && (
                    <p className="mt-1 text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                        {offer.subtitle}
                    </p>
                )}
                {typeof offer.discount_percent === 'number' && offer.discount_percent > 0 && (
                    <span
                        className="mt-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold text-white"
                        style={{ background: 'var(--twc-primary-600, #059669)' }}
                    >
                        خصم {offer.discount_percent}%
                    </span>
                )}
            </div>
        </a>
    );
};

/* ============================== BANNERS (CAROUSEL) ============================== */

export const BannersSection: React.FC<SectionProps> = ({ section, storeData }) => {
    const content = storeData?.content || {};
    const slides = (content?.banners || []) as any[];
    const single = content?.banner;

    if (!slides.length && !(single && single.enabled !== false)) return null;

    return (
        <section className={section.classes?.section || 'w-full py-8'}>
            <div className={section.classes?.container || 'mx-auto px-4'}>
                {slides.length > 0 ? <BannerCarousel slides={slides} /> : <SingleBanner banner={single} />}
            </div>
        </section>
    );
};

const BannerCarousel: React.FC<{ slides: any[] }> = ({ slides }) => {
    const [index, setIndex] = useState(0);
    const count = slides.length;
    const current = slides[index % count];

    if (!current) return null;

    return (
        <div className="relative overflow-hidden rounded-2xl" style={{ background: 'var(--twc-primary-100, #dff3e9)' }}>
            <div className="flex aspect-[21/9] w-full flex-col items-center justify-center p-6 text-center sm:p-10">
                <h3 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                    {current.title}
                </h3>
                {current.subtitle && (
                    <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                        {current.subtitle}
                    </p>
                )}
                {current.button_text && (
                    <a
                        href={current.button_link || '#template-products'}
                        className="mt-4 inline-flex items-center rounded-full px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                        style={{ background: 'var(--twc-primary-600, #059669)' }}
                    >
                        {current.button_text}
                    </a>
                )}
            </div>
            {count > 1 && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                    {slides.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            aria-label={`slide ${i + 1}`}
                            className={`h-2 rounded-full transition-all ${i === index % count ? 'w-6' : 'w-2'} bg-white/80`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const SingleBanner: React.FC<{ banner: any }> = ({ banner }) => (
    <div
        className="flex items-center justify-between gap-6 rounded-2xl p-6 sm:p-10"
        style={{
            background: banner.background || 'var(--twc-primary-600, #059669)',
            backgroundImage: banner.image ? `url(${getImageUrl(banner.image)})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }}
    >
        <div>
            <h3 className="text-2xl font-bold text-white sm:text-3xl">{banner.title}</h3>
            {banner.subtitle && <p className="mt-2 text-sm text-white/90 sm:text-base">{banner.subtitle}</p>}
            {banner.button_text && (
                <a
                    href={banner.button_link || '#template-products'}
                    className="mt-4 inline-flex items-center rounded-full bg-white px-6 py-2.5 text-sm font-bold"
                    style={{ color: 'var(--twc-primary-700, #047857)' }}
                >
                    {banner.button_text}
                </a>
            )}
        </div>
    </div>
);

/* ============================== VIDEO ============================== */

export const VideoSection: React.FC<SectionProps> = ({ section, storeData }) => {
    const content = storeData?.content || {};
    const video = content?.video;
    if (!video || video.enabled === false || !video.video_url) return null;

    const url = video.video_url;

    return (
        <section className={section.classes?.section || 'w-full py-10 sm:py-12'}>
            <div className={section.classes?.container || 'mx-auto max-w-4xl px-4'}>
                {video.title && (
                    <h2 className="mb-6 text-center text-2xl font-bold sm:text-3xl" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                        {video.title}
                    </h2>
                )}
                <div className="aspect-video w-full overflow-hidden rounded-2xl">
                    {url.includes('youtube.com') || url.includes('youtu.be') ? (
                        <iframe
                            src={url.replace('/watch?v=', '/embed/').replace('youtu.be/', 'youtube.com/embed/')}
                            title={video.title || 'video'}
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <video className="h-full w-full object-cover" controls poster={video.poster ? getImageUrl(video.poster) : undefined}>
                            <source src={url} />
                        </video>
                    )}
                </div>
            </div>
        </section>
    );
};

/* ============================== CUSTOM PAGE ============================== */

export const PageSection: React.FC<SectionProps & { page?: any }> = ({ page }) => {
    if (!page) return null;

    return (
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
            {page.image && (
                <img src={getImageUrl(page.image)} alt={page.title} className="mb-6 w-full rounded-2xl object-cover" />
            )}
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                {page.title}
            </h1>
            {page.content && (
                <div
                    className="prose prose-lg mt-6 max-w-none"
                    style={{ color: 'var(--twc-text-primary, #111827)' }}
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />
            )}
        </div>
    );
};

/* ============================== MAP ============================== */

export const SECTION_COMPONENTS: Record<string, React.FC<SectionProps>> = {
    header: HeaderSection,
    hero: HeroSection,
    categories: CategoriesSection,
    products: ProductsSection,
    reviews: ReviewsSection,
    footer: FooterSection,
    custom: ContentSection,
    featured: FeaturedSection,
    banner: AnnouncementSection,
    banners: BannersSection,
    offers: OffersSection,
    video: VideoSection,
    sidebar: SidebarSection,
};
