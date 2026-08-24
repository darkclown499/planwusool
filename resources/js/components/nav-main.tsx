import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';

const STORAGE_KEY = 'nav_expanded_items';

const ACTIVE_GREEN = '#047857';

export function NavMain({ items = [], position }: { items: NavItem[]; position: 'left' | 'right' }) {
    const { t } = useTranslation();
    const page = usePage();
    const { state } = useSidebar();
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    const isRTL = position === 'right';

    useEffect(() => {
        const newExpandedItems: Record<string, boolean> = {};

        const expandActiveMenus = (menuItems: NavItem[], parentKey?: string) => {
            menuItems.forEach(item => {
                const isItemActive = isActive(item.href);
                const hasActiveChild = item.children && isChildActive(item.children);

                if (parentKey && (isItemActive || hasActiveChild)) {
                    newExpandedItems[parentKey] = true;
                }

                if (item.children && (isItemActive || hasActiveChild)) {
                    newExpandedItems[item.title] = true;
                    expandActiveMenus(item.children, item.title);
                }

                if (item.children) {
                    checkNestedChildren(item.children, 1, newExpandedItems);
                }
            });
        };

        expandActiveMenus(items);

        setExpandedItems(newExpandedItems);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newExpandedItems));
        } catch (e) {
            console.error('Error saving navigation state:', e);
        }
    }, [page.url]);

    const checkNestedChildren = (
        children: NavItem[],
        level: number,
        newExpandedItems: Record<string, boolean>
    ) => {
        children.forEach(child => {
            const childKey = `${level}-${child.title}`;
            const hasActiveDescendant = child.children ? isChildActive(child.children) : false;
            const isSelfActive = isActive(child.href, child.activePaths);

            if (child.children && (isSelfActive || hasActiveDescendant)) {
                newExpandedItems[childKey] = true;
                checkNestedChildren(child.children, level + 1, newExpandedItems);
            }
        });
    };

    const toggleExpand = (title: string) => {
        const newExpandedItems = {
            ...expandedItems,
            [title]: !expandedItems[title]
        };

        setExpandedItems(newExpandedItems);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newExpandedItems));
        } catch (e) {
            console.error('Error saving navigation state:', e);
        }
    };

    // Strict active matching: exact pathname (+ search) equality only.
    // Prevents /stores from lighting up when on /stores/60/designer
    // and prevents sibling sub-links sharing same base path from both appearing active.
    const normalizePath = (p: string) => p.replace(/\/+$/, '') || '/';

    const splitPathAndSearch = (url: string): { path: string; search: string } => {
        const idx = url.indexOf('?');
        if (idx === -1) return { path: url, search: '' };
        return { path: url.slice(0, idx), search: url.slice(idx) };
    };

    const parseHref = (href: string): { path: string; search: string } => {
        if (href.startsWith('http')) {
            try {
                const u = new URL(href);
                return { path: u.pathname, search: u.search };
            } catch {
                return splitPathAndSearch(href);
            }
        }
        return splitPathAndSearch(href);
    };

    const isActive = (href?: string, activePaths?: string[]): boolean => {
        if (!href) return false;
        const current = splitPathAndSearch(page.url);
        const currentPathNorm = normalizePath(current.path);
        const currentSearch = current.search;

        if (activePaths && activePaths.length > 0) {
            for (const ap of activePaths) {
                const parsed = parseHref(ap);
                if (normalizePath(parsed.path) === currentPathNorm && parsed.search === currentSearch) {
                    return true;
                }
                // Also allow matching when activePath is prefix-less but current has same pathname regardless of search?
                // Strict requirement says exact, so we do not use startsWith.
            }
        }

        const hrefParsed = parseHref(href);
        const hrefPathNorm = normalizePath(hrefParsed.path);

        // Exact match required: both pathname and query string must match.
        // This ensures ?tab=templates vs bare path are distinguished so only one sibling is active.
        return currentPathNorm === hrefPathNorm && currentSearch === hrefParsed.search;
    };

    const isChildActive = (children?: NavItem[]): boolean => {
        if (!children) return false;
        return children.some(child => isActive(child.href, child.activePaths) || isChildActive(child.children));
    };

    const activeItemStyle = (active: boolean) => {
        if (!active) return undefined;
        return {
            borderInlineStart: `3px solid ${ACTIVE_GREEN}`,
        } as React.CSSProperties;
    };

    const activeSubItemClasses = (active: boolean) =>
        active
            ? 'bg-emerald-100 text-emerald-800 font-medium'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700';

    const renderSubMenu = (children: NavItem[], level: number = 1) => {
        return (
            <ul className={`flex flex-col gap-px ${isRTL ? 'me-7' : 'ms-7'} mt-0.5 mb-1`}>
                {children.map(child => (
                    <li key={child.title}>
                        {child.children ? (
                            <>
                                <button
                                    onClick={() => toggleExpand(`${level}-${child.title}`)}
                                    className={`flex items-center justify-between w-full rounded-lg px-2 py-1 text-[13px] transition-all duration-150 text-gray-500 hover:bg-gray-100 hover:text-gray-700`}
                                >
                                    <span className="truncate">{child.title}</span>
                                    <ChevronDown
                                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                                            expandedItems[`${level}-${child.title}`] ? 'rotate-0' : isRTL ? 'rotate-90' : '-rotate-90'
                                        }`}
                                    />
                                </button>
                                {expandedItems[`${level}-${child.title}`] && renderSubMenu(child.children, level + 1)}
                            </>
                        ) : child.onClick ? (
                            <button
                                onClick={child.onClick}
                                className={`flex items-center justify-between w-full rounded-lg px-2 py-1 text-[13px] transition-all duration-150 text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-start`}
                            >
                                <span className="truncate">{child.title}</span>
                            </button>
                        ) : (
                            <Link
                                href={child.href || '#'}
                                prefetch
                                target={child.target}
                                className={`flex items-center justify-between w-full rounded-lg px-2 py-1 text-[13px] transition-all duration-150 ${activeSubItemClasses(isActive(child.href, child.activePaths))}`}
                            >
                                <span className="truncate">{child.title}</span>
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <SidebarGroup dir={isRTL ? 'rtl' : 'ltr'}>
            <SidebarMenu>
                {items.map((item, index) => {
                    const showGroupLabel = item.groupLabel && (index === 0 || items[index - 1]?.groupLabel !== item.groupLabel);

                    return (
                        <div key={item.title}>
                            {showGroupLabel && (
                                <div className="px-3 pt-3 pb-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                        {item.groupLabel}
                                    </span>
                                </div>
                            )}

                            {item.children ? (
                                <>
                                    <SidebarMenuItem>
                                        {state === "collapsed" ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <SidebarMenuButton
                                                        isActive={false}
                                                        data-current={false}
                                                        tooltip={{ children: item.title }}
                                                        className="rounded-lg text-gray-500"
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            {item.icon && <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
                                                        </div>
                                                    </SidebarMenuButton>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent side={isRTL ? 'left' : 'right'} align="start" className="w-48">
                                                    {item.children.map(child => (
                                                        child.children ? (
                                                            <DropdownMenuSub key={child.title}>
                                                                <DropdownMenuSubTrigger>
                                                                    {child.title}
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent>
                                                                    {child.children.map(subChild => (
                                                                        subChild.onClick ? (
                                                                            <DropdownMenuItem key={subChild.title} onClick={subChild.onClick}>
                                                                                {subChild.title}
                                                                            </DropdownMenuItem>
                                                                        ) : (
                                                                            <DropdownMenuItem key={subChild.title} asChild>
                                                                                <Link href={subChild.href || '#'} prefetch target={subChild.target}>
                                                                                    {subChild.title}
                                                                                </Link>
                                                                            </DropdownMenuItem>
                                                                        )
                                                                    ))}
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>
                                                        ) : child.onClick ? (
                                                            <DropdownMenuItem key={child.title} onClick={child.onClick}>
                                                                {child.title}
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem key={child.title} asChild>
                                                                <Link href={child.href || '#'} prefetch target={child.target}>
                                                                    {child.title}
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <SidebarMenuButton
                                                isActive={false}
                                                data-current={false}
                                                tooltip={{ children: item.title }}
                                                onClick={() => toggleExpand(item.title)}
                                                className="rounded-lg py-2 px-2.5 font-medium text-gray-700 hover:bg-gray-100"
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2">
                                                        {item.icon && <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
                                                        <span className="truncate text-[13.5px]">{item.title}</span>
                                                    </div>
                                                    <ChevronDown
                                                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                                                            expandedItems[item.title] ? 'rotate-0' : isRTL ? 'rotate-90' : '-rotate-90'
                                                        }`}
                                                    />
                                                </div>
                                            </SidebarMenuButton>
                                        )}
                                    </SidebarMenuItem>

                                    {state !== "collapsed" && expandedItems[item.title] && renderSubMenu(item.children)}
                                </>
                            ) : (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive(item.href, item.activePaths)}
                                        data-current={false}
                                        tooltip={{ children: item.title }}
                                        className="rounded-lg py-2 px-2.5 font-medium text-gray-700 hover:bg-gray-100 data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-700"
                                        style={activeItemStyle(isActive(item.href, item.activePaths))}
                                    >
                                        {item.target === '_blank' ? (
                                            <a
                                                href={item.href || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between w-full"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {item.icon && <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
                                                    <span className="truncate text-[13.5px]">{item.title}</span>
                                                </div>
                                            </a>
                                        ) : (
                                            <Link
                                                href={item.href || '#'}
                                                prefetch
                                                className="flex items-center justify-between w-full"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {item.icon && <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
                                                    <span className="truncate text-[13.5px]">{item.title}</span>
                                                </div>
                                            </Link>
                                        )}
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                        </div>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
