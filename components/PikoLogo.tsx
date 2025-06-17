import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';

type Props = {
  isSpeaking: boolean;
  isLoading: boolean;
};

const PikoLogo: React.FC<Props> = ({ isSpeaking, isLoading }) => {
  // Augmentation du nombre de vagues pour un effet plus riche
  const pulses = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  const pulseAnims = useRef<Animated.CompositeAnimation[]>([]);
  const spin = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);
  
  // Animation de pulsation du logo principal
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoScaleAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Animation des vagues de parole
  useEffect(() => {
    if (isSpeaking) {
      // Animation subtile du logo principal
      logoScaleAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.05,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      logoScaleAnim.current.start();

      // Vagues avec des délais et durées variables pour plus de naturel
      pulseAnims.current = pulses.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 300), // Délai réduit pour plus de fluidité
            Animated.timing(anim, {
              toValue: 1,
              duration: 1800 + index * 200, // Durées variables
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ])
        )
      );
      pulseAnims.current.forEach((anim) => anim.start());
    } else {
      pulseAnims.current.forEach((anim) => anim.stop());
      logoScaleAnim.current?.stop();
      // Retour smooth à la taille normale
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }

    return () => {
      pulseAnims.current.forEach((anim) => anim.stop());
      logoScaleAnim.current?.stop();
    };
  }, [isSpeaking]);

  // Animation de chargement
  useEffect(() => {
    if (isLoading) {
      spin.setValue(0);
      spinAnim.current = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 1200, // Légèrement plus lent pour plus d'élégance
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinAnim.current.start();
    } else {
      spinAnim.current?.stop();
    }

    return () => {
      spinAnim.current?.stop();
    };
  }, [isLoading]);

  const spinInterpolate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderPulse = (scaleAnim: Animated.Value, index: number) => {
    const maxScale = 2.2 + index * 0.3; // Échelles plus variées
    const baseOpacity = 0.6 - index * 0.1; // Opacités décroissantes
    
    return (
      <Animated.View
        key={index}
        style={[
          styles.pulse,
          {
            transform: [
              {
                scale: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, maxScale],
                }),
              },
            ],
            opacity: scaleAnim.interpolate({
              inputRange: [0, 0.1, 1],
              outputRange: [baseOpacity, baseOpacity * 0.8, 0],
            }),
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Vagues de parole */}
      {isSpeaking && pulses.map((pulse, index) => renderPulse(pulse, index))}

      {/* Spinner de chargement */}
      {isLoading && (
        <Animated.View
          style={[
            styles.spinner,
            { 
              transform: [{ rotate: spinInterpolate }],
            }
          ]}
        />
      )}

      {/* Logo principal avec animation */}
      <Animated.View 
        style={[
          styles.logo,
          {
            transform: [{ scale: logoScale }],
          }
        ]}
      >
        <Image
          source={require('../assets/images/pikoIcon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#3b82f6', // Couleur plus vive
  },
  spinner: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 3,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderTopColor: '#3b82f6',
    borderRightColor: '#3b82f6',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 10,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
});

export default PikoLogo;