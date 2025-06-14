import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Mic, Volume2, RotateCcw, CircleCheck as CheckCircle, Clock } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useDiagnosticStore } from '@/store/diagnosticStore';
import Typography from './Typography';
import Card from './Card';
import Button from './Button';
import { designTokens } from '@/styles/tokens';

interface MicrophoneTestProps {
  onComplete: (success: boolean, attempts: number) => void;
  onSpeakSentence: (sentence: string) => void;
  onListenForResponse: () => void;
  isVoiceMode?: boolean;
  isWaitingForResponse?: boolean;
}

export default function MicrophoneTest({ 
  onComplete, 
  onSpeakSentence, 
  onListenForResponse,
  isVoiceMode = false,
  isWaitingForResponse = false
}: MicrophoneTestProps) {
  const { colors } = useTheme();
  const { 
    microphoneTestSentences,
    currentSentenceIndex,
    microphoneAttempts,
    initializeMicrophoneTest,
    processMicrophoneResponse,
    nextMicrophoneSentence
  } = useDiagnosticStore();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [testPhase, setTestPhase] = useState<'intro' | 'showing_sentence' | 'waiting_for_user' | 'listening' | 'processing' | 'result'>('intro');
  const [hasStarted, setHasStarted] = useState(false);
  const [waitingTimer, setWaitingTimer] = useState(0);

  const currentSentence = microphoneTestSentences[currentSentenceIndex];
  const maxAttempts = 3;

  useEffect(() => {
    if (!isInitialized) {
      initializeMicrophoneTest();
      setIsInitialized(true);
      setTestPhase('intro');
      setHasStarted(false);
    }
  }, [isInitialized, initializeMicrophoneTest]);

  // Auto-start in voice mode after initialization
  useEffect(() => {
    if (isInitialized && isVoiceMode && !hasStarted && testPhase === 'intro') {
      setTimeout(() => {
        startTest();
      }, 1500);
    }
  }, [isInitialized, isVoiceMode, hasStarted, testPhase]);

  // Timer for waiting phase
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (testPhase === 'waiting_for_user') {
      setWaitingTimer(10); // 10 second countdown
      interval = setInterval(() => {
        setWaitingTimer(prev => {
          if (prev <= 1) {
            // Auto-proceed to listening in voice mode
            if (isVoiceMode) {
              setTestPhase('listening');
              onListenForResponse();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [testPhase, isVoiceMode]);

  const startTest = () => {
    console.log('🎯 Starting microphone test with sentence:', currentSentence);
    setHasStarted(true);
    setTestPhase('showing_sentence');
    setLastResponse('');
    
    // First, speak the instruction
    onSpeakSentence(`I will now say a sentence. Please listen carefully and repeat it exactly. Here is the sentence: ${currentSentence}`);
    
    // After speaking, show the sentence and wait for user
    setTimeout(() => {
      setTestPhase('waiting_for_user');
    }, 6000); // Give enough time for the full instruction
  };

  const handleUserReady = () => {
    setTestPhase('listening');
    onListenForResponse();
  };

  const handleVoiceResponse = (transcript: string) => {
    console.log('🎤 Processing voice response:', transcript);
    setTestPhase('processing');
    setLastResponse(transcript);
    
    const isCorrect = processMicrophoneResponse(transcript);
    
    setTimeout(() => {
      setTestPhase('result');
      
      setTimeout(() => {
        if (isCorrect) {
          // Success - move to next sentence or complete
          if (currentSentenceIndex < microphoneTestSentences.length - 1) {
            nextMicrophoneSentence();
            resetForNextSentence();
          } else {
            onComplete(true, microphoneAttempts + 1);
          }
        } else {
          // Failed attempt
          const newAttempts = microphoneAttempts + 1;
          
          if (newAttempts >= maxAttempts) {
            onComplete(false, newAttempts);
          } else {
            // Try again
            resetForRetry();
          }
        }
      }, 2000);
    }, 1500);
  };

  const resetForNextSentence = () => {
    setHasStarted(false);
    setTestPhase('intro');
    setLastResponse('');
    setWaitingTimer(0);
    
    // Auto-start next sentence in voice mode
    if (isVoiceMode) {
      setTimeout(() => {
        startTest();
      }, 1000);
    }
  };

  const resetForRetry = () => {
    setHasStarted(false);
    setTestPhase('intro');
    setLastResponse('');
    setWaitingTimer(0);
    
    // Auto-retry in voice mode
    if (isVoiceMode) {
      setTimeout(() => {
        startTest();
      }, 1000);
    }
  };

  const handleSkip = () => {
    onComplete(false, maxAttempts);
  };

  const handleRetry = () => {
    resetForRetry();
    if (!isVoiceMode) {
      startTest();
    }
  };

  // Simulate voice response for testing
  const simulateCorrectResponse = () => {
    handleVoiceResponse(currentSentence);
  };

  const simulateIncorrectResponse = () => {
    handleVoiceResponse("This is not the correct sentence");
  };

  const getPhaseDescription = () => {
    switch (testPhase) {
      case 'intro':
        return isVoiceMode ? 'Preparing to speak the sentence...' : 'Ready to start microphone test';
      case 'showing_sentence':
        return 'Listen carefully to the sentence...';
      case 'waiting_for_user':
        return `Now repeat the sentence exactly (${waitingTimer}s)`;
      case 'listening':
        return 'Listening for your response...';
      case 'processing':
        return 'Processing your response...';
      case 'result':
        return lastResponse && processMicrophoneResponse(lastResponse) ? 'Correct! ✓' : 'Incorrect response';
      default:
        return 'Microphone test ready';
    }
  };

  const getPhaseIcon = () => {
    switch (testPhase) {
      case 'showing_sentence':
        return <Volume2 size={32} color={colors.accent} />;
      case 'waiting_for_user':
        return <Clock size={32} color={colors.primary} />;
      case 'listening':
        return <Mic size={32} color={colors.primary} />;
      case 'processing':
        return <RotateCcw size={32} color={colors.success} />;
      case 'result':
        return <CheckCircle size={32} color={lastResponse && processMicrophoneResponse(lastResponse) ? colors.success : colors.error} />;
      default:
        return <Mic size={32} color={colors.textSecondary} />;
    }
  };

  const isResponseCorrect = lastResponse && processMicrophoneResponse(lastResponse);
  const shouldShowSentence = testPhase === 'showing_sentence' || testPhase === 'waiting_for_user' || testPhase === 'listening' || testPhase === 'processing' || testPhase === 'result';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Typography variant="h3" align="center" style={styles.title}>
          Microphone & Speech Test
        </Typography>
        <Typography variant="body" color="secondary" align="center">
          Listen carefully and repeat exactly what I say
        </Typography>
        
        <View style={styles.progress}>
          <Typography variant="label" color="primary">
            Sentence {currentSentenceIndex + 1} of {microphoneTestSentences.length}
          </Typography>
          <Typography variant="label" color="secondary">
            Attempt {microphoneAttempts + 1} of {maxAttempts}
          </Typography>
        </View>
      </Card>

      {/* Main Test Area */}
      <Card style={[styles.testCard, { backgroundColor: colors.surfaceSecondary }]}>
        {/* Phase Indicator */}
        <View style={styles.phaseIndicator}>
          {getPhaseIcon()}
          <Typography variant="h4" align="center" style={[styles.phaseText, { color: colors.text }]}>
            {getPhaseDescription()}
          </Typography>
        </View>

        {/* Sentence Display - Large and Prominent */}
        {shouldShowSentence && (
          <Card style={[styles.sentenceCard, { 
            backgroundColor: colors.surface,
            borderColor: testPhase === 'waiting_for_user' ? colors.primary : colors.border,
            borderWidth: 2
          }]}>
            <Typography variant="caption" color="secondary" align="center" style={styles.sentenceLabel}>
              Sentence to repeat:
            </Typography>
            <Typography variant="h2" align="center" style={[styles.sentence, { color: colors.primary }]}>
              "{currentSentence}"
            </Typography>
            
            {testPhase === 'waiting_for_user' && (
              <Typography variant="body" color="primary" align="center" style={styles.instruction}>
                {isVoiceMode 
                  ? `Please repeat this sentence now (${waitingTimer}s remaining)`
                  : 'When ready, tap "I\'m Ready" and repeat this sentence'
                }
              </Typography>
            )}
          </Card>
        )}

        {/* User Response Display */}
        {lastResponse && testPhase === 'result' && (
          <Card style={[styles.responseCard, { 
            backgroundColor: isResponseCorrect ? colors.success + '20' : colors.error + '20',
            borderColor: isResponseCorrect ? colors.success : colors.error,
            borderWidth: 1
          }]}>
            <Typography variant="label" color="secondary" align="center">
              Your response:
            </Typography>
            <Typography 
              variant="body" 
              align="center"
              style={[
                styles.response, 
                { color: isResponseCorrect ? colors.success : colors.error }
              ]}
            >
              "{lastResponse}"
            </Typography>
            <Typography 
              variant="h4" 
              style={{ 
                color: isResponseCorrect ? colors.success : colors.error,
                marginTop: designTokens.spacing.sm 
              }}
              align="center"
            >
              {isResponseCorrect ? '✓ Perfect!' : '✗ Try Again'}
            </Typography>
          </Card>
        )}
      </Card>

      {/* Controls */}
      <View style={styles.controls}>
        {!isVoiceMode && (
          <View style={styles.manualControls}>
            {testPhase === 'intro' && !hasStarted && (
              <Button
                title="Start Microphone Test"
                onPress={startTest}
                icon={<Volume2 size={20} color="#FFFFFF" />}
                style={styles.primaryButton}
              />
            )}
            
            {testPhase === 'waiting_for_user' && (
              <Button
                title="I'm Ready to Speak"
                onPress={handleUserReady}
                icon={<Mic size={20} color="#FFFFFF" />}
                style={styles.primaryButton}
              />
            )}
            
            {(testPhase === 'result' || (hasStarted && testPhase !== 'listening' && testPhase !== 'processing')) && (
              <Button
                title="Try Again"
                variant="secondary"
                onPress={handleRetry}
                icon={<RotateCcw size={20} color={colors.primary} />}
              />
            )}
          </View>
        )}
        
        <Button
          title="Skip This Test"
          variant="ghost"
          onPress={handleSkip}
          style={styles.skipButton}
        />
      </View>

      {/* Testing Controls (Voice Mode Only) */}
      {isVoiceMode && testPhase === 'listening' && (
        <Card style={[styles.testingCard, { backgroundColor: colors.accent + '20' }]}>
          <Typography variant="caption" color="secondary" align="center">
            Testing Controls:
          </Typography>
          <View style={styles.testingButtons}>
            <Button
              title="✓ Simulate Correct"
              variant="ghost"
              onPress={simulateCorrectResponse}
            />
            <Button
              title="✗ Simulate Wrong"
              variant="ghost"
              onPress={simulateIncorrectResponse}
            />
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: designTokens.spacing.lg,
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  title: {
    marginBottom: designTokens.spacing.sm,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: designTokens.spacing.lg,
  },
  testCard: {
    flex: 1,
    padding: designTokens.spacing.xl,
    justifyContent: 'flex-start',
  },
  phaseIndicator: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.xl,
  },
  phaseText: {
    marginTop: designTokens.spacing.md,
  },
  sentenceCard: {
    padding: designTokens.spacing.xl,
    marginBottom: designTokens.spacing.lg,
    alignItems: 'center',
  },
  sentenceLabel: {
    marginBottom: designTokens.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sentence: {
    fontStyle: 'italic',
    fontWeight: 'bold',
    lineHeight: 40,
    marginBottom: designTokens.spacing.md,
  },
  instruction: {
    marginTop: designTokens.spacing.md,
    fontStyle: 'italic',
  },
  responseCard: {
    padding: designTokens.spacing.lg,
    alignItems: 'center',
  },
  response: {
    marginTop: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.sm,
    fontStyle: 'italic',
  },
  controls: {
    alignItems: 'center',
    marginTop: designTokens.spacing.lg,
  },
  manualControls: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  primaryButton: {
    minWidth: 200,
    marginBottom: designTokens.spacing.sm,
  },
  skipButton: {
    marginTop: designTokens.spacing.sm,
  },
  testingCard: {
    marginTop: designTokens.spacing.lg,
    padding: designTokens.spacing.md,
    alignItems: 'center',
  },
  testingButtons: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.sm,
  },
});