import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { designTokens } from '@/styles/tokens';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'error';
  weight?: keyof typeof designTokens.typography.weights;
  align?: 'left' | 'center' | 'right';
  style?: TextStyle;
}

export default function Typography({
  children,
  variant = 'body',
  color,
  weight,
  align = 'left',
  style,
}: TypographyProps) {
  const { colors } = useTheme();

  const getVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'h1':
        return {
          fontSize: designTokens.typography.sizes['5xl'],
          fontWeight: designTokens.typography.weights.bold,
          lineHeight: designTokens.typography.sizes['5xl'] * designTokens.typography.lineHeights.tight,
        };
      case 'h2':
        return {
          fontSize: designTokens.typography.sizes['3xl'],
          fontWeight: designTokens.typography.weights.bold,
          lineHeight: designTokens.typography.sizes['3xl'] * designTokens.typography.lineHeights.tight,
        };
      case 'h3':
        return {
          fontSize: designTokens.typography.sizes['2xl'],
          fontWeight: designTokens.typography.weights.bold,
          lineHeight: designTokens.typography.sizes['2xl'] * designTokens.typography.lineHeights.normal,
        };
      case 'h4':
        return {
          fontSize: designTokens.typography.sizes.xl,
          fontWeight: designTokens.typography.weights.medium,
          lineHeight: designTokens.typography.sizes.xl * designTokens.typography.lineHeights.normal,
        };
      case 'body':
        return {
          fontSize: designTokens.typography.sizes.base,
          fontWeight: designTokens.typography.weights.regular,
          lineHeight: designTokens.typography.sizes.base * designTokens.typography.lineHeights.normal,
        };
      case 'caption':
        return {
          fontSize: designTokens.typography.sizes.sm,
          fontWeight: designTokens.typography.weights.regular,
          lineHeight: designTokens.typography.sizes.sm * designTokens.typography.lineHeights.normal,
        };
      case 'label':
        return {
          fontSize: designTokens.typography.sizes.sm,
          fontWeight: designTokens.typography.weights.medium,
          lineHeight: designTokens.typography.sizes.sm * designTokens.typography.lineHeights.normal,
        };
      default:
        return {};
    }
  };

  const getTextColor = (): string => {
    if (color) {
      switch (color) {
        case 'primary':
          return colors.primary;
        case 'secondary':
          return colors.textSecondary;
        case 'accent':
          return colors.accent;
        case 'success':
          return colors.success;
        case 'error':
          return colors.error;
        default:
          return colors.text;
      }
    }
    return colors.text;
  };

  const textStyle: TextStyle = {
    fontFamily: designTokens.typography.fontFamily,
    color: getTextColor(),
    textAlign: align,
    fontWeight: weight ? designTokens.typography.weights[weight] : undefined,
    ...getVariantStyle(),
  };

  return <Text style={[textStyle, style]}>{children}</Text>;
}