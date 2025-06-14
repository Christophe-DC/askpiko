export interface VoiceCommand {
  patterns: string[];
  action: string;
  confidence: number;
}

export interface ProcessedCommand {
  action: string;
  confidence: number;
  originalText: string;
}

class VoiceCommandProcessor {
  private commands: VoiceCommand[] = [
    // Affirmative responses - SHORT user responses only
    {
      patterns: ['yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'ready'],
      action: 'CONTINUE',
      confidence: 0.9
    },
    
    // Device info confirmation responses - SHORT user responses only
    {
      patterns: ['perfect', 'great', 'good', 'correct', 'fine', 'continue'],
      action: 'CONTINUE',
      confidence: 0.9
    },
    
    // Negative responses - SHORT user responses only
    {
      patterns: ['no', 'nope', 'stop', 'cancel', 'quit', 'exit'],
      action: 'STOP',
      confidence: 0.9
    },
    
    // Test completion confirmations - SHORT user responses only
    {
      patterns: ['done', 'finished', 'complete', 'completed', 'works', 'working'],
      action: 'TEST_COMPLETE',
      confidence: 0.8
    },
    
    // Help requests - SHORT user responses only
    {
      patterns: ['help', 'what do i do', 'repeat'],
      action: 'HELP',
      confidence: 0.7
    },
    
    // Skip requests - SHORT user responses only
    {
      patterns: ['skip', 'skip this', 'next', 'move on'],
      action: 'SKIP',
      confidence: 0.7
    }
  ];

  processCommand(transcript: string): ProcessedCommand | null {
    const normalizedText = transcript.toLowerCase().trim();
    
    // CRITICAL: Reject agent-like messages immediately
    if (this.isAgentMessage(normalizedText)) {
      console.log('🚫 Rejected agent-like message:', transcript);
      return null;
    }
    
    let bestMatch: ProcessedCommand | null = null;
    let highestScore = 0;

    for (const command of this.commands) {
      for (const pattern of command.patterns) {
        const score = this.calculateSimilarity(normalizedText, pattern);
        
        if (score > highestScore && score > 0.8) { // Increased threshold
          highestScore = score;
          bestMatch = {
            action: command.action,
            confidence: score * command.confidence,
            originalText: transcript
          };
        }
      }
    }

    return bestMatch;
  }

  private isAgentMessage(text: string): boolean {
    // Detect agent-like messages that should NOT be processed as user commands
    const agentIndicators = [
      "i'm piko",
      "hi, i'm",
      "let me",
      "i'll",
      "now let's",
      "perfect! i've",
      "i've gathered",
      "please repeat exactly",
      "listen carefully",
      "here is the sentence",
      "smartphone diagnostics",
      "device step by step",
      "are you ready to begin",
      "all permissions",
      "device information",
      "comprehensive report"
    ];

    // Check for agent indicators
    for (const indicator of agentIndicators) {
      if (text.includes(indicator)) {
        return true;
      }
    }

    // Reject very long messages (agent messages are typically longer)
    if (text.length > 50) {
      return true;
    }

    // Reject messages with multiple sentences
    if (text.split('.').length > 2) {
      return true;
    }

    return false;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // For exact matches or contains, give high score
    if (text1 === text2) {
      return 1.0;
    }
    
    if (text1.includes(text2) || text2.includes(text1)) {
      return 0.9;
    }

    // For word-based matching
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    
    // Check if any word matches exactly
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 && word1.length > 2) {
          return 0.8;
        }
      }
    }

    // Levenshtein distance for more sophisticated matching
    const distance = this.levenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);
    
    return Math.max(0, 1 - (distance / maxLength));
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  getHelpText(currentStep: string): string {
    const helpTexts: Record<string, string> = {
      'introduction': 'Say "yes" or "ready" to begin the diagnostic process.',
      'permissions': 'I need to access your device features. Say "continue" when permissions are granted.',
      'device_info': 'I\'ve shown your device information. Say "OK", "perfect", or "continue" to proceed.',
      'microphone_test': 'Listen to the sentence I say, then repeat it exactly.',
      'touchscreen_test': 'Tap every square on the grid to test your touchscreen.',
      'buttons_test': 'Press the volume and power buttons when prompted.',
      'sensors_test': 'Gently shake your device to test the motion sensors.',
      'camera_test': 'I\'ll test your cameras. Say "ready" when you\'re prepared.',
      'report': 'Your diagnostic is complete! Say "done" to finish.'
    };

    return helpTexts[currentStep] || 'Say "yes" to continue, "no" to stop, or "help" for assistance.';
  }
}

export const voiceCommandProcessor = new VoiceCommandProcessor();