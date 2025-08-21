import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type Density = 'comfortable' | 'compact';

interface TenantColors {
  primary?: Partial<Record<'50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900', string>>;
  background?: string;
}

interface ThemeContextValue {
  theme: Theme;
  density: Density;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setDensity: (density: Density) => void;
  setTenantColors: (colors: TenantColors) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [density, setDensityState] = useState<Density>(() => (localStorage.getItem('density') as Density) || 'comfortable');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
    localStorage.setItem('density', density);
  }, [density]);

  useEffect(() => {
    const root = document.documentElement;
    const storedPrimary = localStorage.getItem('tenant-primary');
    const storedBackground = localStorage.getItem('tenant-background');
    if (storedBackground) {
      root.style.setProperty('--color-background', storedBackground);
    }
    if (storedPrimary) {
      const palette = JSON.parse(storedPrimary);
      Object.entries(palette).forEach(([shade, value]) => {
        root.style.setProperty(`--color-primary-${shade}`, value as string);
      });
    }
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const setDensity = (d: Density) => setDensityState(d);

  const setTenantColors = (colors: TenantColors) => {
    const root = document.documentElement;
    if (colors.background) {
      root.style.setProperty('--color-background', colors.background);
      localStorage.setItem('tenant-background', colors.background);
    }
    if (colors.primary) {
      Object.entries(colors.primary).forEach(([shade, value]) => {
        root.style.setProperty(`--color-primary-${shade}`, value);
      });
      localStorage.setItem('tenant-primary', JSON.stringify(colors.primary));
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, density, setTheme, toggleTheme, setDensity, setTenantColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
