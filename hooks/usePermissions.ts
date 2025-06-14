import { useState, useEffect } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import { Camera } from 'expo-camera';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import { Audio } from 'expo-av';

export interface PermissionStatus {
  camera: boolean;
  microphone: boolean;
  deviceInfo: boolean;
  battery: boolean;
  allGranted: boolean;
}

export interface Permission {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  granted: boolean;
  required: boolean;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: false,
    microphone: false,
    deviceInfo: false,
    battery: false,
    allGranted: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasRequestedPermissions, setHasRequestedPermissions] = useState(false);

  const checkPermissions = async (): Promise<PermissionStatus> => {
    try {
      const cameraStatus = await Camera.getCameraPermissionsAsync();
      const audioStatus = await Audio.getPermissionsAsync();
      
      // Device info and battery are generally available without explicit permissions
      const deviceInfoAvailable = Device.brand !== null;
      const batteryAvailable = Platform.OS !== 'web'; // Battery API not available on web

      const newPermissions = {
        camera: cameraStatus.granted,
        microphone: audioStatus.granted,
        deviceInfo: deviceInfoAvailable,
        battery: batteryAvailable,
        allGranted: false,
      };

      newPermissions.allGranted = 
        newPermissions.camera && 
        newPermissions.microphone && 
        newPermissions.deviceInfo && 
        newPermissions.battery;

      setPermissions(newPermissions);
      return newPermissions;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return permissions;
    }
  };

  const requestSinglePermission = async (permissionId: string): Promise<boolean> => {
    try {
      switch (permissionId) {
        case 'camera': {
          const result = await Camera.requestCameraPermissionsAsync();
          if (!result.granted && result.canAskAgain === false) {
            Alert.alert(
              'Camera Permission Required',
              'Camera access has been permanently denied. Please enable it in your device settings to use camera testing features.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
          }
          return result.granted;
        }
        
        case 'microphone': {
          const result = await Audio.requestPermissionsAsync();
          if (!result.granted && result.canAskAgain === false) {
            Alert.alert(
              'Microphone Permission Required',
              'Microphone access has been permanently denied. Please enable it in your device settings to use audio testing features.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
          }
          return result.granted;
        }
        
        case 'deviceInfo':
          // Device info is usually available without explicit permission
          return Device.brand !== null;
        
        case 'battery':
          // Battery info is available on native platforms
          return Platform.OS !== 'web';
        
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error requesting ${permissionId} permission:`, error);
      return false;
    }
  };

  const checkMicrophonePermission = async () => {
  return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
};

  // Request microphone permission specifically for voice conversation
  const requestMicrophonePermission = async (): Promise<boolean> => {
    console.log('🎤 Requesting microphone permission for voice conversation...');
    setIsLoading(true);
    
    try {
      const result = await Audio.requestPermissionsAsync();
      
      if (!result.granted && result.canAskAgain === false) {
        Alert.alert(
          'Microphone Permission Required',
          'Piko needs microphone access for voice conversation. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
      
      // Update permissions state
      await checkPermissions();
      
      return result.granted;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Request all diagnostic permissions (except microphone)
  const requestDiagnosticPermissions = async (): Promise<boolean> => {
    console.log('🔧 Requesting diagnostic permissions...');
    setIsLoading(true);
    setHasRequestedPermissions(true);

    try {
      // Request camera permission
      const cameraResult = await Camera.requestCameraPermissionsAsync();

      if (!cameraResult.granted && cameraResult.canAskAgain === false) {
        Alert.alert(
          'Camera Permission Required',
          'AskPiko needs camera access to test your device cameras. Please enable camera permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }

      // Check all permissions after requesting
      await checkPermissions();
      
      return cameraResult.granted;
    } catch (error) {
      console.error('Error requesting diagnostic permissions:', error);
      Alert.alert('Permission Error', 'Failed to request permissions. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const recheckPermissions = async () => {
    setIsLoading(true);
    await checkPermissions();
    setIsLoading(false);
  };

  // Only check permissions on mount, don't request them
  useEffect(() => {
    checkPermissions().then(() => {
      setIsLoading(false);
    });
  }, []);

  return {
    permissions,
    isLoading,
    requestSinglePermission,
    requestMicrophonePermission,
    requestDiagnosticPermissions,
    recheckPermissions,
    hasRequestedPermissions,
    checkPermissions,
  };
}