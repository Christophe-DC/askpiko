import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';

type Props = {
  isSpeaking: boolean;
  isLoading: boolean;
  size?: number;
};

const PikoLogo: React.FC<Props> = ({ isSpeaking, isLoading, size = 192 }) => {
  const pulses = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const pulseAnims = useRef<Animated.CompositeAnimation[]>([]);
  const spin = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);

  const waveSize = size * 0.5; // onde part du centre réel, plus petite que le logo
  const imageSize = size * 0.75;

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
      style={{
        position: 'absolute',
        width: waveSize,
        height: waveSize,
        borderRadius: waveSize / 2,
        backgroundColor: 'rgba(59,130,246,0.4)',
        left: (size - waveSize) / 2,
        top: (size - waveSize) / 2,
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
        zIndex: 0,
      }}
    />
  );

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {isSpeaking && pulses.map((p, i) => renderPulse(p, i))}

      <Image
        source={require('../assets/images/pikoIcon.png')}
        style={{ width: imageSize, height: imageSize, zIndex: 2 }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});

export default PikoLogo;
