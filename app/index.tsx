import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useDiagnosticStore } from '@/store/diagnosticStore';
import { useVoiceConversation } from '@/hooks/useVoiceConversation';
import { usePermissions } from '@/hooks/usePermissions';
import { voiceCommandProcessor } from '@/services/voiceCommandProcessor';
import { elevenLabsService } from '@/services/elevenLabsService';
import Typography from '@/components/ui/Typography';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import VoiceIndicator from '@/components/ui/VoiceIndicator';
import TouchGridTest from '@/components/ui/TouchGridTest';
import ButtonTest from '@/components/ui/ButtonTest';
import MicrophoneTest from '@/components/ui/MicrophoneTest';
import ConversationalAI from '@/components/ConversationalAI';
import { designTokens } from '@/styles/tokens';
import { Mic, Play, RotateCcw, FileText, Settings, Globe, Smartphone, MessageCircle, Volume2, VolumeX, Loader as Loader2 } from 'lucide-react-native';

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showDiagnosticFlow, setShowDiagnosticFlow] = useState(false);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [voiceConversationStarted, setVoiceConversationStarted] = useState(false);
  const [lastAgentMessage, setLastAgentMessage] = useState('');
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [voiceMode, setVoiceMode] = useState<'idle' | 'thinking' | 'speaking' | 'listening'>('idle');
  const [step1Phase, setStep1Phase] = useState<'permission' | 'confirmation' | 'complete'>('permission');
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState(false);

  const { requestMicrophonePermission, requestDiagnosticPermissions } = usePermissions();

  const {
    currentStep,
    isRunning,
    steps,
    currentReport,
    startDiagnostic,
    nextStep,
    completeStep,
    skipStep,
    completeDiagnostic,
    resetDiagnostic,
    setAwaitingVoiceResponse,
    processVoiceCommand,
  } = useDiagnosticStore();

  const {
    state: voiceState,
    startConversation,
    endConversation,
    speakText,
    setConversationComponent,
  } = useVoiceConversation(
    handleUserMessage,
    handleAgentMessage,
    handleModeChange
  );

  const currentStepData = steps[currentStep];

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
       if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.userAgent) {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
        const isMobileDevice = mobileKeywords.some(keyword => userAgent.includes(keyword)) || 
                              window.innerWidth <= 768 ||
                              'ontouchstart' in window;
        setIsMobile(isMobileDevice);
        console.log('📱 Mobile device detected:', isMobileDevice);
      } else {
        // Fallback for native environments (Hermes on Android/iOS)
        const isMobileDevice =  Platform.OS === 'android' || Platform.OS === 'ios';
        setIsMobile(isMobileDevice);
        console.log('📱 Detected mobile from Platform API:', isMobileDevice);
      }
    };

    checkMobile();
    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener === 'function' &&
      typeof window.removeEventListener === 'function'
    ) {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  useEffect(() => {
    // Initialize ElevenLabs service
    return () => {
      elevenLabsService.cleanup();
    };
  }, []);

  function handleUserMessage(message: string) {
    console.log('🗣️ User said:', message);
    setLastUserMessage(message);
    
    // Handle Step 1 confirmation phase
    if (currentStep === 0 && step1Phase === 'confirmation') {
      const command = voiceCommandProcessor.processCommand(message);
      
      if (command && (command.action === 'CONTINUE' || command.action === 'TEST_COMPLETE')) {
        console.log('✅ User confirmed readiness to begin diagnostic');
        setStep1Phase('complete');
        handleStepComplete();
        return;
      }
      
      // Check for affirmative responses
      const affirmativeWords = ['yes', 'ready', 'sure', 'okay', 'ok', 'begin', 'start', 'continue'];
      const isAffirmative = affirmativeWords.some(word => 
        message.toLowerCase().includes(word)
      );
      
      if (isAffirmative) {
        console.log('✅ User confirmed readiness to begin diagnostic');
        setStep1Phase('complete');
        handleStepComplete();
        return;
      }
    }
    
    if (!isRunning || !voiceModeEnabled) return;

    // Process voice command for other steps
    const command = voiceCommandProcessor.processCommand(message);
    
    if (command) {
      console.log('🎯 Processed command:', command);
      
      switch (command.action) {
        case 'CONTINUE':
          if (currentStepData.expectsVoiceResponse) {
            handleStepComplete();
          }
          break;
        case 'SKIP':
          skipStep('User requested skip via voice');
          break;
        case 'HELP':
          const helpText = voiceCommandProcessor.getHelpText(currentStepData.type);
          speakText(helpText);
          break;
        case 'TEST_COMPLETE':
          handleStepComplete();
          break;
        case 'STOP':
          handleStopDiagnostic();
          break;
      }
    }
  }

  function handleAgentMessage(message: string) {
    console.log('🤖 Agent said:', message);
    setLastAgentMessage(message);
    
    // Update voice mode when agent is speaking
    if (message && message.trim().length > 0) {
      console.log('🔄 Agent is speaking - updating voice mode');
      setVoiceMode('speaking');
    }
  }

  function handleModeChange(mode: 'listening' | 'speaking' | 'thinking') {
    console.log('🔄 Voice mode changed to:', mode);
    setVoiceMode(mode);
    setAwaitingVoiceResponse(mode === 'listening');
  }

  const handleStartDiagnostic = async () => {
  console.log('🚀 Starting diagnostic with voice mode...');
  setVoiceModeEnabled(true);
  setShowDiagnosticFlow(true);
  setStep1Phase('permission');

  try {
    console.log('🎤 Starting voice conversation...');
    await startConversation();
    setVoiceConversationStarted(true);

    // 1. Vérifie si le micro est déjà autorisé
    const micPermissionAlreadyGranted = await checkMicrophonePermission();
    setMicrophonePermissionGranted(micPermissionAlreadyGranted);

    if (!micPermissionAlreadyGranted) {
      // 2a. Pas encore autorisé → Piko explique qu’il en a besoin
      await speakText("Hello! I'm Piko, your AI assistant. I'm here to guide you through a quick and reliable phone diagnostic. But first, I need access to your microphone so I can hear you. Please allow microphone access when prompted.");

      const grantedNow = await requestMicrophonePermission();
      setMicrophonePermissionGranted(grantedNow);

      if (!grantedNow) {
        console.warn('❌ Microphone permission denied. Cannot proceed.');
        await speakText("I wasn’t able to access your microphone. Unfortunately, I can't continue the diagnostic without it.");
        setVoiceModeEnabled(false);
        setVoiceConversationStarted(false);
        setStep1Phase('complete');
        return;
      }
    } else {
      // 2b. Déjà autorisé → Piko démarre directement
      await speakText("Hello! I'm Piko, your AI assistant. I'm here to guide you through a quick and reliable phone diagnostic.");
    }

    // 3. Démarre le diagnostic officiel et pose la question
    console.log('✅ Microphone permission granted');
    startDiagnostic(true);
    setStep1Phase('confirmation');

    // Agent will ask for confirmation
        setTimeout(() => {
          speakText("Great! I now have access to your microphone. Are you ready to begin the diagnostic?");
        }, 2000);

  } catch (error) {
    console.error('❌ Failed to start voice conversation:', error);
    setVoiceModeEnabled(false);
    setVoiceConversationStarted(false);
    setStep1Phase('complete');
  }
};

  const handleStepComplete = () => {
    const result = {
      testName: currentStepData.title,
      status: 'passed' as const,
      details: 'Test completed successfully',
      timestamp: Date.now(),
      score: 100,
    };

    completeStep(result);

    // Move to next step or complete
    if (currentStep < steps.length - 1) {
      setTimeout(() => {
        nextStep();
        const nextStepData = steps[currentStep + 1];
        
        // Handle contextual permissions for step 2 (system diagnostics)
        if (currentStep + 1 === 1) { // Moving to step 2
          handleDiagnosticPermissions();
        }
        
        if (voiceModeEnabled && voiceConversationStarted && nextStepData) {
          console.log('🔄 Moving to next step - agent will handle transition');
        }
      }, 1000);
    } else {
      completeDiagnostic();
      if (voiceModeEnabled && voiceConversationStarted) {
        console.log('✅ Diagnostic complete - agent will provide summary');
      }
    }
  };

  const handleDiagnosticPermissions = async () => {
    console.log('🔧 Requesting diagnostic permissions for step 2...');
    
    const diagnosticPermissionsGranted = await requestDiagnosticPermissions();
    
    if (diagnosticPermissionsGranted) {
      console.log('✅ Diagnostic permissions granted');
    } else {
      console.warn('⚠️ Some diagnostic permissions denied - continuing with limited functionality');
    }
    
    // Continue with step 2 regardless of permission status
    if (voiceModeEnabled && voiceConversationStarted) {
      speakText("Perfect! I've gathered your device information. Let me summarize what I found and we'll continue with the diagnostic tests.");
    }
  };

  const handleStopDiagnostic = async () => {
    if (voiceModeEnabled && voiceConversationStarted) {
      await endConversation();
      setVoiceConversationStarted(false);
    }
    resetDiagnostic();
    setShowDiagnosticFlow(false);
    setVoiceModeEnabled(false);
    setLastAgentMessage('');
    setLastUserMessage('');
    setVoiceMode('idle');
    setStep1Phase('permission');
    setMicrophonePermissionGranted(false);
  };

  const getVoiceStatusIcon = () => {
    switch (voiceMode) {
      case 'listening':
        return <Mic size={20} color={colors.success} />;
      case 'speaking':
        return <Volume2 size={20} color={colors.accent} />;
      case 'thinking':
        return <Loader2 size={20} color={colors.primary} />;
      default:
        return <MessageCircle size={20} color={colors.textSecondary} />;
    }
  };

  const getVoiceStatusColor = () => {
    switch (voiceMode) {
      case 'listening':
        return colors.success;
      case 'speaking':
        return colors.accent;
      case 'thinking':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getVoiceStatusText = () => {
    switch (voiceMode) {
      case 'listening':
        return 'Listening...';
      case 'speaking':
        return 'Piko speaking...';
      case 'thinking':
        return 'Piko thinking...';
      default:
        return 'Voice ready';
    }
  };

  const renderWelcomeScreen = () => (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        {/* Piko Logo */}
        <View style={styles.logoSection}>
          <View style={[styles.logoContainer, { backgroundColor: colors.primary + '20' }]}>
            <Typography variant="h1" style={[styles.logo, { color: colors.primary }]}>
              Piko
            </Typography>
          </View>
          
          {/* Tagline */}
          <Typography variant="h2" align="center" style={[styles.tagline, { color: colors.text }]}>
            AI-Powered Device Diagnostics
          </Typography>
        </View>

        {/* Single Start Button */}
        <View style={styles.buttonSection}>
          <Button
            title="Start Diagnostic"
            onPress={handleStartDiagnostic}
            icon={<Play size={24} color="#FFFFFF" />}
            style={[styles.startButton, { backgroundColor: colors.primary }]}
          />
        </View>
      </View>
    </View>
  );

  const renderStep1Content = () => {
    if (step1Phase === 'permission') {
      return (
        <Card style={[styles.permissionCard, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}>
          <View style={styles.permissionHeader}>
            <Mic size={24} color={colors.accent} />
            <Typography variant="h4" style={[styles.permissionTitle, { color: colors.accent }]}>
              Microphone Permission
            </Typography>
          </View>
          <Typography variant="body" color="secondary" align="center">
            Piko needs microphone access for voice conversation. Please allow when prompted.
          </Typography>
        </Card>
      );
    }

    if (step1Phase === 'confirmation') {
      return (
        <Card style={[styles.confirmationCard, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
          <View style={styles.confirmationHeader}>
            <MessageCircle size={24} color={colors.primary} />
            <Typography variant="h4" style={[styles.confirmationTitle, { color: colors.primary }]}>
              Ready to Begin?
            </Typography>
          </View>
          <Typography variant="body" color="secondary" align="center" style={styles.confirmationText}>
            Piko is asking if you're ready to begin the diagnostic. Please respond verbally.
          </Typography>
          
          {voiceMode === 'listening' && (
            <View style={styles.listeningIndicator}>
              <Mic size={20} color={colors.success} />
              <Typography variant="label" style={[styles.listeningText, { color: colors.success }]}>
                Listening for your response...
              </Typography>
            </View>
          )}
        </Card>
      );
    }

    return null;
  };

  const renderDiagnosticStep = () => {
    if (!currentStepData) return null;

    switch (currentStepData.type) {
      case 'introduction':
        return (
          <View style={styles.stepContainer}>
            {/* Step 1 Content */}
            {renderStep1Content()}

            {/* Minimal Voice Status - Only Icon and Messages */}
            {voiceModeEnabled && voiceConversationStarted && (
              <Card style={styles.minimalVoiceCard}>
                <View style={styles.voiceStatusRow}>
                  <View style={[styles.voiceStatusIcon, { backgroundColor: getVoiceStatusColor() + '20' }]}>
                    {getVoiceStatusIcon()}
                  </View>
                  <Typography variant="label" style={[styles.voiceStatusLabel, { color: getVoiceStatusColor() }]}>
                    {getVoiceStatusText()}
                  </Typography>
                </View>
                
                {lastAgentMessage ? (
                  <View style={styles.messageRow}>
                    <Typography variant="caption" color="secondary" style={styles.messageLabel}>
                      Piko:
                    </Typography>
                    <Typography variant="body" style={styles.messageText}>
                      {lastAgentMessage}
                    </Typography>
                  </View>
                ) : (
                  <View style={styles.messageRow}>
                    <Typography variant="caption" color="secondary" style={styles.messageLabel}>
                      Status:
                    </Typography>
                    <Typography variant="body" color="secondary" style={styles.messageText}>
                      Connecting to Piko...
                    </Typography>
                  </View>
                )}
                
                {lastUserMessage && (
                  <View style={styles.messageRow}>
                    <Typography variant="caption" color="primary" style={styles.messageLabel}>
                      You:
                    </Typography>
                    <Typography variant="body" color="primary" style={styles.messageText}>
                      {lastUserMessage}
                    </Typography>
                  </View>
                )}
              </Card>
            )}

            {/* Step Content - Simplified for voice mode */}
            <Card style={styles.stepCard}>
              <Typography variant="h3" align="center" style={styles.stepTitle}>
                {currentStepData.title}
              </Typography>
              
              {!voiceModeEnabled && (
                <>
                  <Typography variant="body" color="secondary" align="center" style={styles.stepDescription}>
                    {currentStepData.description}
                  </Typography>
                  
                  <Button
                    title="Continue"
                    onPress={handleStepComplete}
                    icon={<Play size={20} color="#FFFFFF" />}
                    style={styles.continueButton}
                  />
                </>
              )}
              
              {voiceModeEnabled && voiceConversationStarted && (
                <Typography variant="body" color="secondary" align="center" style={styles.voiceInstructions}>
                  {step1Phase === 'confirmation' 
                    ? 'Please respond "yes" or "ready" to begin the diagnostic.'
                    : lastAgentMessage ? 'Listen to Piko and respond naturally.' : 'Connecting to Piko...'
                  }
                </Typography>
              )}
            </Card>
          </View>
        );

      case 'permissions':
        return (
          <View style={styles.stepContainer}>
            <Card style={[styles.permissionCard, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <View style={styles.permissionHeader}>
                <Settings size={24} color={colors.success} />
                <Typography variant="h4" style={[styles.permissionTitle, { color: colors.success }]}>
                  Diagnostic Permissions
                </Typography>
              </View>
              <Typography variant="body" color="secondary" align="center">
                Requesting camera and sensor access for comprehensive device testing...
              </Typography>
            </Card>
            
            <Card style={styles.stepCard}>
              <Typography variant="h3" align="center" style={styles.stepTitle}>
                {currentStepData.title}
              </Typography>
              <Typography variant="body" color="secondary" align="center" style={styles.stepDescription}>
                Requesting necessary permissions for device diagnostics...
              </Typography>
              
              <Button
                title="Continue"
                onPress={handleStepComplete}
                icon={<Play size={20} color="#FFFFFF" />}
                style={styles.continueButton}
              />
            </Card>
          </View>
        );

      case 'microphone':
        return (
          <MicrophoneTest
            onComplete={(success, attempts) => {
              const result = {
                testName: currentStepData.title,
                status: success ? 'passed' as const : 'failed' as const,
                details: `Microphone test ${success ? 'passed' : 'failed'} after ${attempts} attempts`,
                timestamp: Date.now(),
                score: success ? 100 : 0,
                attempts,
                maxAttempts: 3,
              };
              completeStep(result);
            }}
            onSpeakSentence={(sentence) => {
              if (voiceModeEnabled && voiceConversationStarted) {
                speakText(sentence);
              }
            }}
            onListenForResponse={() => {
              // Voice conversation handles this automatically
            }}
            isVoiceMode={voiceModeEnabled && voiceConversationStarted}
            isWaitingForResponse={voiceMode === 'listening'}
          />
        );

      case 'touchscreen':
        return (
          <TouchGridTest
            onComplete={handleStepComplete}
            onTimeout={() => {
              skipStep('Touchscreen test timed out');
            }}
            timeoutSeconds={60}
          />
        );

      case 'buttons':
        return (
          <ButtonTest
            onComplete={handleStepComplete}
            onTimeout={() => {
              skipStep('Button test timed out');
            }}
            timeoutSeconds={30}
          />
        );

      default:
        return (
          <View style={styles.stepContainer}>
            {/* Minimal Voice Status for other steps */}
            {voiceModeEnabled && voiceConversationStarted && (
              <Card style={styles.minimalVoiceCard}>
                <View style={styles.voiceStatusRow}>
                  <View style={[styles.voiceStatusIcon, { backgroundColor: getVoiceStatusColor() + '20' }]}>
                    {getVoiceStatusIcon()}
                  </View>
                  <Typography variant="label" style={[styles.voiceStatusLabel, { color: getVoiceStatusColor() }]}>
                    {getVoiceStatusText()}
                  </Typography>
                </View>
                
                {lastAgentMessage ? (
                  <View style={styles.messageRow}>
                    <Typography variant="caption" color="secondary" style={styles.messageLabel}>
                      Piko:
                    </Typography>
                    <Typography variant="body" style={styles.messageText}>
                      {lastAgentMessage}
                    </Typography>
                  </View>
                ) : (
                  <View style={styles.messageRow}>
                    <Typography variant="caption" color="secondary" style={styles.messageLabel}>
                      Status:
                    </Typography>
                    <Typography variant="body" color="secondary" style={styles.messageText}>
                      Connecting to Piko...
                    </Typography>
                  </View>
                )}
                
                {lastUserMessage && (
                  <View style={styles.messageRow}>
                    <Typography variant="caption" color="primary" style={styles.messageLabel}>
                      You:
                    </Typography>
                    <Typography variant="body" color="primary" style={styles.messageText}>
                      {lastUserMessage}
                    </Typography>
                  </View>
                )}
              </Card>
            )}

            <Card style={styles.stepCard}>
              <Typography variant="h3" align="center" style={styles.stepTitle}>
                {currentStepData.title}
              </Typography>
              <Typography variant="body" color="secondary" align="center" style={styles.stepDescription}>
                {currentStepData.description}
              </Typography>
              
              <Button
                title="Continue"
                onPress={handleStepComplete}
                icon={<Play size={20} color="#FFFFFF" />}
                style={styles.continueButton}
              />
            </Card>
          </View>
        );
    }
  };

  const renderDiagnosticFlow = () => (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Progress Header */}
      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Typography variant="h4" style={styles.progressTitle}>
            Step {currentStep + 1} of {steps.length}
          </Typography>
          <Button
            title="Stop"
            variant="ghost"
            onPress={handleStopDiagnostic}
            style={styles.stopButton}
          />
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                  backgroundColor: colors.primary,
                }
              ]}
            />
          </View>
        </View>
      </Card>

      {/* Voice Conversation Component - Hidden DOM component for voice functionality */}
      {voiceModeEnabled && voiceConversationStarted && (
        <View style={styles.hiddenVoiceContainer}>
          <ConversationalAI
            dom={{ style: styles.hiddenDomComponent }}
            onUserMessage={handleUserMessage}
            onAgentMessage={handleAgentMessage}
            onModeChange={handleModeChange}
            autoStart={true}
          />
        </View>
      )}

      {/* Current Step */}
      <ScrollView style={styles.stepScrollView}>
        {renderDiagnosticStep()}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <StatusBar style="auto" />
      {showDiagnosticFlow ? renderDiagnosticFlow() : renderWelcomeScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: designTokens.spacing['3xl'],
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xl,
    ...designTokens.shadows.lg,
  },
  logo: {
    fontWeight: '800',
    fontSize: 40,
  },
  tagline: {
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 36,
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
  },
  startButton: {
    width: '100%',
    maxWidth: 280,
    height: 64,
    borderRadius: designTokens.borderRadius.xl,
    ...designTokens.shadows.lg,
  },
  progressCard: {
    margin: designTokens.spacing.md,
    marginBottom: designTokens.spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  progressTitle: {
    fontWeight: '600',
  },
  stopButton: {
    paddingHorizontal: designTokens.spacing.md,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    flex: 1,
    height: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  permissionCard: {
    marginBottom: designTokens.spacing.lg,
    padding: designTokens.spacing.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  permissionTitle: {
    marginLeft: designTokens.spacing.sm,
    fontWeight: '600',
  },
  confirmationCard: {
    marginBottom: designTokens.spacing.lg,
    padding: designTokens.spacing.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  confirmationTitle: {
    marginLeft: designTokens.spacing.sm,
    fontWeight: '600',
  },
  confirmationText: {
    marginBottom: designTokens.spacing.md,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: designTokens.spacing.sm,
  },
  listeningText: {
    marginLeft: designTokens.spacing.xs,
    fontWeight: '600',
  },
  hiddenVoiceContainer: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 100,
    height: 100,
    opacity: 0,
    pointerEvents: 'none',
  },
  hiddenDomComponent: {
    width: 1,
    height: 1,
  },
  stepScrollView: {
    flex: 1,
  },
  stepContainer: {
    padding: designTokens.spacing.lg,
  },
  minimalVoiceCard: {
    marginBottom: designTokens.spacing.lg,
    padding: designTokens.spacing.md,
  },
  voiceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  voiceStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
  },
  voiceStatusLabel: {
    fontWeight: '600',
    fontSize: 14,
  },
  messageRow: {
    marginBottom: designTokens.spacing.sm,
  },
  messageLabel: {
    fontWeight: '600',
    marginBottom: designTokens.spacing.xs,
  },
  messageText: {
    lineHeight: 20,
    fontSize: 14,
  },
  stepCard: {
    alignItems: 'center',
    padding: designTokens.spacing.xl,
  },
  stepTitle: {
    marginBottom: designTokens.spacing.md,
    fontWeight: '700',
  },
  stepDescription: {
    marginBottom: designTokens.spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  voiceInstructions: {
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  continueButton: {
    minWidth: 200,
    height: 48,
    borderRadius: designTokens.borderRadius.lg,
  },
});