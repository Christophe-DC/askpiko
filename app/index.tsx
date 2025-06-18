import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { usePermissions } from '../hooks/usePermissions';
import { useVoiceConversation } from '../hooks/useVoiceConversation';
import Typography from '@/components/ui/Typography';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { designTokens } from '@/styles/tokens';
import {
  Mic,
  Play,
  RotateCcw,
  FileText,
  Settings,
  Globe,
  Smartphone,
  MessageCircle,
  Volume2,
  VolumeX,
  Loader as Loader2,
} from 'lucide-react-native';
import ConversationalAI, {
  ConversationalAIHandle,
} from '@/components/ConversationalAI';
import * as Device from 'expo-device';
import PikoLogo from '@/components/PikoLogo';

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

  const aiRef = useRef<ConversationalAIHandle>(null);

  const { requestMicrophonePermission, checkMicrophonePermission } =
    usePermissions();

  const {
    state: voiceState,
    startConversation,
    endConversation,
    speakText,
  } = useVoiceConversation(
    handleUserMessage,
    handleAgentMessage,
    handleModeChange
  );

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
        screenResolution: `${width}x${height}`,
      };

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
        case 7:
          nextDiagStep = 'sensor_test';
        case 8:
          nextDiagStep = 'camera_test';
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
      setPhraseToRead(phrase);
      return `Phrase set: ${phrase}`;
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
    const randomPhrase =
      MICROPHONE_PHRASES[Math.floor(Math.random() * MICROPHONE_PHRASES.length)];
    setPhraseToRead(randomPhrase);
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
      console.log('🎤 Starting voice conversation...');
      await startConversation();
      setVoiceConversationStarted(true);

      // L'agent va gérer l'introduction et les permissions
      await speakText(
        "Hello! Thanks for choosing AskPiko Mobile Verification. I'm Piko, your AI Agent. AskPiko removes the guesswork from second-hand phone sales."
      );
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
      await endConversation();
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

      setContextUpdate(`cell Tapped ${totalTrue}/${TOTAL_CELLS}`);
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
  useEffect(() => {
    if (currentStep === 'sensor_test' && !sensorTestCompleted) {
      const handleDeviceMotion = (event: DeviceMotionEvent) => {
        const acceleration = event.accelerationIncludingGravity;
        if (acceleration) {
          const totalAcceleration = Math.sqrt(
            Math.pow(acceleration.x || 0, 2) +
              Math.pow(acceleration.y || 0, 2) +
              Math.pow(acceleration.z || 0, 2)
          );

          if (totalAcceleration > 15) {
            // Seuil de détection du shake
            diagnosticTools.recordSensorShake();
          }
        }
      };

      window.addEventListener('devicemotion', handleDeviceMotion);
      return () =>
        window.removeEventListener('devicemotion', handleDeviceMotion);
    }
  }, [currentStep, sensorTestCompleted]);

  useEffect(() => {
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
        return (
          <Card style={styles.stepCard}>
            <Typography variant="h3" align="center" style={styles.stepTitle}>
              Introduction & Permissions
            </Typography>
            <Typography
              variant="body"
              color="secondary"
              align="center"
              style={styles.stepDescription}
            >
              Piko is introducing himself and checking microphone permissions.
            </Typography>
          </Card>
        );

      case 'device_detection':
        return (
          <Card style={styles.stepCard}>
            <Typography variant="h3" align="center" style={styles.stepTitle}>
              Device Detection
            </Typography>
            {deviceInfo && (
              <View style={styles.deviceInfoContainer}>
                <Typography variant="body" style={styles.deviceInfoText}>
                  Platform: {deviceInfo.osName}
                </Typography>
                <Typography variant="body" style={styles.deviceInfoText}>
                  Screen: {deviceInfo.screenResolution}
                </Typography>
                <Typography variant="body" style={styles.deviceInfoText}>
                  Mobile: {deviceInfo.isDevice ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="body" style={styles.deviceInfoText}>
                  modelName: {deviceInfo.modelName}
                </Typography>
              </View>
            )}
          </Card>
        );

      case 'display_color':
        if (
          currentColorTest > -1 &&
          currentColorTest < colorTestColors.length
        ) {
          const currentColor = DISPLAY_COLORS[currentColorTest];
          return (
            <View
              style={[
                styles.fullScreenTest,
                { backgroundColor: currentColor.color },
              ]}
            >
              <Typography
                variant="h2"
                align="center"
                style={[
                  styles.colorTestText,
                  { color: currentColor.textColor },
                ]}
              >
                What color do you see?
              </Typography>
              <Typography
                variant="h4"
                align="center"
                style={[
                  styles.colorTestHint,
                  { color: currentColor.textColor },
                ]}
              >
                Say the color name to Piko
              </Typography>
            </View>
          );
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
          <Card style={styles.stepCard}>
            <Typography variant="h3" align="center" style={styles.stepTitle}>
              Button Test
            </Typography>
            <Typography
              variant="body"
              color="secondary"
              align="center"
              style={styles.stepDescription}
            >
              Press the following buttons when Piko asks:
            </Typography>
          </Card>
        );

      case 'microphone_test':
        return (
          <Card style={styles.stepCard}>
            <Typography variant="h3" align="center" style={styles.stepTitle}>
              Microphone Test
            </Typography>
            {phraseToRead && (
              <View style={styles.phraseContainer}>
                <Typography
                  variant="body"
                  color="secondary"
                  align="center"
                  style={styles.phraseLabel}
                >
                  Please read this phrase aloud:
                </Typography>
                <Typography
                  variant="h4"
                  align="center"
                  style={styles.phraseText}
                >
                  "{phraseToRead}"
                </Typography>
              </View>
            )}
          </Card>
        );

      case 'sensor_test':
        return (
          <Card style={styles.stepCard}>
            <Typography variant="h3" align="center" style={styles.stepTitle}>
              Sensor Test
            </Typography>
            <View style={styles.sensorTestContainer}>
              <Hand
                size={48}
                color={sensorTestCompleted ? colors.success : colors.primary}
              />
              <Typography
                variant="body"
                color="secondary"
                align="center"
                style={styles.sensorTestText}
              >
                {sensorTestCompleted
                  ? 'Shake detected! ✅'
                  : 'Shake your phone to test the accelerometer'}
              </Typography>
            </View>
          </Card>
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
          <Card style={styles.stepCard}>
            <Typography variant="h3" align="center" style={styles.stepTitle}>
              Diagnostic Summary
            </Typography>
            <View style={styles.summaryContainer}>
              <Typography
                variant="h2"
                align="center"
                style={[styles.scoreText, { color: colors.primary }]}
              >
                {score}%
              </Typography>
              <Typography
                variant="body"
                color="secondary"
                align="center"
                style={styles.summaryText}
              >
                {passedTests} out of {totalTests} tests passed
              </Typography>

              <View style={styles.resultsContainer}>
                {diagnosticResults.map((result, index) => (
                  <View key={index} style={styles.resultItem}>
                    {result.passed ? (
                      <CheckCircle size={20} color={colors.success} />
                    ) : (
                      <AlertCircle size={20} color={colors.error} />
                    )}
                    <Typography variant="body" style={styles.resultText}>
                      {result.step.replace('_', ' ').toUpperCase()}
                    </Typography>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderDiagnosticFlow = () => {
    const progress = getStepProgress();

    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
          <View style={styles.logoSection}>
            <PikoLogo
              style={styles.pikoVoice}
              isSpeaking={voiceMode === 'speaking'}
              isLoading={voiceMode === 'idle'}
            />

            {/* Progress Header */}
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

            {/* Voice Conversation Component */}

            <View style={styles.hiddenVoiceContainer}>
              <ConversationalAI
                ref={aiRef}
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

            {/* Current Step */}
            <ScrollView style={styles.stepScrollView}>
              {voiceModeEnabled &&
                voiceConversationStarted &&
                renderVoiceStatus()}
              {renderCurrentStepContent()}
            </ScrollView>
          </View>
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
  gridTestContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'transparent',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: SCREEN_WIDTH / TOTAL_COLUMNS,
    height: SCREEN_HEIGHT / TOTAL_ROWS,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'black',
  },
});
