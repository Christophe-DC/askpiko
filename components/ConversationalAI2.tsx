'use dom';

import { useConversation } from '@elevenlabs/react';
import { useState, useEffect, useCallback } from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Mic } from 'lucide-react-native';
import diagnosticTools from '@/utils/diagnosticTools';

export default function ConversationalAI({
  dom,
  onAgentMessage
}: {
  dom?: import('expo/dom').DOMProps;
  onAgentMessage?: (message: string) => void;
}) {
  const [hasPermission, setHasPermission] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('🔗 Connected');
    },
    onMessage: (message) => {
      console.log('📨 Message:', message);
      if (message.source === 'agent') {
        onAgentMessage?.(message.message);
      }
    },
    onError: (error) => {
      console.error('❌ Error:', error);
    }
  });

  const startConversation = useCallback(async () => {
    if (conversation.status !== 'disconnected') return;

    const agentId = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID;
    if (!agentId) throw new Error('Missing agent ID');

    const deviceInfo = await diagnosticTools.get_device_info();

    await conversation.startSession({
      agentId,
      dynamicVariables: {
        platform: 'mobile',
        userAgent: navigator.userAgent,
        screenResolution: deviceInfo.screenResolution,
        language: deviceInfo.language
      },
      clientTools: diagnosticTools
    });

    setConversationStarted(true);
  }, [conversation]);

  const handleButtonPress = async () => {
    await startConversation();
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.callButton} onPress={handleButtonPress}>
        <View style={styles.buttonInner}>
          <Mic size={32} color="#fff" strokeWidth={1.5} />
        </View>
      </Pressable>
      <Text style={styles.statusText}>
        {conversationStarted ? 'Conversation active' : 'Tap to start conversation'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  callButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  buttonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center'
  }
});
