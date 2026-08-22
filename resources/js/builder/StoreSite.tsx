import React, { useEffect, useMemo } from 'react';
import { getBuilderTemplate, normalizeTemplateSlug } from './templates';
import { getSectionComponent } from './registry';
import { applyTokens, mergeTokens, tokensToStyle, clearTokens } from './design-tokens';
import { canAccessTemplate, getTemplateTierFromPlanName } from './types';
import type { BuilderDesignTokens, PlanTier } from './types';
import { CustomSection } from './sections/Custom';
import { EmptySection, css, sectionDefaults } from './sections/helpers';
import { CategoryListing, type CategoryPageData } from './CategoryListing';
import { getWpTheme } from '@/themes/wp/configs';
import { WpStorefront } from '@/themes/wp/WpStorefront';

export interface StoreSiteProps {
  /** Store theme slug (may be legacy/engine — gets normalized). */
  template: string;
  designTokens?: BuilderDesignTokens | Record<string, any> | null;
  templateOverrides?: { sections?: any[] } | null;
  storeData?: any;
  userPlanTier?: PlanTier | null;
  userPlanName?: string | null;
  isSuperAdmin?: boolean;
  isPreview?: boolean;
  mode?: 'home' | 'page' | 'category';
  page?: any;
  /** Payload for the dedicated /category/{slug} listing page (mode="category"). */
  categoryData?: CategoryPageData | null;
}

/**
 * StoreSite — the one renderer for every template in the new Wusool design
 * system. Reads the template catalog, merges per-store design tokens, applies
 * them as CSS variables and renders the ordered section list (store overrides
 * or template defaults). It replaces both the old JSON TemplateRenderer and
 * the schema-driven ThemeEngine with a single, editor-friendly pipeline.
 */
export const StoreSite: React.FC<StoreSiteProps> = ({
  template,
  designTokens,
  templateOverrides,
  storeData,
  userPlanTier,
  userPlanName,
  isSuperAdmin = false,
  isPreview = false,
  mode = 'home',
  page = null,
  categoryData = null,
}) => {
  const slug = useMemo(() => normalizeTemplateSlug(template), [template]);
  const wpTheme = useMemo(() => getWpTheme(slug), [slug]);
  const tpl = useMemo(() => getBuilderTemplate(slug), [slug]);

  const mergedTokens = useMemo(
    () => mergeTokens(tpl?.tokens, designTokens as BuilderDesignTokens | null | undefined),
    [tpl?.tokens, designTokens]
  );

  // Apply tokens as CSS variables so every section & overlay reads live.
  useEffect(() => {
    applyTokens(mergedTokens);
    return () => clearTokens();
  }, [mergedTokens]);

  const planTier: PlanTier = useMemo(
    () => (userPlanTier ? userPlanTier : getTemplateTierFromPlanName(userPlanName)),
    [userPlanTier, userPlanName]
  );

  const accessible = useMemo(
    () => isSuperAdmin || canAccessTemplate(tpl || { is_free: true, plan_required: 'starter' as PlanTier }, planTier),
    [tpl, planTier, isSuperAdmin]
  );
  const locked = !accessible && !!tpl && !tpl.is_free;

  const sections = useMemo(() => {
    const raw = templateOverrides?.sections?.length ? templateOverrides.sections : tpl?.sections || [];
    return raw
      .filter((sec: any) => sec && sec.enabled !== false)
      .map((sec: any) => ({
        id: sec.id || sec.type || 's',
        type: sec.type,
        enabled: sec.enabled !== false,
        order: Number(sec.order) || 0,
        props: { ...(sectionDefaults(sec.type) || {}), ...(sec.props || {}) },
      }))
      .filter((sec: any) => !!getSectionComponent(sec.type))
      .sort((a: any, b: any) => a.order - b.order);
  }, [tpl, templateOverrides]);

  // Bespoke ported WordPress themes render their own faithful storefront
  // (original markup/CSS/section order, Arabic copy) instead of the generic
  // section pipeline. Merchant designer tokens and section show/hide
  // overrides flow through so live edits appear on these themes too.
  // Page/category modes still use the shared chrome below.
  if (wpTheme && mode === 'home') {
    return (
      <WpStorefront
        theme={wpTheme}
        storeData={storeData}
        designTokens={designTokens as BuilderDesignTokens | null | undefined}
        templateOverrides={templateOverrides}
      />
    );
  }

  if (!tpl) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900">القالب غير موجود</h1>
        <p className="mt-2 text-sm text-gray-600">لم يتم العثور على القالب المطلوب.</p>
      </div>
    );
  }

  if (locked && !isPreview) {
    return (
      <div className="min-h-screen bg-gray-50 p-8" style={{ background: css('--twc-surface', '#f8fafc') }}>
        <UpgradeBlock templateName={tpl.name} requiredTier={tpl.plan_required} planTier={planTier} />
      </div>
    );
  }

  // Custom store page mode: render the page content within the theme chrome.
  if (mode === 'page' && page) {
    return (
      <div className="min-h-screen overflow-x-hidden" style={{ ...tokensToStyle(mergedTokens), background: css('--twc-background', '#ffffff'), color: css('--twc-text-primary', '#0f172a') }} dir="rtl">
        <CustomSection section={{ id: '__page__', type: 'custom', enabled: true, order: 0, props: {} }} storeData={storeData} mode="page" page={page} />
      </div>
    );
  }

  // Category listing mode: store chrome (announcement/header) → category
  // listing (breadcrumb, sort, grid, pagination, WhatsApp share) → footer.
  if (mode === 'category' && categoryData) {
    const chromeBefore = sections.filter((sec: any) => ['announcement', 'header'].includes(sec.type));
    const footer = sections.filter((sec: any) => sec.type === 'footer');
    return (
      <div
        className="min-h-screen overflow-x-hidden"
        style={{
          ...tokensToStyle(mergedTokens),
          background: css('--twc-background', '#ffffff'),
          color: css('--twc-text-primary', '#0f172a'),
        }}
        dir="rtl"
      >
        {chromeBefore.map((sec: any) => {
          const Component = getSectionComponent(sec.type);
          if (!Component) return null;
          return <Component key={sec.id} section={sec} storeData={storeData} mode="home" />;
        })}
        <CategoryListing categoryPage={categoryData} storeData={storeData} />
        {footer.map((sec: any) => {
          const Component = getSectionComponent(sec.type);
          if (!Component) return null;
          return <Component key={sec.id} section={sec} storeData={storeData} mode="home" />;
        })}
      </div>
    );
  }

  const rendered = sections.map((sec: any) => {
    const Component = getSectionComponent(sec.type);
    if (!Component) return null;
    return <Component key={sec.id} section={sec} storeData={storeData} mode="home" />;
  });

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        ...tokensToStyle(mergedTokens),
        background: css('--twc-background', '#ffffff'),
        color: css('--twc-text-primary', '#0f172a'),
      }}
      dir="rtl"
    >
      {rendered.length ? (
        rendered
      ) : (
        <EmptySection title="هذا القالب لا يحتوي أقساماً بعد" hint="افتح المحرر البصري وأضف أقسام المتجر." />
      )}
    </div>
  );
};

const TierLabels: Record<PlanTier, string> = {
  starter: 'باقة البداية',
  growth: 'باقة النمو',
  professional: 'باقة الاحتراف',
};

const UpgradeBlock: React.FC<{ templateName: string; requiredTier: PlanTier; planTier: PlanTier }> = ({
  templateName,
  requiredTier,
  planTier,
}) => (
  <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
      <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <h3 className="text-lg font-bold text-gray-900">قالب «{templateName}» يتطلب ترقية الباقة</h3>
    <p className="mt-2 text-sm text-gray-600">
      هذا القالب متاح في <span className="font-semibold">{TierLabels[requiredTier]}</span> أو أعلى. باقتك الحالية:{' '}
      <span className="font-semibold">{TierLabels[planTier]}</span>
    </p>
    <div className="mt-6 flex justify-center">
      <a href="/plans" className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-amber-700">
        ترقية الباقة الآن
      </a>
    </div>
  </div>
);

export default StoreSite;