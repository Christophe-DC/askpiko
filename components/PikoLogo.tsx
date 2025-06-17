import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';

type Props = {
  isSpeaking: boolean;
  isLoading: boolean;
};

const WAVE_SIZE = 80; // Taille plus petite que le logo visible
const WAVE_OFFSET = 8; // Ajustement du centrage visuel

const PikoLogo: React.FC<Props> = ({ isSpeaking, isLoading }) => {
  const pulses = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const pulseAnims = useRef<Animated.CompositeAnimation[]>([]);
  const spin = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Pulse
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
      {/* Pulses (derrière) */}
      {isSpeaking && pulses.map((p, i) => renderPulse(p, i))}

      {/* Spinner */}
      {isLoading && (
        <Animated.View
          style={[styles.spinner, { transform: [{ rotate: spinInterpolate }] }]}
        />
      )}

      {/* Logo */}
      <View style={styles.logo}>
        <Image
          source={require('../assets/images/pikoIcon.png')}
          style={{ width: 96, height: 96 }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: WAVE_SIZE,
    height: WAVE_SIZE,
    left: (128 - WAVE_SIZE) / 2 - WAVE_OFFSET,
    top: (128 - WAVE_SIZE) / 2 - WAVE_OFFSET,
    borderRadius: WAVE_SIZE / 2,
    backgroundColor: 'rgba(59,130,246,0.4)',
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
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
    zIndex: 2,
  },
});

export default PikoLogo;
