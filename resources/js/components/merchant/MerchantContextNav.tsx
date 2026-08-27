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
        <nav aria-label={`${title} navigation`} className="flex flex-col gap-4 py-4">
            <div className="ps-3.5 pe-3 pt-0.5">
                <h2 className="text-[12px] font-semibold tracking-tight text-gray-900 leading-none">{title}</h2>
            </div>
            <ul className="flex flex-col gap-0.5 px-2.5">
                {items.map((item) => {
                    const active = isActive(item.href, item.activePaths, url);
                    return (
                        <li key={item.title}>
                            <Link
                                href={item.href || '#'}
                                prefetch
                                aria-current={active ? 'page' : undefined}
                                data-active={active}
                                className={cn(
                                    'relative flex w-full items-center rounded-lg ps-3 pe-2.5 py-[9px] text-[13px] leading-5 font-normal transition-colors duration-150',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1',
                                    active
                                        ? 'bg-emerald-50/70 text-emerald-700 font-medium border-s-2 border-emerald-600 -ms-px ps-[10px]'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-transparent'
                                )}
                            >
                                <span className="truncate">{item.title}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
