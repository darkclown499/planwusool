import React, { lazy, ComponentType } from 'react';

export interface ThemeMetadata {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  features: string[];
  previewUrl?: string;
}

export interface ThemeModule {
  default: ComponentType<any>;
  metadata: ThemeMetadata;
}

export interface RegisteredTheme {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  features: string[];
  previewUrl?: string;
  component: () => Promise<ComponentType<any>>;
  metadata: ThemeMetadata;
}

class ThemeRegistry {
  private themes: Map<string, RegisteredTheme> = new Map();
  private static instance: ThemeRegistry;

  static getInstance(): ThemeRegistry {
    if (!ThemeRegistry.instance) {
      ThemeRegistry.instance = new ThemeRegistry();
    }
    return ThemeRegistry.instance;
  }

  register(themeModule: () => Promise<ThemeModule>): void {
    themeModule().then((module) => {
      const { default: Component, metadata } = module;
      const id = metadata.id;

      if (this.themes.has(id)) {
        console.warn(`Theme ${id} is already registered, overwriting`);
      }

      this.themes.set(id, {
        id: metadata.id,
        name: metadata.name,
        description: metadata.description,
        thumbnail: metadata.thumbnail,
        category: metadata.category,
        features: metadata.features,
        previewUrl: metadata.previewUrl,
        component: () => Promise.resolve(Component),
        metadata,
      });
    });
  }

  getTheme(id: string): RegisteredTheme | undefined {
    return this.themes.get(id);
  }

  getAllThemes(): RegisteredTheme[] {
    return Array.from(this.themes.values());
  }

  getThemesByCategory(category: string): RegisteredTheme[] {
    return Array.from(this.themes.values()).filter(t => t.category === category);
  }

  hasTheme(id: string): boolean {
    return this.themes.has(id);
  }
}

export const themeRegistry = ThemeRegistry.getInstance();

/**
 * Helper function to register a theme
 * Usage in theme's index.ts:
 * import { registerTheme } from '@/themes/base/ThemeRegistry';
 * registerTheme(import('./components'));
 */
export function registerTheme(themeModule: () => Promise<any>): void {
  themeRegistry.register(themeModule);
}

export function getTheme(id: string) {
  return themeRegistry.getTheme(id);
}

export function getAllThemes() {
  return themeRegistry.getAllThemes();
}

export function getThemesByCategory(category: string) {
  return themeRegistry.getThemesByCategory(category);
}