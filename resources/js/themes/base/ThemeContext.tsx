import React from 'react';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ThemeContextType {
  theme: string;
  brandColor: string;
  setTheme: (theme: string) => void;
  setBrandColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: string;
  defaultBrandColor?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'basic',
  defaultBrandColor = '#10b77f',
}) => {
  const [theme, setTheme] = useState(defaultTheme);
  const [brandColor, setBrandColor] = useState(defaultBrandColor);

  const value = {
    theme,
    brandColor,
    setTheme,
    setBrandColor,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const withBaseTheme = <T extends Record<string, any>>(
  Component: React.ComponentType<any>,
  defaultProps: Partial<any> = {}
) => {
  return function ThemedComponent(props: any) {
    const { theme, brandColor } = useTheme();
    return (
      <Component
        {...props}
        theme={props.theme || theme}
        brandColor={props.brandColor || brandColor}
      />
    );
  };
}