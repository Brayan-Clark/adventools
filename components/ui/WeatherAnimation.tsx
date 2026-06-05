import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const Particle = ({
  type,
  delay,
  duration,
  startX,
  size,
}: {
  type: 'rain' | 'snow' | 'star';
  delay: number;
  duration: number;
  startX: number;
  size: number;
}) => {
  const translateY = useSharedValue(type === 'star' ? Math.random() * height * 0.5 : -20);
  const opacity = useSharedValue(type === 'star' ? 0.2 : 0);

  useEffect(() => {
    if (type === 'rain' || type === 'snow') {
      opacity.value = withDelay(delay, withTiming(type === 'rain' ? 0.6 : 0.8, { duration: 200 }));
      translateY.value = withDelay(
        delay,
        withRepeat(
          withTiming(height + 20, {
            duration,
            easing: Easing.linear,
          }),
          -1,
          false
        )
      );
    } else if (type === 'star') {
      opacity.value = withDelay(
        delay,
        withRepeat(
          withTiming(Math.random() * 0.8 + 0.2, {
            duration,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        )
      );
    }
  }, [type, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    if (type === 'star') {
      return {
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
      };
    }
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  if (type === 'rain') {
    return (
      <Animated.View
        style={[
          styles.rainDrop,
          { left: startX, width: size, height: size * 10 },
          animatedStyle,
        ]}
      />
    );
  }

  if (type === 'snow') {
    return (
      <Animated.View
        style={[
          styles.snowFlake,
          { left: startX, width: size, height: size, borderRadius: size / 2 },
          animatedStyle,
        ]}
      />
    );
  }

  // star
  return (
    <Animated.View
      style={[
        styles.star,
        { left: startX, width: size, height: size, borderRadius: size / 2 },
        animatedStyle,
      ]}
    />
  );
};

export function WeatherAnimation({ conditionCode }: { conditionCode: number }) {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    let type: 'rain' | 'snow' | 'star' | null = null;
    let count = 0;

    // Determine type and count based on code
    if (conditionCode === 0) {
      type = 'star'; // Clear sky, show stars at night (or just ambient particles)
      count = 30;
    } else if (conditionCode >= 51 && conditionCode <= 67) {
      type = 'rain'; // Rain
      count = 40;
    } else if (conditionCode >= 80 && conditionCode <= 82) {
      type = 'rain'; // Heavy rain
      count = 60;
    } else if (conditionCode >= 71 && conditionCode <= 77) {
      type = 'snow'; // Snow
      count = 50;
    } else if (conditionCode >= 95) {
      type = 'rain'; // Thunderstorm
      count = 70;
    }

    if (!type) {
      setParticles([]);
      return;
    }

    const newParticles = Array.from({ length: count }).map((_, i) => ({
      id: i,
      type: type!,
      startX: Math.random() * width,
      delay: Math.random() * 2000,
      duration: type === 'rain' ? 800 + Math.random() * 400 : type === 'snow' ? 3000 + Math.random() * 2000 : 1500 + Math.random() * 1500,
      size: type === 'rain' ? 1.5 + Math.random() * 1 : type === 'snow' ? 3 + Math.random() * 3 : 1.5 + Math.random() * 2,
    }));

    setParticles(newParticles);
  }, [conditionCode]);

  if (particles.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <Particle
          key={p.id}
          type={p.type}
          delay={p.delay}
          duration={p.duration}
          startX={p.startX}
          size={p.size}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rainDrop: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
  },
  snowFlake: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  star: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});
