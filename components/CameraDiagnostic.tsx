import { useTheme } from '@react-navigation/native';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {
  Camera as VisionCamera,
  useCameraDevices,
  useFrameProcessor,
  useCameraPermission,
  useCameraDevice,
  runAsync,
  runAtTargetFps,
} from 'react-native-vision-camera';
import {
  Camera,
  Face,
  FaceDetectionOptions,
  useFaceDetector,
} from 'react-native-vision-camera-face-detector';
import { useSharedValue, Worklets } from 'react-native-worklets-core';
//import { useTextRecognition } from 'react-native-vision-camera-text-recognition';

const CameraDiagnostic = ({
  onFaceDetected,
}: {
  onFaceDetected: (camera: string, isDetected: boolean) => void;
}) => {
  const { colors } = useTheme();
  const [step, setStep] = React.useState<'text' | 'face'>('text');
  const [currentCamera, setCurrentCamera] = React.useState<'front' | 'back'>(
    'back'
  );
  const [textDetected, setTextDetected] = useState<string[] | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });

  const { hasPermission, requestPermission } = useCameraPermission();
  const devices = useCameraDevices();
  const backCamera = useCameraDevice('back');
  const frontCamera = useCameraDevice('front');
  const cameraRef = useRef<'front' | 'back'>('back');
  useEffect(() => {
    cameraRef.current = currentCamera;
  }, [currentCamera]);

  const faceDetectionOptions = useRef<FaceDetectionOptions>({
    performanceMode: 'accurate',
    landmarkMode: 'all',
    contourMode: 'none',
    classificationMode: 'all',
    trackingEnabled: false,

    windowWidth: cameraLayout.width || 200,
    windowHeight: cameraLayout.height || 200,
    //autoScale: true,
  }).current;
  const { detectFaces } = useFaceDetector(faceDetectionOptions);

  useEffect(() => {
    requestPermission();
  }, []);

  const faceWidth = useRef(new Animated.Value(0)).current;
  const faceHeight = useRef(new Animated.Value(0)).current;
  const faceX = useRef(new Animated.Value(0)).current;
  const faceY = useRef(new Animated.Value(0)).current;
  const drawFaceBounds = (face?: Face) => {
    if (face && cameraLayout.width > 0 && cameraLayout.height > 0) {
      const { width, height, x, y } = face.bounds;

      // Facteurs d'échelle pour adapter les coordonnées du frame à la vue caméra
      const scaleX =
        cameraLayout.width / (faceDetectionOptions.windowWidth || 1);
      const scaleY =
        cameraLayout.height / (faceDetectionOptions.windowHeight || 1);

      // Coordonnées adaptées à la taille de la vue caméra
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;

      Animated.parallel([
        Animated.timing(faceWidth, {
          toValue: scaledWidth,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(faceHeight, {
          toValue: scaledHeight,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(faceX, {
          toValue: scaledX,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(faceY, {
          toValue: scaledY,
          duration: 100,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(faceWidth, {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(faceHeight, {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(faceX, {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(faceY, {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const handleDetectedFaces = Worklets.createRunOnJS((faces: Face[]) => {
    if (faces?.length > 0) {
      const face = faces[0];
      onFaceDetected(cameraRef.current, true);
      setFaceDetected(true);
      //drawFaceBounds(face);
    } else {
      setFaceDetected(false);
      //drawFaceBounds();
    }
  });

  /*const frameProcessor = useFrameProcessor((frame) => {
    'worklet';a
     const result = detectFaces(frame);
    //   handleFacesDetection(result);
  }, []);*/
  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      try {
        runAtTargetFps(10, () => {
          'worklet';
          try {
            const faces = detectFaces(frame);
            handleDetectedFaces(faces);
          } catch (e) {
            console.error('Frame processing error:', e);
          }
        });
      } catch (e) {
        console.error('runAsync frame processing error:', e);
      }
    },
    [handleDetectedFaces]
  );
  /* const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      runAsync(frame, () => {
        'worklet';
        try {
          // const faces = detectFaces(frame);
          // handleDetectedFaces(faces);
        } catch (error) {
          console.error('Error in face detection:', error);
        }
      });
    },
    [handleDetectedFaces, detectFaces]
  );*/

  const aFaceW = useSharedValue(0);
  const aFaceH = useSharedValue(0);
  const aFaceX = useSharedValue(0);
  const aFaceY = useSharedValue(0);

  /*const drawFaceBounds = (face?: Face) => {
    if (face) {
      const { width, height, x, y } = face.bounds;
      aFaceW.value = width;
      aFaceH.value = height;
      aFaceX.value = x;
      aFaceY.value = y;
    } else {
      aFaceW.value = aFaceH.value = aFaceX.value = aFaceY.value = 0;
    }
  };

  const faceBoxStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    borderWidth: 4,
    borderLeftColor: 'rgb(0,255,0)',
    borderRightColor: 'rgb(0,255,0)',
    borderBottomColor: 'rgb(0,255,0)',
    borderTopColor: 'rgb(0,255,0)',
    width: withTiming(aFaceW.value, { duration: 100 }),
    height: withTiming(aFaceH.value, { duration: 100 }),
    left: withTiming(aFaceX.value, { duration: 100 }),
    top: withTiming(aFaceY.value, { duration: 100 }),
  }));*/

  const handleFacesDetection = (faces: Face[]) => {
    /*try {
      if (faces?.length > 0) {
        const face = faces[0];

        // You can add your own logic here!!
        drawFaceBounds(face);
        setFaceStatus({
          yaw:
            face.yawAngle > 15
              ? 'Right'
              : face.yawAngle < -15
              ? 'Left'
              : 'Center',
          pitch:
            face.pitchAngle > 15
              ? 'Up'
              : face.pitchAngle < -10
              ? 'Down'
              : 'Center',
          eye:
            face.leftEyeOpenProbability > 0.7 &&
            face.rightEyeOpenProbability > 0.7
              ? 'Open'
              : 'Close',
        });
      } else {
        drawFaceBounds();
      }
    } catch (error) {
      console.error('Error in face detection:', error);
    }*/
  };

  if (!hasPermission) return <Text>No camera permission</Text>;
  if (step === 'text' && !backCamera) return <ActivityIndicator />;
  if (step === 'face' && !frontCamera) return <ActivityIndicator />;

  const onNextStep = () => {
    if (step === 'text' && textDetected?.length) {
      setStep('face');
    } else if (step === 'text') {
      Alert.alert('Text not detected', 'Please try again.');
    } else if (step === 'face') {
      if (faceDetected) {
        Alert.alert('Diagnostic Complete', 'All tests passed!');
      } else {
        Alert.alert('No face detected', 'Please try again.');
      }
    }
  };

  if (currentCamera === 'front' && !frontCamera) return <ActivityIndicator />;
  if (currentCamera === 'back' && !backCamera) return <ActivityIndicator />;
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        width: '100%',
        shadowColor: colors.primary,
        shadowOffset: {
          width: 0,
          height: 5,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 60,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.primary,
          paddingVertical: 16,
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: 'white',
            textAlign: 'center',
          }}
        >
          Please position your face in {currentCamera} camera
        </Text>
      </View>
      <View
        style={{
          width: '100%',
          padding: 8,
          height: 220,
        }}
      >
        {/* Camera Section */}
        {!faceDetected && (
          <View style={styles.cameraContainer}>
            <VisionCamera
              style={styles.camera}
              device={currentCamera === 'front' ? frontCamera! : backCamera!}
              isActive={true}
              frameProcessor={frameProcessor}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                setCameraLayout({ width, height });
              }}
              pixelFormat={'yuv'}
            />
          </View>
        )}

        {/* Results */}
        {step === 'text' && textDetected && (
          <Text style={styles.result}>
            📝 Text detected: {textDetected.join(', ')}
          </Text>
        )}

        {step === 'face' && (
          <Text style={styles.result}>
            {faceDetected ? '😊 Face detected' : '😐 No face detected yet'}
          </Text>
        )}

        {/* Success State */}
        {faceDetected && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>✅ Face detected!</Text>
            {currentCamera === 'back' && (
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  setCurrentCamera('front');
                  setFaceDetected(false);
                }}
              >
                <Text style={styles.buttonText}>Start front camera</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333333',
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  camera: {
    flex: 1,
  },
  result: {
    textAlign: 'center',
    marginVertical: 15,
    fontSize: 16,
    color: '#666666',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 30,
    color: '#333333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },

  // Legacy compatibility
  faceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00FF00',
    backgroundColor: 'transparent',
  },
});

export default CameraDiagnostic;
