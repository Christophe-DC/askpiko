import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  interpolate,
  Easing
} from 'react-native-reanimated';
import { Mic, Volume2, Loader, MessageCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { designTokens } from '@/styles/tokens';
import Typography from './Typography';

interface VoiceIndicatorProps {
  isConnected?: boolean;
  isListening?: boolean;
  isSpeaking?: boolean;
  isThinking?: boolean;
  lastMessage?: string;
  error?: string | null;
}

export default function VoiceIndicator({
  isConnected = false,
  isListening = false,
  isSpeaking = false,
  isThinking = false,
  lastMessage = '',
  error = null
}: VoiceIndicatorProps) {
  const { colors } = useTheme();
  const pulseAnimation = useSharedValue(0);
  const waveAnimation = useSharedValue(0);

  React.useEffect(() => {
    if (isListening || isSpeaking || isThinking) {
      pulseAnimation.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      
      waveAnimation.value = withRepeat(
        withTiming(1, { duration: 800, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      pulseAnimation.value = withTiming(0);
      waveAnimation.value = withTiming(0);
    }
  }, [isListening, isSpeaking, isThinking]);

  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnimation.value, [0, 1], [1, 1.2]);
    const opacity = interpolate(pulseAnimation.value, [0, 1], [0.6, 1]);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const waveStyle = useAnimatedStyle(() => {
    const scale = interpolate(waveAnimation.value, [0, 1], [1, 1.5]);
    const opacity = interpolate(waveAnimation.value, [0, 1], [0.8, 0]);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const getStatusColor = () => {
    if (error) return colors.error;
    if (!isConnected) return colors.textSecondary;
    if (isListening) return colors.primary;
    if (isSpeaking) return colors.accent;
    if (isThinking) return colors.success;
    return colors.border;
  };

  const getStatusText = () => {
    if (error) return 'Voice Error';
    if (!isConnected) return 'Voice Disconnected';
    if (isListening) return 'Listening for your response...';
    if (isSpeaking) return 'Piko is speaking...';
    if (isThinking) return 'Piko is thinking...';
    return 'Voice Ready';
  };

  const getIcon = () => {
    if (error) return <AlertCircle size={24} color={getStatusColor()} />;
    if (isThinking) return <Loader size={24} color={getStatusColor()} />;
    if (isListening) return <Mic size={24} color={getStatusColor()} />;
    if (isSpeaking) return <Volume2 size={24} color={getStatusColor()} />;
    return <MessageCircle size={24} color={getStatusColor()} />;
  };

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.indicatorContainer}>
        {(isListening || isSpeaking || isThinking) && (
          <Animated.View 
            style={[
              styles.wave,
              { backgroundColor: getStatusColor() + '20' },
              waveStyle
            ]} 
          />
        )}
        
        <Animated.View 
          style={[
            styles.iconContainer,
            { backgroundColor: getStatusColor() + '20' },
            pulseStyle
          ]}
        >
          {getIcon()}
        </Animated.View>
      </View>

      <View style={styles.textContainer}>
        <Typography 
          variant="label" 
          style={[styles.statusText, { color: getStatusColor() }]}
        >
          {getStatusText()}
        </Typography>
        
        {lastMessage && !error && (
          <Typography 
            variant="caption" 
            color="secondary" 
            style={styles.lastMessage}
          >
            You said: "{lastMessage}"
          </Typography>
        )}
        
        {error && (
          <Typography 
            variant="caption" 
            color="error" 
            style={styles.errorText}
          >
            {error}
          </Typography>
        )}
        
        {isListening && (
          <Typography 
            variant="caption" 
            color="secondary" 
            style={styles.helpText}
          >
            Say "yes", "ready", "works", or "done" to continue
          </Typography>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 1,
    backgroundColor: 'transparent',
    marginBottom: designTokens.spacing.md,
  },
  indicatorContainer: {
    position: 'relative',
    marginRight: designTokens.spacing.md,
  },
  wave: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    top: -18,
    left: -18,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    marginBottom: designTokens.spacing.xs,
  },
  lastMessage: {
    fontStyle: 'italic',
    marginBottom: designTokens.spacing.xs,
  },
  errorText: {
    fontStyle: 'italic',
    marginBottom: designTokens.spacing.xs,
  },
  helpText: {
    fontSize: 12,
    opacity: 0.8,
  },
});