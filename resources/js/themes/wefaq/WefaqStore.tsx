import { useStorefrontCore } from '@/templates/storefront';
import { toast } from '@/components/custom-toast';
import { WefaqCategorySidebar } from '@/themes/wefaq/components/WefaqCategorySidebar';
import { WefaqFooter } from '@/themes/wefaq/components/WefaqFooter';
import { WefaqHeader } from '@/themes/wefaq/components/WefaqHeader';
import { WefaqHero } from '@/themes/wefaq/components/WefaqHero';
import { WefaqProductSection } from '@/themes/wefaq/components/WefaqProductSection';
import { WefaqRecipeBanner } from '@/themes/wefaq/components/WefaqRecipeBanner';
import { storeIdentity } from '@/templates/pages/types';
import type { DesignTokens, TemplateConfig } from '@/templates/types';
import React, { useCallback, useMemo, useState } from 'react';
import { WEFAQ_BRAND, WEFAQ_CATEGORIES, WEFAQ_PRODUCTS, WEFAQ_RECIPE_ITEMS, WEFAQ_SECTIONS } from './mockData';

interface WefaqStoreProps {
    template?: TemplateConfig | null;
    storeData?: any;
    designTokens?: DesignTokens | null;
    isPreview?: boolean;
}

const FRUIT_KEYWORDS = ['فراولة', 'موز', 'تفاح', 'برتقال', 'عنب', 'خوخ', 'مانجو', 'بطيخ', 'أناناس', 'مشمش', 'دراق', 'فواكه'];

function pickFruits(products: any[]): any[] {
    const fruits = products.filter((p) => FRUIT_KEYWORDS.some((k) => String(p.name || '').includes(k)));
    if (fruits.length >= 3) return fruits.slice(0, 3);
    return products.slice(0, 3);
}

function buildSectionItems(tag: string, all: any[], categoryId: string): any[] {
    let pool = categoryId === 'all' ? all : all.filter((p) => String(p.categoryId) === String(categoryId));

    const tagged = pool.filter((p) => p.tags?.includes(tag));
    let items: any[];

    if (tagged.length) {
        items = tagged;
    } else if (tag === 'deal') {
        items = pool.filter((p) => Number(p.originalPrice || p.sale_price || 0) > Number(p.price || 0));
        if (!items.length) items = pool.slice(0, 10);
    } else if (tag === 'new') {
        items = pool.slice(0, 10);
    } else if (tag === 'organic') {
        items = pool.slice(Math.min(2, pool.length), 12);
        if (!items.length) items = pool.slice(0, 10);
    } else if (tag === 'bestSeller') {
        items = pool.slice(-10).reverse();
        if (!items.length) items = pool.slice(0, 10);
    } else {
        items = [...pool].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)).slice(0, 10);
    }

    return items.slice(0, 10);
}

export const WefaqStore: React.FC<WefaqStoreProps> = ({ storeData, isPreview = false }) => {
    const { cart, config: ctxConfig, product: productCtx, wishlist } = useStorefrontCore();
    const [activeCategory, setActiveCategory] = useState('all');
    const [recipeAdded, setRecipeAdded] = useState(false);

    const cfg = ctxConfig && Object.keys(ctxConfig).length ? ctxConfig : storeData?.config || {};

    const liveProducts = useMemo(() => {
        const list = productCtx?.filteredProducts?.length ? productCtx.filteredProducts : storeData?.products;
        return Array.isArray(list) ? list : [];
    }, [productCtx?.filteredProducts, storeData?.products]);

    const liveCategories = useMemo(() => {
        const list = productCtx?.categories?.length ? productCtx.categories : storeData?.categories;
        return Array.isArray(list) ? list : [];
    }, [productCtx?.categories, storeData?.categories]);

    const hasRealData = liveProducts.length > 0;
    const previewMode = isPreview || !hasRealData;

    const categories = hasRealData ? liveCategories : WEFAQ_CATEGORIES;
    const products = hasRealData ? liveProducts : WEFAQ_PRODUCTS;

    const identity = storeIdentity(cfg, storeData);
    const brandName = identity.name || WEFAQ_BRAND.name;
    const brandSub = WEFAQ_BRAND.sub;
    const phone = identity.phone || '+970 599 123 456';

    const cartCount = cart.cartItems?.length || 0;
    const wishlistCount = wishlist?.count || 0;

    const counts = useMemo(() => {
        const acc: Record<string, number> = {};
        products.forEach((p) => {
            const id = String(p.categoryId);
            acc[id] = (acc[id] || 0) + 1;
        });
        return acc;
    }, [products]);

    const recipeItems = useMemo(() => {
        if (!hasRealData) {
            return WEFAQ_PRODUCTS.filter((p) => WEFAQ_RECIPE_ITEMS.includes(p.id));
        }
        return pickFruits(products);
    }, [hasRealData, products]);

    const addRecipeToCart = useCallback(() => {
        recipeItems.forEach((p) => cart.addToCart(p));
        setRecipeAdded(true);
        toast.success('تمت إضافة مكونات السلطة إلى السلة!');
    }, [recipeItems, cart]);

    const scrollToProducts = useCallback(() => {
        document.getElementById('wefaq-deal')?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const sections = useMemo(() => {
        return WEFAQ_SECTIONS.map((section) => ({
            ...section,
            items: buildSectionItems(section.tag, products, activeCategory),
        }));
    }, [products, activeCategory]);

    return (
        <div className="min-h-screen bg-[#F5F6F8] text-gray-900" style={{ fontFamily: 'Tajawal, Cairo, system-ui, sans-serif' }}>
            <WefaqHeader
                brandName={brandName}
                brandSub={brandSub}
                cartCount={cartCount}
                wishlistCount={wishlistCount}
                isPreview={previewMode}
            />

            <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-5">
                <WefaqHero brandName={brandName} onShopNow={scrollToProducts} />

                <WefaqRecipeBanner onAddRecipe={addRecipeToCart} added={recipeAdded} />

                <div className="flex flex-col gap-6 lg:flex-row">
                    <div className="shrink-0 lg:w-64">
                        <div className="lg:sticky lg:top-32">
                            <WefaqCategorySidebar
                                categories={categories}
                                activeId={activeCategory}
                                counts={counts}
                                onSelect={setActiveCategory}
                            />
                        </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-8">
                        {sections.map((section) => (
                            <WefaqProductSection
                                key={section.id}
                                id={section.id}
                                title={section.title}
                                products={section.items}
                            />
                        ))}
                        {!sections.some((s) => s.items.length > 0) && (
                            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                                <p className="text-lg font-bold text-gray-700">لا توجد منتجات في هذا القسم حالياً</p>
                                <p className="mt-1 text-sm text-gray-500">جرب تصفح قسم آخر.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <WefaqFooter brandName={brandName} brandSub={brandSub} phone={phone} />
        </div>
    );
};

export default WefaqStore;
