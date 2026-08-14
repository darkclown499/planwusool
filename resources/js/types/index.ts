import { type PageProps } from '@inertiajs/core';
import type { LucideIcon } from 'lucide-react';

export interface Plan {
    id: number;
    name: string;
    slug?: string;
    description?: string;
    price?: number | string;
    monthly_price?: number | string;
    yearly_price?: number | string;
    duration?: number | string;
    theme_limit?: number;
    store_limit?: number;
    product_limit?: number;
    is_default?: number | boolean;
    [key: string]: unknown;
}

export interface Store {
    id: string | number;
    name: string;
    slug: string;
    theme?: string;
    logo?: string;
    email?: string;
    description?: string;
    domain?: string | null;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    email_verified_at?: string | null;
    type: string;
    lang?: string;
    current_store?: string | number | null;
    created_by?: number | null;
    plan_id?: number | null;
    plan?: Plan | null;
    stores?: Store[];
    is_trial?: number | boolean;
    is_enable_login?: number | boolean;
    status?: number | boolean;
    mode?: string;
    storage_limit?: number | null;
    delete_status?: number | boolean;
    [key: string]: unknown;
}

export interface SharedData extends PageProps {
    auth: {
        user: User | null;
        roles?: string[];
        permissions?: string[];
        lang: string;
        stores: Store[];
    };
    stores?: Store[];
    flash?: {
        success?: string;
        error?: string;
        warning?: string;
        info?: string;
    };
    globalSettings?: Record<string, any>;
    superadminSettings?: Record<string, any>;
    storeCurrency?: Record<string, any>;
    isLoggedIn?: boolean;
    customer?: unknown;
    customer_address?: unknown[];
    name?: string;
    base_url?: string;
    quote?: { message: string; author: string };
    csrf_token?: string;
    is_demo?: boolean;
    title?: string;
}

export interface AuthPageProps extends PageProps {
    settings?: Record<string, unknown>;
    authProviders?: string[];
    rtl?: boolean;
}

export interface NavItem {
    title: string;
    href?: string;
    icon?: LucideIcon;
    permission?: string;
    activePaths?: string[];
    children?: NavItem[];
    target?: string;
    groupLabel?: string;
}

export interface BreadcrumbItem {
    title: string;
    href?: string;
}

export interface PageAction {
    label: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    onClick?: () => void;
    disabled?: boolean;
}
