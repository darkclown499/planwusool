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

  // If previewing a demo store, allow all templates to render
  return (
    <TemplateRenderer
      template={resolvedTemplate}
      storeData={storeData}
      designTokens={designTokens}
      isPreview={isPreview}
      isSuperAdmin={isLoggedIn || isPreview}
    />
  );
};

export default DynamicStore;