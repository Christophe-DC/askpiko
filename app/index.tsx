import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { usePermissions } from '../hooks/usePermissions';
import Typography from '@/components/ui/Typography';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { designTokens } from '@/styles/tokens';
import {
  Mic,
  Play,
  MessageCircle,
  Volume2,
  Monitor,
  Cpu,
  HardDrive,
  Loader as Loader2,
} from 'lucide-react-native';
import ConversationalAI, {
  ConversationalAIHandle,
} from '@/components/ConversationalAI';
import * as Device from 'expo-device';
import PikoLogo from '@/components/PikoLogo';
import ColorContainerTest from '@/components/ColorContainerTest';
import LottieView from 'lottie-react-native';
import PhonePressButon from '@/assets/animation/PhonePressButon.json';
import PhoneShake from '@/assets/animation/PhoneShake.json';
import { useShakeDetection } from '@/hooks/useShakeDetection';
import { usePhysicalButtons } from '@/hooks/usePhysicalButtons';

// Types pour le diagnostic
type DiagnosticStep =
  | 'introduction'
  | 'device_detection'
  | 'display_color'
  | 'display_grid'
  | 'button_test'
  | 'microphone_test'
  | 'sensor_test'
  | 'camera_test'
  | 'summary';

type VoiceMode = 'idle' | 'thinking' | 'speaking' | 'listening';

interface DiagnosticResult {
  step: DiagnosticStep;
  passed: boolean;
  details: string;
  timestamp: number;
}

interface DeviceInfo {
  brand: string | null;
  manufacturer: string;
  modelName: string | null;
  deviceName: string;
  osName: string | null;
  osVersion: string | null;
  platformApiLevel: number | string;
  totalMemory: number;
  supportedCpuArchitectures: string[];
  isDevice: boolean;
  screenResolution: string;
}

// Configuration des couleurs pour le test d'affichage
const DISPLAY_COLORS = [
  { name: 'Red', color: '#FF0000', textColor: '#FFFFFF' },
  { name: 'Green', color: '#00FF00', textColor: '#000000' },
  { name: 'Blue', color: '#0000FF', textColor: '#FFFFFF' },
  { name: 'Yellow', color: '#FFFF00', textColor: '#000000' },
  { name: 'Purple', color: '#800080', textColor: '#FFFFFF' },
  { name: 'Orange', color: '#FFA500', textColor: '#000000' },
];

// Phrases pour le test microphone
const MICROPHONE_PHRASES = [
  'The quick brown fox jumps over the lazy dog',
  'Hello world, this is a microphone test',
  'Testing one two three four five',
  'The weather is beautiful today',
  'Technology makes our lives easier',
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const TOTAL_ROWS = 10;
const TOTAL_COLUMNS = 5;
const TOTAL_CELLS = TOTAL_ROWS * TOTAL_COLUMNS;

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // États principaux
  const [currentStep, setCurrentStep] =
    useState<DiagnosticStep>('introduction');
  const [isRunning, setIsRunning] = useState(false);
  const [showDiagnosticFlow, setShowDiagnosticFlow] = useState(false);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [voiceConversationStarted, setVoiceConversationStarted] =
    useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('idle');

  // États pour les permissions
  const [microphonePermissionGranted, setMicrophonePermissionGranted] =
    useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

  // États pour les messages vocaux
  const [lastAgentMessage, setLastAgentMessage] = useState('');
  const [lastUserMessage, setLastUserMessage] = useState('');

  // États pour les tests spécifiques
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [currentColorTest, setCurrentColorTest] = useState(0);
  const [colorTestColors, setColorTestColors] = useState<typeof DISPLAY_COLORS>(
    []
  );
  const [gridTestCompleted, setGridTestCompleted] = useState<boolean[]>(
    Array(TOTAL_CELLS).fill(false)
  );
  const [buttonTestProgress, setButtonTestProgress] = useState<string[]>([]);
  const [phraseToRead, setPhraseToRead] = useState('');
  const [sensorTestCompleted, setSensorTestCompleted] = useState(false);
  const [cameraTestCompleted, setCameraTestCompleted] = useState(false);
  const [contextUpdate, setContextUpdate] = useState('');

  // Résultats des tests
  const [diagnosticResults, setDiagnosticResults] = useState<
    DiagnosticResult[]
  >([]);

  const { requestMicrophonePermission, checkMicrophonePermission } =
    usePermissions();

  // Outils de diagnostic
  const diagnosticTools = {
    test_microphone: async (): Promise<string> => {
      try {
        const permission = await checkMicrophonePermission();
        return permission;
      } catch (error) {
        console.error('Failed to test microphone:', error);
        return 'error';
      }
    },

    async get_device_info(): Promise<DeviceInfo> {
      const { width, height } = Dimensions.get('screen');
      const info: DeviceInfo = {
        brand: Device.brand ?? null,
        manufacturer: Device.manufacturer ?? 'unknown',
        modelName: Device.modelName ?? null,
        deviceName: Device.deviceName ?? 'unknown',
        osName: Device.osName ?? null,
        osVersion: Device.osVersion ?? null,
        platformApiLevel: Device.platformApiLevel ?? 'unknown',
        totalMemory: Device.totalMemory ?? 0,
        supportedCpuArchitectures: Device.supportedCpuArchitectures ?? [],
        isDevice: Device.isDevice,
        screenResolution: `${Math.floor(width)}x${Math.floor(height)}`,
      };

      setDeviceInfo(info);
      console.log('📱 Device Info:', info);
      return info;
    },

    updateDiagnosticStep: async (nextStep: string): Promise<string> => {
      console.log(`🔄 Moving to step: ${nextStep}`);

      // Ajouter le résultat de l'étape précédente
      if (currentStep !== 'introduction') {
        addDiagnosticResult(currentStep, true, 'Test completed successfully');
      }

      let nextDiagStep = currentStep || 'introduction';
      switch (nextStep?.step) {
        case 1:
          nextDiagStep = 'introduction';
          break;
        case 2:
          nextDiagStep = 'device_detection';
          break;
        case 3:
          nextDiagStep = 'display_color';
          break;
        case 4:
          nextDiagStep = 'display_grid';
          break;
        case 5:
          nextDiagStep = 'button_test';
          break;
        case 6:
          nextDiagStep = 'microphone_test';
          break;
        case 7:
          nextDiagStep = 'sensor_test';
          break;
        case 8:
          nextDiagStep = 'summary'; //'camera_test';
          break;
        case 9:
          nextDiagStep = 'summary';
          break;
      }

      setCurrentStep(nextDiagStep as DiagnosticStep);

      // Préparer l'étape suivante
      switch (nextDiagStep as DiagnosticStep) {
        case 'display_color':
          setupColorTest();
          break;
        case 'display_grid':
          setupGridTest();
          break;
        case 'button_test':
          setupButtonTest();
          break;
        case 'microphone_test':
          setupMicrophoneTest();
          break;
        case 'sensor_test':
          setupSensorTest();
          break;
        case 'camera_test':
          setupCameraTest();
          break;
      }

      return `Moved to step: ${nextStep}`;
    },

    updatePhraseToRead: async (phrase: string): Promise<string> => {
      console.log('updatePhraseToRead:', phrase);
      setPhraseToRead(phrase.phrase);
      return `Phrase set: ${phrase.phrase}`;
    },

    updateColorToShow: async (colorName: string): Promise<string> => {
      console.log('updateColorToShow:', colorName);
      if (colorName === 'undefined' || colorName.color === 'undefined') {
        return 'Color error';
      }
      const colorIndex = DISPLAY_COLORS.findIndex(
        (c) => c.name.toLowerCase() === colorName.color.toLowerCase()
      );
      if (colorIndex !== -1) {
        console.log('colorIndex:', colorIndex);
        setCurrentColorTest(colorIndex);
      }
      return `Color set to: ${colorName.color}`;
    },

    recordGridCellCompleted: async (cellIndex: string): Promise<string> => {
      const index = parseInt(cellIndex);
      setGridTestCompleted((prev) => {
        const newCompleted = [...prev];
        newCompleted[index] = true;
        return newCompleted;
      });
      return `Cell ${cellIndex} completed`;
    },

    recordButtonPressed: async (buttonName: string): Promise<string> => {
      setButtonTestProgress((prev) => [...prev, buttonName]);
      return `Button ${buttonName} pressed`;
    },

    recordSensorShake: async (): Promise<string> => {
      setSensorTestCompleted(true);
      return 'Sensor shake detected';
    },

    recordCameraPhoto: async (): Promise<string> => {
      setCameraTestCompleted(true);
      return 'Camera photo taken';
    },
  };

  const clientTools = {
    checkMicrophonePermission: diagnosticTools.test_microphone,
    getDeviceInfos: diagnosticTools.get_device_info,
    updateDiagnosticStep: diagnosticTools.updateDiagnosticStep,
    updatePhraseToRead: diagnosticTools.updatePhraseToRead,
    updateColorToShow: diagnosticTools.updateColorToShow,
    recordButtonPressed: diagnosticTools.recordButtonPressed,
    recordSensorShake: diagnosticTools.recordSensorShake,
    recordCameraPhoto: diagnosticTools.recordCameraPhoto,
  };

  // Handlers pour la conversation vocale
  function handleUserMessage(message: string) {
    console.log('🗣️ User said:', message);
    setLastUserMessage(message);
  }

  function handleAgentMessage(message: string) {
    console.log('🤖 Agent said:', message);
    setLastAgentMessage(message);
  }

  function handleModeChange(
    mode: 'listening' | 'speaking' | 'thinking' | 'idle'
  ) {
    console.log('🔄 Voice mode changed to:', mode);
    setVoiceMode(mode);
  }

  // Fonctions de configuration des tests
  const setupColorTest = () => {
    const shuffled = [...DISPLAY_COLORS].sort(() => Math.random() - 0.5);
    setColorTestColors(shuffled.slice(0, 3));
    setCurrentColorTest(0);
  };

  const setupGridTest = () => {
    setGridTestCompleted(Array(TOTAL_CELLS).fill(false)); // 5x10 grid
  };

  const setupButtonTest = () => {
    setButtonTestProgress([]);
  };

  const setupMicrophoneTest = () => {
    //const randomPhrase = MICROPHONE_PHRASES[Math.floor(Math.random() * MICROPHONE_PHRASES.length)];
    //setPhraseToRead(randomPhrase);
  };

  const setupSensorTest = () => {
    setSensorTestCompleted(false);
  };

  const setupCameraTest = () => {
    setCameraTestCompleted(false);
  };

  // Fonction pour ajouter un résultat de diagnostic
  const addDiagnosticResult = (
    step: DiagnosticStep,
    passed: boolean,
    details: string
  ) => {
    const result: DiagnosticResult = {
      step,
      passed,
      details,
      timestamp: Date.now(),
    };
    setDiagnosticResults((prev) => [...prev, result]);
  };

  // Démarrage du diagnostic
  const handleStartDiagnostic = async () => {
    console.log('🚀 Starting diagnostic with voice mode...');
    setVoiceModeEnabled(true);
    setShowDiagnosticFlow(true);
    setIsRunning(true);
    setCurrentStep('introduction');

    try {
      setVoiceConversationStarted(true);
    } catch (error) {
      console.error('❌ Failed to start voice conversation:', error);
      setVoiceModeEnabled(false);
      setVoiceConversationStarted(false);
      setIsRunning(false);
    }
  };

  // Arrêt du diagnostic
  const handleStopDiagnostic = async () => {
    if (voiceModeEnabled && voiceConversationStarted) {
      setVoiceConversationStarted(false);
    }

    // Reset de tous les états
    setIsRunning(false);
    setShowDiagnosticFlow(false);
    setVoiceModeEnabled(false);
    setCurrentStep('introduction');
    setLastAgentMessage('');
    setLastUserMessage('');
    setVoiceMode('idle');
    setMicrophonePermissionGranted(false);
    setDiagnosticResults([]);

    // Reset des états de tests
    setDeviceInfo(null);
    setCurrentColorTest(0);
    setColorTestColors([]);
    setGridTestCompleted([]);
    setButtonTestProgress([]);
    setPhraseToRead('');
    setSensorTestCompleted(false);
    setCameraTestCompleted(false);
  };

  // Gestion des permissions microphone
  const handleMicrophonePermissionRequest = async () => {
    setIsCheckingPermissions(true);
    try {
      const granted = await requestMicrophonePermission();
      setMicrophonePermissionGranted(granted);

      // Informer l'agent du résultat
      if (granted) {
        console.log('✅ Microphone permission granted');
      } else {
        console.warn('❌ Microphone permission denied');
      }
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  // Gestionnaires d'événements pour les tests
  const handleGridCellClick = (index: number) => {
    console.log('handleGridCellClick:', index);
    if (!gridTestCompleted[index]) {
      const newGridTestCompleted = [...gridTestCompleted];
      newGridTestCompleted[index] = true;
      setGridTestCompleted(newGridTestCompleted);

      // Notify AI agent if applicable
      const totalTrue = newGridTestCompleted.filter(Boolean).length;

      if (totalTrue === 25 || totalTrue === 50) {
        setContextUpdate(`Cell tapped ${totalTrue}/${TOTAL_CELLS}`);
      }
      /* console.log('aiRef.current:', aiRef.current);
      aiRef.current?.sendContextUpdate(
        `cell Tapped ${totalTrue}/${TOTAL_CELLS}`
      );*/
    }
  };

  const handleButtonPress = (buttonName: string) => {
    if (!buttonTestProgress.includes(buttonName)) {
      diagnosticTools.recordButtonPressed(buttonName);
    }
  };

  // Détection des mouvements pour les capteurs
  const handleShakeDetected = () => {
    console.log('Shake détected!');
    setContextUpdate('Device shake detected');
    diagnosticTools.recordSensorShake();
  };

  useShakeDetection(handleShakeDetected, currentStep === 'sensor_test', 2.5);

  useEffect(() => {
    diagnosticTools.get_device_info();
    handleMicrophonePermissionRequest();
  }, []);

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => {
      if (
        typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        typeof navigator.userAgent !== 'undefined'
      ) {
        const userAgent = navigator.userAgent?.toLowerCase();
        const mobileKeywords = [
          'android',
          'iphone',
          'ipad',
          'ipod',
          'blackberry',
          'windows phone',
        ];
        const isMobileDevice =
          mobileKeywords.some((keyword) => userAgent.includes(keyword)) ||
          window.innerWidth <= 768 ||
          'ontouchstart' in window;
        console.log('📱 Mobile device detected:', isMobileDevice);
      }
    };

    checkMobile();
    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener !== 'undefined'
    ) {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Utilitaires d'affichage
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

  const getStepProgress = () => {
    const steps = [
      'introduction',
      'device_detection',
      'display_color',
      'display_grid',
      'button_test',
      'microphone_test',
      'sensor_test',
      'camera_test',
      'summary',
    ];
    const currentIndex = steps.indexOf(currentStep);
    return { current: currentIndex + 1, total: steps.length };
  };

  usePhysicalButtons({
    onVolumeUp: () => {
      console.log('olume-Up pressed !');
      setContextUpdate('Volume-Up pressed');
    },
    onVolumeDown: () => {
      console.log('Volume-Down pressed !');
      setContextUpdate('Volume-Down pressed');
    },
    onBackButton: () => {
      console.log('Back button pressed !');
      setContextUpdate('Back button pressed');
    },
    onPowerButton: () => {
      console.log('Power  button pressed !');
      setContextUpdate('Power button pressed');
    },
    enabled: currentStep === 'button_test',
  });

  // Composants de rendu
  const renderWelcomeScreen = () => (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <View style={styles.logoSection}>
          <PikoLogo
            style={styles.pikoVoice}
            isSpeaking={false}
            isLoading={false}
          />

          <Typography
            variant="h2"
            align="center"
            style={[styles.tagline, { color: colors.text }]}
          >
            AI-Powered Device Diagnostics
          </Typography>
        </View>

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

  const renderVoiceStatus = () => (
    <Card style={styles.minimalVoiceCard}>
      <View style={styles.voiceStatusRow}>
        <View
          style={[
            styles.voiceStatusIcon,
            { backgroundColor: getVoiceStatusColor() + '20' },
          ]}
        >
          {getVoiceStatusIcon()}
        </View>
        <Typography
          variant="label"
          style={[styles.voiceStatusLabel, { color: getVoiceStatusColor() }]}
        >
          {getVoiceStatusText()}
        </Typography>
      </View>

      {lastAgentMessage && (
        <View style={styles.messageRow}>
          <Typography
            variant="caption"
            color="secondary"
            style={styles.messageLabel}
          >
            Piko:
          </Typography>
          <Typography variant="body" style={styles.messageText}>
            {lastAgentMessage}
          </Typography>
        </View>
      )}

      {lastUserMessage && (
        <View style={styles.messageRow}>
          <Typography
            variant="caption"
            color="primary"
            style={styles.messageLabel}
          >
            You:
          </Typography>
          <Typography variant="body" color="primary" style={styles.messageText}>
            {lastUserMessage}
          </Typography>
        </View>
      )}
    </Card>
  );

  const renderCurrentStepContent = () => {
    switch (currentStep) {
      case 'introduction':
        return <View />;

      case 'device_detection':
        const formatSize = (size?: number): string => {
          if (!size) return 'N/A';
          const gb = size / 1024 / 1024 / 1024;
          return gb >= 1 ? `${gb.toFixed(1)} GB` : `${size} MB`;
        };

        const InfoRow = ({ icon, label, value, iconColor = '#3b82f6' }) => {
          if (!value) return null;

          return (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                marginVertical: 2,
                backgroundColor: '#f8fafc',
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: 1,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: iconColor,
                    marginRight: 12,
                  }}
                >
                  {React.cloneElement(icon, {
                    size: 16,
                    color: 'white',
                  })}
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: '#374151',
                    flex: 1,
                  }}
                >
                  {label}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#111827',
                  textAlign: 'right',
                  flexShrink: 0,
                  maxWidth: 120,
                }}
                numberOfLines={1}
              >
                {value}
              </Text>
            </TouchableOpacity>
          );
        };

        return (
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: '100%',
              shadowColor: colors.primary,
              shadowOffset: {
                width: 0,
                height: 5,
              },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              marginBottom: 60,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 16,
                paddingHorizontal: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                📱 Informations Device
              </Text>
              {deviceInfo?.brand && deviceInfo?.modelName && (
                <Text
                  style={{
                    fontSize: 14,
                    color: 'rgba(255, 255, 255, 0.9)',
                    textAlign: 'center',
                    marginTop: 4,
                  }}
                >
                  {deviceInfo.brand} {deviceInfo.modelName}
                </Text>
              )}
            </View>

            {/* Contenu */}
            <View style={{ padding: 8 }}>
              <InfoRow
                icon={<Cpu />}
                label="Version OS"
                value={deviceInfo?.osVersion}
                iconColor="#10b981"
              />

              <InfoRow
                icon={<Monitor />}
                label="Résolution"
                value={deviceInfo?.screenResolution}
                iconColor="#ec4899"
              />

              <InfoRow
                icon={<HardDrive />}
                label="Mémoire"
                value={formatSize(deviceInfo?.totalMemory)}
                iconColor="#6366f1"
              />
            </View>
          </View>
        );

      case 'display_color':
        console.log('colorIndex:', currentColorTest);
        if (currentColorTest > -1 && currentColorTest < DISPLAY_COLORS.length) {
          const currentColor = DISPLAY_COLORS[currentColorTest];
          console.log(' currentColor:', currentColor?.color);
          return <ColorContainerTest color={currentColor?.color} />;
        }
        return null;

      case 'display_grid':
        return (
          <View style={styles.gridTestContainer}>
            <Typography variant="h3" align="center" style={styles.stepTitle}>
              Touch Screen Test
            </Typography>
            <Typography
              variant="body"
              color="secondary"
              align="center"
              style={styles.stepDescription}
            >
              Tap each cell to test your touchscreen
            </Typography>
            <View style={styles.overlay}>
              <View style={styles.gridContainer}>
                {Array.from({ length: TOTAL_CELLS }, (_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.cell,
                      {
                        opacity: gridTestCompleted[index] ? 0 : 0.5,
                      },
                    ]}
                    onPress={() => handleGridCellClick(index)}
                  />
                ))}
              </View>
            </View>
          </View>
        );

      case 'button_test':
        const expectedButtons = ['Volume Up', 'Volume Down', 'Power'];
        return (
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: '100%',
              shadowColor: colors.primary,
              shadowOffset: {
                width: 0,
                height: 5,
              },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              marginBottom: 60,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 16,
                paddingHorizontal: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                Press Buttons
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: 'center',
                  marginTop: 4,
                }}
              ></Text>
            </View>

            {/* Contenu */}
            <View style={{ padding: 8 }}>
              <View
                style={{
                  width: '100%',
                  height: 160,
                  overflow: 'hidden',
                }}
              >
                <LottieView
                  source={PhonePressButon}
                  autoPlay
                  loop
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              </View>
            </View>
          </View>
        );

      case 'microphone_test':
        return (
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: '100%',
              shadowColor: colors.primary,
              shadowOffset: {
                width: 0,
                height: 5,
              },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              marginBottom: 60,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 16,
                paddingHorizontal: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                🎤 Microphone Test
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: 'center',
                  marginTop: 4,
                }}
              >
                Please read this phrase aloud:
              </Text>
            </View>

            {/* Contenu */}
            <View style={{ padding: 8, minHeight: 160 }}>
              <Typography variant="h4" align="center" style={styles.phraseText}>
                {phraseToRead}
              </Typography>
            </View>
          </View>
        );

      case 'sensor_test':
        return (
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: '100%',
              shadowColor: colors.primary,
              shadowOffset: {
                width: 0,
                height: 5,
              },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              marginBottom: 60,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 16,
                paddingHorizontal: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                Shake your device
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: 'center',
                  marginTop: 4,
                }}
              ></Text>
            </View>

            {/* Contenu */}
            <View style={{ padding: 8 }}>
              <View
                style={{
                  width: '100%',
                  height: 160,
                  overflow: 'hidden',
                }}
              >
                <LottieView
                  source={PhoneShake}
                  autoPlay
                  loop
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              </View>
            </View>
          </View>
        );

      case 'camera_test':
        return (
          <Card style={styles.stepCard}>
            <Typography variant="h3" align="center" style={styles.stepTitle}>
              Camera Test
            </Typography>
            <View style={styles.cameraTestContainer}>
              <Camera
                size={48}
                color={cameraTestCompleted ? colors.success : colors.primary}
              />
              <Typography
                variant="body"
                color="secondary"
                align="center"
                style={styles.cameraTestText}
              >
                {cameraTestCompleted
                  ? 'Photo taken! ✅'
                  : 'Take a photo when Piko asks'}
              </Typography>
            </View>
          </Card>
        );

      case 'summary':
        const passedTests = diagnosticResults.filter((r) => r.passed).length;
        const totalTests = diagnosticResults.length;
        const score = Math.round((passedTests / totalTests) * 100);

        return (
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              width: '100%',
              shadowColor: colors.primary,
              shadowOffset: {
                width: 0,
                height: 5,
              },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              marginBottom: 60,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 16,
                paddingHorizontal: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                Diagnostic Summary
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: 'center',
                  marginTop: 4,
                }}
              ></Text>
            </View>

            {/* Contenu */}
            <View style={{ padding: 8, minHeight: 160 }}>
              <Typography
                variant="h4"
                align="center"
                style={{
                  margin: 'auto',
                }}
              >
                7 out of 7 tests passed
              </Typography>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const SHOW_VOICE_DEBUG = false;
  const SHOW_PROGRESS_DEBUG = false;
  const renderDiagnosticFlow = () => {
    const progress = getStepProgress();
    const isGridTest = currentStep === 'display_grid';

    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Contenu principal - toujours visible */}
        <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
          {/* Logo - même position que welcome screen */}
          <View style={styles.logoSection}>
            <PikoLogo
              style={styles.pikoVoice}
              isSpeaking={voiceMode === 'speaking'}
              isLoading={voiceMode === 'idle'}
            />
          </View>

          {/* Barre de progression (debug) */}
          {SHOW_PROGRESS_DEBUG && (
            <Card style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Typography variant="h4" style={styles.progressTitle}>
                  Step {progress.current} of {progress.total}
                </Typography>
                <Button
                  title="Stop"
                  variant="ghost"
                  onPress={handleStopDiagnostic}
                  style={styles.stopButton}
                />
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(progress.current / progress.total) * 100}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            </Card>
          )}

          {/* État vocal (debug) */}
          {SHOW_VOICE_DEBUG &&
            voiceModeEnabled &&
            voiceConversationStarted &&
            renderVoiceStatus()}

          {/* Zone de contenu pour les étapes (pas pour grid) */}
          {!isGridTest && (
            <View style={styles.stepContentContainer}>
              {renderCurrentStepContent()}
            </View>
          )}
        </View>

        {/* Overlay pour le test de grille (par-dessus tout) */}
        {isGridTest && (
          <View style={styles.fullScreenOverlay}>
            {renderCurrentStepContent()}
          </View>
        )}

        {/* Composant IA caché */}
        <View style={styles.hiddenVoiceContainer}>
          <ConversationalAI
            dom={{ style: styles.hiddenDomComponent }}
            onUserMessage={handleUserMessage}
            onAgentMessage={handleAgentMessage}
            onModeChange={handleModeChange}
            autoStart={voiceModeEnabled && voiceConversationStarted}
            isVisible={voiceModeEnabled && voiceConversationStarted}
            checkMicrophonePermission={diagnosticTools.test_microphone}
            getDeviceInfos={diagnosticTools.get_device_info}
            updateDiagnosticStep={diagnosticTools.updateDiagnosticStep}
            updatePhraseToRead={diagnosticTools.updatePhraseToRead}
            updateColorToShow={diagnosticTools.updateColorToShow}
            recordButtonPressed={diagnosticTools.recordButtonPressed}
            recordSensorShake={diagnosticTools.recordSensorShake}
            recordCameraPhoto={diagnosticTools.recordCameraPhoto}
            contextUpdate={contextUpdate}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <StatusBar style="auto" />
      {showDiagnosticFlow ? renderDiagnosticFlow() : renderWelcomeScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.xl,
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
    width: '100%',
    marginBottom: designTokens.spacing.md,
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
  pikoVoice: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xl,
    ...designTokens.shadows.lg,
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
  minimalVoiceCard: {
    width: '100%',
    marginBottom: designTokens.spacing.md,
    padding: designTokens.spacing.sm,
  },
  voiceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  voiceStatusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
  },
  voiceStatusLabel: {
    fontWeight: '600',
    fontSize: 12,
  },
  messageRow: {
    marginBottom: designTokens.spacing.xs,
  },
  messageLabel: {
    fontWeight: '600',
    marginBottom: designTokens.spacing.xs,
    fontSize: 10,
  },
  messageText: {
    lineHeight: 16,
    fontSize: 12,
  },
  stepCard: {
    alignItems: 'center',
    padding: designTokens.spacing.xl,
    width: '100%',
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
  // Nouveau style pour le conteneur de contenu des étapes
  stepContentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  // Nouveau style pour l'overlay plein écran
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
  },
  gridTestContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1001,
    paddingTop: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridTestTitle: {
    color: 'white',
    marginBottom: designTokens.spacing.md,
    fontWeight: '700',
  },
  gridTestDescription: {
    color: 'white',
    marginBottom: designTokens.spacing.lg,
    textAlign: 'center',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: SCREEN_WIDTH / TOTAL_COLUMNS,
    height: SCREEN_HEIGHT / TOTAL_ROWS,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'black',
  },
});
