import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { designTokens } from '@/styles/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof designTokens.spacing;
  shadow?: keyof typeof designTokens.shadows;
}

export default function Card({ 
  children, 
  style, 
  padding = 'lg',
  shadow = 'md' 
}: CardProps) {
  const { colors } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing[padding],
    borderWidth: 1,
    borderColor: colors.border,
    ...designTokens.shadows[shadow],
  };

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}