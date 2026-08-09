import React, { useMemo, useContext } from 'react';
import { TemplateRenderer } from '@/templates/TemplateRenderer';
import { getTemplateConfig } from '@/templates/registry';
import { AuthContext } from '@/contexts/AuthContext';

interface DynamicStoreProps {
  template: string;
  templateConfig?: any;
  designTokens?: any;
  store: any;
  categories: any[];
  products: any[];
  config?: any;
  storeSettings?: any;
  isPreview?: boolean;
  userPlanName?: string | null;
  userPlanTier?: 'starter' | 'growth' | 'professional';
  isSuperAdmin?: boolean;
  demoStoreUrl?: string;
}

/**
 * DynamicStore - renders a store using the new template system.
 * The template config is passed from the controller, or falls back
 * to the static frontend registry.
 */
const DynamicStore: React.FC<DynamicStoreProps> = ({
  template,
  templateConfig,
  designTokens,
  store,
  categories,
  products,
  config,
  storeSettings,
  isPreview = false,
  userPlanName = null,
  userPlanTier = 'starter',
  isSuperAdmin = false,
  demoStoreUrl = '',
}) => {
  // The storefront auth context may not be mounted for guest visits,
  // so read it defensively instead of throwing like useAuth() does.
  const auth = useContext(AuthContext);
  const isLoggedIn = auth?.isLoggedIn ?? false;

  const resolvedTemplate = useMemo(() => {
    if (templateConfig) {
      return templateConfig;
    }
    return getTemplateConfig(template) || getTemplateConfig('basic');
  }, [template, templateConfig]);

  const storeData = useMemo(
    () => ({
      ...store,
      categories,
      products,
      config,
      storeSettings,
    }),
    [store, categories, products, config, storeSettings]
  );

  // Plan gating on the storefront is based on the store owner's plan (passed
  // from the server), not the viewer. Preview/demo + superadmin bypass gating.
  const effectiveSuperAdmin = isSuperAdmin || isLoggedIn || isPreview;

  return (
    <TemplateRenderer
      template={resolvedTemplate}
      storeData={storeData}
      designTokens={designTokens}
      isPreview={isPreview}
      userPlanName={userPlanName}
      userPlanTier={userPlanTier}
      isSuperAdmin={effectiveSuperAdmin}
      demoStoreUrl={demoStoreUrl}
    />
  );
};

export default DynamicStore;