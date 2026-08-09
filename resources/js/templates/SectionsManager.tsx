import type { TemplateConfig, TemplateSectionConfig } from '@/templates/types';
import { ChevronDown, ChevronUp, Eye, EyeOff, Save } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface SectionsManagerProps {
    storeId: number | string;
    template: TemplateConfig | null;
    onSave?: () => void;
}

const SECTION_LABELS: Record<string, string> = {
    header: 'الترويسة',
    hero: 'الواجهة الرئيسية',
    categories: 'الأقسام',
    products: 'المنتجات',
    reviews: 'آراء العملاء',
    footer: 'التذييل',
    banner: 'شريط الإعلان',
    featured: 'مميزات',
    custom: 'قسم مخصص',
    sidebar: 'شريط جانبي',
};

/**
 * SectionsManager - lets the store owner toggle, reorder and edit the
 * sections of a JSON-section template. Persists via the overrides API so
 * the storefront renders the customized section list.
 */
export const SectionsManager: React.FC<SectionsManagerProps> = ({ storeId, template, onSave }) => {
    const [sections, setSections] = useState<TemplateSectionConfig[]>(() => template?.sections || []);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        fetch(`/api/stores/${storeId}/design-tokens`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (active) {
                    const merged = data?.template_config?.sections;
                    if (Array.isArray(merged) && merged.length) {
                        setSections(merged);
                    } else if (template?.sections) {
                        setSections(template.sections);
                    }
                }
            })
            .catch(() => {})
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [storeId, template]);

    const patchSection = useCallback((index: number, patch: Partial<TemplateSectionConfig>) => {
        setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
        setSaved(false);
    }, []);

    const patchProps = useCallback((index: number, key: string, value: string) => {
        setSections((prev) => prev.map((s, i) => (i === index ? { ...s, props: { ...s.props, [key]: value } } : s)));
        setSaved(false);
    }, []);

    const move = useCallback((index: number, dir: -1 | 1) => {
        setSections((prev) => {
            const target = index + dir;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            const [item] = next.splice(index, 1);
            next.splice(target, 0, item);
            return next.map((s, i) => ({ ...s, order: i + 1 }));
        });
        setSaved(false);
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const ordered = sections.map((s, i) => ({ ...s, order: i + 1 }));
            const response = await fetch(`/api/stores/${storeId}/overrides`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ overrides: { sections: ordered } }),
            });
            if (!response.ok) throw new Error('Failed to save');
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            if (onSave) onSave();
        } catch (error) {
            console.error('Failed to save sections:', error);
        } finally {
            setSaving(false);
        }
    }, [storeId, sections, onSave]);

    if (loading) {
        return <p className="py-8 text-center text-sm text-gray-400">جارٍ تحميل الأقسام...</p>;
    }

    if (!sections.length) {
        return <p className="py-8 text-center text-sm text-gray-400">لا توجد أقسام قابلة للتخصيص لهذا القالب.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                يعمل محرر الأقسام على القوالب ذات الأقسام الديناميكية. القوالب بتصميم كامل (مثل المتاجر المتخصصة) لا تتأثر بترتيب الأقسام هنا.
            </div>

            {/* Save bar */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">فعّل / رتّب الأقسام ثم احفظ التغييرات.</p>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                    <Save className="h-4 w-4" />
                    {saving ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ ✓' : 'حفظ الأقسام'}
                </button>
            </div>

            {/* Section list */}
            <div className="space-y-2">
                {sections.map((section, index) => {
                    const label = SECTION_LABELS[section.type] || section.id;
                    const isEditable = section.type === 'hero';
                    return (
                        <div key={section.id || index} className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="text-xs font-bold text-gray-400">{index + 1}</span>
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                                            section.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'
                                        }`}
                                    >
                                        {label}
                                    </span>
                                    <span className="truncate text-xs text-gray-400" dir="ltr">
                                        {section.id} · {section.type}
                                    </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => move(index, -1)}
                                        disabled={index === 0}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-30"
                                        aria-label="لأعلى"
                                    >
                                        <ChevronUp className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => move(index, 1)}
                                        disabled={index === sections.length - 1}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-30"
                                        aria-label="لأسفل"
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => patchSection(index, { enabled: !section.enabled })}
                                        className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-xs font-semibold transition ${
                                            section.enabled
                                                ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                                : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                                        }`}
                                    >
                                        {section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                        {section.enabled ? 'ظاهر' : 'مخفي'}
                                    </button>
                                </div>
                            </div>

                            {isEditable && (
                                <div className="mt-3 grid gap-2 border-t border-gray-100 pt-3 md:grid-cols-3">
                                    <label className="block">
                                        <span className="text-xs font-semibold text-gray-600">العنوان</span>
                                        <input
                                            value={section.props?.title || ''}
                                            onChange={(e) => patchProps(index, 'title', e.target.value)}
                                            placeholder="عنوان الواجهة"
                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs font-semibold text-gray-600">الوصف</span>
                                        <input
                                            value={section.props?.subtitle || ''}
                                            onChange={(e) => patchProps(index, 'subtitle', e.target.value)}
                                            placeholder="وصف قصير"
                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs font-semibold text-gray-600">شارة علوية</span>
                                        <input
                                            value={section.props?.badge || ''}
                                            onChange={(e) => patchProps(index, 'badge', e.target.value)}
                                            placeholder="مثال: تخفيضات الموسم"
                                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SectionsManager;
