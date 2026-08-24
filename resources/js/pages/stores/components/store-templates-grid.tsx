import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Eye, LayoutGrid, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiPut } from '@/utils/api';
import { listTemplateModules, type TemplateModule } from '@/templates-v2';

interface Props {
    store: any;
    /** Slug of the currently active theme (lower-cased). */
    activeTheme: string;
    /** Current user's allowed theme slugs — used to lock unavailable templates. */
    availableThemes?: string[];
    /** Called after a successful apply so the parent can sync its theme state. */
    onApplied?: (slug: string) => void;
    /** Whether to show sector filter chips — true by default */
    withFilter?: boolean;
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

    const modules = useMemo(() => listTemplateModules(), []);
    const sectors = useMemo(
        () => ['الكل', ...Array.from(new Set(modules.map((m) => m.meta.sector)))],
        [modules],
    );
    const visible = useMemo(
        () => (filter === 'الكل' ? modules : modules.filter((m) => m.meta.sector === filter)),
        [modules, filter],
    );

    const isActive = (slug: string) => activeTheme.trim().toLowerCase() === slug;
    const isAllowed = (slug: string) =>
        !availableThemes || availableThemes.length === 0 || availableThemes.includes(slug);

    const openPreview = (slug: string) => {
        window.open(`/stores/${store.id}/templates/${slug}/preview`, '_blank', 'noopener');
    };

    const applyTheme = async (tpl: TemplateModule) => {
        setApplying(tpl.meta.slug);
        try {
            await apiPut(`/api/stores/${store.id}/designer`, { theme: tpl.meta.slug });
            onApplied?.(tpl.meta.slug);
            toast.success('تم تطبيق القالب بنجاح', {
                description: `قالب «${tpl.meta.name}» أصبح نشطاً على متجرك.`,
            });
        } catch (e) {
            console.error('Apply theme failed', e);
            toast.error('تعذر تطبيق القالب. حاول مرة أخرى.');
        } finally {
            setApplying(null);
        }
    };

    return (
        <div>
            {withFilter && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    <LayoutGrid className="me-1 h-4 w-4 text-gray-400" />
                    {sectors.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setFilter(c)}
                            className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition ${
                                filter === c
                                    ? 'bg-emerald-600 text-white shadow'
                                    : 'bg-white text-gray-500 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((tpl) => {
                    const active = isActive(tpl.meta.slug);
                    const allowed = isAllowed(tpl.meta.slug);
                    return (
                        <div
                            key={tpl.meta.slug}
                            className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                                active ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'
                            } ${!allowed ? 'opacity-60' : ''}`}
                        >
                            {/* Cover */}
                            <button
                                type="button"
                                onClick={() => openPreview(tpl.meta.slug)}
                                className="relative block h-48 w-full overflow-hidden text-start"
                                aria-label={`معاينة ${tpl.meta.name}`}
                            >
                                <span
                                    className="absolute inset-0"
                                    style={{ background: tpl.meta.preview }}
                                />
                                <span className="absolute inset-x-5 top-5 bottom-0 flex flex-col gap-2 opacity-90 transition-transform duration-300 group-hover:-translate-y-1">
                                    <span className="h-3 w-2/3 rounded-full bg-black/10" />
                                    <span className="h-14 w-full rounded-lg bg-white/45 shadow-inner" />
                                    <span className="flex gap-2">
                                        {[...Array(4)].map((_, i) => (
                                            <span
                                                key={i}
                                                className="aspect-[3/4] flex-1 rounded-md bg-white/55 shadow-sm"
                                            />
                                        ))}
                                    </span>
                                    <span className="flex gap-2">
                                        {[...Array(4)].map((_, i) => (
                                            <span
                                                key={i}
                                                className="aspect-[3/4] flex-1 rounded-md bg-white/35 shadow-sm"
                                            />
                                        ))}
                                    </span>
                                </span>
                                {active && (
                                    <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-md">
                                        <Check className="h-3.5 w-3.5" /> نشط الآن
                                    </span>
                                )}
                                <span className="absolute bottom-2 right-3 rounded-lg bg-black/45 px-2 py-0.5 text-sm font-black text-white backdrop-blur-sm">
                                    {tpl.meta.name}
                                </span>
                            </button>

                            {/* Body */}
                            <div className="flex flex-1 flex-col p-4">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <p className="text-xs font-bold tracking-wide text-emerald-600">
                                        {tpl.meta.sector}
                                    </p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                        {tpl.meta.name_en}
                                    </p>
                                </div>
                                <p className="mb-4 line-clamp-2 min-h-10 text-xs leading-relaxed text-gray-500">
                                    {tpl.meta.description}
                                </p>
                                <div className="mt-auto flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        onClick={() => openPreview(tpl.meta.slug)}
                                    >
                                        <Eye className="h-3.5 w-3.5" /> معاينة حية
                                    </Button>
                                    {active ? (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled
                                            className="gap-1.5 text-emerald-600"
                                        >
                                            <Check className="h-3.5 w-3.5" /> مطبَّق
                                        </Button>
                                    ) : !allowed ? (
                                        <Button size="sm" disabled className="gap-1.5">
                                            غير متاح في باقتك
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            disabled={applying === tpl.meta.slug}
                                            onClick={() => applyTheme(tpl)}
                                            style={{ backgroundColor: tpl.meta.accent }}
                                            className="gap-1.5 text-white hover:opacity-90"
                                        >
                                            {applying === tpl.meta.slug && (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            )}
                                            تطبيق
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
