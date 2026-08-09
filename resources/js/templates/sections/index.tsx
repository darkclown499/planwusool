import { AccountButton, CartButton, WhatsAppButton, useStorefrontCore } from '@/templates/storefront';
import type { DesignTokens, TemplateLayoutConfig, TemplateSectionConfig } from '@/templates/types';
import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { ChevronLeft, MessageCircle, Minus, PackageX, Plus, Search, ShoppingCart } from 'lucide-react';
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

                    {/* Search (desktop) */}
                    {props.show_search !== false && (
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
                        {props.show_whatsapp !== false && <WhatsAppButton className="hidden lg:flex" />}
                        {props.show_cart !== false && <CartButton />}
                        {props.show_auth !== false && <AccountButton />}
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

    const storeName = config?.storeName || storeData?.name || 'متجرك الرائع';
    const description = config?.description || storeData?.description || 'اكتشف منتجاتنا المميزة بأسعار تنافسية وخدمة استثنائية.';
    const welcome = config?.welcomeMessage || 'أهلاً بك في';

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
    const visibleProducts = activeCat && activeCat !== 'all' ? products.filter((p: any) => String(p.categoryId) === String(activeCat)) : products;
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
                                    {product.description && (
                                        <p className="mt-1 line-clamp-2 text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                            {product.description}
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
    const reviews = storeData?.reviews || [];

    if (reviews.length === 0) return null;

    return (
        <section className={classes.section || 'w-full py-10 sm:py-12'} style={{ background: 'var(--twc-surface, #f1f5f9)' }}>
            <div className={classes.container || 'mx-auto max-w-7xl px-4'}>
                <h2 className={`${classes.heading || 'mb-6 text-2xl font-bold sm:text-3xl'}`} style={{ color: 'var(--twc-text-primary, #111827)' }}>
                    تقييمات العملاء
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {reviews.map((review: any) => (
                        <div
                            key={review.id}
                            className="rounded-2xl border p-5"
                            style={{ borderColor: 'var(--twc-border, #e5e7eb)', background: 'var(--twc-background, #ffffff)' }}
                        >
                            <div className="mb-2 text-yellow-400">{'★'.repeat(review.rating || 5)}</div>
                            <p className="text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                                {review.comment}
                            </p>
                            <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                                {review.customer_name}
                            </p>
                        </div>
                    ))}
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

/* ============================== CUSTOM ============================== */

export const CustomSection: React.FC<SectionProps> = (props) => {
    const { section } = props;
    const sectionProps = section.props || {};
    const classes = section.classes || {};
    const componentName = sectionProps.component || section.id;

    return (
        <section className={classes.section || 'w-full py-10 sm:py-12'} style={{ background: 'var(--twc-surface, #f1f5f9)' }}>
            <div className={classes.container || 'mx-auto max-w-7xl px-4'}>
                <div className="rounded-2xl border-2 border-dashed p-8 text-center" style={{ borderColor: 'var(--twc-border, #e5e7eb)' }}>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                        {componentName}
                    </h2>
                    <p className="mt-2 text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
                        قسم مخصص لقوالب هذا التصنيف
                    </p>
                </div>
            </div>
        </section>
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
    custom: CustomSection,
    featured: CustomSection,
    banner: CustomSection,
    sidebar: CustomSection,
};
