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
            try { return new URL(u).pathname; } catch { return u.split('?')[0]; }
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
        <nav aria-label={`${title} navigation`} className="flex flex-col gap-3 py-3">
            <div className="px-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
            </div>
            <ul className="flex flex-col gap-0.5 px-2">
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
                                    'flex w-full items-center rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                                    active
                                        ? 'bg-emerald-50 text-emerald-700 border-s-[3px] border-emerald-600'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
