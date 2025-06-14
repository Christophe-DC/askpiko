import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { elevenLabsService, ConversationCallbacks } from '@/services/elevenLabsService';

export interface VoiceConversationState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  lastMessage: string;
  lastUserMessage: string;
  error: string | null;
}

export interface VoiceConversationHook {
  state: VoiceConversationState;
  startConversation: () => Promise<void>;
  endConversation: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  speakText: (text: string) => Promise<void>;
  stopSpeaking: () => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  setConversationComponent: (component: any) => void;
}

export function useVoiceConversation(
  onUserMessage?: (message: string) => void,
  onAgentMessage?: (message: string) => void,
  onModeChange?: (mode: 'listening' | 'speaking' | 'thinking') => void
): VoiceConversationHook {
  const [state, setState] = useState<VoiceConversationState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    isThinking: false,
    lastMessage: '',
    lastUserMessage: '',
    error: null,
  });

  const callbacksRef = useRef<ConversationCallbacks>({
    onConnect: () => {
      console.log('🔗 Voice conversation connected');
      setState(prev => ({ ...prev, isConnected: true, error: null }));
    },
    onDisconnect: () => {
      console.log('🔌 Voice conversation disconnected');
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isListening: false, 
        isSpeaking: false, 
        isThinking: false 
      }));
    },
    onMessage: (message: string, isUser: boolean) => {
      console.log(`${isUser ? '🗣️ User' : '🤖 Agent'} message:`, message);
      setState(prev => ({
        ...prev,
        lastMessage: message,
        lastUserMessage: isUser ? message : prev.lastUserMessage,
      }));
      
      if (isUser) {
        onUserMessage?.(message);
      } else {
        onAgentMessage?.(message);
      }
    },
    onModeChange: (mode: 'listening' | 'speaking' | 'thinking') => {
      console.log('🔄 Voice mode changed to:', mode);
      setState(prev => ({
        ...prev,
        isListening: mode === 'listening',
        isSpeaking: mode === 'speaking',
        isThinking: mode === 'thinking',
      }));
      onModeChange?.(mode);
    },
    onError: (error: Error) => {
      console.error('❌ Voice conversation error:', error);
      setState(prev => ({ ...prev, error: error.message }));
    },
  });

  useEffect(() => {
    elevenLabsService.setCallbacks(callbacksRef.current);
  }, []);

  const startConversation = useCallback(async () => {
    try {
      console.log('🚀 Starting voice conversation...');
      setState(prev => ({ ...prev, error: null }));
      await elevenLabsService.startConversation();
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      setState(prev => ({ ...prev, error: (error as Error).message }));
    }
  }, []);

  const endConversation = useCallback(async () => {
    try {
      console.log('🔚 Ending voice conversation...');
      await elevenLabsService.endConversation();
    } catch (error) {
      console.error('❌ Failed to end conversation:', error);
      setState(prev => ({ ...prev, error: (error as Error).message }));
    }
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    try {
      console.log('📤 Sending message to voice conversation:', message);
      await elevenLabsService.sendMessage(message);
    } catch (error) {
      setState(prev => ({ ...prev, error: (error as Error).message }));
    }
  }, []);

  const speakText = useCallback(async (text: string) => {
    try {
      console.log('🗣️ Speaking text via voice conversation:', text);
      setState(prev => ({ ...prev, error: null }));
      
      // Use the conversation AI to speak naturally
      await elevenLabsService.sendMessage(text);
      
    } catch (error) {
      console.error('❌ Failed to speak text:', error);
      setState(prev => ({ 
        ...prev, 
        error: (error as Error).message 
      }));
    }
  }, []);

  const stopSpeaking = useCallback(async () => {
    try {
      console.log('🔇 Stopping voice conversation speech...');
      await elevenLabsService.stopSpeaking();
    } catch (error) {
      console.error('❌ Failed to stop speaking:', error);
      setState(prev => ({ ...prev, error: (error as Error).message }));
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      console.log('🎤 Starting to listen via voice conversation...');
      await elevenLabsService.startListeningForCommand();
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      setState(prev => ({ ...prev, error: (error as Error).message }));
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      console.log('🔇 Stopping voice conversation listening...');
      await elevenLabsService.stopListening();
    } catch (error) {
      console.error('❌ Failed to stop listening:', error);
      setState(prev => ({ ...prev, error: (error as Error).message }));
    }
  }, []);

  const setConversationComponent = useCallback((component: any) => {
    elevenLabsService.setConversationComponent(component);
  }, []);

  return {
    state,
    startConversation,
    endConversation,
    sendMessage,
    speakText,
    stopSpeaking,
    startListening,
    stopListening,
    setConversationComponent,
  };
}