import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { designTokens } from '@/styles/tokens';
import Typography from './Typography';

interface StatusBadgeProps {
  status: 'passed' | 'failed' | 'warning' | 'pending';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const { colors } = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'passed':
        return {
          icon: CheckCircle,
          color: colors.success,
          backgroundColor: colors.success + '20',
          label: label || 'Passed',
        };
      case 'failed':
        return {
          icon: XCircle,
          color: colors.error,
          backgroundColor: colors.error + '20',
          label: label || 'Failed',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: colors.accent,
          backgroundColor: colors.accent + '20',
          label: label || 'Warning',
        };
      case 'pending':
        return {
          icon: AlertTriangle,
          color: colors.textSecondary,
          backgroundColor: colors.border,
          label: label || 'Pending',
        };
      default:
        return {
          icon: AlertTriangle,
          color: colors.textSecondary,
          backgroundColor: colors.border,
          label: label || 'Unknown',
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;
  
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const padding = size === 'sm' ? designTokens.spacing.xs : size === 'lg' ? designTokens.spacing.md : designTokens.spacing.sm;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          padding,
        },
      ]}
    >
      <IconComponent size={iconSize} color={config.color} />
      {label && (
        <Typography
          variant={size === 'sm' ? 'caption' : 'label'}
          style={[styles.label, { color: config.color }]}
        >
          {config.label}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: designTokens.borderRadius.full,
    alignSelf: 'flex-start',
  },
  label: {
    marginLeft: designTokens.spacing.xs,
  },
});