import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DiagnosticResult {
  testName: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  details: string;
  timestamp: number;
  score: number;
  attempts?: number;
  maxAttempts?: number;
}

export interface DeviceInfo {
  brand: string;
  model: string;
  osVersion: string;
  imei?: string;
  serialNumber?: string;
  manufacturer?: string;
  deviceType?: string;
  totalMemory?: number;
  totalStorage?: number;
  screenResolution?: string;
  cpuArchitecture?: string;
}

export interface DiagnosticReport {
  id: string;
  deviceInfo: DeviceInfo;
  batteryHealth: {
    level: number;
    status: string;
    temperature?: number;
    isCharging?: boolean;
    chargingTime?: number;
  };
  results: DiagnosticResult[];
  overallScore: number;
  timestamp: number;
  completed: boolean;
  duration: number;
}

export interface DiagnosticStep {
  id: string;
  title: string;
  description: string;
  voicePrompt: string;
  type:
    | 'introduction'
    | 'permissions'
    | 'device_info'
    | 'microphone'
    | 'touchscreen'
    | 'buttons'
    | 'sensors'
    | 'camera'
    | 'report';
  completed: boolean;
  result?: DiagnosticResult;
  expectsVoiceResponse?: boolean;
  voiceCommands?: string[];
  timeoutSeconds?: number;
  maxAttempts?: number;
  currentAttempt?: number;
  testData?: any;
}

interface DiagnosticState {
  currentStep: number;
  isRunning: boolean;
  steps: DiagnosticStep[];
  currentReport: DiagnosticReport | null;
  reports: DiagnosticReport[];
  isSpeaking: boolean;
  isVoiceMode: boolean;
  awaitingVoiceResponse: boolean;
  startTime: number;

  // Touch screen test state
  touchGrid: boolean[][];
  touchGridSize: { rows: number; cols: number };
  touchTestStartTime: number;

  // Button test state
  buttonsPressed: { volumeUp: boolean; volumeDown: boolean; power: boolean };
  buttonTestStartTime: number;
  currentButtonToPress: 'volumeUp' | 'volumeDown' | 'power' | null;

  // Microphone test state
  currentSentenceIndex: number;
  microphoneAttempts: number;

  // Camera test state
  cameraTestPhase: 'front' | 'rear' | 'complete';
  cameraRecordingTime: number;

  // Actions
  startDiagnostic: (voiceMode?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeStep: (result: DiagnosticResult) => void;
  skipStep: (reason?: string) => void;
  completeDiagnostic: () => void;
  resetDiagnostic: () => void;
  setSpeaking: (speaking: boolean) => void;
  setVoiceMode: (enabled: boolean) => void;
  setAwaitingVoiceResponse: (awaiting: boolean) => void;
  processVoiceCommand: (command: string) => boolean;

  // Touch screen test actions
  initializeTouchGrid: () => void;
  tapGridCell: (row: number, col: number) => void;
  checkTouchGridComplete: () => boolean;

  // Button test actions
  initializeButtonTest: () => void;
  pressButton: (button: 'volumeUp' | 'volumeDown' | 'power') => void;
  checkButtonTestComplete: () => boolean;

  // Microphone test actions
  initializeMicrophoneTest: () => void;
  processMicrophoneResponse: (transcript: string) => boolean;
  nextMicrophoneSentence: () => void;

  // Camera test actions
  initializeCameraTest: () => void;
  switchCameraPhase: (phase: 'front' | 'rear' | 'complete') => void;

  // Storage actions
  loadReports: () => Promise<void>;
  saveReport: (report: DiagnosticReport) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
}

const initialSteps: DiagnosticStep[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    description: 'Welcome to AskPiko Mobile Verification',
    voicePrompt:
      "Hi, I'm Piko — your AI assistant for smartphone diagnostics. I'll help you test your device step by step. Are you ready to begin?",
    type: 'introduction',
    completed: false,
    expectsVoiceResponse: true,
    voiceCommands: ['yes', 'ready', 'continue', 'start', 'begin'],
  },
  {
    id: 'permissions',
    title: 'Permissions Request',
    description: 'Requesting device permissions',
    voicePrompt:
      'To begin, I need permission to access your device model, IMEI, sensors, battery stats, CPU, GPU, storage information, microphone, and cameras. Please allow when prompted.',
    type: 'permissions',
    completed: false,
    expectsVoiceResponse: true,
    voiceCommands: ['continue', 'done', 'ready', 'granted'],
  },
  {
    id: 'device_info',
    title: 'Device Information',
    description: 'Gathering device information',
    voicePrompt:
      "Perfect! I've gathered your device information. Let me summarize what I found.",
    type: 'device_info',
    completed: false,
    expectsVoiceResponse: true,
    voiceCommands: ['continue', 'next', 'proceed'],
  },
  {
    id: 'microphone_test',
    title: 'Microphone & Speech Test',
    description: 'Testing microphone and speech recognition',
    voicePrompt:
      "Now let's test your microphone and speech recognition. I'll give you a sentence to read aloud. Please repeat exactly what I say.",
    type: 'microphone',
    completed: false,
    expectsVoiceResponse: true,
    voiceCommands: [],
    maxAttempts: 3,
    currentAttempt: 0,
  },
  {
    id: 'touchscreen_test',
    title: 'Touch Screen Test',
    description: 'Testing touchscreen responsiveness',
    voicePrompt:
      "Great! Now let's test your touchscreen. I'll display a grid covering your full screen. Please tap on every square to test the touchscreen. You have 60 seconds to complete this test.",
    type: 'touchscreen',
    completed: false,
    expectsVoiceResponse: false,
    timeoutSeconds: 60,
  },
  {
    id: 'buttons_test',
    title: 'Physical Buttons Test',
    description: 'Testing physical buttons',
    voicePrompt:
      "Excellent! Now let's test your physical buttons. Please press Volume Up, then Volume Down, then the Power button. You have 10 seconds for each button.",
    type: 'buttons',
    completed: false,
    expectsVoiceResponse: false,
    timeoutSeconds: 30,
  },
  {
    id: 'sensors_test',
    title: 'Motion Sensor Test',
    description: 'Testing device sensors',
    voicePrompt:
      "Perfect! Now let's test your motion sensors. Please shake the device from left to right. You have 15 seconds to complete this test.",
    type: 'sensors',
    completed: false,
    expectsVoiceResponse: false,
    timeoutSeconds: 15,
  },
  {
    id: 'camera_test',
    title: 'Camera Test',
    description: 'Testing front and rear cameras',
    voicePrompt:
      "Almost done! Let's test your cameras. I'll ask you to record 3 seconds with the front camera, then 3 seconds with the rear camera.",
    type: 'camera',
    completed: false,
    expectsVoiceResponse: true,
    voiceCommands: ['ready', 'continue', 'start'],
  },
  {
    id: 'report',
    title: 'Final Report',
    description: 'Diagnostic complete',
    voicePrompt:
      "Excellent! Your device diagnostic is now complete. I've generated a comprehensive report with your device's health score and detailed test results.",
    type: 'report',
    completed: false,
    expectsVoiceResponse: false,
  },
];

export const useDiagnosticStore = create<DiagnosticState>((set, get) => ({
  currentStep: 0,
  isRunning: false,
  steps: initialSteps,
  currentReport: null,
  reports: [],
  isSpeaking: false,
  isVoiceMode: false,
  awaitingVoiceResponse: false,
  startTime: 0,

  // Touch screen test state
  touchGrid: [],
  touchGridSize: { rows: 10, cols: 15 },
  touchTestStartTime: 0,

  // Button test state
  buttonsPressed: { volumeUp: false, volumeDown: false, power: false },
  buttonTestStartTime: 0,
  currentButtonToPress: null,

  // Microphone test state
  currentSentenceIndex: 0,
  microphoneAttempts: 0,

  // Camera test state
  cameraTestPhase: 'front',
  cameraRecordingTime: 0,

  startDiagnostic: (voiceMode = false) => {
    const newReport: DiagnosticReport = {
      id: Date.now().toString(),
      deviceInfo: {
        brand: 'Unknown',
        model: 'Unknown',
        osVersion: 'Unknown',
      },
      batteryHealth: {
        level: 0,
        status: 'Unknown',
      },
      results: [],
      overallScore: 0,
      timestamp: Date.now(),
      completed: false,
      duration: 0,
    };

    set({
      currentStep: 0,
      isRunning: true,
      isVoiceMode: voiceMode,
      startTime: Date.now(),
      steps: initialSteps.map((step) => ({
        ...step,
        completed: false,
        result: undefined,
        currentAttempt: 0,
      })),
      currentReport: newReport,
      awaitingVoiceResponse: voiceMode,
      // Reset all test states
      touchGrid: [],
      touchTestStartTime: 0,
      buttonsPressed: { volumeUp: false, volumeDown: false, power: false },
      buttonTestStartTime: 0,
      currentButtonToPress: null,
      microphoneAttempts: 0,
      currentSentenceIndex: 0,
      cameraTestPhase: 'front',
      cameraRecordingTime: 0,
    });
  },

  nextStep: () => {
    const { currentStep, steps, isVoiceMode } = get();
    if (currentStep < steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      const nextStep = steps[nextStepIndex];

      set({
        currentStep: nextStepIndex,
        awaitingVoiceResponse: isVoiceMode && nextStep.expectsVoiceResponse,
      });
    }
  },

  prevStep: () => {
    const { currentStep, steps, isVoiceMode } = get();
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      const prevStep = steps[prevStepIndex];

      set({
        currentStep: prevStepIndex,
        awaitingVoiceResponse: isVoiceMode && prevStep.expectsVoiceResponse,
      });
    }
  },

  completeStep: (result: DiagnosticResult) => {
    const { currentStep, steps, currentReport } = get();
    const updatedSteps = [...steps];
    updatedSteps[currentStep] = {
      ...updatedSteps[currentStep],
      completed: true,
      result,
    };

    const updatedReport = currentReport
      ? {
          ...currentReport,
          results: [...currentReport.results, result],
        }
      : null;

    set({
      steps: updatedSteps,
      currentReport: updatedReport,
      awaitingVoiceResponse: false,
    });
  },

  skipStep: (reason = 'User requested skip') => {
    const { currentStep, steps } = get();
    const currentStepData = steps[currentStep];

    const skipResult: DiagnosticResult = {
      testName: currentStepData.title,
      status: 'skipped',
      details: reason,
      timestamp: Date.now(),
      score: 0,
    };

    get().completeStep(skipResult);
  },

  completeDiagnostic: async () => {
    const { currentReport, saveReport, startTime } = get();
    if (currentReport) {
      const duration = Date.now() - startTime;
      const totalScore = currentReport.results.reduce(
        (sum, result) => sum + result.score,
        0
      );
      const avgScore =
        currentReport.results.length > 0
          ? totalScore / currentReport.results.length
          : 0;

      const completedReport = {
        ...currentReport,
        overallScore: Math.round(avgScore),
        completed: true,
        duration,
      };

      await saveReport(completedReport);

      set({
        currentReport: completedReport,
        isRunning: false,
        awaitingVoiceResponse: false,
      });
    }
  },

  resetDiagnostic: () => {
    set({
      currentStep: 0,
      isRunning: false,
      isVoiceMode: false,
      startTime: 0,
      steps: initialSteps.map((step) => ({
        ...step,
        completed: false,
        result: undefined,
        currentAttempt: 0,
      })),
      currentReport: null,
      awaitingVoiceResponse: false,
      // Reset all test states
      touchGrid: [],
      touchTestStartTime: 0,
      buttonsPressed: { volumeUp: false, volumeDown: false, power: false },
      buttonTestStartTime: 0,
      currentButtonToPress: null,
      microphoneAttempts: 0,
      currentSentenceIndex: 0,
      cameraTestPhase: 'front',
      cameraRecordingTime: 0,
    });
  },

  setSpeaking: (speaking: boolean) => {
    set({ isSpeaking: speaking });
  },

  setVoiceMode: (enabled: boolean) => {
    set({ isVoiceMode: enabled });
  },

  setAwaitingVoiceResponse: (awaiting: boolean) => {
    set({ awaitingVoiceResponse: awaiting });
  },

  processVoiceCommand: (command: string): boolean => {
    const { currentStep, steps } = get();
    const currentStepData = steps[currentStep];

    if (
      !currentStepData.expectsVoiceResponse ||
      !currentStepData.voiceCommands
    ) {
      return false;
    }

    const normalizedCommand = command.toLowerCase().trim();
    const isValidCommand = currentStepData.voiceCommands.some((cmd) =>
      normalizedCommand.includes(cmd.toLowerCase())
    );

    return isValidCommand;
  },

  // Touch screen test methods
  initializeTouchGrid: () => {
    const { touchGridSize } = get();
    const grid = Array(touchGridSize.rows)
      .fill(null)
      .map(() => Array(touchGridSize.cols).fill(false));

    set({
      touchGrid: grid,
      touchTestStartTime: Date.now(),
    });
  },

  tapGridCell: (row: number, col: number) => {
    const { touchGrid } = get();
    if (touchGrid[row] && touchGrid[row][col] === false) {
      const newGrid = [...touchGrid];
      newGrid[row][col] = true;
      set({ touchGrid: newGrid });
    }
  },

  checkTouchGridComplete: (): boolean => {
    const { touchGrid } = get();
    return touchGrid.every((row) => row.every((cell) => cell === true));
  },

  // Button test methods
  initializeButtonTest: () => {
    set({
      buttonsPressed: { volumeUp: false, volumeDown: false, power: false },
      buttonTestStartTime: Date.now(),
      currentButtonToPress: 'volumeUp',
    });
  },

  pressButton: (button: 'volumeUp' | 'volumeDown' | 'power') => {
    const { buttonsPressed, currentButtonToPress } = get();

    if (button === currentButtonToPress) {
      const newButtonsPressed = { ...buttonsPressed, [button]: true };
      let nextButton: 'volumeUp' | 'volumeDown' | 'power' | null = null;

      if (button === 'volumeUp') nextButton = 'volumeDown';
      else if (button === 'volumeDown') nextButton = 'power';
      else if (button === 'power') nextButton = null;

      set({
        buttonsPressed: newButtonsPressed,
        currentButtonToPress: nextButton,
      });
    }
  },

  checkButtonTestComplete: (): boolean => {
    const { buttonsPressed } = get();
    return (
      buttonsPressed.volumeUp &&
      buttonsPressed.volumeDown &&
      buttonsPressed.power
    );
  },

  // Microphone test methods
  initializeMicrophoneTest: () => {
    set({
      currentSentenceIndex: 0,
      microphoneAttempts: 0,
    });
  },

  processMicrophoneResponse: (transcript: string): boolean => {
    // Simple similarity check (in production, use more sophisticated matching)
    const similarity = calculateSimilarity(
      transcript.toLowerCase(),
      expectedSentence.toLowerCase()
    );
    return similarity > 0.7; // 70% similarity threshold
  },

  nextMicrophoneSentence: () => {},

  // Camera test methods
  initializeCameraTest: () => {
    set({
      cameraTestPhase: 'front',
      cameraRecordingTime: 0,
    });
  },

  switchCameraPhase: (phase: 'front' | 'rear' | 'complete') => {
    set({ cameraTestPhase: phase });
  },

  loadReports: async () => {
    try {
      const storedReports = await AsyncStorage.getItem('diagnostic_reports');
      if (storedReports) {
        const reports = JSON.parse(storedReports);
        set({ reports });
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  },

  saveReport: async (report: DiagnosticReport) => {
    try {
      const { reports } = get();
      const updatedReports = [
        report,
        ...reports.filter((r) => r.id !== report.id),
      ];
      await AsyncStorage.setItem(
        'diagnostic_reports',
        JSON.stringify(updatedReports)
      );
      set({ reports: updatedReports });
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  },

  deleteReport: async (reportId: string) => {
    try {
      const { reports } = get();
      const updatedReports = reports.filter((r) => r.id !== reportId);
      await AsyncStorage.setItem(
        'diagnostic_reports',
        JSON.stringify(updatedReports)
      );
      set({ reports: updatedReports });
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  },
}));

// Helper function for text similarity
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');

  let matches = 0;
  const maxLength = Math.max(words1.length, words2.length);

  for (let i = 0; i < Math.min(words1.length, words2.length); i++) {
    if (words1[i] === words2[i]) {
      matches++;
    }
  }

  return matches / maxLength;
}
