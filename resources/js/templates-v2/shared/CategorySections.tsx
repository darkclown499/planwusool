import React from 'react';
import { useStorefrontCore } from './hooks';

interface Props {
    storeData: any;
    products: any[];
    categories: any[];
    card: React.ComponentType<{ product: any }>;
    limit?: number;
}

/**
 * Dynamic category sections for homepage — driven by designer settings:
 *  - settings.homepage_categories (ids)
 *  - settings.homepage_products_per_category (4/8/12)
 * Renders a grid per selected category with "عرض الكل" linking to /category/[slug].
 * Uses store.settings or storeData.content.settings (fallback chain).
 */
export function CategorySections({ storeData, products, categories, card: Card, limit }: Props) {
    const { store, product } = useStorefrontCore() as any;
    // Prefer content from provider if storeData not passed via prop
    const content = storeData?.content ?? storeData?.storeContent ?? {};
    // content.settings is the canonical location (designer saves via settings.*)
    // Fall back to homepage.* and top-level for backward compat
    const settings = (content?.settings ?? content?.homepage ?? storeData?.settings ?? (store as any)?.settings ?? {}) as any;

    const rawIds: any[] = Array.isArray(settings?.homepage_categories)
        ? settings.homepage_categories
        : Array.isArray(content?.homepage_categories)
            ? content.homepage_categories
            : Array.isArray(content?.homepage?.homepage_categories)
                ? content.homepage.homepage_categories
                : Array.isArray(storeData?.homepage_categories)
                    ? storeData.homepage_categories
                    : [];

    const perCategory = (() => {
        const v = Number(settings?.homepage_products_per_category ?? content?.homepage_products_per_category ?? settings?.products_per_category ?? limit ?? 8);
        return [4, 8, 12].includes(v) ? v : 8;
    })();

    if (!rawIds.length) return null;

    // Resolve categories map
    const catMap = new Map<string, any>();
    (categories || []).forEach((c: any) => catMap.set(String(c.id), c));

    // Also fallback to categories from product context if not passed
    const fallbackCats = (product?.categories || []) as any[];
    fallbackCats.forEach((c: any) => {
        if (!catMap.has(String(c.id))) catMap.set(String(c.id), c);
    });

    const sections = rawIds
        .map(String)
        .map((id) => catMap.get(id))
        .filter(Boolean);

    if (!sections.length) return null;

    return (
        <>
            {sections.map((cat: any) => {
                const catProducts = products.filter((p: any) => String(p.categoryId ?? p.category_id ?? p.category) === String(cat.id)).slice(0, perCategory);
                if (!catProducts.length) return null;
                const href = `/category/${cat.slug || cat.id}`;
                return (
                    <section key={cat.id} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900">
                                <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-teal-500 to-emerald-600" />
                                {cat.name}
                            </h2>
                            <a href={href} className="text-sm font-bold text-teal-700 transition hover:text-teal-600">عرض الكل ←</a>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                            {catProducts.map((p: any) => (
                                <Card key={p.id} product={p} />
                            ))}
                        </div>
                    </section>
                );
            })}
        </>
    );
}

export function useHomepageSettings(storeData: any) {
    const { store } = useStorefrontCore() as any;
    const content = storeData?.content ?? storeData?.storeContent ?? {};
    const settings = (content?.settings ?? content?.homepage ?? storeData?.settings ?? (store as any)?.settings ?? {}) as any;

    const get = (key: string, fallback: any) => {
        if (settings?.[key] !== undefined) return settings[key];
        if (content?.[key] !== undefined) return content[key];
        if (storeData?.[key] !== undefined) return storeData[key];
        if ((store as any)?.settings?.[key] !== undefined) return (store as any).settings[key];
        return fallback;
    };

    const showLatest = get('show_latest_products', true);
    const showBest = get('show_best_sellers', true);

    const rawIds: any[] = Array.isArray(settings?.homepage_categories)
        ? settings.homepage_categories
        : Array.isArray(content?.homepage_categories)
            ? content.homepage_categories
            : Array.isArray(content?.homepage?.homepage_categories)
                ? content.homepage.homepage_categories
                : Array.isArray(get('homepage_categories', []))
                    ? get('homepage_categories', [])
                    : [];

    const perCategory = (() => {
        const v = Number(get('homepage_products_per_category', 8));
        return [4, 8, 12].includes(v) ? v : 8;
    })();

    return {
        showLatest: showLatest === undefined ? true : !!showLatest,
        showBest: showBest === undefined ? true : !!showBest,
        homepageCategories: rawIds.map(String),
        productsPerCategory: perCategory,
        settings,
        content,
    };
}
