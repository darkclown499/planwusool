import React from 'react';
import basic from './basic';
import type { TemplatePageProps } from './types';

/**
 * Dedicated full-page template implementations.
 * The storefront always renders the "basic" template page.
 */
export const TEMPLATE_PAGES: Record<string, React.FC<TemplatePageProps>> = {
    basic,
};

export function hasDedicatedPage(slug?: string): boolean {
    return !!slug && !!TEMPLATE_PAGES[slug];
}
