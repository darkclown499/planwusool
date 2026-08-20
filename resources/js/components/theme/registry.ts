import { lazy, ComponentType } from 'react';

/**
 * Engine Theme Registry
 * ---------------------
 * Maps engine theme ids to their (lazily loaded) module components, mirroring
 * the template registry so the storefront router can detect engine themes and
 * hand them to the ThemeEngine. Each module folder also carries a
 * `theme.config.json` that the engine turns into live CSS variables.
 */

export const ENGINE_THEME_IDS = ['market-fast', 'fashion-luxe', 'fresh-produce'] as const;

export type EngineThemeId = (typeof ENGINE_THEME_IDS)[number];

export interface EngineThemeModule {
  id: string;
  Component: ComponentType<any>;
  /** Relative config file path (used for the runtime override URL). */
  configFile: string;
}

const ENGINE_MODULES: Record<EngineThemeId, () => Promise<{ default: ComponentType<any> }>> = {
  'market-fast': () => import('./modules/market-fast/MarketFastModule'),
  'fashion-luxe': () => import('./modules/fashion-luxe/FashionLuxeModule'),
  'fresh-produce': () => import('./modules/fresh-produce/FreshProduceModule'),
};

export const ENGINE_THEME_META: Record<EngineThemeId, Omit<EngineThemeModule, 'Component'>> = {
  'market-fast': { id: 'market-fast', configFile: 'market-fast/theme.config.json' },
  'fashion-luxe': { id: 'fashion-luxe', configFile: 'fashion-luxe/theme.config.json' },
  'fresh-produce': { id: 'fresh-produce', configFile: 'fresh-produce/theme.config.json' },
};

/** True when the template/theme slug belongs to the engine floor. */
export function isEngineTheme(id?: string | null): boolean {
  return !!id && (ENGINE_THEME_IDS as readonly string[]).includes(id);
}

/** Lazy component for an engine theme (null for non-engine themes). */
export function getEngineThemeComponent(id: string): ComponentType<any> | null {
  if (!isEngineTheme(id)) return null;
  const loader = ENGINE_MODULES[id as EngineThemeId];
  return lazy(loader);
}

/** Runtime `theme.config.json` URL used by the engine (served from public/). */
export function engineThemeConfigUrl(id: string): string {
  return `/theme-configs/${id}.json`;
}