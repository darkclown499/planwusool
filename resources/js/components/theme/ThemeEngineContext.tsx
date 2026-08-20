import {
  ThemeConfig,
  normalizeThemeConfig,
  validateThemeConfig,
  applyThemeToDocument,
  getThemePreset,
} from '@/config/theme.schema';
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export interface ThemeEngineContextValue {
  themeId: string;
  config: ThemeConfig;
  hydrated: boolean;
}

const ThemeEngineContext = createContext<ThemeEngineContextValue | undefined>(undefined);

export const useThemeEngine = (): ThemeEngineContextValue => {
  const ctx = useContext(ThemeEngineContext);
  if (!ctx) throw new Error('useThemeEngine must be used within <ThemeEngine>');
  return ctx;
};

/**
 * Resolve the active theme config for a store.
 *
 * Priority:
 *   1. `serverConfig` - passed from the server when the store saved a custom
 *      `theme.config.json` (see ThemeController).
 *   2. Runtime fetch of `/theme-configs/<id>.json` (live override, used in
 *      preview mode or when the file lives in public storage).
 *   3. The bundled preset for the theme (shipped next to each module).
 *
 * The optional remote merge lets merchants ship per-store JSON overrides
 * without a redeploy, while every shipped store still works offline from the
 * bundled preset. The fetched file is fused over the preset so a partial JSON
 * (e.g. only `styling.primaryColor`) never blanks the rest of the theme.
 */
export function useEngineConfig(
  themeId: string,
  serverConfig?: unknown,
  configUrl?: string
): { config: ThemeConfig; hydrated: boolean } {
  const [remote, setRemote] = useState<ThemeConfig | null>(null);
  const [hydrated, setHydrated] = useState(!!serverConfig);

  const preset = useMemo(() => getThemePreset(themeId), [themeId]);

  const config = useMemo(() => {
    if (serverConfig) {
      try {
        return validateThemeConfig({ ...preset, ...(serverConfig as object), id: themeId });
      } catch (error) {
        console.error('[ThemeEngine] invalid server theme config', error);
      }
    }
    return normalizeThemeConfig(remote ?? preset);
  }, [themeId, serverConfig, remote, preset]);

  useEffect(() => {
    applyThemeToDocument(config);
  }, [config]);

  // Best-effort live `theme.config.json` override (used for previews / per-store
  // storage overrides). Never fails a page when the URL 404s - keep the preset.
  useEffect(() => {
    if (serverConfig || !configUrl) return;
    let cancelled = false;
    fetch(configUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        try {
          setRemote(validateThemeConfig({ ...getThemePreset(themeId), ...(json as object), id: themeId }));
        } catch (error) {
          console.error('[ThemeEngine] failed to parse remote theme.config.json', error);
        }
      })
      .catch(() => console.warn(`[ThemeEngine] no runtime theme.config.json at ${configUrl}`))
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, serverConfig, configUrl]);

  return { config, hydrated };
}

export interface ThemeEngineProviderProps {
  themeId: string;
  serverConfig?: unknown;
  /** Optional remote `theme.config.json` URL for live overrides in preview. */
  configUrl?: string;
  children: ReactNode;
}

export const ThemeEngineProvider: React.FC<ThemeEngineProviderProps> = ({
  themeId,
  serverConfig,
  configUrl,
  children,
}) => {
  const { config, hydrated } = useEngineConfig(themeId, serverConfig, configUrl);
  const value = useMemo(() => ({ themeId, config, hydrated }), [themeId, config, hydrated]);

  return <ThemeEngineContext.Provider value={value}>{children}</ThemeEngineContext.Provider>;
}