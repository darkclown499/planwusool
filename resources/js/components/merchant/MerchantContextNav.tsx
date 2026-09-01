import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

interface Item {
    title: string;
    href?: string;
    activePaths?: string[];
}

interface Props {
    title: string;
    items: Item[];
    storeId?: string | number | null;
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
        for (const ap of activePaths) {
            if (normalize(parsePath(ap)) === normalize(current)) return true;
        }
    }
    return normalize(parsePath(href)) === normalize(current);
}

export function MerchantContextNav({ title, items }: Props) {
    const { url } = usePage();
    if (!items || items.length === 0) return null;

    return (
        <nav aria-label={`${title} navigation`} className="flex flex-col gap-3 py-4 overflow-x-hidden">
            <div className="ps-3 pe-3 overflow-hidden">
                <h2 className="text-[10.5px] font-semibold tracking-widest text-gray-400 uppercase leading-none text-start truncate">{title}</h2>
            </div>
            <ul className="flex flex-col gap-0.5 px-1.5 overflow-x-hidden">
                {items.map((item) => {
                    const active = isActive(item.href, item.activePaths, url);
                    return (
                        <li key={item.title} className="min-w-0 overflow-hidden">
                            <Link
                                href={item.href || '#'}
                                prefetch
                                aria-current={active ? 'page' : undefined}
                                data-active={active}
                                className={cn(
                                    'relative flex w-full items-center rounded-md ps-2.5 pe-2 py-2 text-[12.5px] leading-none font-normal transition-colors duration-150 min-h-[36px] overflow-hidden',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 min-w-0',
                                    active
                                        ? 'bg-emerald-50 text-emerald-700 font-medium border-s-[2.5px] border-emerald-600 -ms-px ps-[9px]'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent'
                                )}
                            >
                                <span className="truncate min-w-0 flex-1 text-start">{item.title}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
