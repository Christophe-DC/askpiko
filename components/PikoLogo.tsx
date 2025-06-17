import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';

type Props = {
  isSpeaking: boolean;
  isLoading: boolean;
};

const PikoLogo: React.FC<Props> = ({ isSpeaking, isLoading }) => {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  // Pulse animation (waves)
  useEffect(() => {
    if (isSpeaking) {
      const createPulse = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
              easing: Easing.out(Easing.ease),
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      createPulse(pulse1, 0);
      createPulse(pulse2, 400);
      createPulse(pulse3, 800);
    }
  }, [isSpeaking]);

  // Spinner animation (loading)
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    }
  }, [isLoading]);

  const spinInterpolate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderPulse = (scale: Animated.Value) => (
    <Animated.View
      style={[
        styles.pulse,
        {
          transform: [
            {
              scale: scale.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 2.5],
              }),
            },
          ],
          opacity: scale.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 0],
          }),
        },
      ]}
    />
  );

  return (
    <View style={styles.container}>
      {/* Pulses */}
      {isSpeaking && (
        <>
          {renderPulse(pulse1)}
          {renderPulse(pulse2)}
          {renderPulse(pulse3)}
        </>
      )}

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
          style={{ width: 64, height: 64 }}
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
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(59,130,246,0.4)',
  },
  spinner: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: 'rgba(59,130,246,0.4)',
    borderTopColor: 'transparent',
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
    zIndex: 1,
  },
});

export default PikoLogo;
