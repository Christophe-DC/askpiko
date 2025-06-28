import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Typography from './ui/Typography';

const { width, height } = Dimensions.get('window');

export const CompleteModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const [canClose, setCanClose] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCanClose(false); // reset à chaque ouverture

      // Activer la fermeture après 3 secondes
      const timeout = setTimeout(() => {
        setCanClose(true);
      }, 3000);

      // Animation d'entrée
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: false,
          friction: 6,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.exp),
          useNativeDriver: false,
        }),
      ]).start();

      return () => clearTimeout(timeout); // clean
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handlePress = () => {
    if (canClose) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.modal,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Image
              source={require('../assets/images/circle_check.png')}
              style={{ width: 60, height: 60 }}
              resizeMode="contain"
            />

            <Typography variant="h2" style={styles.title}>
              Verification Complete
            </Typography>

            <Image
              source={require('../assets/images/askpiko_verified.png')}
              style={styles.image}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(33, 35, 94, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 20,
  },
  image: {
    width: 250,
    height: 250,
    marginBottom: 40,
  },
});
