import { useEffect } from 'react';
import { BackHandler, Platform, AppState } from 'react-native';
import KeyEvent from 'react-native-keyevent';

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

    // Nettoyage
    return () => {
      console.log('🎮 Physical buttons detection DISABLED');
      backHandler.remove();
      KeyEvent.removeKeyDownListener();
      appStateSubscription?.remove();
    };
  }, [enabled, onVolumeUp, onVolumeDown, onBackButton, onPowerButton]);
};

export { usePhysicalButtons };
