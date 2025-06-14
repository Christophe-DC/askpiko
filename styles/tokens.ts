export const designTokens = {
  colors: {
    primary: '#0057E1',
    accent: '#FFCF25',
    success: '#2ECC71',
    error: '#E45C5C',
    light: {
      surface: '#FFFFFF',
      text: '#2B2B2B',
      border: '#E0E0E0',
      textSecondary: '#6B7280',
      surfaceSecondary: '#F8FAFC',
    },
    dark: {
      surface: '#111418',
      text: '#F3F4F6',
      border: '#292C33',
      textSecondary: '#9CA3AF',
      surfaceSecondary: '#1F2937',
    },
  },
  typography: {
    fontFamily: 'Inter',
    weights: {
      regular: '400',
      medium: '500',
      bold: '700',
    },
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 28,
      '4xl': 32,
      '5xl': 48,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.6,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  components: {
    button: {
      height: 48,
      borderRadius: 8,
      paddingHorizontal: 24,
    },
  },
};

export type DesignTokens = typeof designTokens;