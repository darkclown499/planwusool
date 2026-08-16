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

interface TemplateTabProps {
    store: any;
    availableThemes?: string[];
    storeContent?: any;
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

export default function TemplateTab({ store, initialAction = null }: TemplateTabProps) {
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
                        <p className="mb-4 text-sm text-muted-foreground">
                            {t('One core design system with 29 ready-made variations. Your plan unlocks a subset; premium templates include advanced sections (offers, video, multi-banner, cart & page controls).')}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {catalog.map((th) => {
                                const active = selectedTheme === th.value;
                                const locked = th.tier === 'growth' ? caps.level === 'none' : caps.level === 'none' || caps.level === 'limited';
                                return (
                                    <button
                                        key={th.value}
                                        type="button"
                                        onClick={() => {
                                            if (locked) {
                                                maybeUpgrade(t('Premium template'));
                                                return;
                                            }
                                            setSelectedTheme(th.value);
                                        }}
                                        className={cn(
                                            'rounded-xl border-2 p-4 text-start transition',
                                            active ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:border-gray-300',
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{th.icon}</span>
                                                <span className="font-semibold">{th.name}</span>
                                            </div>
                                            {active && <CheckCircle2 className="h-5 w-5 text-primary" />}
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">{th.name_en}</p>
                                        <span
                                            className={cn(
                                                'mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                                                locked ? 'bg-muted text-muted-foreground' : 'text-white',
                                            )}
                                            style={locked ? undefined : { background: th.accent }}
                                        >
                                            {locked && <Lock className="h-3 w-3" />}
                                            {TIER_LABEL[th.tier]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-5 flex items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setSelectedTheme(theme)}>
                                {t('Reset')}
                            </Button>
                            <Button type="button" onClick={handleChooseTheme} disabled={savingTheme || selectedTheme === theme}>
                                {savingTheme && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                                {t('Apply Template')}
                            </Button>
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
                                    <Switch checked={content?.banner?.enabled === true} onCheckedChange={(v) => updateContent('banner', { ...content.banner, enabled: v })} />
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