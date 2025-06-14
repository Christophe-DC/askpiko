declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_ELEVENLABS_API_KEY: string;
      EXPO_PUBLIC_ELEVENLABS_AGENT_ID: string;
      EXPO_PUBLIC_ELEVENLABS_VOICE_ID?: string;
    }
  }
}

// Ensure this file is treated as a module
export {};