import { Plus, Save, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface StoreContentEditorProps {
    storeId: number | string;
    initialContent?: any;
    userPlanName?: string | null;
    userPlanTier?: 'starter' | 'growth' | 'professional';
    isSuperAdmin?: boolean;
    onSave?: () => void;
}

const DEFAULT_CONTENT = {
    announcement: { enabled: true, text: '', link: '' },
    features: [] as { icon: string; title: string; desc: string }[],
    testimonials: [] as { name: string; rating: number; text: string }[],
    faqs: [] as { q: string; a: string }[],
    trust_bar: { enabled: true },
    newsletter: { enabled: true },
    banner: { enabled: false, title: '', subtitle: '', button_text: 'تسوّق الآن', button_link: '#template-products', image: '', background: '' },
};

/**
 * StoreContentEditor - lets the store owner configure the storefront's
 * content blocks (announcement bar, features, testimonials, FAQs) that the
 * template pages render. Persists to the store_content JSON blob.
 */
export const StoreContentEditor: React.FC<StoreContentEditorProps> = ({ storeId, initialContent, onSave }) => {
    const [content, setContent] = useState<any>(() => {
        const base = initialContent || DEFAULT_CONTENT;
        return {
            ...DEFAULT_CONTENT,
            ...base,
            announcement: { ...DEFAULT_CONTENT.announcement, ...(base.announcement || {}) },
            trust_bar: { ...DEFAULT_CONTENT.trust_bar, ...(base.trust_bar || {}) },
            newsletter: { ...DEFAULT_CONTENT.newsletter, ...(base.newsletter || {}) },
            banner: { ...DEFAULT_CONTENT.banner, ...(base.banner || {}) },
            features: base.features || [],
            testimonials: base.testimonials || [],
            faqs: base.faqs || [],
        };
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        let active = true;
        fetch(`/api/stores/${storeId}/content`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (active && data?.content) {
                    setContent((prev: any) => ({
                        ...DEFAULT_CONTENT,
                        ...data.content,
                        announcement: { ...DEFAULT_CONTENT.announcement, ...(data.content.announcement || {}) },
                        trust_bar: { ...DEFAULT_CONTENT.trust_bar, ...(data.content.trust_bar || {}) },
                        newsletter: { ...DEFAULT_CONTENT.newsletter, ...(data.content.newsletter || {}) },
                        banner: { ...DEFAULT_CONTENT.banner, ...(data.content.banner || {}) },
                        features: data.content.features || prev.features || [],
                        testimonials: data.content.testimonials || prev.testimonials || [],
                        faqs: data.content.faqs || prev.faqs || [],
                    }));
                }
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [storeId]);

    const patch = useCallback((path: string, value: any) => {
        setContent((prev: any) => {
            const keys = path.split('.');
            const next = { ...prev };
            let cursor: any = next;
            for (let i = 0; i < keys.length - 1; i++) {
                cursor[keys[i]] = { ...cursor[keys[i]] };
                cursor = cursor[keys[i]];
            }
            cursor[keys[keys.length - 1]] = value;
            return next;
        });
        setSaved(false);
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/stores/${storeId}/content`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ content }),
            });
            if (!response.ok) throw new Error('Failed to save');
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
            if (onSave) onSave();
        } catch (error) {
            console.error('Failed to save store content:', error);
        } finally {
            setSaving(false);
        }
    }, [storeId, content, onSave]);

    const sectionTitle = 'text-sm font-bold text-gray-900';
    const helper = 'mt-0.5 text-xs text-gray-500';

    return (
        <div className="space-y-6">
            {/* Save bar */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">تُعرض هذه المحتويات تلقائياً في صفحات متجرك.</p>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                    <Save className="h-4 w-4" />
                    {saving ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ ✓' : 'حفظ المحتوى'}
                </button>
            </div>

            {/* Announcement bar */}
            <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={sectionTitle}>شريط الإعلان</h3>
                        <p className={helper}>النص المتحرك أعلى المتجر (تخفيضات، شحن مجاني...).</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center">
                        <input
                            type="checkbox"
                            checked={content.announcement.enabled !== false}
                            onChange={(e) => patch('announcement.enabled', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                        />
                        <span className="ms-2 text-xs font-semibold text-gray-700">مفعّل</span>
                    </label>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="block">
                        <span className="text-xs font-semibold text-gray-600">نص الإعلان</span>
                        <input
                            value={content.announcement.text}
                            onChange={(e) => patch('announcement.text', e.target.value)}
                            placeholder="مثال: شحن مجاني للطلبات فوق 200₪"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                    </label>
                    <label className="block">
                        <span className="text-xs font-semibold text-gray-600">رابط الإعلان (اختياري)</span>
                        <input
                            value={content.announcement.link}
                            onChange={(e) => patch('announcement.link', e.target.value)}
                            placeholder="https://..."
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                    </label>
                </div>
            </div>

            {/* Features */}
            <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={sectionTitle}>مزايا المتجر</h3>
                        <p className={helper}>بطاقات المزايا (شحن، إرجاع، دفع آمن...). تُستخدم عند عرض قسم المزايا.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => patch('features', [...(content.features || []), { icon: '⭐', title: '', desc: '' }])}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <Plus className="h-3.5 w-3.5" /> إضافة ميزة
                    </button>
                </div>
                <div className="mt-3 space-y-3">
                    {!content.features?.length && <p className="text-xs text-gray-400">لا توجد مزايا مخصصة — سيُستخدم المحتوى الافتراضي.</p>}
                    {(content.features || []).map((f: any, i: number) => (
                        <div key={i} className="grid gap-2 rounded-lg border border-gray-200 p-3 md:grid-cols-[4rem_1fr_1.4fr_auto]">
                            <input
                                value={f.icon}
                                onChange={(e) => patch(`features.${i}.icon`, e.target.value)}
                                placeholder="أيقونة"
                                className="rounded-lg border border-gray-300 px-3 py-2 text-center text-sm"
                            />
                            <input
                                value={f.title}
                                onChange={(e) => patch(`features.${i}.title`, e.target.value)}
                                placeholder="العنوان"
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                                value={f.desc}
                                onChange={(e) => patch(`features.${i}.desc`, e.target.value)}
                                placeholder="الوصف"
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    patch(
                                        'features',
                                        (content.features || []).filter((_: any, x: number) => x !== i),
                                    )
                                }
                                className="flex items-center justify-center rounded-lg border border-red-200 px-2 text-red-500 hover:bg-red-50"
                                aria-label="حذف"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Testimonials */}
            <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={sectionTitle}>آراء العملاء</h3>
                        <p className={helper}>شهادات تظهر في قسم آراء العملاء.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => patch('testimonials', [...(content.testimonials || []), { name: '', rating: 5, text: '' }])}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <Plus className="h-3.5 w-3.5" /> إضافة رأي
                    </button>
                </div>
                <div className="mt-3 space-y-3">
                    {!content.testimonials?.length && <p className="text-xs text-gray-400">لا توجد آراء مخصصة — سيُستخدم المحتوى الافتراضي.</p>}
                    {(content.testimonials || []).map((t: any, i: number) => (
                        <div key={i} className="grid gap-2 rounded-lg border border-gray-200 p-3 md:grid-cols-[10rem_5rem_1fr_auto]">
                            <input
                                value={t.name}
                                onChange={(e) => patch(`testimonials.${i}.name`, e.target.value)}
                                placeholder="اسم العميل"
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <select
                                value={t.rating}
                                onChange={(e) => patch(`testimonials.${i}.rating`, Number(e.target.value))}
                                className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
                            >
                                {[5, 4.5, 4, 3.5, 3, 2, 1].map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                            <textarea
                                value={t.text}
                                onChange={(e) => patch(`testimonials.${i}.text`, e.target.value)}
                                placeholder="نص الرأي"
                                rows={1}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    patch(
                                        'testimonials',
                                        (content.testimonials || []).filter((_: any, x: number) => x !== i),
                                    )
                                }
                                className="flex items-center justify-center rounded-lg border border-red-200 px-2 text-red-500 hover:bg-red-50"
                                aria-label="حذف"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQs */}
            <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={sectionTitle}>الأسئلة الشائعة</h3>
                        <p className={helper}>أسئلة تظهر في قسم الأسئلة الشائعة.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => patch('faqs', [...(content.faqs || []), { q: '', a: '' }])}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <Plus className="h-3.5 w-3.5" /> إضافة سؤال
                    </button>
                </div>
                <div className="mt-3 space-y-3">
                    {!content.faqs?.length && <p className="text-xs text-gray-400">لا توجد أسئلة مخصصة — سيُستخدم المحتوى الافتراضي.</p>}
                    {(content.faqs || []).map((f: any, i: number) => (
                        <div key={i} className="grid gap-2 rounded-lg border border-gray-200 p-3 md:grid-cols-[1fr_1.5fr_auto]">
                            <input
                                value={f.q}
                                onChange={(e) => patch(`faqs.${i}.q`, e.target.value)}
                                placeholder="السؤال"
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <textarea
                                value={f.a}
                                onChange={(e) => patch(`faqs.${i}.a`, e.target.value)}
                                placeholder="الإجابة"
                                rows={1}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    patch(
                                        'faqs',
                                        (content.faqs || []).filter((_: any, x: number) => x !== i),
                                    )
                                }
                                className="flex items-center justify-center rounded-lg border border-red-200 px-2 text-red-500 hover:bg-red-50"
                                aria-label="حذف"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Visibility toggles */}
            <div className="rounded-xl border border-gray-200 p-4">
                <h3 className={sectionTitle}>إظهار الأقسام الافتراضية</h3>
                <p className={helper}>تحكم في ظهور الأقسام الاختيارية في صفحات المتجر.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                        <span className="text-sm font-semibold text-gray-700">شريط الثقة (شحن/إرجاع/دفع)</span>
                        <input
                            type="checkbox"
                            checked={content.trust_bar.enabled !== false}
                            onChange={(e) => patch('trust_bar.enabled', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                        />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                        <span className="text-sm font-semibold text-gray-700">النشرة البريدية</span>
                        <input
                            type="checkbox"
                            checked={content.newsletter.enabled !== false}
                            onChange={(e) => patch('newsletter.enabled', e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default StoreContentEditor;
