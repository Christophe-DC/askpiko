import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  AccessibilityInfo,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Camera, Mic, Smartphone, Battery, Shield, ArrowRight, Settings, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Typography from '@/components/ui/Typography';
import StatusBadge from '@/components/ui/StatusBadge';
import { designTokens } from '@/styles/tokens';

const { width, height } = Dimensions.get('window');

interface Permission {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  granted: boolean;
  required: boolean;
}

interface PermissionOverlayProps {
  visible: boolean;
  permissions: Permission[];
  onRequestPermission: (permissionId: string) => Promise<boolean>;
  onComplete: () => void;
  onSkip?: () => void;
  title?: string;
  subtitle?: string;
}

export default function PermissionOverlay({
  visible,
  permissions,
  onRequestPermission,
  onComplete,
  onSkip,
  title = "Welcome to AskPiko",
  subtitle = "We need a few permissions to provide the best diagnostic experience"
}: PermissionOverlayProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animatedValue] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(0));
  const [isRequesting, setIsRequesting] = useState(false);
  const [localPermissions, setLocalPermissions] = useState(permissions);
  const [showAllPermissions, setShowAllPermissions] = useState(false);

  const currentPermission = localPermissions[currentIndex];
  const isLastPermission = currentIndex === localPermissions.length - 1;
  const allRequiredGranted = localPermissions
    .filter(p => p.required)
    .every(p => p.granted);
  const grantedCount = localPermissions.filter(p => p.granted).length;
  const totalCount = localPermissions.length;

  useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  useEffect(() => {
    if (visible) {
      // Announce to screen readers
      AccessibilityInfo.announceForAccessibility(
        `Permission setup screen opened. ${grantedCount} of ${totalCount} permissions granted.`
      );

      Animated.parallel([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      animatedValue.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible]);

  const handleRequestPermission = async () => {
    if (!currentPermission) return;

    setIsRequesting(true);
    try {
      const granted = await onRequestPermission(currentPermission.id);
      
      setLocalPermissions(prev => 
        prev.map(p => 
          p.id === currentPermission.id 
            ? { ...p, granted } 
            : p
        )
      );

      // Announce result to screen readers
      AccessibilityInfo.announceForAccessibility(
        granted 
          ? `${currentPermission.title} permission granted`
          : `${currentPermission.title} permission denied`
      );

      setTimeout(() => {
        if (isLastPermission || showAllPermissions) {
          if (allRequiredGranted || granted) {
            onComplete();
          }
        } else {
          animateToNext();
        }
      }, 1000);
    } catch (error) {
      console.error('Permission request failed:', error);
      AccessibilityInfo.announceForAccessibility('Permission request failed. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  const animateToNext = () => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 200);
  };

  const handleSkip = () => {
    AccessibilityInfo.announceForAccessibility('Skipping permission setup');
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  const handleShowAllPermissions = () => {
    setShowAllPermissions(true);
    AccessibilityInfo.announceForAccessibility('Showing all permissions at once');
  };

  const renderProgressHeader = () => (
    <View style={styles.progressHeader}>
      <View style={styles.progressInfo}>
        <Typography variant="h1" style={[styles.progressNumber, { color: colors.primary }]}>
          {grantedCount}
        </Typography>
        <Typography variant="caption" color="secondary">
          of {totalCount} granted
        </Typography>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${(grantedCount / totalCount) * 100}%`,
              }
            ]}
          />
        </View>
        <Typography variant="caption" color="secondary" style={styles.progressText}>
          {Math.round((grantedCount / totalCount) * 100)}% complete
        </Typography>
      </View>
    </View>
  );

  const renderSinglePermissionCard = () => {
    if (!currentPermission) return null;

    const IconComponent = currentPermission.icon;
    const slideTransform = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    });

    return (
      <Animated.View 
        style={[
          {
            transform: [
              { translateY: slideTransform },
              { scale: slideAnim }
            ],
            opacity: slideAnim,
          }
        ]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${currentPermission.title} permission. ${currentPermission.description}. ${currentPermission.granted ? 'Already granted' : 'Tap to grant'}`}
      >
        <Card style={[styles.permissionCard, { borderColor: currentPermission.color + '30' }]}>
          <View style={[styles.iconContainer, { backgroundColor: currentPermission.color + '15' }]}>
            <IconComponent size={56} color={currentPermission.color} />
            {currentPermission.granted && (
              <View style={[styles.grantedBadge, { backgroundColor: colors.success }]}>
                <CheckCircle size={20} color="#FFFFFF" />
              </View>
            )}
          </View>
          
          <Typography variant="h3" align="center" style={styles.permissionTitle}>
            {currentPermission.title}
          </Typography>
          <Typography variant="body" color="secondary" align="center" style={styles.permissionDescription}>
            {currentPermission.description}
          </Typography>
          
          <View style={styles.statusContainer}>
            <StatusBadge 
              status={currentPermission.granted ? 'passed' : 'pending'} 
              label={currentPermission.granted ? 'Permission Granted' : currentPermission.required ? 'Required' : 'Optional'}
              size="lg"
            />
          </View>
        </Card>
      </Animated.View>
    );
  };

  const renderAllPermissionsGrid = () => (
    <ScrollView 
      style={styles.permissionsGrid}
      showsVerticalScrollIndicator={false}
      accessible={true}
      accessibilityLabel="All permissions list"
    >
      {localPermissions.map((permission, index) => {
        const IconComponent = permission.icon;
        return (
          <TouchableOpacity
            key={permission.id}
            style={[
              styles.permissionGridItem,
              { 
                borderColor: permission.granted ? colors.success : colors.border,
                backgroundColor: permission.granted ? colors.success + '10' : colors.surfaceSecondary,
              }
            ]}
            onPress={() => !permission.granted && onRequestPermission(permission.id)}
            disabled={permission.granted || isRequesting}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${permission.title}. ${permission.description}. ${permission.granted ? 'Granted' : 'Tap to grant'}`}
            accessibilityState={{ disabled: permission.granted }}
          >
            <View style={styles.gridItemHeader}>
              <View style={[styles.gridIconContainer, { backgroundColor: permission.color + '20' }]}>
                <IconComponent size={24} color={permission.color} />
              </View>
              {permission.granted ? (
                <CheckCircle size={20} color={colors.success} />
              ) : (
                <AlertCircle size={20} color={colors.textSecondary} />
              )}
            </View>
            
            <Typography variant="label" style={styles.gridItemTitle}>
              {permission.title}
            </Typography>
            <Typography variant="caption" color="secondary" style={styles.gridItemDescription}>
              {permission.description}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderActionButtons = () => (
    <View style={styles.actionContainer}>
      {!showAllPermissions && !currentPermission?.granted && (
        <Button
          title={isRequesting ? 'Requesting...' : 'Grant Permission'}
          onPress={handleRequestPermission}
          disabled={isRequesting}
          loading={isRequesting}
          icon={!isRequesting ? <ArrowRight size={20} color="#FFFFFF" /> : undefined}
          style={styles.primaryButton}
        />
      )}

      {!showAllPermissions && currentPermission?.granted && (
        <Button
          title={isLastPermission ? 'Continue to App' : 'Next Permission'}
          onPress={() => {
            if (isLastPermission) {
              onComplete();
            } else {
              animateToNext();
            }
          }}
          icon={<ArrowRight size={20} color="#FFFFFF" />}
          style={styles.primaryButton}
        />
      )}

      {showAllPermissions && allRequiredGranted && (
        <Button
          title="Continue to App"
          onPress={onComplete}
          icon={<ArrowRight size={20} color="#FFFFFF" />}
          style={styles.primaryButton}
        />
      )}

      <View style={styles.secondaryActions}>
        {!showAllPermissions && !isLastPermission && (
          <Button
            title="Show All Permissions"
            variant="secondary"
            onPress={handleShowAllPermissions}
            style={styles.secondaryButton}
          />
        )}

        {!allRequiredGranted && (
          <Button
            title="Skip for Now"
            variant="ghost"
            onPress={handleSkip}
            style={styles.skipButton}
          />
        )}
      </View>
    </View>
  );

  if (!visible) return null;

  // Calculate safe container height to avoid system buttons
  const safeContainerHeight = height - insets.top - insets.bottom - 120;
  const maxContainerHeight = Math.min(safeContainerHeight, height * 0.9);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      accessible={true}
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBlur]} />
        )}
        
        <Animated.View
          style={[
            styles.container,
            {
              opacity: animatedValue,
              maxHeight: maxContainerHeight,
              marginTop: insets.top + 20,
              marginBottom: Math.max(insets.bottom + 40, 80),
              transform: [
                {
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Card style={styles.content}>
            <ScrollView 
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.header}>
                <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Shield size={40} color={colors.primary} />
                </View>
                <Typography variant="h2" align="center" style={styles.title}>
                  {title}
                </Typography>
                <Typography variant="body" color="secondary" align="center" style={styles.subtitle}>
                  {subtitle}
                </Typography>
              </View>

              {renderProgressHeader()}
              
              {showAllPermissions ? renderAllPermissionsGrid() : renderSinglePermissionCard()}
            </ScrollView>
            
            {renderActionButtons()}

            <TouchableOpacity 
              style={styles.settingsHint}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="You can change these permissions later in device settings"
            >
              <Settings size={16} color={colors.textSecondary} />
              <Typography variant="caption" color="secondary" style={styles.settingsText}>
                You can change these permissions later in Settings
              </Typography>
            </TouchableOpacity>
          </Card>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  androidBlur: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    width: width * 0.92,
    maxWidth: 420,
    flex: 1,
  },
  content: {
    flex: 1,
    ...designTokens.shadows.xl,
    borderRadius: designTokens.borderRadius['2xl'],
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: designTokens.spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.xl,
    paddingTop: designTokens.spacing.md,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  title: {
    marginBottom: designTokens.spacing.sm,
    fontWeight: '700',
  },
  subtitle: {
    maxWidth: 300,
    lineHeight: 22,
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.xl,
    paddingHorizontal: designTokens.spacing.lg,
  },
  progressInfo: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  progressNumber: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 52,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: designTokens.spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontWeight: '600',
  },
  permissionCard: {
    alignItems: 'center',
    marginHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.lg,
    padding: designTokens.spacing.xl,
    borderWidth: 2,
    borderRadius: designTokens.borderRadius.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
    position: 'relative',
  },
  grantedBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  permissionTitle: {
    marginBottom: designTokens.spacing.md,
    fontWeight: '700',
  },
  permissionDescription: {
    marginBottom: designTokens.spacing.lg,
    maxWidth: 280,
    lineHeight: 22,
  },
  statusContainer: {
    alignItems: 'center',
  },
  permissionsGrid: {
    flex: 1,
    paddingHorizontal: designTokens.spacing.lg,
  },
  permissionGridItem: {
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 2,
  },
  gridItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  gridIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridItemTitle: {
    marginBottom: designTokens.spacing.xs,
    fontWeight: '600',
  },
  gridItemDescription: {
    lineHeight: 18,
  },
  actionContainer: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.sm,
  },
  primaryButton: {
    marginBottom: designTokens.spacing.md,
    height: 52,
    borderRadius: designTokens.borderRadius.lg,
  },
  secondaryActions: {
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  secondaryButton: {
    marginBottom: designTokens.spacing.sm,
  },
  skipButton: {
    marginBottom: designTokens.spacing.xs,
  },
  settingsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  settingsText: {
    marginLeft: designTokens.spacing.xs,
    fontSize: 12,
  },
});