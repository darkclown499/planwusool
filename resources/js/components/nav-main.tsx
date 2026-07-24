import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';

const STORAGE_KEY = 'nav_expanded_items';

export function NavMain({ items = [], position }: { items: NavItem[]; position: 'left' | 'right' }) {
    const page = usePage();
    const { state } = useSidebar();
    const { themeColor, customColor } = useBrand();
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    const getActiveColor = () => {
        return themeColor === 'custom' ? customColor : THEME_COLORS[themeColor];
    };

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
            const isChildItemActive = isActive(child.href, child.activePaths);
            const hasActiveChild = child.children && isChildItemActive(child.children);

            if (child.children && (isChildItemActive || hasActiveChild)) {
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

    const isActive = (href?: string, activePaths?: string[]): boolean => {
        const currentPath = page.url.split('?')[0];

        if (activePaths && activePaths.length > 0) {
            for (const path of activePaths) {
                if (currentPath === path || currentPath.startsWith(path + '/')) {
                    return true;
                }
            }
        }

        if (!href) return false;

        const hrefPath = href.startsWith('http') ? new URL(href).pathname : href;

        const active = currentPath === hrefPath || currentPath.startsWith(hrefPath + '/');
        return active;
    };

    const isChildActive = (children?: NavItem[]): boolean => {
        if (!children) return false;
        return children.some(child => isActive(child.href, child.activePaths) || isChildActive(child.children));
    };

    const renderSubMenu = (children: NavItem[], level: number = 1) => {
        return (
            <SidebarMenuSub dir={isRTL ? 'rtl' : 'ltr'}>
                {children.map(child => (
                    <div key={child.title}>
                        {child.children ? (
                            <>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton
                                        isActive={isChildActive(child.children)}
                                        data-current={false}
                                        onClick={() => toggleExpand(`${level}-${child.title}`)}
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <span className="flex-1">{child.title}</span>
                                            {state !== "collapsed" && (
                                                expandedItems[`${level}-${child.title}`] ?
                                                    <ChevronDown className="h-3 w-3 shrink-0" /> :
                                                    <ChevronRight className="h-3 w-3 shrink-0" />
                                            )}
                                        </div>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                {expandedItems[`${level}-${child.title}`] && renderSubMenu(child.children, level + 1)}
                            </>
                        ) : (
                            <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={isActive(child.href, child.activePaths)} data-current={isActive(child.href, child.activePaths)}>
                                    <Link
                                        href={child.href || '#'}
                                        prefetch
                                        target={child.target}
                                        className="flex items-center gap-3 w-full"
                                    >
                                        <span className="flex-1">{child.title}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        )}
                    </div>
                ))}
            </SidebarMenuSub>
        );
    };

    return (
        <SidebarGroup dir={isRTL ? 'rtl' : 'ltr'}>
            <SidebarMenu>
                {items.map((item) => (
                    <div key={item.groupLabel ? `group-${item.groupLabel}` : item.title}>
                        {item.groupLabel && (
                            <div className={`mt-5 mb-2 px-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase border-b border-border/40 pb-1`}>
                                {item.groupLabel}
                            </div>
                        )}
                        {item.children ? (
                            <>
                                <SidebarMenuItem>
                                    {state === "collapsed" ? (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <SidebarMenuButton
                                                    isActive={isChildActive(item.children)}
                                                    data-current={false}
                                                    tooltip={{ children: item.title }}
                                                >
                                                    <div className="flex items-center gap-2 w-full">
                                                        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
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
                                                                    <DropdownMenuItem key={subChild.title} asChild>
                                                                        <Link href={subChild.href || '#'} prefetch>
                                                                            {subChild.title}
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuSub>
                                                    ) : (
                                                        <DropdownMenuItem key={child.title} asChild>
                                                            <Link href={child.href || '#'} prefetch>
                                                                {child.title}
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ) : (
                                        <SidebarMenuButton
                                            isActive={isChildActive(item.children)}
                                            data-current={false}
                                            tooltip={{ children: item.title }}
                                            onClick={() => toggleExpand(item.title)}
                                            style={isChildActive(item.children) ? { borderInlineStart: `3px solid ${getActiveColor()}`, backgroundColor: `${getActiveColor()}10` } : undefined}
                                        >
                                            <div className="flex items-center gap-3 w-full">
                                                {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                                <span className="flex-1">{item.title}</span>
                                                {expandedItems[item.title] ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                                            </div>
                                        </SidebarMenuButton>
                                    )}
                                </SidebarMenuItem>

                                {state !== "collapsed" && expandedItems[item.title] && renderSubMenu(item.children)}
                            </>
                        ) : (
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isActive(item.href, item.activePaths)} data-current={false} tooltip={{ children: item.title }}
                                    style={isActive(item.href, item.activePaths) ? { borderInlineStart: `3px solid ${getActiveColor()}`, backgroundColor: `${getActiveColor()}10` } : undefined}>
                                    {item.target === '_blank' ? (
                                        <a
                                            href={item.href || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 w-full"
                                        >
                                            {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                            <span className="flex-1">{item.title}</span>
                                        </a>
                                    ) : (
                                        <Link
                                            href={item.href || '#'}
                                            prefetch
                                            className="flex items-center gap-3 w-full"
                                        >
                                            {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                            <span className="flex-1">{item.title}</span>
                                        </Link>
                                    )}
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}
                    </div>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
