import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Volume2, VolumeX, Power } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useDiagnosticStore } from '@/store/diagnosticStore';
import Typography from './Typography';
import Card from './Card';
import { designTokens } from '@/styles/tokens';

interface ButtonTestProps {
  onComplete: () => void;
  onTimeout: () => void;
  timeoutSeconds: number;
}

export default function ButtonTest({ onComplete, onTimeout, timeoutSeconds }: ButtonTestProps) {
  const { colors } = useTheme();
  const { 
    buttonsPressed, 
    currentButtonToPress,
    initializeButtonTest, 
    pressButton, 
    checkButtonTestComplete 
  } = useDiagnosticStore();
  
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      initializeButtonTest();
      setIsInitialized(true);
    }
  }, [isInitialized, initializeButtonTest]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeout]);

  useEffect(() => {
    if (checkButtonTestComplete()) {
      onComplete();
    }
  }, [buttonsPressed, checkButtonTestComplete, onComplete]);

  // Simulate button presses for testing (in production, use actual hardware events)
  const simulateButtonPress = (button: 'volumeUp' | 'volumeDown' | 'power') => {
    pressButton(button);
  };

  const getButtonStatus = (button: 'volumeUp' | 'volumeDown' | 'power') => {
    if (buttonsPressed[button]) return 'completed';
    if (currentButtonToPress === button) return 'current';
    return 'pending';
  };

  const getButtonColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'current': return colors.primary;
      case 'pending': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getCurrentInstruction = () => {
    switch (currentButtonToPress) {
      case 'volumeUp': return 'Press Volume Up button';
      case 'volumeDown': return 'Press Volume Down button';
      case 'power': return 'Press Power button';
      default: return 'All buttons tested!';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Card style={styles.instructionCard}>
        <Typography variant="h4" align="center" style={styles.title}>
          Physical Button Test
        </Typography>
        <Typography variant="body" color="secondary" align="center">
          Press each button when prompted
        </Typography>
        
        <View style={styles.currentInstruction}>
          <Typography variant="h4" color="primary" align="center">
            {getCurrentInstruction()}
          </Typography>
          <Typography variant="label" color="error" align="center">
            Time remaining: {timeLeft}s
          </Typography>
        </View>
      </Card>

      <View style={styles.buttonsContainer}>
        {/* Volume Up Button */}
        <Card style={[
          styles.buttonCard,
          { 
            borderColor: getButtonColor(getButtonStatus('volumeUp')),
            backgroundColor: getButtonStatus('volumeUp') === 'current' 
              ? colors.primary + '20' 
              : colors.surfaceSecondary 
          }
        ]}>
          <Volume2 
            size={48} 
            color={getButtonColor(getButtonStatus('volumeUp'))} 
          />
          <Typography 
            variant="label" 
            style={{ color: getButtonColor(getButtonStatus('volumeUp')) }}
          >
            Volume Up
          </Typography>
          <Typography variant="caption" color="secondary">
            {buttonsPressed.volumeUp ? '✓ Pressed' : 'Not pressed'}
          </Typography>
          
          {/* Simulation button for testing */}
          {currentButtonToPress === 'volumeUp' && (
            <Typography 
              variant="caption" 
              color="primary" 
              style={styles.simulateText}
              onPress={() => simulateButtonPress('volumeUp')}
            >
              Tap here to simulate
            </Typography>
          )}
        </Card>

        {/* Volume Down Button */}
        <Card style={[
          styles.buttonCard,
          { 
            borderColor: getButtonColor(getButtonStatus('volumeDown')),
            backgroundColor: getButtonStatus('volumeDown') === 'current' 
              ? colors.primary + '20' 
              : colors.surfaceSecondary 
          }
        ]}>
          <VolumeX 
            size={48} 
            color={getButtonColor(getButtonStatus('volumeDown'))} 
          />
          <Typography 
            variant="label" 
            style={{ color: getButtonColor(getButtonStatus('volumeDown')) }}
          >
            Volume Down
          </Typography>
          <Typography variant="caption" color="secondary">
            {buttonsPressed.volumeDown ? '✓ Pressed' : 'Not pressed'}
          </Typography>
          
          {/* Simulation button for testing */}
          {currentButtonToPress === 'volumeDown' && (
            <Typography 
              variant="caption" 
              color="primary" 
              style={styles.simulateText}
              onPress={() => simulateButtonPress('volumeDown')}
            >
              Tap here to simulate
            </Typography>
          )}
        </Card>

        {/* Power Button */}
        <Card style={[
          styles.buttonCard,
          { 
            borderColor: getButtonColor(getButtonStatus('power')),
            backgroundColor: getButtonStatus('power') === 'current' 
              ? colors.primary + '20' 
              : colors.surfaceSecondary 
          }
        ]}>
          <Power 
            size={48} 
            color={getButtonColor(getButtonStatus('power'))} 
          />
          <Typography 
            variant="label" 
            style={{ color: getButtonColor(getButtonStatus('power')) }}
          >
            Power
          </Typography>
          <Typography variant="caption" color="secondary">
            {buttonsPressed.power ? '✓ Pressed' : 'Not pressed'}
          </Typography>
          
          {/* Simulation button for testing */}
          {currentButtonToPress === 'power' && (
            <Typography 
              variant="caption" 
              color="primary" 
              style={styles.simulateText}
              onPress={() => simulateButtonPress('power')}
            >
              Tap here to simulate
            </Typography>
          )}
        </Card>
      </View>

      <View style={styles.progress}>
        <Typography variant="label" color="secondary" align="center">
          Progress: {Object.values(buttonsPressed).filter(Boolean).length}/3 buttons
        </Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: designTokens.spacing.lg,
  },
  instructionCard: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.xl,
  },
  title: {
    marginBottom: designTokens.spacing.sm,
  },
  currentInstruction: {
    marginTop: designTokens.spacing.lg,
    alignItems: 'center',
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  buttonCard: {
    alignItems: 'center',
    padding: designTokens.spacing.lg,
    minWidth: 150,
    borderWidth: 2,
  },
  simulateText: {
    marginTop: designTokens.spacing.sm,
    textDecorationLine: 'underline',
  },
  progress: {
    marginTop: designTokens.spacing.lg,
  },
});