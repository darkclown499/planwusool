import { PageTemplate } from '@/components/page-template';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useInitials } from '@/hooks/use-initials';
import { router, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronLeft, ChevronRight, Code2, ExternalLink, Search, Store as StoreIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface StoreItem {
    id: number;
    name: string;
    slug: string;
    store_url: string;
    template_slug: string;
    template_name: string;
}

interface CompanyItem {
    id: number;
    name: string;
    email: string;
    status: string;
    avatar?: string | null;
    created_at?: string;
    stores_count: number;
    stores: StoreItem[];
}

export default function TemplateEditorIndex() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { companies, filters = {} } = usePage().props as any;
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    const rows: CompanyItem[] = companies?.data || [];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('template-editor.index'),
            { search: searchTerm, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const toggleCompany = (id: number) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <PageTemplate
            title={t('Template Editor')}
            url="/template-editor"
            description={t('Browse companies and open the template editor for any store to edit its CSS, JS and JSON overrides.')}
            breadcrumbs={[
                { title: t('Dashboard'), href: route('dashboard') },
                { title: t('Template Editor') },
            ]}
        >
            <div className="space-y-4">
                {/* Search */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <form onSubmit={handleSearch} className="flex w-full max-w-md gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('Search company or store...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full ps-9"
                            />
                        </div>
                        <Button type="submit" size="sm">
                            {t('Search')}
                        </Button>
                    </form>
                </div>

                {/* Companies */}
                {rows.length === 0 && (
                    <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center text-muted-foreground">
                        <Code2 className="h-8 w-8 text-gray-300" />
                        <p>{t('No companies found')}</p>
                    </Card>
                )}

                <div className="space-y-3">
                    {rows.map((company) => (
                        <Card key={company.id} className="overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                                <div className="flex items-center gap-3">
                                    {company.avatar ? (
                                        <img
                                            src={company.avatar}
                                            alt={company.name}
                                            className="h-10 w-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                                            {getInitials(company.name)}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 font-medium">{company.name}</div>
                                        <div className="truncate text-sm text-muted-foreground">{company.email}</div>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="ms-1 hidden shrink-0 items-center gap-1 sm:inline-flex"
                                    >
                                        <StoreIcon className="h-3.5 w-3.5" />
                                        {company.stores_count ?? 0} {t('stores')}
                                    </Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleCompany(company.id)}
                                    className="gap-1"
                                >
                                    {expanded[company.id] ? t('Hide stores') : t('Show stores')}
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform ${expanded[company.id] ? 'rotate-180' : ''}`}
                                    />
                                </Button>
                            </div>

                            {expanded[company.id] && (
                                <div className="divide-y divide-gray-100 border-t border-gray-100">
                                    {(company.stores || []).map((store) => (
                                        <div
                                            key={store.id}
                                            className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 px-4 py-3"
                                        >
                                            <div className="flex min-w-0 items-center gap-3 ps-1">
                                                <StoreIcon className="h-4 w-4 shrink-0 text-gray-400" />
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold">{store.name}</div>
                                                    <a
                                                        href={store.store_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 truncate text-xs text-indigo-600 hover:underline"
                                                    >
                                                        {store.store_url}
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
                                                <Badge variant="secondary" className="hidden md:inline-flex">
                                                    {store.template_name}
                                                </Badge>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <Badge variant="outline" className="md:hidden">
                                                    {store.template_name}
                                                </Badge>
                                                <Button asChild size="sm">
                                                    <a href={`/template-editor/${store.id}`}>
                                                        <Code2 className="h-4 w-4 me-1.5" />
                                                        {t('Edit Template')}
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {(company.stores || []).length === 0 && (
                                        <p className="px-4 py-4 text-sm text-muted-foreground">
                                            {t('This company has no stores yet.')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                {/* Pagination */}
                {companies && (companies.last_page ?? 1) > 1 && (
                    <div className="flex items-center justify-between border-t pt-4">
                        <div className="text-sm text-muted-foreground">
                            {t('Showing')} <span className="font-medium">{companies.from || 0}</span> {t('to')}{' '}
                            <span className="font-medium">{companies.to || 0}</span> {t('of')}{' '}
                            <span className="font-medium">{companies.total || 0}</span>
                        </div>
                        <div className="flex gap-1">
                            {(companies.links || []).map((link: any, i: number, arr: any[]) => {
                                const isFirst = i === 0 && link.url;
                                const isLast = i === arr.length - 1 && link.url;
                                const isTextLink = isFirst || isLast;
                                return (
                                    <Button
                                        key={i}
                                        variant={link.active ? 'default' : 'outline'}
                                        size={isTextLink ? 'sm' : 'icon'}
                                        className={`${isTextLink ? 'gap-1 px-3' : 'h-8 w-8'} min-w-[32px]`}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                    >
                                        {isFirst ? (
                                            <>
                                                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                                                <span className="hidden sm:inline">{t('Previous')}</span>
                                            </>
                                        ) : isLast ? (
                                            <>
                                                <span className="hidden sm:inline">{t('Next')}</span>
                                                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                                            </>
                                        ) : (
                                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                        )}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </PageTemplate>
    );
}