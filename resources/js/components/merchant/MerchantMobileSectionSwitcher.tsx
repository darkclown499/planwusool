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
        if (u.startsWith('http')) {
            try {
                return new URL(u).pathname;
            } catch {
                return u.split('?')[0];
            }
        }
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

    const activeItem = items.find((i) => isActive(i.href, i.activePaths, url)) ?? items[0];

    return (
        <div className="lg:hidden border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-[13px] font-semibold tracking-tight text-gray-900">{sectionTitle}</span>
                <button
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    aria-label={`تبديل قسم ${sectionTitle}`}
                    className="inline-flex max-w-[60%] items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-[13px] font-medium leading-none text-gray-700 hover:bg-white hover:border-gray-300 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1"
                >
                    <span className="truncate">{activeItem?.title}</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-150', open ? 'rotate-180' : '')} />
                </button>
            </div>
            {open && (
                <ul role="listbox" className="flex flex-col gap-0.5 px-2 pb-3 pt-1">
                    {items.map((it) => {
                        const active = isActive(it.href, it.activePaths, url);
                        return (
                            <li key={it.title} role="option" aria-selected={active}>
                                <Link
                                    href={it.href || '#'}
                                    prefetch
                                    onClick={() => setOpen(false)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex w-full rounded-xl px-3 py-2.5 text-[13px] leading-5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                                        active ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
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
