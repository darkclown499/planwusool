import { LayoutGrid, ShoppingBasket } from 'lucide-react';
import React from 'react';

interface WefaqCategorySidebarProps {
    categories: any[];
    activeId: string;
    counts: Record<string, number>;
    onSelect: (id: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
    خضروات: '🥬',
    'لحوم وأسماك': '🐟',
    لحم: '🥩',
    'ألبان وأجبان': '🧀',
    بقالة: '🛒',
    تجهيز: '🏠',
    مشروبات: '🥤',
    'مونة البيت': '🫙',
    حلويات: '🍰',
    المكسرات: '🥜',
};

function categoryIcon(name: string): string {
    const normalized = String(name || '').trim();
    if (CATEGORY_ICONS[normalized]) return CATEGORY_ICONS[normalized];
    const lowered = normalized;
    if (lowered.includes('خضر') || lowered.includes('فواكه')) return '🥬';
    if (lowered.includes('لحم') || lowered.includes('سمك')) return '🥩';
    if (lowered.includes('ألبان') || lowered.includes('اجبان') || lowered.includes('حليب')) return '🧀';
    if (lowered.includes('مشروب') || lowered.includes('عصير')) return '🥤';
    if (lowered.includes('حلو') || lowered.includes('شوكولات')) return '🍰';
    if (lowered.includes('مكسر') || lowered.includes('بذور')) return '🥜';
    if (lowered.includes('مخبوز') || lowered.includes('خبز')) return '🥖';
    return '🛍️';
}

export const WefaqCategorySidebar: React.FC<WefaqCategorySidebarProps> = ({ categories, activeId, counts, onSelect }) => {
    return (
        <aside className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 bg-[#4CAF50] px-4 py-3 text-white">
                <LayoutGrid className="h-5 w-5" />
                <span className="text-sm font-extrabold">الأقسام</span>
            </div>

            <ul className="divide-y divide-gray-50">
                <li>
                    <button
                        type="button"
                        onClick={() => onSelect('all')}
                        className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-bold transition ${
                            activeId === 'all'
                                ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <span className="text-lg">🛒</span>
                            كل المنتجات
                        </span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                activeId === 'all' ? 'bg-[#4CAF50] text-white' : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                            {Object.values(counts).reduce((a, b) => a + b, 0)}
                        </span>
                    </button>
                </li>
                {categories.map((cat: any) => {
                    const id = String(cat.id);
                    const count = counts[id] || 0;
                    const active = activeId === id;
                    return (
                        <li key={id}>
                            <button
                                type="button"
                                onClick={() => onSelect(active ? 'all' : id)}
                                className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-bold transition ${
                                    active ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-lg">{categoryIcon(cat.name)}</span>
                                    <span>{cat.name}</span>
                                </span>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                        active ? 'bg-[#4CAF50] text-white' : 'bg-gray-100 text-gray-500'
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            <div className="m-3 rounded-xl bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] p-4">
                <div className="flex items-center gap-2 text-[#1B5E20]">
                    <ShoppingBasket className="h-5 w-5" />
                    <span className="text-sm font-extrabold">توصيل سريع</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#33691E]">اطلب قبل الساعة 4 مساءً ليصلك الطلب اليوم.</p>
            </div>
        </aside>
    );
};

export default WefaqCategorySidebar;
