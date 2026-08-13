import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command';
import { usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import { LayoutGrid, Package, ShoppingCart, Users, Search, Store, Settings, type LucideIcon } from 'lucide-react';

interface PageItem {
    title: string;
    href: string;
    icon: LucideIcon;
    group: string;
}

interface SearchResults {
    products: Array<{ id: number; name: string; sku?: string | null; price?: number | null; sale_price?: number | null }>;
    orders: Array<{ id: number; order_number: string; customer?: string | null; status?: string | null; total_amount?: number | null }>;
    customers: Array<{ id: number; name?: string | null; email?: string | null; phone?: string | null }>;
}

const PAGE_ITEMS: PageItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid, group: 'Main' },
    { title: 'Products', href: '/products', icon: Package, group: 'Store' },
    { title: 'Orders', href: '/orders', icon: ShoppingCart, group: 'Store' },
    { title: 'Customers', href: '/customers', icon: Users, group: 'Store' },
    { title: 'Settings', href: '/settings', icon: Settings, group: 'System' },
    { title: 'Store Management', href: '/stores', icon: Store, group: 'Store' },
];

const getCsrfToken = () => {
    const meta = document.head.querySelector('meta[name="csrf-token"]');
    return meta ? (meta as HTMLMetaElement).content : '';
};

export function GlobalSearch({ open, onOpenChange, trigger }: { open: boolean; onOpenChange: (open: boolean) => void; trigger?: React.ReactNode }) {
    const { t } = useTranslation();
    const { props } = usePage();
    const user = (props as { auth?: { user?: { type?: string } } }).auth?.user;
    const isSuperAdmin = user?.type === 'superadmin';

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ products: [], orders: [], customers: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const navigate = (href: string) => {
        onOpenChange(false);
        setQuery('');
        setResults({ products: [], orders: [], customers: [] });
        setSearched(false);
        router.visit(href);
    };

    const performSearch = useCallback(async (q: string) => {
        const term = q.trim();
        if (term.length < 2 || isSuperAdmin) {
            setResults({ products: [], orders: [], customers: [] });
            return;
        }
        setIsLoading(true);
        setSearched(true);
        try {
            const res = await fetch(`${route('search')}?q=${encodeURIComponent(term)}`, {
                headers: { 'X-CSRF-TOKEN': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json();
            setResults(data as SearchResults);
        } catch {
            setResults({ products: [], orders: [], customers: [] });
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        const delay = setTimeout(() => {
            performSearch(query);
        }, 250);
        return () => clearTimeout(delay);
    }, [query, performSearch]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                onOpenChange(!open);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onOpenChange]);

    const filteredPages = PAGE_ITEMS.filter((item) => {
        if (item.href === '/stores' && isSuperAdmin) return true;
        if (item.href === '/stores' && !isSuperAdmin) return false;
        if (item.href === '/settings' && isSuperAdmin) return true;
        return true;
    }).filter((item) => (item.title.toLowerCase().includes(query.toLowerCase()))) || [];

    const hasRecordResults = results.products.length > 0 || results.orders.length > 0 || results.customers.length > 0;

    return (
        <>
            {trigger}
            <CommandDialog open={open} onOpenChange={onOpenChange}>
                <CommandInput
                    placeholder={t('Search for products, orders, customers or pages...')}
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>{t('No results found')}</CommandEmpty>

                    {filteredPages.length > 0 && (
                        <CommandGroup heading={t('Pages')}>
                            {filteredPages.map((item) => (
                                <CommandItem key={item.href} value={`page ${item.title}`} onSelect={() => navigate(item.href)}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {filteredPages.length > 0 && (results.products.length > 0 || results.orders.length > 0 || results.customers.length > 0) && (
                        <CommandSeparator />
                    )}

                    {results.products.length > 0 && (
                        <CommandGroup heading={t('Products')}>
                            {results.products.map((p) => (
                                <CommandItem key={`p${p.id}`} value={`product ${p.name}`} onSelect={() => navigate(`/products/${p.id}/edit`)}>
                                    <Package />
                                    <span>{p.name}</span>
                                    {p.price != null && <CommandShortcut>{p.price.toFixed(2)}</CommandShortcut>}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {results.orders.length > 0 && (
                        <CommandGroup heading={t('Orders')}>
                            {results.orders.map((o) => (
                                <CommandItem key={`o${o.id}`} value={`order ${o.order_number} ${o.customer || ''}`} onSelect={() => navigate(`/orders/${o.id}`)}>
                                    <ShoppingCart />
                                    <span>{o.order_number}</span>
                                    {o.customer && <span className="truncate text-muted-foreground">{o.customer}</span>}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {results.customers.length > 0 && (
                        <CommandGroup heading={t('Customers')}>
                            {results.customers.map((c) => (
                                <CommandItem key={`c${c.id}`} value={`customer ${c.name} ${c.email || ''} ${c.phone || ''}`} onSelect={() => navigate(`/customers/${c.id}/edit`)}>
                                    <Users />
                                    <span>{c.name}</span>
                                    {c.email && <span className="truncate text-muted-foreground">{c.email}</span>}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                            <Search className="me-2 h-4 w-4 animate-pulse" />
                            {t('Searching...')}
                        </div>
                    )}

                    {!isLoading && searched && !hasRecordResults && query.trim().length >= 2 && filteredPages.length === 0 && (
                        <CommandEmpty>{t('No results found')}</CommandEmpty>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}