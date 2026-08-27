import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
    title: string;
    href?: string;
    activePaths?: string[];
}

interface Props {
    sectionTitle: string;
    items: Item[];
}

function isActive(href: string | undefined, activePaths: string[] | undefined, currentUrl: string): boolean {
    if (!href) return false;
    const current = currentUrl.split('?')[0].replace(/\/+$/, '') || '/';
    const normalize = (p: string) => p.replace(/\/+$/, '') || '/';
    const parsePath = (u: string) => {
        if (u.startsWith('http')) { try { return new URL(u).pathname; } catch { return u.split('?')[0]; } }
        return u.split('?')[0];
    };
    if (activePaths && activePaths.length > 0) {
        for (const ap of activePaths) if (normalize(parsePath(ap)) === normalize(current)) return true;
    }
    return normalize(parsePath(href)) === normalize(current);
}

export function MerchantMobileSectionSwitcher({ sectionTitle, items }: Props) {
    const { url } = usePage();
    const [open, setOpen] = useState(false);
    if (!items || items.length === 0) return null;

    const activeItem = items.find(i => isActive(i.href, i.activePaths, url)) ?? items[0];

    return (
        <div className="md:hidden border-b bg-white">
            <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{sectionTitle}</span>
                <button
                    onClick={() => setOpen(v => !v)}
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    aria-label={`تبديل قسم ${sectionTitle}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                    <span className="truncate max-w-[160px]">{activeItem?.title}</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', open ? 'rotate-180' : '')} />
                </button>
            </div>
            {open && (
                <ul role="listbox" className="px-2 pb-2 flex flex-col gap-0.5">
                    {items.map(it => {
                        const active = isActive(it.href, it.activePaths, url);
                        return (
                            <li key={it.title} role="option" aria-selected={active}>
                                <Link
                                    href={it.href || '#'}
                                    prefetch
                                    onClick={() => setOpen(false)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex w-full rounded-lg px-3 py-2 text-sm',
                                        active ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                                    )}
                                >
                                    {it.title}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
