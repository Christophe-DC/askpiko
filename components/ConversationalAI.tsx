'use dom';

import { useConversation } from '@elevenlabs/react';
import { Mic, MicOff, Volume2, VolumeX, Loader } from 'lucide-react-native';
import {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { View, Pressable, StyleSheet, Text, Platform } from 'react-native';
import diagnosticTools from '@/utils/diagnosticTools';
import { Audio } from 'expo-av';
import PikoLogo from './PikoLogo';

async function requestMicrophonePermission() {
  try {
    console.log('requestMicrophonePermission');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    console.log('✅ Microphone permission granted');
    return true;
  } catch (error) {
    console.error('❌ Microphone permission denied:', error);
    return false;
  }
}

/*async function requestMicrophonePermission() {
  try {
      console.log('requestMicrophonePermission');
    const { status } = await Audio.requestPermissionsAsync();
      console.log('requestMicrophonePermission with status:', status);

    if (status === 'granted') {
      console.log('✅ Microphone permission granted');
      return true;
    } else {
      console.warn('❌ Microphone permission denied');
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting microphone permission:', error);
    return false;
  }
}*/

async function enableAudioPlayback() {
  try {
    // Create audio context with user gesture for mobile
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();

    if (audioContext.state === 'suspended') {
      console.log('🔊 Resuming audio context for mobile playback...');
      await audioContext.resume();
    }

    // Create a brief silent audio to unlock audio playback on mobile
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.value = 0; // Silent
    oscillator.frequency.value = 440;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);

    console.log('✅ Audio playback enabled for mobile');
    return true;
  } catch (error) {
    console.error('❌ Failed to enable audio playback:', error);
    return false;
  }
}

export type ConversationalAIHandle = {
  sendContextUpdate: (text: string) => void;
};

type Props = {
  dom: DOMProps;
  onUserMessage?: (message: string) => void;
  onAgentMessage?: (message: string) => void;
  onModeChange?: (mode: 'listening' | 'speaking' | 'thinking' | 'idle') => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  checkMicrophonePermission: () => string;
  getDeviceInfos: () => string;
  updateDiagnosticStep: () => number;
  updatePhraseToRead: () => string;
  updateColorToShow: () => string;
  recordButtonPressed: () => string;
  recordSensorShake: () => string;
  recordCameraPhoto: () => string;
  modeUpdated: (mode: string) => string;
  autoStart?: boolean;
  isVisible?: boolean;
  contextUpdate?: string;
};

const ConversationalAI = forwardRef<ConversationalAIHandle, Props>(
  (
    {
      dom,
      onUserMessage,
      onAgentMessage,
      onModeChange,
      onConnect,
      onDisconnect,
      onError,
      checkMicrophonePermission,
      getDeviceInfos,
      updateDiagnosticStep,
      updatePhraseToRead,
      updateColorToShow,
      recordButtonPressed,
      recordSensorShake,
      recordCameraPhoto,
      modeUpdated,
      autoStart = false,
      isVisible = false,
      contextUpdate = null,
    },
    ref
  ) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [currentMode, setCurrentMode] = useState<
      'listening' | 'speaking' | 'thinking' | 'idle'
    >('idle');
    const [hasPermission, setHasPermission] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [lastUserMessage, setLastUserMessage] = useState('');
    const [lastAgentMessage, setLastAgentMessage] = useState('');
    const [conversationStarted, setConversationStarted] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [connectionRetries, setConnectionRetries] = useState(0);
    const [manualStartRequested, setManualStartRequested] = useState(false);
    const maxRetries = 3;

    // Detect mobile device with enhanced detection
    useEffect(() => {
      const checkMobile = () => {
        if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
          const userAgent = navigator.userAgent.toLowerCase();
          const mobileKeywords = [
            'android',
            'iphone',
            'ipad',
            'ipod',
            'blackberry',
            'windows phone',
            'mobile',
          ];
          const isMobileDevice =
            mobileKeywords.some((keyword) => userAgent.includes(keyword)) ||
            window.innerWidth <= 768 ||
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0;
          setIsMobile(isMobileDevice);
          console.log(
            '📱 Mobile device detected:',
            isMobileDevice,
            'UserAgent:',
            userAgent
          );
        }
      };

      checkMobile();
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
      }
    }, []);

    const conversation = useConversation({
      onConnect: () => {
        console.log('🔗 ElevenLabs conversation connected');
        setIsInitialized(true);
        setCurrentMode('idle');
        setConnectionRetries(0);
        onConnect?.();

        // REMOVED: Auto-trigger first message - now only manual control
        console.log('✅ Conversation connected - waiting for manual control');
      },
      onDisconnect: () => {
        console.log('🔌 ElevenLabs conversation disconnected');
        setIsInitialized(false);
        setCurrentMode('idle');
        setConversationStarted(false);
        setManualStartRequested(false);
        onDisconnect?.();
      },
      onMessage: (message) => {
        console.log('📨 ElevenLabs message received:', message);

        if (message.source === 'user') {
          console.log('🗣️ User message from ElevenLabs:', message.message);
          setLastUserMessage(message.message);
          onUserMessage?.(message.message);
        } else if (message.source === 'ai') {
          console.log('🤖 Agent message from ElevenLabs:', message.message);
          setLastAgentMessage(message.message);
          onAgentMessage?.(message.message);

          if (!conversationStarted) {
            console.log(
              '✅ Agent has started speaking - conversation is now active'
            );
            setConversationStarted(true);
          }
        }
      },
      onModeChange: (mode) => {
        console.log('🔄 ElevenLabs mode change:', mode.mode);
        setCurrentMode(mode.mode);
        onModeChange?.(mode.mode);
      },
      onAudio: (audioEvent) => {
        console.log('🔄 ElevenLabs onAudio:', audioEvent);
        console.log('🔄 ElevenLabs onAudio type:', audioEvent.type);
      },
      onError: (error) => {
        console.error('❌ ElevenLabs conversation error:', error);
        setConnectionRetries((prev) => prev + 1);
        onError?.(new Error(error.message || 'Conversation error'));
      },
    });

    useImperativeHandle(ref, () => ({
      sendContextUpdate: (text: string) => {
        console.log('Message envoyé à l’IA:', text);
        conversation.sendContextualUpdate(text);
      },
    }));

    useEffect(() => {
      console.log('useEffect Message envoyé à l’IA:', contextUpdate);
      if (contextUpdate) {
        conversation?.sendContextualUpdate(contextUpdate);
      }
    }, [contextUpdate]);

    const startConversation = useCallback(async () => {
      try {
        console.log('🚀 Starting ElevenLabs conversation manually...');

        setUserInteracted(true);
        setManualStartRequested(true);

        // Enable audio playback first (critical for mobile)
        if (!audioEnabled) {
          console.log('🔊 Enabling audio playback for mobile...');
          const audioUnlocked = await enableAudioPlayback();
          if (audioUnlocked) {
            setAudioEnabled(true);
          }
        }

        console.log('check mic permission:', hasPermission);
        // Request microphone permission
        if (!hasPermission) {
          const granted = await requestMicrophonePermission();
          if (!granted) {
            throw new Error(
              'Microphone permission is required for voice conversation'
            );
          }
          setHasPermission(true);
        }

        const agentId = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID;
        if (!agentId) {
          throw new Error(
            'ElevenLabs Agent ID not configured. Please set EXPO_PUBLIC_ELEVENLABS_AGENT_ID in your environment variables.'
          );
        }

        console.log('🎤 Starting conversation with agent:', agentId);

        // Reset state
        setLastUserMessage('');
        setLastAgentMessage('');
        setConversationStarted(false);

        // Get device platform info
        const platformInfo = isMobile ? 'mobile' : 'web';
        const deviceInfo = await diagnosticTools.get_device_info();
        const microphonePermission = await checkMicrophonePermission;
        console.log('microphonePermission:', microphonePermission);

        // Start the conversation with mobile-optimized settings
        await conversation.startSession({
          agentId: agentId,
          dynamicVariables: {
            platform: platformInfo,
            microphonePermission: microphonePermission,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            audioEnabled: audioEnabled.toString(),
            deviceType: isMobile ? 'mobile' : 'desktop',
            screenResolution: deviceInfo.screenResolution,
            language: deviceInfo.language,
          },
          clientTools: {
            requestMicrophonePermission: requestMicrophonePermission,
            checkMicrophonePermission: checkMicrophonePermission,
            getDeviceInfos: getDeviceInfos,
            updateDiagnosticStep: updateDiagnosticStep,
            updatePhraseToRead: updatePhraseToRead,
            updateColorToShow: updateColorToShow,
            recordButtonPressed: recordButtonPressed,
            recordSensorShake: recordSensorShake,
            recordCameraPhoto: recordCameraPhoto,
          } /* {
          getDeviceInfos: diagnosticTools.get_device_info,
          updateDiagnosticStep: async ({ step }) => {
            console.log(step);
          },

          get_battery_level: diagnosticTools.get_battery_level,
          get_device_info: diagnosticTools.get_device_info,
          test_microphone: diagnosticTools.test_microphone,
          test_camera: diagnosticTools.test_camera,
          flash_screen: diagnosticTools.flash_screen,
          vibrate_device: diagnosticTools.vibrate_device,
          get_network_info: diagnosticTools.get_network_info,
        },*/,
          overrides: {
            /*agent: {
            firstMessage:
              "Hi, I'm Piko — your AI assistant for smartphone diagnostics. I'll help you test your device step by step. Are you ready to begin?",
          },*/
            // Mobile-optimized audio settings
            audio: {
              inputGain: isMobile ? 1.3 : 1.0, // Higher input gain for mobile
              outputGain: isMobile ? 1.2 : 1.0, // Higher output gain for mobile
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true, // Important for mobile
              sampleRate: isMobile ? 16000 : 24000, // Lower sample rate for mobile stability
            },
            // Mobile-optimized conversation settings
            conversation: {
              turnDetection: {
                type: 'server_vad',
                threshold: isMobile ? 0.6 : 0.5, // Higher threshold for mobile (less sensitive)
                prefixPaddingMs: isMobile ? 400 : 300,
                silenceDurationMs: isMobile ? 1000 : 800, // Longer silence detection for mobile
              },
            },
          },
        });
        conversation;

        console.log(
          '✅ ElevenLabs conversation started successfully - ready for manual control'
        );
      } catch (error) {
        console.error('❌ Failed to start conversation:', error);

        // Retry logic for mobile
        if (connectionRetries < maxRetries && isMobile) {
          console.log(
            `🔄 Retrying connection (${connectionRetries + 1}/${maxRetries})...`
          );
          setTimeout(() => {
            startConversation();
          }, 2000 * (connectionRetries + 1)); // Exponential backoff
        } else {
          onError?.(error as Error);
          setManualStartRequested(false);
        }
      }
    }, [
      conversation,
      onError,
      hasPermission,
      audioEnabled,
      onConnect,
      isMobile,
      connectionRetries,
    ]);

    useImperativeHandle(ref, () => ({
      sendContextUpdate: (text: string) => {
        conversation.sendContextualUpdate(text);
      },
    }));

    const stopConversation = useCallback(async () => {
      try {
        console.log('🔚 Stopping ElevenLabs conversation...');
        await conversation.endSession();
        setCurrentMode('idle');
        setLastUserMessage('');
        setLastAgentMessage('');
        setConversationStarted(false);
        setConnectionRetries(0);
        setManualStartRequested(false);
      } catch (error) {
        console.error('❌ Failed to stop conversation:', error);
        onError?.(error as Error);
      }
    }, [conversation, onError]);

    // REMOVED: Auto-start useEffect - conversation only starts when manually triggered
    // No auto-start behavior based on autoStart prop or any other lifecycle hooks
    useEffect(() => {
      console.log('🚀 use effect autoStart', autoStart);
      if (autoStart) {
        startConversation();
      }
    }, [autoStart]);

    // Expose conversation methods globally for external control
    useEffect(() => {
      (window as any).elevenLabsConversation = {
        start: startConversation,
        stop: stopConversation,
        conversation,
        status: conversation.status,
        mode: currentMode,
        isConnected: conversation.status === 'connected',
        isListening: currentMode === 'listening',
        isSpeaking: currentMode === 'speaking',
        isThinking: currentMode === 'thinking',
        lastUserMessage,
        lastAgentMessage,
        conversationStarted,
        audioEnabled,
        hasPermission,
        isMobile,
        connectionRetries,
        manualStartRequested,
        sendMessage: async (message: string) => {
          if (conversation.status === 'connected') {
            console.log(
              '📤 Sending message to agent via conversation:',
              message
            );
            // The conversation API handles message sending automatically
            return true;
          }
          return false;
        },
        triggerAgentSpeech: async () => {
          if (conversation.status === 'connected') {
            console.log(
              '🎯 Agent speech is handled automatically by ElevenLabs'
            );
            return true;
          }
          return false;
        },
        enableAudio: async () => {
          console.log('🔊 Manually enabling audio...');
          const enabled = await enableAudioPlayback();
          setAudioEnabled(enabled);
          return enabled;
        },
        // Mobile-specific methods
        optimizeForMobile: () => {
          console.log('📱 Mobile optimizations already applied');
          return {
            isMobile,
            audioSettings: {
              inputGain: 1.3,
              outputGain: 1.2,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            connectionSettings: {
              retryCount: connectionRetries,
              maxRetries,
            },
          };
        },
      };

      return () => {
        if ((window as any).elevenLabsConversation) {
          delete (window as any).elevenLabsConversation;
        }
      };
    }, [
      startConversation,
      stopConversation,
      conversation,
      currentMode,
      lastUserMessage,
      lastAgentMessage,
      conversationStarted,
      audioEnabled,
      hasPermission,
      isMobile,
      connectionRetries,
      manualStartRequested,
    ]);

    const handleButtonPress = async () => {
      setUserInteracted(true);

      console.log(
        'handleButtonPress conversation.status:',
        conversation.status
      );
      if (conversation.status === 'disconnected') {
        // Enable audio on first user interaction (required for mobile)
        if (!audioEnabled) {
          console.log('🔊 Enabling audio on user interaction...');
          const enabled = await enableAudioPlayback();
          setAudioEnabled(enabled);
        }

        await startConversation();
      } else {
        await stopConversation();
      }
    };

    const getButtonIcon = () => {
      if (conversation.status === 'connecting') {
        return <Loader size={32} color="#E2E8F0" strokeWidth={1.5} />;
      }

      if (conversation.status === 'connected') {
        switch (currentMode) {
          case 'listening':
            return <Mic size={32} color="#E2E8F0" strokeWidth={1.5} />;
          case 'speaking':
            return <Volume2 size={32} color="#E2E8F0" strokeWidth={1.5} />;
          case 'thinking':
            return <VolumeX size={32} color="#E2E8F0" strokeWidth={1.5} />;
          default:
            return <MicOff size={32} color="#E2E8F0" strokeWidth={1.5} />;
        }
      }
      return <Mic size={32} color="#E2E8F0" strokeWidth={1.5} />;
    };

    const getStatusText = () => {
      if (conversation.status === 'connecting') {
        return isMobile
          ? 'Connecting to Piko... (mobile)'
          : 'Connecting to Piko...';
      }

      if (conversation.status === 'connected') {
        if (!conversationStarted) {
          return 'Connected - ready for conversation';
        }

        switch (currentMode) {
          case 'listening':
            return isMobile
              ? 'Listening... (speak clearly)'
              : 'Listening for your response...';
          case 'speaking':
            return 'Piko is speaking...';
          case 'thinking':
            return 'Piko is thinking...';
          default:
            return 'Voice conversation active';
        }
      }

      if (!audioEnabled && userInteracted) {
        return 'Enabling audio for mobile...';
      }

      if (connectionRetries > 0) {
        return `Retrying connection... (${connectionRetries}/${maxRetries})`;
      }

      return isMobile
        ? 'Tap to start voice conversation (mobile)'
        : 'Tap to start voice conversation';
    };

    const getButtonColor = () => {
      if (conversation.status === 'connecting') {
        return '#6B7280'; // Gray for connecting
      }

      if (conversation.status === 'connected') {
        switch (currentMode) {
          case 'listening':
            return '#10B981'; // Green for listening
          case 'speaking':
            return '#F59E0B'; // Orange for speaking
          case 'thinking':
            return '#8B5CF6'; // Purple for thinking
          default:
            return '#3B82F6'; // Blue for connected
        }
      }

      if (connectionRetries > 0) {
        return '#EF4444'; // Red for retry
      }

      return '#3B82F6'; // Blue for disconnected
    };

    const isDisabled =
      conversation.status === 'connecting' || connectionRetries >= maxRetries;

    return isVisible ? (
      <View style={styles.container}>
        <PikoLogo
          isSpeaking={currentMode === 'listening'}
          isLoading={isInitialized}
        />
      </View>
    ) : null;
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  callButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  mobileHint: {
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 4,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
    maxWidth: 200,
    fontWeight: '500',
  },
  lastUserMessage: {
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 2,
    maxWidth: 200,
    fontWeight: '500',
  },
  waitingText: {
    fontSize: 12,
    color: '#8B5CF6',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  permissionText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  audioText: {
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  retryText: {
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
    maxWidth: 200,
  },
});

export default ConversationalAI;
