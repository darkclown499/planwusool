import React from 'react';
import { cn } from '@/lib/utils';

interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  theme?: string;
  brandColor?: string;
}

/**
 * Base component that provides common functionality for all theme components.
 * Themes can extend this to get common functionality like brandColor handling,
 * className merging, etc.
 */
export function BaseComponent<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  defaultProps: Partial<T> = {}
) {
  return function BaseWrapper(props: T & BaseComponentProps) {
    const { className, theme, brandColor, ...rest } = props;
    const mergedProps = { ...defaultProps, ...rest } as T;

    return <Component {...mergedProps} className={cn(defaultProps.className, className)} />;
  };
}

export function withTheme<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  defaultProps: Partial<T> = {}
) {
  return function ThemedComponent(props: T & BaseComponentProps) {
    const { className, theme, brandColor, ...rest } = props;
    const mergedProps = { ...defaultProps, ...rest } as T;

    return (
      <div className={cn(defaultProps.className, className)}>
        <Component {...mergedProps} />
      </div>
    );
  };
}