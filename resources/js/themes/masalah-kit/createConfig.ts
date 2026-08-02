import { MasalahThemeConfig } from './MasalahThemeConfig';
import { DEFAULT_MASALAH_CONFIG } from './MasalahThemeProvider';

export type MasalahThemeConfigOverride = Partial<MasalahThemeConfig> & {
  id: string;
  name: string;
  sectorLabel: string;
};

export const createMasalahConfig = (override: MasalahThemeConfigOverride): MasalahThemeConfig => {
  return {
    ...DEFAULT_MASALAH_CONFIG,
    ...override,
    colors: { ...DEFAULT_MASALAH_CONFIG.colors, ...(override.colors || {}) },
    layout: { ...DEFAULT_MASALAH_CONFIG.layout, ...(override.layout || {}) },
    copy: { ...DEFAULT_MASALAH_CONFIG.copy, ...(override.copy || {}) }
  };
};
