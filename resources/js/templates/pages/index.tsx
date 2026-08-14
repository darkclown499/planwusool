import React from 'react';
import basic from './basic';
import arabicGadgets from './arabic-gadgets';
import wefaq from './wefaq';
import type { TemplatePageProps } from './types';

/**
 * Dedicated full-page template implementations.
 * The storefront renders the template matching the store's theme slug.
 */
export const TEMPLATE_PAGES: Record<string, React.FC<TemplatePageProps>> = {
    basic,
    'arabic-gadgets': arabicGadgets,
    wefaq,
};

export function hasDedicatedPage(slug?: string): boolean {
    return !!slug && !!TEMPLATE_PAGES[slug];
}
