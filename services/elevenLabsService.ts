import { Platform } from 'react-native';

export interface VoiceConfig {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface SpeechToTextResult {
  text: string;
  confidence: number;
}

export interface ConversationCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: string, isUser: boolean) => void;
  onModeChange?: (mode: 'listening' | 'speaking' | 'thinking') => void;
  onError?: (error: Error) => void;
}

class ElevenLabsService {
  private apiKey: string;
  private agentId: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private isConnected = false;
  private callbacks: ConversationCallbacks = {};
  private conversationComponent: any = null;
  private isInitialized = false;
  private waitingForConnection = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 30;
  private isMobile = false;

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';
    this.agentId = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID || '';
    this.detectMobile();
  }

  private detectMobile() {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.userAgent) {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      this.isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword)) || 
                     window.innerWidth <= 768 ||
                     'ontouchstart' in window;
      console.log('📱 Mobile device detected in service:', this.isMobile);
    } else {
      // Fallback for native environments (Hermes on Android/iOS)
      this.isMobile = Platform.OS === 'android' || Platform.OS === 'ios';
      console.log('📱 Detected mobile from Platform API:', this.isMobile);
    }
  }

  setCallbacks(callbacks: ConversationCallbacks) {
    this.callbacks = callbacks;
  }

  setConversationComponent(component: any) {
    this.conversationComponent = component;
  }

  async startConversation(): Promise<void> {
    if (!this.agentId) {
      console.warn('ElevenLabs Agent ID not configured');
      throw new Error('ElevenLabs Agent ID not configured');
    }

    try {
      console.log('🚀 Starting ElevenLabs conversational AI (manual control)...');
      
      // ElevenLabs Conversation AI works on both web and mobile browsers
      // Connection is handled by the DOM component - we just track state
      
      this.isConnected = true;
      this.isInitialized = true;
      this.callbacks.onConnect?.();
      
      console.log('✅ ElevenLabs conversational AI started successfully (manual control)');
      
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  async startListeningForCommand(): Promise<void> {
    if (!this.isConnected || !this.isInitialized) {
      console.warn('⚠️ Conversation not ready for listening');
      return;
    }

    console.log('🎤 ElevenLabs conversation is handling listening automatically...');
    this.callbacks.onModeChange?.('listening');
  }

  async stopListening(): Promise<void> {
    console.log('🔇 ElevenLabs conversation handles stop listening automatically...');
  }

  async endConversation(): Promise<void> {
    try {
      console.log('🔚 Ending voice conversation...');
      this.isConnected = false;
      this.isInitialized = false;
      this.waitingForConnection = false;
      this.connectionAttempts = 0;
      
      // Stop DOM component if available
      if (this.conversationComponent) {
        try {
          await this.conversationComponent.stop();
        } catch (error) {
          console.warn('Error stopping DOM component:', error);
        }
      }
      
      this.callbacks.onDisconnect?.();
    } catch (error) {
      console.error('❌ Error ending conversation:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Conversation not connected');
    }

    try {
      console.log('📤 Sending message to conversational AI:', message);
      
      // In ElevenLabs conversational AI, the agent responds automatically
      // The conversation component handles message sending
      if (this.conversationComponent && this.conversationComponent.sendMessage) {
        await this.conversationComponent.sendMessage(message);
      } else {
        console.warn('⚠️ Conversation component not available for sending messages');
        
        // Simulate agent response for manual control
        this.callbacks.onModeChange?.('thinking');
        
        setTimeout(() => {
          this.callbacks.onModeChange?.('speaking');
          this.callbacks.onMessage?.(message, false);
          
          setTimeout(() => {
            this.callbacks.onModeChange?.('listening');
          }, 3000);
        }, 1000);
      }
      
    } catch (error) {
      this.callbacks.onError?.(error as Error);
    }
  }

  isConversationActive(): boolean {
    return this.isConnected;
  }

  isCurrentlyListening(): boolean {
    return this.conversationComponent?.isListening || false;
  }

  isCurrentlySpeaking(): boolean {
    return this.conversationComponent?.isSpeaking || false;
  }

  // Legacy TTS method for compatibility
  async textToSpeech(
    text: string,
    voiceConfig?: VoiceConfig,
    onStart?: () => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      console.log('🗣️ TTS request (using conversation AI):', text);
      onStart?.();
      
      // Use conversation AI to speak the text naturally
      await this.sendMessage(text);
      onComplete?.();
      
    } catch (error) {
      console.error('❌ TTS error:', error);
      onError?.(error as Error);
    }
  }

  async stopSpeaking(): Promise<void> {
    if (this.conversationComponent && this.conversationComponent.stop) {
      await this.conversationComponent.stop();
    }
  }

  async cleanup(): Promise<void> {
    this.waitingForConnection = false;
    this.connectionAttempts = 0;
    await this.endConversation();
    await this.stopSpeaking();
  }

  // Mobile-specific optimizations
  getMobileOptimizations() {
    return {
      isMobile: this.isMobile,
      audioSettings: {
        inputGain: this.isMobile ? 1.2 : 1.0,
        outputGain: this.isMobile ? 1.1 : 1.0,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: this.isMobile, // Enable AGC for mobile
      },
      connectionSettings: {
        maxRetries: this.isMobile ? 5 : 3,
        retryDelay: this.isMobile ? 2000 : 1000,
        connectionTimeout: this.isMobile ? 30000 : 20000,
      }
    };
  }
}

// Extend Window interface for ElevenLabs
declare global {
  interface Window {
    elevenLabsConversation: any;
    AudioContext: any;
    webkitAudioContext: any;
  }
}

export const elevenLabsService = new ElevenLabsService();