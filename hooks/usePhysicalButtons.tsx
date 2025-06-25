import { useEffect } from 'react';
import { BackHandler, Platform, NativeModules, AppState } from 'react-native';
import KeyEvent from 'react-native-keyevent';

const { KeyEventInterceptModule } = NativeModules;

const usePhysicalButtons = (callbacks: {
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onBackButton?: () => void;
  onPowerButton?: () => void;
  enabled?: boolean;
}) => {
  const {
    onVolumeUp = () => {},
    onVolumeDown = () => {},
    onBackButton = () => {},
    onPowerButton = () => {},
    enabled = false,
  } = callbacks;

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      console.log('📵 Physical buttons detection inactive');
      return;
    }

    console.log('🎮 Physical buttons detection ENABLED');

    console.log(
      '🔍 KeyEventInterceptModule available:',
      !!KeyEventInterceptModule
    );
    console.log(
      '🔍 KeyEventInterceptModule methods:',
      KeyEventInterceptModule ? Object.keys(KeyEventInterceptModule) : 'N/A'
    );

    if (KeyEventInterceptModule) {
      KeyEventInterceptModule.setKeyInterception(true);
      console.log('🚫 Key default actions DISABLED');
    }

    // Bouton retour Android
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('📱 Back button pressed');
        onBackButton();
        return true;
      }
    );

    // Volume Up / Down via KeyEvent (fiable et natif)
    KeyEvent.onKeyDownListener((keyEvent) => {
      console.log('onKeyDownListener keyEvent', keyEvent);
      const { keyCode } = keyEvent;
      if (keyCode === 24) {
        console.log('🔊 Volume Up pressed');
        onVolumeUp();
      } else if (keyCode === 25) {
        console.log('🔉 Volume Down pressed');
        onVolumeDown();
      } else if (keyCode === 26) {
        // KeyCode 26 = KEYCODE_POWER
        console.log('⚡ Power button pressed (KeyEvent)');
        onPowerButton();
      }
    });

    // Bouton Power → app passe en background
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background') {
        console.log('⚡ Power button pressed');
        onPowerButton();
      }
    };
    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      console.log('🎮 Physical buttons detection DISABLED');
      if (KeyEventInterceptModule) {
        KeyEventInterceptModule.setKeyInterception(false);
        console.log('✅ Key default actions RESTORED');
      }

      backHandler.remove();
      KeyEvent.removeKeyDownListener();
      appStateSubscription?.remove();
    };
  }, [enabled, onVolumeUp, onVolumeDown, onBackButton, onPowerButton]);
};

export { usePhysicalButtons };
