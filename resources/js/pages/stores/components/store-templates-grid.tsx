import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Eye, LayoutGrid, Loader2, Monitor, Smartphone, Paintbrush, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { apiPut } from '@/utils/api';
import { listTemplateModules, type TemplateModule } from '@/templates-v2/registry';

interface Props {
    store: any;
    activeTheme: string;
    availableThemes?: string[];
    onApplied?: (slug: string) => void;
    withFilter?: boolean;
}

// Distinct visual mocks per template — each reflects the real layout direction
function TemplateVisualPreview({ slug, preview }: { slug: string; preview: string }) {
    const base = 'absolute inset-0';
    if (slug === 'fashion-atelier') {
        // Minimal header, large editorial hero, 2-col large photography
        return (
            <>
                <span className={base} style={{ background: preview }} />
                <span className="absolute inset-0 flex flex-col">
                    <span className="flex h-8 items-center justify-between px-4">
                        <span className="h-2 w-6 rounded-full bg-black/15" />
                        <span className="h-2 w-16 rounded-full bg-black/10" />
                        <span className="h-5 w-5 rounded-full bg-black/10" />
                    </span>
                    <span className="mx-3 mt-1 h-28 rounded-xl bg-white/80 shadow-sm flex items-end p-3">
                        <span className="space-y-1">
                            <span className="block h-2 w-20 rounded-full bg-black/10" />
                            <span className="block h-1.5 w-28 rounded-full bg-black/8" />
                            <span className="block h-6 w-16 rounded-full bg-black/80 mt-1" />
                        </span>
                    </span>
                    <span className="mx-3 mt-2 grid grid-cols-2 gap-2 flex-1">
                        {[...Array(4)].map((_, i) => (
                            <span key={i} className="rounded-xl bg-white/90 shadow-sm flex flex-col overflow-hidden">
                                <span className="flex-1 bg-black/[0.04]" />
                                <span className="h-6 p-1.5 space-y-1">
                                    <span className="block h-1.5 w-3/4 rounded-full bg-black/10" />
                                    <span className="block h-1 w-1/2 rounded-full bg-black/8" />
                                </span>
                            </span>
                        ))}
                    </span>
                </span>
            </>
        );
    }
    if (slug === 'grocery-souq') {
        // Yellow search header, pill categories, dense grid with prominent price
        return (
            <>
                <span className={base} style={{ background: preview }} />
                <span className="absolute inset-0 flex flex-col">
                    <span className="flex h-10 items-center gap-2 px-3">
                        <span className="h-7 flex-1 rounded-full bg-white shadow-sm flex items-center px-2 gap-1">
                            <span className="h-3 w-3 rounded-full bg-black/10" />
                            <span className="h-1.5 w-16 rounded-full bg-black/8" />
                        </span>
                        <span className="h-7 w-7 rounded-full bg-black/10" />
                    </span>
                    <span className="mx-3 flex gap-1.5 overflow-hidden">
                        {[...Array(5)].map((_, i) => (
                            <span key={i} className={`h-6 rounded-full px-2 flex items-center ${i === 0 ? 'bg-black text-white' : 'bg-white/80'}`}>
                                <span className={`h-1.5 rounded-full ${i === 0 ? 'w-8 bg-white' : 'w-8 bg-black/10'}`} />
                            </span>
                        ))}
                    </span>
                    <span className="mx-3 mt-2 grid grid-cols-3 gap-2 flex-1">
                        {[...Array(6)].map((_, i) => (
                            <span key={i} className="rounded-xl bg-white shadow-sm flex flex-col p-1">
                                <span className="aspect-square rounded-lg bg-black/[0.04] mb-1" />
                                <span className="h-1 w-full rounded-full bg-black/10" />
                                <span className="h-1.5 w-2/3 rounded-full bg-amber-500/80 mt-1" />
                            </span>
                        ))}
                    </span>
                </span>
            </>
        );
    }
    if (slug === 'restaurant-menu') {
        // Dark header, large food hero, menu list
        return (
            <>
                <span className={base} style={{ background: preview }} />
                <span className="absolute inset-0 flex flex-col">
                    <span className="flex h-8 items-center justify-between px-4">
                        <span className="h-2 w-12 rounded-full bg-white/20" />
                        <span className="h-6 w-6 rounded-full bg-white/15" />
                    </span>
                    <span className="mx-3 h-24 rounded-xl bg-black/20 backdrop-blur flex items-center gap-3 p-3">
                        <span className="h-16 w-16 rounded-xl bg-white/90 flex-shrink-0" />
                        <span className="space-y-1.5 flex-1">
                            <span className="block h-2 w-16 rounded-full bg-white" />
                            <span className="block h-1.5 w-full rounded-full bg-white/60" />
                            <span className="block h-5 w-14 rounded-full bg-amber-400" />
                        </span>
                    </span>
                    <span className="mx-3 mt-2 space-y-2 flex-1">
                        {[...Array(3)].map((_, i) => (
                            <span key={i} className="flex gap-2 rounded-xl bg-white/90 p-2 shadow-sm">
                                <span className="h-12 w-12 rounded-lg bg-black/5 flex-shrink-0" />
                                <span className="flex-1 space-y-1">
                                    <span className="block h-1.5 w-3/4 rounded-full bg-black/10" />
                                    <span className="block h-1 w-full rounded-full bg-black/6" />
                                    <span className="block h-1.5 w-10 rounded-full bg-black/80" />
                                </span>
                            </span>
                        ))}
                    </span>
                </span>
            </>
        );
    }
    if (slug === 'electronics-hub') {
        // Navy dense header, 4-col compact tech cards with badges
        return (
            <>
                <span className={base} style={{ background: preview }} />
                <span className="absolute inset-0 flex flex-col">
                    <span className="flex h-8 items-center gap-2 px-3 bg-black/10">
                        <span className="h-2 w-10 rounded-full bg-white/20" />
                        <span className="flex-1 flex justify-center gap-1.5">
                            <span className="h-1.5 w-6 rounded-full bg-white/30" />
                            <span className="h-1.5 w-6 rounded-full bg-white/30" />
                            <span className="h-1.5 w-6 rounded-full bg-white/30" />
                        </span>
                        <span className="h-5 w-5 rounded-full bg-white/15" />
                    </span>
                    <span className="mx-3 mt-2 h-16 rounded-xl bg-white/15 backdrop-blur flex items-center p-2 gap-2">
                        <span className="flex-1 space-y-1">
                            <span className="block h-2 w-20 rounded-full bg-white" />
                            <span className="block h-1.5 w-28 rounded-full bg-white/60" />
                        </span>
                        <span className="h-12 w-16 rounded-lg bg-white/90 flex-shrink-0" />
                    </span>
                    <span className="mx-3 mt-2 grid grid-cols-4 gap-1.5 flex-1">
                        {[...Array(8)].map((_, i) => (
                            <span key={i} className="rounded-lg bg-white shadow-sm flex flex-col p-1 relative overflow-hidden">
                                <span className="absolute top-1 right-1 h-3 w-8 rounded-full bg-rose-500" />
                                <span className="aspect-square rounded-md bg-black/[0.04] mb-1" />
                                <span className="h-1 w-full rounded-full bg-black/10" />
                                <span className="h-1.5 w-10 rounded-full bg-sky-600 mt-1" />
                            </span>
                        ))}
                    </span>
                </span>
            </>
        );
    }
    if (slug === 'bakery-house') {
        // Warm cream, large hero, 3-col rounded-3xl cards
        return (
            <>
                <span className={base} style={{ background: preview }} />
                <span className="absolute inset-0 flex flex-col">
                    <span className="flex h-8 items-center justify-center gap-2 px-4">
                        <span className="h-6 w-6 rounded-full bg-amber-800/10" />
                        <span className="h-2 w-16 rounded-full bg-amber-900/15" />
                    </span>
                    <span className="mx-3 h-20 rounded-[1.5rem] bg-white/70 shadow-sm flex items-center justify-center">
                        <span className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-sm">🧁</span>
                        <span className="ms-2 space-y-1">
                            <span className="block h-2 w-16 rounded-full bg-amber-900/10" />
                            <span className="block h-1.5 w-20 rounded-full bg-amber-900/8" />
                        </span>
                    </span>
                    <span className="mx-3 mt-2 grid grid-cols-3 gap-2 flex-1">
                        {[...Array(6)].map((_, i) => (
                            <span key={i} className="rounded-[1.2rem] bg-white shadow-sm flex flex-col overflow-hidden">
                                <span className="aspect-square bg-amber-50" />
                                <span className="p-2 space-y-1">
                                    <span className="block h-1.5 w-3/4 rounded-full bg-black/10" />
                                    <span className="block h-1 w-1/2 rounded-full bg-amber-600/20" />
                                </span>
                            </span>
                        ))}
                    </span>
                </span>
            </>
        );
    }
    // bazaar-market default: teal, category circles, balanced grid
    return (
        <>
            <span className={base} style={{ background: preview }} />
            <span className="absolute inset-0 flex flex-col">
                <span className="flex h-8 items-center justify-between px-4">
                    <span className="h-6 w-6 rounded-xl bg-white shadow-sm" />
                    <span className="h-2 w-16 rounded-full bg-black/10" />
                    <span className="h-6 w-6 rounded-full bg-teal-600" />
                </span>
                <span className="mx-3 flex justify-around">
                    {[...Array(5)].map((_, i) => (
                        <span key={i} className="flex flex-col items-center gap-1">
                            <span className="h-10 w-10 rounded-2xl bg-white shadow-sm" />
                            <span className="h-1 w-8 rounded-full bg-black/10" />
                        </span>
                    ))}
                </span>
                <span className="mx-3 mt-1 h-16 rounded-2xl bg-gradient-to-l from-teal-700 to-emerald-700 flex items-center p-3 gap-2">
                    <span className="space-y-1">
                        <span className="block h-1.5 w-16 rounded-full bg-white/80" />
                        <span className="block h-2 w-20 rounded-full bg-white" />
                    </span>
                </span>
                <span className="mx-3 mt-2 grid grid-cols-3 gap-2 flex-1">
                    {[...Array(6)].map((_, i) => (
                        <span key={i} className="rounded-xl bg-white shadow-sm flex flex-col overflow-hidden">
                            <span className="aspect-[4/3] bg-black/[0.04]" />
                            <span className="p-2 space-y-1">
                                <span className="block h-1.5 w-full rounded-full bg-black/10" />
                                <span className="block h-1.5 w-10 rounded-full bg-teal-600" />
                            </span>
                        </span>
                    ))}
                </span>
            </span>
        </>
    );
}

export default function StoreTemplatesGrid({
    store,
    activeTheme,
    availableThemes,
    onApplied,
    withFilter = true,
}: Props) {
    const [applying, setApplying] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('الكل');
    const [search, setSearch] = useState('');
    const [previewSlug, setPreviewSlug] = useState<string | null>(null);
    const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

    const modules = useMemo(() => listTemplateModules(), []);
    const sectors = useMemo(
        () => ['الكل', ...Array.from(new Set(modules.map((m) => m.meta.sector)))],
        [modules],
    );
    const filtered = useMemo(() => {
        let list = filter === 'الكل' ? modules : modules.filter((m) => m.meta.sector === filter);
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (m) =>
                    m.meta.name.toLowerCase().includes(q) ||
                    m.meta.name_en.toLowerCase().includes(q) ||
                    m.meta.sector.toLowerCase().includes(q) ||
                    m.meta.description.toLowerCase().includes(q),
            );
        }
        return list;
    }, [modules, filter, search]);

    const isActive = (slug: string) => activeTheme.trim().toLowerCase() === slug.toLowerCase();
    const isAllowed = (slug: string) =>
        !availableThemes || availableThemes.length === 0 || availableThemes.includes(slug);

    const previewModule = useMemo(
        () => (previewSlug ? modules.find((m) => m.meta.slug === previewSlug) ?? null : null),
        [previewSlug, modules],
    );
    const confirmModule = useMemo(
        () => (confirmSlug ? modules.find((m) => m.meta.slug === confirmSlug) ?? null : null),
        [confirmSlug, modules],
    );

    const applyTheme = async (tpl: TemplateModule) => {
        setApplying(tpl.meta.slug);
        try {
            await apiPut(`/api/stores/${store.id}/designer`, { theme: tpl.meta.slug });
            onApplied?.(tpl.meta.slug);
            toast.success('تم تطبيق القالب بنجاح', {
                description: `قالب «${tpl.meta.name}» أصبح نشطاً على متجرك.`,
            });
            setConfirmSlug(null);
        } catch (e) {
            console.error('Apply theme failed', e);
            toast.error('تعذر تطبيق القالب. حاول مرة أخرى.');
        } finally {
            setApplying(null);
        }
    };

    return (
        <div dir="rtl">
            {/* Filters + Search — horizontal scroll on mobile, restrained */}
            {withFilter && (
                <div className="mb-6 space-y-3">
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 shrink-0 ps-1">
                            <LayoutGrid className="h-3.5 w-3.5" /> التصنيف:
                        </span>
                        {sectors.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setFilter(c)}
                                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                                    filter === c
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-white text-gray-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                    {modules.length > 5 && (
                        <div className="relative max-w-sm">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ابحث عن قالب..."
                                className="pe-9 bg-white"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-gray-100"
                                >
                                    <X className="h-4 w-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Professional gallery: 1 col on 375, 2 on 768, 3 on 1440 — large preview 75% */}
            <div className="grid gap-6 pb-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((tpl) => {
                    const active = isActive(tpl.meta.slug);
                    const allowed = isAllowed(tpl.meta.slug);
                    return (
                        <div
                            key={tpl.meta.slug}
                            className={`group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${
                                active ? 'border-emerald-500 ring-2 ring-emerald-100 shadow-md' : 'border-slate-200 hover:border-slate-300'
                            } ${!allowed ? 'opacity-60' : ''}`}
                        >
                            {/* Large visual preview — 72-80% of card */}
                            <button
                                type="button"
                                onClick={() => setPreviewSlug(tpl.meta.slug)}
                                className="relative block w-full overflow-hidden text-start aspect-[4/3] sm:aspect-[4/3] bg-slate-50"
                                aria-label={`معاينة ${tpl.meta.name}`}
                            >
                                <TemplateVisualPreview slug={tpl.meta.slug} preview={tpl.meta.preview} />
                                {/* Hover overlay */}
                                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-xl">
                                        <Eye className="h-4 w-4" /> معاينة القالب
                                    </span>
                                </span>
                                {active && (
                                    <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-lg">
                                        <Check className="h-3.5 w-3.5" /> مستخدم حالياً
                                    </span>
                                )}
                                {!allowed && (
                                    <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow">
                                        ترقية مطلوبة
                                    </span>
                                )}
                            </button>

                            {/* Body — compact, hierarchy clear */}
                            <div className="flex flex-1 flex-col p-5">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h3 className="text-[15px] font-black leading-tight text-slate-900">{tpl.meta.name}</h3>
                                    <Badge variant="secondary" className="shrink-0 bg-slate-100 text-slate-600 text-[10px] font-bold">
                                        {tpl.meta.sector}
                                    </Badge>
                                </div>
                                <p className="text-xs leading-relaxed text-slate-500 line-clamp-2 min-h-[2.5rem] mb-4">
                                    {tpl.meta.description}
                                </p>
                                <div className="mt-auto flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 gap-1.5 font-bold"
                                        onClick={() => setPreviewSlug(tpl.meta.slug)}
                                    >
                                        <Eye className="h-4 w-4" /> معاينة
                                    </Button>
                                    {active ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 gap-1.5 font-bold border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                            onClick={() => {
                                                // Navigate to customization — same designer, identity tab
                                                window.location.href = `/stores/${store.id}/designer`;
                                            }}
                                        >
                                            <Paintbrush className="h-4 w-4" /> تخصيص القالب
                                        </Button>
                                    ) : !allowed ? (
                                        <Button size="sm" disabled className="flex-1 gap-1.5 font-bold">
                                            غير متاح في باقتك
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            disabled={applying === tpl.meta.slug}
                                            onClick={() => setConfirmSlug(tpl.meta.slug)}
                                            className="flex-1 gap-1.5 font-bold bg-slate-900 text-white hover:bg-slate-800"
                                            style={{ backgroundColor: tpl.meta.accent }}
                                        >
                                            {applying === tpl.meta.slug ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : null}
                                            استخدام القالب
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <Search className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">لا توجد قوالب مطابقة</p>
                    <p className="text-xs text-slate-400">جرب تغيير الفلتر أو كلمة البحث</p>
                    <Button variant="outline" size="sm" onClick={() => { setFilter('الكل'); setSearch(''); }}>
                        عرض الكل
                    </Button>
                </div>
            )}

            {/* Preview Modal — large, with Desktop/Mobile toggle, reuses existing preview route */}
            <Dialog open={!!previewSlug} onOpenChange={(o) => !o && setPreviewSlug(null)}>
                <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
                    {previewModule && (
                        <>
                            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="text-start">
                                        <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                                            {previewModule.meta.name}
                                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                                                {previewModule.meta.sector}
                                            </span>
                                        </DialogTitle>
                                        <DialogDescription className="text-sm text-slate-500 mt-1 text-start">
                                            {previewModule.meta.description}
                                        </DialogDescription>
                                    </div>
                                    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewMode('desktop')}
                                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                                previewMode === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            <Monitor className="h-3.5 w-3.5" /> سطح المكتب
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewMode('mobile')}
                                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                                previewMode === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            <Smartphone className="h-3.5 w-3.5" /> الهاتف
                                        </button>
                                    </div>
                                </div>
                            </DialogHeader>
                            <div className="flex-1 overflow-hidden bg-slate-100 p-4 flex items-center justify-center min-h-0">
                                <div
                                    className={`bg-white shadow-xl rounded-2xl overflow-hidden transition-all duration-300 ${
                                        previewMode === 'mobile' ? 'w-[390px] max-w-full h-[650px]' : 'w-full h-[600px]'
                                    }`}
                                >
                                    <iframe
                                        src={`/stores/${store.id}/templates/${previewModule.meta.slug}/preview`}
                                        title={`معاينة ${previewModule.meta.name}`}
                                        className="w-full h-full border-0"
                                        loading="lazy"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="px-6 py-4 border-t border-slate-100 shrink-0 gap-2 sm:gap-2">
                                <Button variant="outline" onClick={() => setPreviewSlug(null)}>
                                    إغلاق
                                </Button>
                                {isActive(previewModule.meta.slug) ? (
                                    <Button
                                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => {
                                            setPreviewSlug(null);
                                            window.location.href = `/stores/${store.id}/designer`;
                                        }}
                                    >
                                        <Paintbrush className="h-4 w-4" /> تخصيص القالب
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={!isAllowed(previewModule.meta.slug) || applying === previewModule.meta.slug}
                                        onClick={() => {
                                            setPreviewSlug(null);
                                            setConfirmSlug(previewModule.meta.slug);
                                        }}
                                        style={{ backgroundColor: isAllowed(previewModule.meta.slug) ? previewModule.meta.accent : undefined }}
                                        className="gap-1.5 text-white"
                                    >
                                        {applying === previewModule.meta.slug && <Loader2 className="h-4 w-4 animate-spin" />}
                                        استخدام هذا القالب
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Apply confirmation — safety */}
            <Dialog open={!!confirmSlug} onOpenChange={(o) => !o && setConfirmSlug(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>هل تريد تطبيق هذا القالب؟</DialogTitle>
                        <DialogDescription className="text-start leading-relaxed">
                            سيتم تغيير طريقة عرض متجرك إلى قالب <span className="font-bold text-slate-900">«{confirmModule?.meta.name}»</span>.
                            <br />
                            <span className="text-emerald-700 font-medium">لن يتم حذف منتجاتك أو تصنيفاتك أو طلباتك أو عملائك أو إعدادات الشحن والدفع والدومين.</span>
                            <br />
                            يمكنك الرجوع وتغيير القالب في أي وقت، وسيبقى شعارك وألوانك محفوظة.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setConfirmSlug(null)} disabled={!!applying}>
                            إلغاء
                        </Button>
                        <Button
                            onClick={() => confirmModule && applyTheme(confirmModule)}
                            disabled={!!applying}
                            style={{ backgroundColor: confirmModule?.meta.accent }}
                            className="gap-1.5 text-white"
                        >
                            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            تطبيق القالب
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
