import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';

type Props = {
  isSpeaking: boolean;
  isLoading: boolean;
};

const IMAGE_SIZE = 96;
const CONTAINER_SIZE = 128;
const PULSE_ORIGIN_SIZE = 64; // Taille initiale de l'onde (réduite pour compenser le padding transparent)

const PikoLogo: React.FC<Props> = ({ isSpeaking, isLoading }) => {
  const pulses = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const pulseAnims = useRef<Animated.CompositeAnimation[]>([]);
  const spin = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Pulses
  useEffect(() => {
    if (isSpeaking) {
      pulseAnims.current = pulses.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 400),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        )
      );
      pulseAnims.current.forEach((a) => a.start());
    } else {
      pulseAnims.current.forEach((a) => a.stop?.());
    }
  }, [isSpeaking]);

  // Spinner
  useEffect(() => {
    if (isLoading) {
      spin.setValue(0);
      spinAnim.current = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnim.current.start();
    } else {
      spinAnim.current?.stop?.();
    }
  }, [isLoading]);

  const spinInterpolate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderPulse = (scaleAnim: Animated.Value, index: number) => (
    <Animated.View
      key={index}
      style={[
        styles.pulse,
        {
          transform: [
            {
              scale: scaleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 2 + index * 0.4],
              }),
            },
          ],
          opacity: scaleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 0],
          }),
        },
      ]}
    />
  );

  return (
    <View style={styles.container}>
      {/* Ondes */}
      {isSpeaking && pulses.map((p, i) => renderPulse(p, i))}

      {/* Spinner */}
      {isLoading && (
        <Animated.View
          style={[styles.spinner, { transform: [{ rotate: spinInterpolate }] }]}
        />
      )}

      {/* Logo sans fond */}
      <View style={styles.logo}>
        <Image
          source={require('../assets/images/pikoIcon.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulse: {
    position: 'absolute',
    width: PULSE_ORIGIN_SIZE,
    height: PULSE_ORIGIN_SIZE,
    borderRadius: PULSE_ORIGIN_SIZE / 2,
    backgroundColor: 'rgba(59,130,246,0.4)',
    left: (CONTAINER_SIZE - PULSE_ORIGIN_SIZE) / 2,
    top: (CONTAINER_SIZE - PULSE_ORIGIN_SIZE) / 2,
    zIndex: 0,
  },
  spinner: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: 'rgba(59,130,246,0.4)',
    borderTopColor: 'transparent',
    zIndex: 0,
  },
  logo: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    zIndex: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default PikoLogo;
