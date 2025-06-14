import { useState, useEffect, createContext, useContext } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { designTokens } from '@/styles/tokens';

interface ThemeContextType {
  isDark: boolean;
  colors: typeof designTokens.colors.light & { primary: string; accent: string; success: string; error: string };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useThemeProvider() {
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() || 'light' // Default to light mode
  );

  useEffect(() => {
    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme || 'light'); // Default to light mode if null
    });

    return () => subscription?.remove();
  }, []);

  // Use system theme, defaulting to light mode
  const isDark = systemColorScheme === 'dark';

  // Get current theme colors
  const colors = {
    ...designTokens.colors,
    ...(isDark ? designTokens.colors.dark : designTokens.colors.light),
    primary: designTokens.colors.primary,
    accent: designTokens.colors.accent,
    success: designTokens.colors.success,
    error: designTokens.colors.error,
  };

  return {
    isDark,
    colors,
  };
}

export { ThemeContext };