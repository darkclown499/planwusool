import { PageSection } from '@/templates/sections';
import { SECTION_COMPONENTS } from '@/templates/sections';
import { UpgradePrompt } from '@/templates/PlanGuard';
import type { DesignTokens, TemplateConfig, TemplateSectionConfig } from '@/templates/types';
import { useTemplateAccess } from '@/templates/useTemplateAccess';
import { applyDesignTokensToCSS, mergeDesignTokens, tokensToCssVars } from '@/utils/designTokens';
import React, { useEffect, useMemo } from 'react';

interface TemplateRendererProps {
    template: TemplateConfig | null;
    storeData?: any;
    designTokens?: DesignTokens | null;
    overrides?: { sections?: TemplateSectionConfig[] } | null;
    userPlanName?: string | null;
    userPlanTier?: 'starter' | 'growth' | 'professional' | null;
    isSuperAdmin?: boolean;
    isPreview?: boolean;
    loading?: boolean;
    demoStoreUrl?: string;
    mode?: 'home' | 'page';
    page?: any;
}

/**
 * TemplateRenderer - renders a store using a template's JSON config.
 * All 29 templates are data-driven (one core design system): this component
 * renders the section list, applies design tokens as CSS variables and gates
 * premium templates with the upgrade prompt.
 */
export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
    template,
    storeData,
    designTokens,
    overrides,
    userPlanName,
    userPlanTier,
    isSuperAdmin = false,
    isPreview = false,
    loading = false,
    demoStoreUrl = '',
    mode = 'home',
    page = null,
}) => {
    const { canActivate, filterSections } = useTemplateAccess({
        templateSlug: template?.slug,
        userPlanName,
        userPlanTier,
        isSuperAdmin,
        isPreview,
    });

    // Merge template tokens with store overrides
    const mergedTokens = useMemo(() => mergeDesignTokens(template?.design_tokens, designTokens), [template?.design_tokens, designTokens]);

    // Apply design tokens to CSS variables
    useEffect(() => {
        applyDesignTokensToCSS(mergedTokens);
    }, [mergedTokens]);

    if (loading) {
        return <StoreSkeleton />;
    }

    if (!template) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
                <h1 className="text-xl font-bold text-gray-900">القالب غير موجود</h1>
                <p className="mt-2 text-sm text-gray-600">لم يتم العثور على القالب المطلوب.</p>
            </div>
        );
    }

    // Locked (premium) template for a viewer without access.
    if (!canActivate) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <UpgradePrompt
                    templateSlug={template.slug}
                    templateName={template.name}
                    requiredPlan={template.plan_required}
                    userPlanName={userPlanName}
                    userPlanTier={userPlanTier}
                    demoStoreUrl={demoStoreUrl}
                />
            </div>
        );
    }

    // Custom store "page" mode: render a simple page within the theme chrome.
    if (mode === 'page' && page) {
        return (
            <div
                className={`min-h-screen overflow-x-hidden ${template.layout.dark_mode ? 'dark' : ''}`}
                style={{
                    background: 'var(--twc-background, #ffffff)',
                    color: 'var(--twc-text-primary, #111827)',
                    ...tokensToCssVars(mergedTokens),
                }}
                dir="rtl"
            >
                <PageSection
                    section={{ id: '__page__', type: 'custom', enabled: true, order: 0, props: {} }}
                    storeData={storeData}
                    designTokens={mergedTokens}
                    isPreview={isPreview}
                    layout={template.layout}
                    page={page}
                />
            </div>
        );
    }

    // Determine effective sections (overrides take precedence)
    const sections: TemplateSectionConfig[] = overrides?.sections?.length ? overrides.sections : template.sections;

    const enabledSections = filterSections(sections.filter((s) => s.enabled));

    // Sidebar templates keep sidebar sections in a sticky aside on desktop.
    const sidebarSections = enabledSections.filter((s) => s.id === 'sidebar' || s.type === 'sidebar');
    const mainSections = enabledSections.filter((s) => s.id !== 'sidebar' && s.type !== 'sidebar');
    const hasSidebar = template.layout.sidebar === true && sidebarSections.length > 0;

    const renderSection = (section: TemplateSectionConfig, index: number) => {
        const Component = SECTION_COMPONENTS[section.type];
        if (!Component) {
            return (
                <div key={section.id} className="bg-amber-50 p-4 text-center text-sm text-amber-800">
                    قسم غير معروف: {section.id} ({section.type})
                </div>
            );
        }
        return (
            <Component
                key={section.id || index}
                section={section}
                storeData={storeData}
                designTokens={mergedTokens}
                isPreview={isPreview}
                layout={template.layout}
                mode={mode}
            />
        );
    };

    return (
        <div
            className={`min-h-screen overflow-x-hidden ${template.layout.dark_mode ? 'dark' : ''}`}
            style={{
                background: 'var(--twc-background, #ffffff)',
                color: 'var(--twc-text-primary, #111827)',
                ...tokensToCssVars(mergedTokens),
            }}
            dir="rtl"
        >
            {hasSidebar ? (
                <div className={`${template.layout.container || 'max-w-7xl'} mx-auto flex flex-col gap-6 px-4 lg:flex-row`}>
                    <aside className="w-full shrink-0 lg:w-64">
                        <div className="lg:sticky lg:top-20">{sidebarSections.map(renderSection)}</div>
                    </aside>
                    <div className="min-w-0 flex-1">{mainSections.map(renderSection)}</div>
                </div>
            ) : (
                mainSections.map(renderSection)
            )}
        </div>
    );
};

/**
 * Loading skeleton for store template.
 */
export const StoreSkeleton: React.FC = () => (
    <div className="min-h-screen bg-gray-50">
        <div className="h-16 animate-pulse bg-gray-200" />
        <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="mx-auto h-10 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="mx-auto mt-4 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-200" />
                ))}
            </div>
        </div>
    </div>
);

export default TemplateRenderer;