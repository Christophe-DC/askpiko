import { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text } from 'react-native';
import Typography from './ui/Typography';
import { useTheme } from '@/hooks/useTheme';

const ColorContainerTest = ({ color }: { color: string }) => {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.setValue(0.8);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [color]);

  return (
    <Animated.View
      style={{
        borderRadius: 16,
        width: '100%',
        height: '100%',
        maxHeight: 280,
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
        marginBottom: 140,
        overflow: 'hidden',
        backgroundColor: color,
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
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
          What color do you see?
        </Text>
      </View>

      <View style={{ backgroundColor: color }}></View>
      {/*<Typography
        variant="h2"
        align="center"
        style={{
          color: colors.primary,
          textShadowColor: '#FFFFFF',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 3,
        }}
      >
        What color do you see?
      </Typography>
      <Typography
        variant="h4"
        align="center"
        style={{
          color: colors.primary,
          textShadowColor: '#FFFFFF',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 3,
        }}
      >
        Say the color name to Piko
      </Typography>*/}
    </Animated.View>
  );
};

export default ColorContainerTest;
