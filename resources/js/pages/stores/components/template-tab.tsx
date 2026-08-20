import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import {
    LayoutTemplate,
    Palette,
    Pencil,
    Plus,
    Trash2,
    CheckCircle2,
    Loader2,
    Globe,
    ExternalLink,
    Megaphone,
    Film,
    ShoppingCart,
    FileText,
    Settings2,
    Lock,
    BadgePercent,
    Check,
    Smartphone,
    Monitor,
    X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import MediaPicker from '@/components/MediaPicker';
import { apiDelete, apiGet, apiPut } from '@/utils/api';
import { cn } from '@/lib/utils';
import { getTemplateConfig } from '@/templates/registry';

interface TemplateTabProps {
    store: any;
    availableThemes?: string[];
    storeContent?: any;
    demoStoreUrl?: string;
    initialAction?: 'theme' | 'editor' | null;
}

interface TemplateCapabilities {
    level: 'none' | 'limited' | 'full';
    colors: boolean;
    logo: boolean;
    banners: boolean;
    offers: boolean;
    hero: boolean;
    video: boolean;
    cart: boolean;
    pages: boolean;
    advanced: boolean;
    behavior: boolean;
}

type TabKey = 'variations' | 'colors' | 'logo' | 'hero' | 'banners' | 'video' | 'cart' | 'offers' | 'pages' | 'behavior';

const TEMPLATE_CATALOG: Record<string, { name: string; name_en: string; tier: 'free' | 'growth' | 'pro'; icon: string; accent: string }> = {
    'core-minimal': { name: 'أساسي', name_en: 'Core Minimal', tier: 'free', icon: '🌿', accent: '#10b77f' },
    'core-bold': { name: 'جريء', name_en: 'Core Bold', tier: 'free', icon: '🔥', accent: '#e11d48' },
    'core-sidebar': { name: 'شريط جانبي', name_en: 'Core Sidebar', tier: 'free', icon: '🗂️', accent: '#2563eb' },
    'core-dark': { name: 'داكن', name_en: 'Core Dark', tier: 'free', icon: '🌙', accent: '#6366f1' },
    'core-bazaar': { name: 'بازار', name_en: 'Core Bazaar', tier: 'free', icon: '🛒', accent: '#4CAF50' },
    'core-elegant': { name: 'راقي', name_en: 'Core Elegant', tier: 'free', icon: '✨', accent: '#a67c52' },
    'core-showcase': { name: 'عرض', name_en: 'Core Showcase', tier: 'free', icon: '🎬', accent: '#7c3aed' },
    'growth-electronics': { name: 'إلكترونيات', name_en: 'Electronics', tier: 'growth', icon: '📱', accent: '#0088ff' },
    'growth-fashion': { name: 'أزياء', name_en: 'Fashion', tier: 'growth', icon: '👗', accent: '#ec4899' },
    'growth-food': { name: 'مطعم', name_en: 'Food', tier: 'growth', icon: '🍔', accent: '#f59e0b' },
    'growth-cosmetics': { name: 'تجميل', name_en: 'Cosmetics', tier: 'growth', icon: '💄', accent: '#d946ef' },
    'growth-supermarket': { name: 'سوبر ماركت', name_en: 'Supermarket', tier: 'growth', icon: '🛒', accent: '#4CAF50' },
    'growth-home-decor': { name: 'ديكور منزلي', name_en: 'Home Decor', tier: 'growth', icon: '🛋️', accent: '#a16207' },
    'growth-pharmacy': { name: 'صيدلية', name_en: 'Pharmacy', tier: 'growth', icon: '💊', accent: '#14b8a6' },
    'pro-tech': { name: 'تقني', name_en: 'Pro Tech', tier: 'pro', icon: '💻', accent: '#4f46e5' },
    'pro-beauty': { name: 'جمال احترافي', name_en: 'Pro Beauty', tier: 'pro', icon: '🌸', accent: '#a855f7' },
    'pro-books': { name: 'كتب', name_en: 'Pro Books', tier: 'pro', icon: '📚', accent: '#f59e0b' },
    'pro-sport': { name: 'رياضة', name_en: 'Pro Sport', tier: 'pro', icon: '⚽', accent: '#22c55e' },
    'pro-pets': { name: 'حيوانات أليفة', name_en: 'Pro Pets', tier: 'pro', icon: '🐾', accent: '#f97316' },
    'pro-flowers': { name: 'زهور', name_en: 'Pro Flowers', tier: 'pro', icon: '💐', accent: '#f472b6' },
    'pro-coffee': { name: 'قهوة', name_en: 'Pro Coffee', tier: 'pro', icon: '☕', accent: '#78350f' },
    'pro-stationery': { name: 'قرطاسية', name_en: 'Pro Stationery', tier: 'pro', icon: '✏️', accent: '#0ea5e9' },
    'pro-spices': { name: 'توابل', name_en: 'Pro Spices', tier: 'pro', icon: '🌶️', accent: '#ca8a04' },
    'pro-clothing': { name: 'ملابس', name_en: 'Pro Clothing', tier: 'pro', icon: '🧥', accent: '#57534e' },
    'pro-fragrances': { name: 'عطور', name_en: 'Pro Fragrances', tier: 'pro', icon: '🧴', accent: '#c8923c' },
    'pro-home-tools': { name: 'أدوات منزلية', name_en: 'Pro Home Tools', tier: 'pro', icon: '🔧', accent: '#78716c' },
    'pro-kids': { name: 'أطفال', name_en: 'Pro Kids', tier: 'pro', icon: '🧸', accent: '#38bdf8' },
    'pro-sports': { name: 'رياضات', name_en: 'Pro Sports', tier: 'pro', icon: '🏅', accent: '#6366f1' },
    'pro-boutique': { name: 'بوتيك', name_en: 'Pro Boutique', tier: 'pro', icon: '💎', accent: '#b08d3f' },
    /* Dynamic Theme Engine niches (theme.config.json driven) */
    'market-fast': { name: 'سوق سريع', name_en: 'Market Fast', tier: 'growth', icon: '🛒', accent: '#16a34a' },
    'fashion-luxe': { name: 'أزياء فاخرة', name_en: 'Fashion Luxe', tier: 'growth', icon: '👗', accent: '#e11d48' },
    'fresh-produce': { name: 'خضار طازجة', name_en: 'Fresh Produce', tier: 'growth', icon: '🥬', accent: '#65a30d' },
};

type NicheCategoryId = 'all' | 'fashion' | 'grocery' | 'fresh' | 'food' | 'tech' | 'beauty';

/** Horizontal category filter bar items. */
const NICHE_FILTERS: { id: NicheCategoryId; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'fashion', label: 'أزياء وموضة' },
    { id: 'grocery', label: 'سوبر ماركت وبقالة' },
    { id: 'fresh', label: 'المنتجات الطازجة' },
    { id: 'food', label: 'مطاعم وكافيهات' },
    { id: 'tech', label: 'تقنية وإلكترونيات' },
    { id: 'beauty', label: 'جمال وعناية' },
];

/** Theme slug → niche category (falls back to 'all' for general templates). */
const TEMPLATE_CATEGORY: Record<string, NicheCategoryId> = {
    'core-minimal': 'all',
    'core-bold': 'all',
    'core-sidebar': 'all',
    'core-dark': 'all',
    'core-showcase': 'all',
    'core-bazaar': 'grocery',
    'core-elegant': 'fashion',
    'growth-electronics': 'tech',
    'growth-fashion': 'fashion',
    'growth-food': 'food',
    'growth-cosmetics': 'beauty',
    'growth-supermarket': 'grocery',
    'growth-home-decor': 'all',
    'growth-pharmacy': 'beauty',
    'pro-tech': 'tech',
    'pro-beauty': 'beauty',
    'pro-books': 'all',
    'pro-sport': 'all',
    'pro-pets': 'all',
    'pro-flowers': 'all',
    'pro-coffee': 'food',
    'pro-stationery': 'all',
    'pro-spices': 'grocery',
    'pro-clothing': 'fashion',
    'pro-fragrances': 'beauty',
    'pro-home-tools': 'all',
    'pro-kids': 'all',
    'pro-sports': 'all',
    'pro-boutique': 'fashion',
    'market-fast': 'grocery',
    'fashion-luxe': 'fashion',
    'fresh-produce': 'fresh',
};

const TIER_LABEL: Record<string, string> = {
    free: 'مجاني',
    growth: 'نمو',
    pro: 'احترافي',
};

const FREE_CATALOG = Object.entries(TEMPLATE_CATALOG)
    .filter(([, v]) => v.tier === 'free')
    .map(([k, v]) => ({ value: k, ...v }));
const GROWTH_CATALOG = Object.entries(TEMPLATE_CATALOG)
    .filter(([, v]) => v.tier !== 'pro')
    .map(([k, v]) => ({ value: k, ...v }));
const PRO_CATALOG = Object.entries(TEMPLATE_CATALOG).map(([k, v]) => ({ value: k, ...v }));

const DEFAULT_CONTENT: any = {
    announcement: { enabled: true, text: '', link: '' },
    banner: { enabled: false, title: '', subtitle: '', button_text: 'تسوّق الآن', button_link: '#template-products', image: '', background: '' },
    banners: [],
    hero: { enabled: true, title: '', subtitle: '', badge: '', image: '', video: '', button_text: 'تسوّق الآن', button_link: '#template-products' },
    video: { enabled: false, type: 'section', title: '', video_url: '', poster: '' },
    features: [],
    testimonials: [],
    faqs: [],
    trust_bar: { enabled: true },
    newsletter: { enabled: true },
};

const DEFAULT_BEHAVIOR: any = {
    enable_customer_login: true,
    enable_customer_registration: true,
    require_login_checkout: false,
    show_whatsapp_order_button: true,
    show_search: true,
    show_cart: true,
    show_auth_button: true,
};

export default function TemplateTab({ store, demoStoreUrl = '', initialAction = null }: TemplateTabProps) {
    const { t } = useTranslation();

    const [caps, setCaps] = useState<TemplateCapabilities>({
        level: 'none',
        colors: true,
        logo: true,
        banners: false,
        offers: false,
        hero: false,
        video: false,
        cart: false,
        pages: false,
        advanced: false,
        behavior: false,
    });
    const [availableThemes, setAvailableThemes] = useState<string[]>([]);
    const [theme, setTheme] = useState<string>('core-minimal');
    const [designTokens, setDesignTokens] = useState<any>({});
    const [themeConfig, setThemeConfig] = useState<any>(null);
    const [content, setContent] = useState<any>({ ...DEFAULT_CONTENT });
    const [behavior, setBehavior] = useState<any>({ ...DEFAULT_BEHAVIOR });
    const [offers, setOffers] = useState<any[]>([]);
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [activeTab, setActiveTab] = useState<TabKey>('variations');
    const [themeDialogOpen, setThemeDialogOpen] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState(theme);
    const [savingTheme, setSavingTheme] = useState(false);

    // Niche category filter + live preview modal state
    const [categoryFilter, setCategoryFilter] = useState<NicheCategoryId>('all');
    const [previewTheme, setPreviewTheme] = useState<string | null>(null);
    const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('desktop');

    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [upgradeFeature, setUpgradeFeature] = useState('');

    const [setupOpen, setSetupOpen] = useState(false);

    const loadAll = useCallback(() => {
        setLoading(true);
        apiGet(route('api.store-template.show', store.id))
            .then((res: any) => {
                const data = res?.data || res;
                const tmpl = data.template || {};
                setTheme(tmpl.theme || 'core-minimal');
                setSelectedTheme(tmpl.theme || 'core-minimal');
                setDesignTokens(tmpl.design_tokens || {});
                setThemeConfig(tmpl.theme_config || null);
                setContent({ ...DEFAULT_CONTENT, ...(tmpl.content || {}) });
                setBehavior({ ...DEFAULT_BEHAVIOR, ...(data.behavior || {}) });
                setCaps(data.capabilities || caps);
                setAvailableThemes(data.availableThemes || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [store.id]);

    const loadOffers = useCallback(() => {
        apiGet(route('api.store-offers.index', store.id))
            .then((res: any) => {
                const data = res?.data || res;
                setOffers(data.offers || []);
            })
            .catch(() => {});
    }, [store.id]);

    const loadPages = useCallback(() => {
        apiGet(route('api.store-pages.index', store.id))
            .then((res: any) => {
                const data = res?.data || res;
                setPages(data.pages || []);
            })
            .catch(() => {});
    }, [store.id]);

    useEffect(() => {
        loadAll();
        if (!initialAction) return;
        if (initialAction === 'theme') setThemeDialogOpen(true);
        if (initialAction === 'editor') setActiveTab('colors');
    }, [loadAll, initialAction]);

    const maybeUpgrade = (feature: string) => {
        setUpgradeFeature(feature);
        setUpgradeOpen(true);
        return true;
    };

    const saveState = (patch: any) => {
        if (saving) return Promise.reject('busy');
        setSaving(true);
        const payload: any = {};
        if (patch.theme !== undefined) payload.theme = patch.theme;
        if (patch.theme_config !== undefined) payload.theme_config = patch.theme_config;
        if (patch.design_tokens !== undefined) payload.design_tokens = patch.design_tokens;
        if (patch.content !== undefined) payload.content = patch.content;
        if (patch.behavior !== undefined) payload.behavior = patch.behavior;
        return apiPut(route('api.store-template.update', store.id), payload)
            .then(() => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            })
            .catch(() => {})
            .finally(() => setSaving(false));
    };

    const updateContent = (key: string, value: any) => {
        const next = { ...content, [key]: value };
        setContent(next);
        saveState({ content: next });
    };

    const updateBehavior = (key: string, value: boolean) => {
        const next = { ...behavior, [key]: value };
        setBehavior(next);
        saveState({ behavior: next });
    };

    const isPromotionalBannerEnabled = content?.banner?.enabled === true;

    /** Promo banner toggle: mirrors content.banner.enabled AND merges the
     *  boolean into theme_config.features.enable_banner so the engine
     *  storefront shows/paids the banner slider on the live subdomain. */
    const updatePromotionalBanner = (enabled: boolean) => {
        const nextContent = { ...content, banner: { ...content.banner, enabled } };
        const nextThemeConfig = {
            ...(themeConfig || {}),
            features: { ...((themeConfig as any)?.features || {}), enable_banner: enabled },
        };
        setContent(nextContent);
        setThemeConfig(nextThemeConfig);
        saveState({ content: nextContent, theme_config: nextThemeConfig });
    };

    const handleChooseTheme = () => {
        if (!selectedTheme || savingTheme) return;
        setSavingTheme(true);
        apiPut(route('stores.settings.theme', store.id), { theme: selectedTheme })
            .then(() => {
                setTheme(selectedTheme);
                setThemeDialogOpen(false);
                router.reload();
            })
            .catch(() => {})
            .finally(() => setSavingTheme(false));
    };

    const catalog = React.useMemo(() => {
        if (caps.level === 'full') return PRO_CATALOG;
        if (caps.level === 'limited') return GROWTH_CATALOG;
        return FREE_CATALOG;
    }, [caps.level]);

    const currentMeta = TEMPLATE_CATALOG[theme] || FREE_CATALOG[0];
    const selectedMeta = TEMPLATE_CATALOG[selectedTheme] || FREE_CATALOG[0];
    const currentTier = caps.level;
    const tierUnlocks: Record<string, string[]> = {
        none: ['colors', 'variations'],
        limited: ['colors', 'variations', 'banners', 'offers'],
        full: ['colors', 'variations', 'banners', 'offers', 'hero', 'video', 'cart', 'pages', 'behavior'],
    };
    const allowedTabs = tierUnlocks[currentTier];

    const tabs: { key: TabKey; label: string; icon: React.ReactNode; locked: boolean }[] = [
        { key: 'variations', label: 'القالب', icon: <LayoutTemplate className="h-4 w-4" />, locked: false },
        { key: 'colors', label: 'الألوان', icon: <Palette className="h-4 w-4" />, locked: false },
        { key: 'banners', label: 'البانرات', icon: <Megaphone className="h-4 w-4" />, locked: !caps.banners },
        { key: 'offers', label: 'العروض', icon: <BadgePercent className="h-4 w-4" />, locked: !caps.offers },
        { key: 'hero', label: 'واجهة الهيرو', icon: <Globe className="h-4 w-4" />, locked: !caps.hero },
        { key: 'video', label: 'الفيديو', icon: <Film className="h-4 w-4" />, locked: !caps.video },
        { key: 'cart', label: 'سلة المشتريات', icon: <ShoppingCart className="h-4 w-4" />, locked: !caps.cart },
        { key: 'pages', label: 'الصفحات', icon: <FileText className="h-4 w-4" />, locked: !caps.pages },
        { key: 'behavior', label: 'السلوك', icon: <Settings2 className="h-4 w-4" />, locked: !caps.behavior },
    ];

    const storeUrl = (() => {
        if (typeof window === 'undefined') return '';
        const slug = store?.slug;
        if (!slug) return '';
        const { protocol, hostname, port } = window.location;
        const parts = hostname.split('.');
        const base = parts.length >= 3 ? parts.slice(-2).join('.') : hostname;
        return `${protocol}//${slug}.${base}${port ? `:${port}` : ''}`;
    })();

    const previewUrlFor = (templateValue: string): string => {
        const base = demoStoreUrl || storeUrl;
        return base ? `${base}?theme=${encodeURIComponent(templateValue)}&preview=1` : '';
    };

    // Live preview iframe target — the demo store renders the theme override
    // without touching the merchant's live store.
    const previewBaseUrl = demoStoreUrl || 'https://demo.wusool.ps';
    const previewIframeUrl = (slug: string): string =>
        `${previewBaseUrl}?theme=${encodeURIComponent(slug)}&preview=1`;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">{t('Loading template editor...')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Current template summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LayoutTemplate className="h-4 w-4" />
                        {t('Store Template')}
                        {currentTier !== 'full' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                <Lock className="h-3 w-3" />
                                {t('Editor')}: {t(TIER_LABEL[caps.level === 'none' ? 'free' : 'growth'])}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
                        <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl text-white"
                            style={{ background: currentMeta?.accent || '#10b77f' }}
                        >
                            {currentMeta?.icon || '🛒'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold">{currentMeta?.name || t('Core Minimal')}</p>
                            <p className="text-sm text-muted-foreground">{currentMeta?.name_en}</p>
                            {storeUrl && (
                                <a
                                    href={storeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    {t('View your store')}
                                </a>
                            )}
                        </div>
                        {caps.level === 'full' && (
                            <Button type="button" variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
                                <Settings2 className="h-4 w-4 me-1.5" />
                                {t('Premium Setup')}
                            </Button>
                        )}
                    </div>

                    {/* Sub-tabs (tier gated) */}
                    <div className="flex flex-wrap gap-1.5">
                        {tabs.map((tab) => {
                            const active = activeTab === tab.key;
                            const locked = tab.locked;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => {
                                        if (locked) {
                                            maybeUpgrade(tab.label);
                                            return;
                                        }
                                        setActiveTab(tab.key);
                                        if (tab.key === 'offers') loadOffers();
                                        if (tab.key === 'pages') loadPages();
                                    }}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
                                        active ? 'bg-primary text-primary-foreground' : locked ? 'bg-muted text-muted-foreground' : 'bg-muted/60 hover:bg-muted',
                                    )}
                                >
                                    {tab.icon}
                                    {t(tab.label)}
                                    {locked && <Lock className="h-3 w-3" />}
                                </button>
                            );
                        })}
                    </div>

                    {saved && (
                        <span className="inline-flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            {t('Saved')}
                        </span>
                    )}
                </CardContent>
            </Card>

            {activeTab === 'variations' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            {t('Choose Template')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Niche category filter bar */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-200/80">
                            {NICHE_FILTERS.map((f) => {
                                const activeFilter = categoryFilter === f.id;
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setCategoryFilter(f.id)}
                                        className={
                                            activeFilter
                                                ? 'bg-emerald-600 text-white font-bold rounded-full px-4 py-1.5 text-xs shadow-md shadow-emerald-600/20 shrink-0'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold rounded-full px-4 py-1.5 text-xs transition-colors shrink-0'
                                        }
                                    >
                                        {f.label}
                                    </button>
                                );
                            })}
                        </div>

                        <p className="mb-4 text-sm text-muted-foreground">
                            {t('One core design system with 29 ready-made variations. Your plan unlocks a subset; premium templates include advanced sections (offers, video, multi-banner, cart & page controls).')}
                        </p>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {catalog.map((th) => {
                                const active = selectedTheme === th.value;
                                const locked = th.tier === 'growth' ? caps.level === 'none' : caps.level === 'none' || caps.level === 'limited';
                                const category = TEMPLATE_CATEGORY[th.value] || 'all';
                                const matchesFilter = categoryFilter === 'all' || category === categoryFilter;
                                if (!matchesFilter) return null;
                                return (
                                    <div
                                        key={th.value}
                                        onClick={() => setSelectedTheme(th.value)}
                                        className={cn(
                                            'cursor-pointer bg-white border border-slate-200/90 rounded-2xl p-3 hover:border-emerald-500/50 hover:shadow-xl transition-all duration-200 relative group flex flex-col justify-between',
                                            active && 'ring-2 ring-emerald-500 border-transparent shadow-xl bg-emerald-50/20 scale-[1.01] z-10',
                                        )}
                                    >
                                        {/* Rich gradient preview with real UI elements */}
                                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                                            <RichTemplateThumbnail slug={th.value} category={category} accent={th.accent} />
                                            {locked && (
                                                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/45 backdrop-blur-[1px]">
                                                    <span className="flex flex-col items-center gap-1 text-white">
                                                        <Lock className="h-6 w-6" />
                                                        <span className="text-[10px] font-semibold">{t('Premium')}</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Selected checkmark badge */}
                                        {active && (
                                            <span className="absolute top-5 right-5 bg-emerald-600 text-white p-1.5 rounded-full shadow-lg z-10">
                                                <Check className="h-4 w-4" />
                                            </span>
                                        )}

                                        <div className="mt-3 flex flex-1 flex-col">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-lg shrink-0">{th.icon}</span>
                                                    <span className="font-bold truncate text-sm">{th.name}</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                                        locked ? 'bg-slate-100 text-slate-500' : 'text-white',
                                                    )}
                                                    style={locked ? undefined : { background: th.accent }}
                                                >
                                                    {locked && <Lock className="h-2.5 w-2.5" />}
                                                    {TIER_LABEL[th.tier]}
                                                </span>
                                                {category !== 'all' && (
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                                        {NICHE_FILTERS.find((f) => f.id === category)?.label}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-3 flex items-center gap-2">
                                                {!locked ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewTheme(th.value);
                                                            setPreviewDevice('desktop');
                                                        }}
                                                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        {t('Preview')}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            maybeUpgrade(t('Premium template'));
                                                        }}
                                                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                                    >
                                                        <Lock className="h-3.5 w-3.5" />
                                                        {t('Upgrade to unlock')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Sticky bottom apply footer */}
                        <div className="sticky bottom-4 z-40 bg-white/90 backdrop-blur-md border border-slate-200/90 p-4 rounded-2xl shadow-2xl flex items-center justify-between mt-8">
                            <div className="min-w-0 pe-4">
                                <p className="text-xs font-medium text-slate-500">القالب المحدد</p>
                                <p className="truncate text-sm font-bold text-slate-900">
                                    {selectedMeta.name} - {selectedMeta.name_en}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleChooseTheme}
                                disabled={savingTheme || selectedTheme === theme}
                                className="inline-flex shrink-0 items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {savingTheme && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('Apply Template Now')}
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'colors' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            {t('Colors')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-sm text-muted-foreground">{t('Set your store brand colors. These apply across all sections of your template.')}</p>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {(['primary-500', 'primary-600', 'primary-700', 'background', 'surface', 'text-primary', 'text-muted'] as const).map((key) => (
                                <div key={key}>
                                    <Label className="text-xs">{key}</Label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={designTokens.colors?.[key] || '#ffffff'}
                                            onChange={(e) => {
                                                const next = {
                                                    ...designTokens,
                                                    colors: { ...(designTokens.colors || {}), [key]: e.target.value },
                                                };
                                                setDesignTokens(next);
                                                saveState({ design_tokens: next });
                                            }}
                                            className="h-9 w-9 cursor-pointer rounded-lg border"
                                        />
                                        <Input
                                            dir="ltr"
                                            value={designTokens.colors?.[key] || ''}
                                            onChange={(e) => {
                                                const next = {
                                                    ...designTokens,
                                                    colors: { ...(designTokens.colors || {}), [key]: e.target.value },
                                                };
                                                setDesignTokens(next);
                                                saveState({ design_tokens: next });
                                            }}
                                            className="font-mono"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'banners' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone className="h-4 w-4" />
                            {t('Banners')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TemplateSection title={t('Announcement Bar')}>
                            <div className="flex items-center justify-between">
                                <Label>{t('Enabled')}</Label>
                                <Switch checked={content?.announcement?.enabled !== false} onCheckedChange={(v) => updateContent('announcement', { ...content.announcement, enabled: v })} />
                            </div>
                            <div className="grid gap-3">
                                <div>
                                    <Label>{t('Message')}</Label>
                                    <Textarea rows={2} value={content?.announcement?.text || ''} onChange={(e) => updateContent('announcement', { ...content.announcement, text: e.target.value })} placeholder={t('🎉 شحن مجاني للطلبات فوق 200₪')} />
                                </div>
                                <div>
                                    <Label>{t('Link (optional)')}</Label>
                                    <Input dir="ltr" value={content?.announcement?.link || ''} onChange={(e) => updateContent('announcement', { ...content.announcement, link: e.target.value })} placeholder="https://..." />
                                </div>
                            </div>
                        </TemplateSection>

                        <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between">
                                <Label>{t('Promo Banner')}</Label>
                            </div>
                            <div className="grid gap-3">
                                <div className="flex items-center justify-between">
                                    <Label>{t('Enabled')}</Label>
                                    <Switch checked={isPromotionalBannerEnabled} onCheckedChange={updatePromotionalBanner} />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label>{t('Title')}</Label>
                                        <Input value={content?.banner?.title || ''} onChange={(e) => updateContent('banner', { ...content.banner, title: e.target.value })} />
                                    </div>
                                    <div>
                                        <Label>{t('Subtitle')}</Label>
                                        <Input value={content?.banner?.subtitle || ''} onChange={(e) => updateContent('banner', { ...content.banner, subtitle: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <Label>{t('Button Text')}</Label>
                                        <Input value={content?.banner?.button_text || ''} onChange={(e) => updateContent('banner', { ...content.banner, button_text: e.target.value })} />
                                    </div>
                                    <div>
                                        <Label>{t('Button Link')}</Label>
                                        <Input dir="ltr" value={content?.banner?.button_link || ''} onChange={(e) => updateContent('banner', { ...content.banner, button_link: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <MediaPicker label={t('Banner Image')} value={content?.banner?.image || ''} onChange={(v) => updateContent('banner', { ...content.banner, image: v })} placeholder={t('Select image...')} dragDrop />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <Label>{t('Banner Slides (carousel)')}</Label>
                            <BannerSlidesEditor slides={content?.banners || []} onChange={(slides) => updateContent('banners', slides)} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'offers' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BadgePercent className="h-4 w-4" />
                            {t('Offers')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <OffersEditor storeId={store.id} offers={offers} onChange={setOffers} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'hero' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            {t('Hero Section')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TemplateSection title={t('Hero')}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Title')}</Label>
                                    <Input value={content?.hero?.title || ''} onChange={(e) => updateContent('hero', { ...content.hero, title: e.target.value })} />
                                </div>
                                <div>
                                    <Label>{t('Badge')}</Label>
                                    <Input value={content?.hero?.badge || ''} onChange={(e) => updateContent('hero', { ...content.hero, badge: e.target.value })} placeholder="🎉 جديد" />
                                </div>
                            </div>
                            <div>
                                <Label>{t('Subtitle')}</Label>
                                <Textarea rows={2} value={content?.hero?.subtitle || ''} onChange={(e) => updateContent('hero', { ...content.hero, subtitle: e.target.value })} />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Button Text')}</Label>
                                    <Input value={content?.hero?.button_text || ''} onChange={(e) => updateContent('hero', { ...content.hero, button_text: e.target.value })} />
                                </div>
                                <div>
                                    <Label>{t('Button Link')}</Label>
                                    <Input dir="ltr" value={content?.hero?.button_link || ''} onChange={(e) => updateContent('hero', { ...content.hero, button_link: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <MediaPicker label={t('Hero Image')} value={content?.hero?.image || ''} onChange={(v) => updateContent('hero', { ...content.hero, image: v })} placeholder={t('Select image...')} dragDrop />
                            </div>
                        </TemplateSection>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'video' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Film className="h-4 w-4" />
                            {t('Video')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TemplateSection title={t('Video Section')}>
                            <div className="flex items-center justify-between">
                                <Label>{t('Enabled')}</Label>
                                <Switch checked={content?.video?.enabled === true} onCheckedChange={(v) => updateContent('video', { ...content.video, enabled: v })} />
                            </div>
                            <div>
                                <Label>{t('Title')}</Label>
                                <Input value={content?.video?.title || ''} onChange={(e) => updateContent('video', { ...content.video, title: e.target.value })} />
                            </div>
                            <div>
                                <Label>{t('Video URL (YouTube or direct mp4)')}</Label>
                                <Input dir="ltr" value={content?.video?.video_url || ''} onChange={(e) => updateContent('video', { ...content.video, video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
                            </div>
                            <div>
                                <MediaPicker label={t('Poster (optional)')} value={content?.video?.poster || ''} onChange={(v) => updateContent('video', { ...content.video, poster: v })} placeholder={t('Select image...')} dragDrop />
                            </div>
                        </TemplateSection>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'cart' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            {t('Cart & Checkout')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <TemplateSection title={t('Cart behavior')}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="flex items-center justify-between">
                                    <Label>{t('Show WhatsApp order button')}</Label>
                                    <Switch checked={behavior.show_whatsapp_order_button} onCheckedChange={(v) => updateBehavior('show_whatsapp_order_button', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>{t('Show search in header')}</Label>
                                    <Switch checked={behavior.show_search} onCheckedChange={(v) => updateBehavior('show_search', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>{t('Show cart button')}</Label>
                                    <Switch checked={behavior.show_cart} onCheckedChange={(v) => updateBehavior('show_cart', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>{t('Show account button')}</Label>
                                    <Switch checked={behavior.show_auth_button} onCheckedChange={(v) => updateBehavior('show_auth_button', v)} />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('Payment methods, WhatsApp ordering number, and delivery methods are configured in Settings → Payment Methods.')}
                            </p>
                        </TemplateSection>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'pages' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('Custom Pages')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PagesEditor storeId={store.id} pages={pages} onChange={setPages} storeSlug={store.slug} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'behavior' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            {t('Storefront Behavior')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <TemplateSection title={t('Customer accounts')}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>{t('Enable customer login')}</Label>
                                        <p className="text-xs text-muted-foreground">{t('Allow customers to log in to their account.')}</p>
                                    </div>
                                    <Switch checked={behavior.enable_customer_login} onCheckedChange={(v) => updateBehavior('enable_customer_login', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>{t('Enable registration')}</Label>
                                        <p className="text-xs text-muted-foreground">{t('Allow new customers to create an account.')}</p>
                                    </div>
                                    <Switch checked={behavior.enable_customer_registration} onCheckedChange={(v) => updateBehavior('enable_customer_registration', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>{t('Require login to checkout')}</Label>
                                        <p className="text-xs text-muted-foreground">{t('Customers must log in before completing an order. Guests can still browse.')}</p>
                                    </div>
                                    <Switch checked={behavior.require_login_checkout} onCheckedChange={(v) => updateBehavior('require_login_checkout', v)} />
                                </div>
                            </div>
                        </TemplateSection>
                    </CardContent>
                </Card>
            )}

            {/* Live preview iframe modal with device switcher */}
            <Dialog open={!!previewTheme} onOpenChange={(o) => !o && setPreviewTheme(null)}>
                <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
                    <DialogHeader className="border-b border-slate-200/80 p-4">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <ExternalLink className="h-4 w-4 text-emerald-600" />
                            {previewTheme ? TEMPLATE_CATALOG[previewTheme]?.name || previewTheme : ''}
                            <span className="text-xs font-medium text-slate-400">- معاينة تفاعلية مباشرة</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50 px-4 py-3">
                        <p className="text-xs text-slate-500">يُعرض القالب على المتجر التجريبي دون التأثير على متجرك</p>
                        <div className="flex items-center gap-1 rounded-full bg-slate-200/70 p-1">
                            <button
                                type="button"
                                onClick={() => setPreviewDevice('mobile')}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors',
                                    previewDevice === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                                )}
                            >
                                <Smartphone className="h-3.5 w-3.5" />
                                {t('Mobile View')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewDevice('desktop')}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors',
                                    previewDevice === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                                )}
                            >
                                <Monitor className="h-3.5 w-3.5" />
                                {t('Desktop View')}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-start justify-center overflow-hidden bg-slate-100 p-4 sm:p-6" style={{ minHeight: '62vh' }}>
                        {previewTheme &&
                            (previewDevice === 'mobile' ? (
                                <div className="w-[350px] max-w-full overflow-hidden rounded-[2rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl">
                                    <iframe
                                        src={previewIframeUrl(previewTheme)}
                                        title={TEMPLATE_CATALOG[previewTheme]?.name || previewTheme}
                                        className="h-[620px] w-full bg-white"
                                    />
                                </div>
                            ) : (
                                <div className="w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl">
                                    <iframe
                                        src={previewIframeUrl(previewTheme)}
                                        title={TEMPLATE_CATALOG[previewTheme]?.name || previewTheme}
                                        className="h-[72vh] w-full bg-white"
                                    />
                                </div>
                            ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-200/80 px-4 py-3">
                        <Button type="button" variant="outline" onClick={() => setPreviewTheme(null)}>
                            <X className="h-4 w-4 me-1.5" />
                            {t('Close')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Upgrade modal */}
            <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t('Upgrade Required')}
                        </DialogTitle>
                        <DialogDescription>
                            {t(':feature requires a higher plan.', { feature: upgradeFeature })} {t('Upgrade to access this template feature.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setUpgradeOpen(false)}>
                            {t('Close')}
                        </Button>
                        <Button type="button" onClick={() => router.visit(route('plans.index'))}>
                            {t('Upgrade Plan')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Premium setup checklist */}
            <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            {t('Premium Template Setup')}
                        </DialogTitle>
                        <DialogDescription>{t('Your premium template is wired to your existing settings. Complete the checklist below to get the most out of it.')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2.5">
                        <SetupCheck title={t('Payment Methods')} desc={t('Enable Stripe, PayPal, Razorpay, COD, WhatsApp ordering and more.')} href={route('settings')} onClick={() => router.visit(route('settings'))} />
                        <SetupCheck title={t('SMS / WhatsApp Notifications')} desc={t('Configure Twilio or HotSMS and order notification templates.')} href={route('settings')} onClick={() => router.visit(route('settings'))} />
                        <SetupCheck title={t('Cloud Storage')} desc={t('Store product images on local, S3 or Wasabi storage.')} href={route('settings')} onClick={() => router.visit(route('settings'))} />
                        <SetupCheck title={t('Store Behavior')} desc={t('Control login, registration, require-login checkout and button visibility.')} href="#" onClick={() => { setSetupOpen(false); setActiveTab('behavior'); }} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSetupOpen(false)}>
                            {t('Close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ------------------------------ Helpers ------------------------------ */

function RichTemplateThumbnail({ slug, category = 'all', accent }: { slug: string; category?: NicheCategoryId; accent: string }) {
    const cfg = getTemplateConfig(slug);
    const colors = cfg?.design_tokens?.colors ?? {};
    const primary = colors['primary-600'] || accent;
    const deep = shadeHex(primary, -24);
    const light = shadeHex(primary, 16);

    return (
        <div
            className="relative flex h-full w-full flex-col overflow-hidden"
            style={{ background: `linear-gradient(155deg, ${light} 0%, ${primary} 45%, ${deep} 100%)` }}
        >
            <DotPattern />

            {/* Header chrome */}
            <div
                className="relative flex items-center justify-between px-2.5 py-1.5"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(3px)', borderBottom: '1px solid rgba(255,255,255,0.18)' }}
            >
                <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    <span className="h-1.5 w-14 rounded-full bg-white/85" />
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-5 rounded-full bg-white/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/70" />
                </div>
            </div>

            {/* Hero band */}
            <div className="relative px-2.5 pt-2">
                <div className="h-1.5 w-16 rounded-full bg-white/95" />
                <div className="mt-1 h-1 w-28 rounded-full bg-white/45" />
                <div className="mt-1.5 inline-flex rounded-full bg-white px-2 py-0.5 text-[6px] font-black" style={{ color: primary }}>
                    تسوّق الآن
                </div>
            </div>

            {/* Category-specific detail strip */}
            <div className="relative mt-1.5 flex items-center justify-center gap-1 px-2.5">
                {category === 'fashion' && (
                    <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">
                        {['#e11d48', '#f59e0b', '#0ea5e9', '#0f172a'].map((c) => (
                            <span key={c} className="h-2 w-2 rounded-full" style={{ background: c, boxShadow: '0 0 0 1px rgba(255,255,255,0.6)' }} />
                        ))}
                        <span className="text-[5px] font-bold text-white/90">مقاس M · عنابي</span>
                    </div>
                )}
                {category === 'grocery' && (
                    <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[6px] font-black text-white backdrop-blur-sm">
                        <span className="rounded-full bg-white/20 px-1">₪8.50</span>
                        <span className="rounded-full bg-white px-1" style={{ color: primary }}>أضف +</span>
                    </div>
                )}
                {category === 'fresh' && (
                    <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[6px] font-black text-white backdrop-blur-sm">
                        <span>كجم</span>
                        <span className="rounded-full bg-white px-1" style={{ color: primary }}>1.5</span>
                        <span>جم</span>
                    </div>
                )}
                {category === 'food' && (
                    <div className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">
                        {['🍔', '☕', '🍕'].map((e, i) => <span key={i}>{e}</span>)}
                        <span className="text-[5px] font-bold text-white/90">توصيل 30 دقيقة</span>
                    </div>
                )}
                {category === 'tech' && (
                    <div className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">
                        {['📱', '💻', '🎧'].map((e, i) => <span key={i}>{e}</span>)}
                        <span className="text-[5px] font-bold text-white/90">خصم 25%</span>
                    </div>
                )}
                {category === 'beauty' && (
                    <div className="rounded-full bg-white px-2 py-0.5 text-[6px] font-black" style={{ color: primary }}>
                        ✨ عروض التجميل — حتى 40%
                    </div>
                )}
                {category === 'all' && (
                    <div className="flex items-center gap-1.5">
                        {[0, 1, 2, 3].map((n) => (
                            <span key={n} className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.8)' }} />
                        ))}
                    </div>
                )}
            </div>

            {/* Product mini-grid */}
            <div className="relative mt-2 grid flex-1 grid-cols-3 gap-1 px-2 pb-2">
                <ThumbProductCard img={`linear-gradient(135deg, ${primary}, ${deep})`} primary={primary} />
                <ThumbProductCard img={`linear-gradient(135deg, ${deep}, ${primary})`} primary={primary} />
                <ThumbProductCard img="linear-gradient(135deg, #cbd5e1, #94a3b8)" primary={primary} />
            </div>

            {/* Signature category footer UI */}
            <div className="relative px-2 pb-2">
                {category === 'grocery' || category === 'fresh' ? (
                    <div className="flex items-center justify-between rounded-lg bg-white/95 px-2 py-1 shadow-sm">
                        <span className="text-[6px] font-black" style={{ color: primary }}>الإجمالي 42.50 ₪</span>
                        <span className="rounded-md px-1.5 py-0.5 text-[6px] font-black text-white" style={{ background: primary }}>إتمام الطلب</span>
                    </div>
                ) : category === 'fashion' ? (
                    <div className="flex items-center justify-between gap-1 rounded-lg bg-white/95 px-2 py-1 shadow-sm">
                        <div className="h-1 w-1/2 rounded-full bg-emerald-100">
                            <div className="h-1 w-4/5 rounded-full bg-emerald-500" />
                        </div>
                        <span className="text-[5px] font-bold text-slate-600">شحن مجاني</span>
                    </div>
                ) : category === 'food' ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-lg bg-white/95 px-2 py-1 shadow-sm">
                        {['جديد', 'الأكثر مبيعاً', 'عرض'].map((b, i) => (
                            <span key={b} className="rounded-full px-1.5 py-0.5 text-[5px] font-black text-white" style={{ background: [primary, '#f59e0b', deep][i] }}>
                                {b}
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-between rounded-lg bg-white/95 px-2 py-1 shadow-sm">
                        <span className="text-[5px] font-bold text-slate-600">منتجات مختارة لك</span>
                        <span className="rounded-md px-1.5 py-0.5 text-[5px] font-black text-white" style={{ background: primary }}>تصفح</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Dot-pattern overlay used by every rich thumbnail. */
function DotPattern() {
    return (
        <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.14]"
            style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '12px 12px' }}
        />
    );
}

/** Compact gradient product card for the thumbnail mockups. */
function ThumbProductCard({ img, primary }: { img: string; primary: string }) {
    return (
        <div className="flex-1 rounded-lg bg-white/95 p-1 shadow-sm">
            <div className="h-8 w-full rounded-md" style={{ background: img }} />
            <div className="mt-1 h-1 w-full rounded-full bg-slate-300/80" />
            <div className="mt-0.5 h-1 w-1/2 rounded-full" style={{ background: primary }} />
        </div>
    );
}

/** Darken or lighten a hex color by a percentage (-100..100). */
function shadeHex(hex: string, percent: number): string {
    const value = hex.replace('#', '');
    const isShort = value.length === 3 || value.length === 4;
    const full = (isShort ? value.split('').map((c) => c + c).join('') : value).slice(0, 6);
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return '#059669';
    const amt = Math.round(2.55 * percent);
    const channel = (c: number) => Math.min(255, Math.max(0, c + amt));
    const r = channel((num >> 16) & 0xff);
    const g = channel((num >> 8) & 0xff);
    const b = channel(num & 0xff);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function TemplateSection({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{title}</span>
                    {badge && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{badge}</span>}
                </div>
            </div>
            <div className="space-y-3 p-4">{children}</div>
        </div>
    );
}

function SetupCheck({ title, desc, href, onClick, fallbackTitle }: { title: string; desc: string; href?: string; onClick?: () => void; fallbackTitle?: string }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={onClick || (() => (window.location.href = href || '#'))}>
                {t('Open')}
            </Button>
        </div>
    );
}

function BannerSlidesEditor({ slides, onChange }: { slides: any[]; onChange: (items: any[]) => void }) {
    const { t } = useTranslation();
    const update = (i: number, key: string, value: any) => onChange(slides.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
    const remove = (i: number) => onChange(slides.filter((_, idx) => idx !== i));
    const add = () => onChange([...(slides || []), { title: '', subtitle: '', button_text: 'تسوّق الآن', button_link: '#template-products', image: '' }]);

    return (
        <div className="space-y-3">
            {slides.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    <p>{t('No banner slides configured')}</p>
                    <Button type="button" variant="outline" size="sm" onClick={add}>
                        <Plus className="h-3.5 w-3.5 me-1.5" />
                        {t('Add Slide')}
                    </Button>
                </div>
            )}
            {slides.map((slide, i) => (
                <div key={i} className="space-y-2 rounded-lg border bg-muted/10 p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">
                            {t('Slide')} {i + 1}
                        </span>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => remove(i)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('Remove')}</TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                            <Label className="text-xs">{t('Title')}</Label>
                            <Input value={slide.title || ''} onChange={(e) => update(i, 'title', e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs">{t('Subtitle')}</Label>
                            <Input value={slide.subtitle || ''} onChange={(e) => update(i, 'subtitle', e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs">{t('Button Text')}</Label>
                            <Input value={slide.button_text || ''} onChange={(e) => update(i, 'button_text', e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs">{t('Button Link')}</Label>
                            <Input dir="ltr" value={slide.button_link || ''} onChange={(e) => update(i, 'button_link', e.target.value)} />
                        </div>
                    </div>
                    <MediaPicker label={t('Slide Image')} value={slide.image || ''} onChange={(v) => update(i, 'image', v)} placeholder={t('Select image...')} dragDrop />
                </div>
            ))}
            {slides.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={add}>
                    <Plus className="h-3.5 w-3.5 me-1.5" />
                    {t('Add Slide')}
                </Button>
            )}
        </div>
    );
}

function OffersEditor({ storeId, offers, onChange }: { storeId: number; offers: any[]; onChange: (items: any[]) => void }) {
    const { t } = useTranslation();
    const [savingIdx, setSavingIdx] = useState<number | null>(null);

    const update = (i: number, key: string, value: any) => {
        const next = offers.map((o, idx) => (idx === i ? { ...o, [key]: value } : o));
        onChange(next);
    };

    const save = (i: number) => {
        const offer = offers[i];
        setSavingIdx(i);
        if (offer.id) {
            apiPut(route('api.store-offers.update', [storeId, offer.id]), offer).finally(() => setSavingIdx(null));
        } else {
            const { id, ...payload } = offer;
            apiPut(route('api.store-offers.store', storeId), payload).finally(() => setSavingIdx(null));
        }
    };

    const remove = (i: number) => {
        const offer = offers[i];
        if (offer.id) {
            apiDelete(route('api.store-offers.destroy', [storeId, offer.id]))
                .then(() => onChange(offers.filter((_, idx) => idx !== i)))
                .catch(() => {});
        } else {
            onChange(offers.filter((_, idx) => idx !== i));
        }
    };

    const add = () => onChange([...(offers || []), { title: '', subtitle: '', image: '', product_id: null, link: '', discount_percent: null, is_active: true }]);

    return (
        <div className="space-y-3">
            {offers.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    <p>{t('No offers configured — add promo cards or product-discount offers.')}</p>
                    <Button type="button" variant="outline" size="sm" onClick={add}>
                        <Plus className="h-3.5 w-3.5 me-1.5" />
                        {t('Add Offer')}
                    </Button>
                </div>
            )}
            {offers.map((offer, i) => (
                <div key={i} className="space-y-2.5 rounded-lg border bg-muted/10 p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                                {t('Offer')} {i + 1}
                            </span>
                            <Switch checked={offer.is_active !== false} onCheckedChange={(v) => update(i, 'is_active', v)} />
                        </div>
                        <div className="flex items-center gap-1">
                            <Button type="button" size="sm" variant="outline" onClick={() => save(i)} disabled={savingIdx === i}>
                                {savingIdx === i && <Loader2 className="h-3.5 w-3.5 animate-spin me-1" />}
                                {t('Save')}
                            </Button>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => remove(i)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Remove')}</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                            <Label className="text-xs">{t('Title')}</Label>
                            <Input value={offer.title || ''} onChange={(e) => update(i, 'title', e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs">{t('Subtitle')}</Label>
                            <Input value={offer.subtitle || ''} onChange={(e) => update(i, 'subtitle', e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs">{t('Discount % (optional)')}</Label>
                            <Input type="number" min={0} max={100} value={offer.discount_percent ?? ''} onChange={(e) => update(i, 'discount_percent', e.target.value === '' ? null : Number(e.target.value))} />
                        </div>
                        <div>
                            <Label className="text-xs">{t('Link')}</Label>
                            <Input dir="ltr" value={offer.link || ''} onChange={(e) => update(i, 'link', e.target.value)} placeholder="#template-products" />
                        </div>
                    </div>
                    <MediaPicker label={t('Offer Image')} value={offer.image || ''} onChange={(v) => update(i, 'image', v)} placeholder={t('Select image...')} dragDrop />
                </div>
            ))}
            {offers.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={add}>
                    <Plus className="h-3.5 w-3.5 me-1.5" />
                    {t('Add Offer')}
                </Button>
            )}
        </div>
    );
}

function PagesEditor({ storeId, pages, onChange, storeSlug }: { storeId: number; pages: any[]; onChange: (items: any[]) => void; storeSlug: string }) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState<any | null>(null);

    const save = () => {
        if (!editing?.title) return;
        if (editing.id) {
            apiPut(route('api.store-pages.update', [storeId, editing.id]), editing)
                .then(() => {
                    onChange(pages.map((p) => (p.id === editing.id ? editing : p)));
                    setEditing(null);
                })
                .catch(() => {});
        } else {
            apiPut(route('api.store-pages.store', storeId), editing)
                .then(() => {
                    onChange([...pages, { ...editing, id: Date.now() }]);
                    setEditing(null);
                })
                .catch(() => {});
        }
    };

    const remove = (p: any) => {
        if (!p.id) return;
        apiDelete(route('api.store-pages.destroy', [storeId, p.id]))
            .then(() => onChange(pages.filter((x) => x.id !== p.id)))
            .catch(() => {});
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{t('Create simple pages (about, contact, policies…) that appear in your store header and can be linked from banners/offers.')}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing({ title: '', slug: '', content: '', image: '', is_active: true })}>
                    <Plus className="h-3.5 w-3.5 me-1.5" />
                    {t('New Page')}
                </Button>
            </div>

            {pages.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/10 p-3">
                    <div className="min-w-0">
                        <p className="font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">
                            /page/{p.slug}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditing({ ...p })}>
                            <Pencil className="h-3.5 w-3.5 me-1" />
                            {t('Edit')}
                        </Button>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => remove(p)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('Remove')}</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            ))}

            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t(editing?.id ? 'Edit Page' : 'New Page')}</DialogTitle>
                    </DialogHeader>
                    {editing && (
                        <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <Label>{t('Title')}</Label>
                                    <Input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                                </div>
                                <div>
                                    <Label>{t('Slug')}</Label>
                                    <Input dir="ltr" value={editing.slug || ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="about-us" />
                                </div>
                            </div>
                            <div>
                                <Label>{t('Content (HTML)')}</Label>
                                <Textarea rows={8} value={editing.content || ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder={'<p>اكتب محتوى الصفحة هنا...</p>'} />
                            </div>
                            <MediaPicker label={t('Page Image (optional)')} value={editing.image || ''} onChange={(v) => setEditing({ ...editing, image: v })} placeholder={t('Select image...')} dragDrop />
                            <div className="flex items-center justify-between">
                                <Label>{t('Active')}</Label>
                                <Switch checked={editing.is_active !== false} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={save}>
                            {t('Save Page')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}